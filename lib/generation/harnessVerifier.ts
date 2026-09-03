import { AgentFramework, AGENT_FRAMEWORK_OPTIONS, AGENT_FRAMEWORK_TOOLS } from '../gitagent/constants';

export class HarnessMismatchError extends Error {
  selectedHarness: AgentFramework;
  detectedHarness: string;
  detectedFrom: string;

  constructor(options: {
    selectedHarness: AgentFramework;
    detectedHarness: string;
    detectedFrom?: string;
    customMessage?: string;
  }) {
    const selectedMeta = AGENT_FRAMEWORK_OPTIONS.find(f => f.id === options.selectedHarness);
    const detectedMeta = AGENT_FRAMEWORK_OPTIONS.find(f => f.id === options.detectedHarness);

    const selectedLabel = selectedMeta ? `${selectedMeta.label} (${options.selectedHarness})` : options.selectedHarness;
    const detectedLabel = detectedMeta ? `${detectedMeta.label} (${options.detectedHarness})` : options.detectedHarness;

    const message = options.customMessage || 
      `Runtime harness mismatch: Selected harness from UI state is "${selectedLabel}", but the AI model response identified harness "${detectedLabel}". The generation was rejected to prevent misconfigured tools and execution errors.`;

    super(message);
    this.name = 'HarnessMismatchError';
    this.selectedHarness = options.selectedHarness;
    this.detectedHarness = options.detectedHarness;
    this.detectedFrom = options.detectedFrom || 'model_payload';

    Object.setPrototypeOf(this, HarnessMismatchError.prototype);
  }
}

export interface HarnessDetectionResult {
  detectedHarness: string | null;
  detectedFrom: string | null;
  conflictingTools?: string[];
}

/**
 * Extracts any identified harness ID or signature from the model response payload.
 */
export function extractIdentifiedHarness(modelResponse: any): HarnessDetectionResult {
  if (!modelResponse) {
    return { detectedHarness: null, detectedFrom: null };
  }

  const payload = modelResponse.object || modelResponse;

  // 1. Check direct properties in manifest or top-level payload
  const directId = 
    payload.targetFramework ||
    payload.harness ||
    payload.manifest?.metadata?.harness ||
    payload.manifest?.metadata?.targetFramework ||
    payload.manifest?.targetFramework ||
    payload.manifest?.harness ||
    payload.metadata?.harness ||
    payload.metadata?.targetFramework;

  if (directId && typeof directId === 'string') {
    const matched = AGENT_FRAMEWORK_OPTIONS.find(
      f => f.id === directId || f.id.toLowerCase() === directId.toLowerCase()
    );
    if (matched) {
      return { detectedHarness: matched.id, detectedFrom: 'manifest_metadata' };
    }
    return { detectedHarness: directId, detectedFrom: 'manifest_metadata' };
  }

  // 2. Check explanation or text fields for explicit harness signatures
  const explanationText = payload.explanation || payload.text || payload.content || '';
  if (typeof explanationText === 'string' && explanationText.trim().length > 0) {
    for (const f of AGENT_FRAMEWORK_OPTIONS) {
      const explicitHarnessMatch = 
        explanationText.includes(`harness "${f.id}"`) ||
        explanationText.includes(`harness '${f.id}'`) ||
        explanationText.includes(`harness: ${f.id}`) ||
        explanationText.includes(`harness: "${f.id}"`) ||
        explanationText.includes(`target harness "${f.label}"`) ||
        explanationText.includes(`for harness ${f.id}`);
      
      if (explicitHarnessMatch) {
        return { detectedHarness: f.id, detectedFrom: 'explanation_text' };
      }
    }
  }

  // 3. Inspect tools present in skills if available
  const skillsList = payload.skillsList || (payload.manifest?.skills ? Object.values(payload.skills || {}) : []);
  if (Array.isArray(skillsList) && skillsList.length > 0) {
    const usedTools = new Set<string>();
    for (const s of skillsList) {
      if (typeof s.allowedTools === 'string') {
        s.allowedTools.split(/\s+/).filter(Boolean).forEach((t: string) => usedTools.add(t));
      } else if (Array.isArray(s.allowedTools)) {
        s.allowedTools.forEach((t: string) => usedTools.add(t));
      }
    }

    if (usedTools.size > 0) {
      // Find which framework has the highest match or exclusive tools
      for (const [fId, validTools] of Object.entries(AGENT_FRAMEWORK_TOOLS)) {
        const uniqueTools = Array.from(usedTools).filter(t => validTools.includes(t));
        const nonUniqueTools = Array.from(usedTools).filter(t => !validTools.includes(t));
        
        // If all tools match this framework and would be invalid for others
        if (uniqueTools.length > 0 && nonUniqueTools.length === 0) {
          // Check if it has tools exclusive to this framework
          const isExclusiveToThis = Object.entries(AGENT_FRAMEWORK_TOOLS)
            .filter(([otherId]) => otherId !== fId)
            .some(([_, otherTools]) => uniqueTools.some(t => !otherTools.includes(t)));
          
          if (isExclusiveToThis) {
            return { detectedHarness: fId, detectedFrom: 'tool_signature' };
          }
        }
      }
    }
  }

  return { detectedHarness: null, detectedFrom: null };
}

/**
 * Verifies that the model response matches the selected harness ID from UI state.
 */
export function verifyHarnessMatch(options: {
  selectedHarnessId: AgentFramework;
  modelResponse: any;
  stage?: string;
}): {
  valid: boolean;
  selectedHarness: AgentFramework;
  detectedHarness: string | null;
  detectedFrom: string | null;
  error?: string;
} {
  const { selectedHarnessId, modelResponse } = options;
  const detection = extractIdentifiedHarness(modelResponse);

  const selectedMeta = AGENT_FRAMEWORK_OPTIONS.find(f => f.id === selectedHarnessId);
  const selectedLabel = selectedMeta ? `${selectedMeta.label} (${selectedHarnessId})` : selectedHarnessId;

  if (detection.detectedHarness && detection.detectedHarness !== selectedHarnessId) {
    const detectedMeta = AGENT_FRAMEWORK_OPTIONS.find(f => f.id === detection.detectedHarness);
    const detectedLabel = detectedMeta ? `${detectedMeta.label} (${detection.detectedHarness})` : detection.detectedHarness;

    return {
      valid: false,
      selectedHarness: selectedHarnessId,
      detectedHarness: detection.detectedHarness,
      detectedFrom: detection.detectedFrom,
      error: `Runtime harness mismatch: Selected harness from UI state is "${selectedLabel}", but the AI model response identified harness "${detectedLabel}" (detected via ${detection.detectedFrom}). Generation was rejected to prevent misconfigured tools.`
    };
  }

  // Also check if text explicitly mentions other harnesses without mentioning the selected harness
  const payload = modelResponse?.object || modelResponse;
  const explanation = payload?.explanation || payload?.text || '';
  if (typeof explanation === 'string' && explanation.length > 0) {
    const otherFrameworks = AGENT_FRAMEWORK_OPTIONS.filter(f => f.id !== selectedHarnessId);
    const conflictingFramework = otherFrameworks.find(f => {
      const mentionsOtherHarnessId = 
        explanation.includes(`harness "${f.id}"`) || 
        explanation.includes(`harness '${f.id}'`) || 
        explanation.includes(`for harness ${f.id}`);
      const mentionsOtherLabel = 
        explanation.toLowerCase().includes(f.label.toLowerCase()) && 
        !explanation.toLowerCase().includes(selectedMeta?.label.toLowerCase() || selectedHarnessId);
      return mentionsOtherHarnessId || mentionsOtherLabel;
    });

    if (conflictingFramework) {
      return {
        valid: false,
        selectedHarness: selectedHarnessId,
        detectedHarness: conflictingFramework.id,
        detectedFrom: 'explanation_conflict',
        error: `Runtime harness mismatch: Selected harness from UI state is "${selectedLabel}", but the AI model response text referenced harness "${conflictingFramework.label} (${conflictingFramework.id})". Generation was rejected to prevent misconfigured tools.`
      };
    }
  }

  return {
    valid: true,
    selectedHarness: selectedHarnessId,
    detectedHarness: detection.detectedHarness,
    detectedFrom: detection.detectedFrom
  };
}

/**
 * Asserts that the model response matches the UI-selected harness ID.
 * Throws a HarnessMismatchError if a mismatch is detected.
 */
export function assertHarnessMatch(options: {
  selectedHarnessId: AgentFramework;
  modelResponse: any;
  stage?: string;
}): void {
  const result = verifyHarnessMatch(options);
  if (!result.valid) {
    throw new HarnessMismatchError({
      selectedHarness: options.selectedHarnessId,
      detectedHarness: result.detectedHarness || 'unknown',
      detectedFrom: result.detectedFrom || undefined,
      customMessage: result.error
    });
  }
}
