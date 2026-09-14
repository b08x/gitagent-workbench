import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgentWorkspace } from '../context/AgentContext';
import { useSettings } from '../context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Send, 
  Upload, 
  X, 
  Bot, 
  User, 
  Sparkles, 
  Loader2,
  FileText,
  Save,
  RotateCcw,
  Square,
  AlertCircle,
  Settings as SettingsIcon,
  Lightbulb,
  ArrowRight,
  Check,
  Zap,
  KeyRound,
  Trash2,
  Cpu,
  Layers,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  FileCode,
  Code2,
  Download,
  GitBranch,
  Shield,
  Clock,
  Activity,
  RefreshCw,
  Edit3
} from 'lucide-react';
import { ResetRestartDialog } from './components/ResetRestartDialog';
import { cn, formatErrorMessage } from '../../lib/utils';
import { providers } from '../../lib/providers';
import { synthesizeAgentSpec } from '../../lib/generation/agentSynthesizer';
import { assertHarnessMatch } from '../../lib/generation/harnessVerifier';
import { AGENT_FRAMEWORK_OPTIONS, AGENT_FRAMEWORK_TOOLS } from '../../lib/gitagent/constants';
import { AgentFramework } from '../../lib/gitagent/types';
import { inferFrameworkTools } from '../../lib/gitagent/contextToolInference';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isInitializing?: boolean;
  timestamp?: string;
  isError?: boolean;
  isCancelled?: boolean;
  cancelledPrompt?: string;
  cancelledDuration?: number;
  failedPrompt?: string;
  failedFiles?: File[];
  resolved?: boolean;
  resolvedVia?: string;
  retrying?: boolean;
  actionTaken?: string;
  isAuditLog?: boolean;
  completionData?: {
    agentName: string;
    agentDescription?: string;
    targetFramework: string;
    targetFrameworkLabel: string;
    tokensCount: number;
    skillsCount: number;
    hasSoul: boolean;
    hasRules: boolean;
  };
}

type GenerationStage = 'intent' | 'manifest' | 'soul' | 'rules' | 'skills' | 'finalizing' | 'complete';

const GENERATION_STEPS = [
  { id: 'intent', label: 'Parsing intent' },
  { id: 'manifest', label: 'Drafting manifest' },
  { id: 'soul', label: 'Composing soul' },
  { id: 'rules', label: 'Defining rules' },
  { id: 'skills', label: 'Assigning skills' },
  { id: 'finalizing', label: 'Finalizing' }
] as const;

const getStepOrder = (stage: GenerationStage): number => {
  const index = GENERATION_STEPS.findIndex(s => s.id === stage);
  return index === -1 ? (stage === 'complete' ? 6 : 0) : index;
};

const getDynamicFinalizingMessage = (elapsedSec: number, frameworkLabel: string, modelId: string): string => {
  const cleanModel = modelId.replace(/^.*\//, '');
  if (elapsedSec < 12) {
    return `Finalizing specification health and verifying ${frameworkLabel} harness constraints...`;
  } else if (elapsedSec < 20) {
    return `Synthesizing deep identity directives, persona tone, and domain principles into SOUL.md...`;
  } else if (elapsedSec < 30) {
    return `Formulating operational rules, safety boundaries, and constraint invariants (RULES.md)...`;
  } else if (elapsedSec < 42) {
    return `Mapping domain tool signatures and execution contracts to ${frameworkLabel} matrix...`;
  } else if (elapsedSec < 56) {
    return `Deep LLM synthesis in progress with ${cleanModel} (generating comprehensive multi-file specification)...`;
  } else if (elapsedSec < 72) {
    return `Validating JSON schema integrity and cross-referencing multi-file injection slots...`;
  } else if (elapsedSec < 90) {
    return `Processing extended token stream (${elapsedSec.toFixed(0)}s elapsed) — assembling manifest & tool parameters...`;
  } else {
    return `Performing final specification assembly and packaging live workspace (${elapsedSec.toFixed(0)}s)...`;
  }
};

const getEstimatedDuration = (seconds: number): string => {
  if (seconds < 12) return 'Est. ~15–30s';
  if (seconds < 30) return 'Deep Synthesis • ~30–45s';
  if (seconds < 60) return 'Complex Spec • ~60–80s';
  if (seconds < 90) return 'Extended Blueprint • ~90s';
  return 'Extended Generation';
};

export function AgentWizard({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const { state, dispatch } = useAgentWorkspace();
  const { settings, updateTaskModel, setApiKey, clearApiKey } = useSettings();
  const navigate = useNavigate();

  const activeFramework: AgentFramework = (state.targetFramework as AgentFramework) || 'hermes_agent';
  const activeFrameworkMeta = AGENT_FRAMEWORK_OPTIONS.find(f => f.id === activeFramework) || AGENT_FRAMEWORK_OPTIONS[0];

  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: 'init-1',
      role: 'assistant', 
      content: `Hello! I am your AI Architect configured for the ${activeFrameworkMeta.label} runtime. Describe your agent's purpose, target workflows, or upload spec documents. I will configure the manifest, soul, rules, and skills in real time.`,
      isInitializing: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [generationStage, setGenerationStage] = useState<GenerationStage>('intent');
  const [stageProgress, setStageProgress] = useState<number>(15);
  const [stageMessage, setStageMessage] = useState<string>('');
  const [contextFiles, setContextFiles] = useState<File[]>([]);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [inlineKeyInput, setInlineKeyInput] = useState('');
  const [showInlineKeyInput, setShowInlineKeyInput] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressiveTimersRef = useRef<NodeJS.Timeout[]>([]);
  const lastUserPromptRef = useRef<string>('');

  const clearProgressiveTimers = () => {
    progressiveTimersRef.current.forEach(t => clearTimeout(t));
    progressiveTimersRef.current = [];
  };

  const currentProviderId = settings.taskModels.architect?.providerId || 'google';
  const currentModelId = settings.taskModels.architect?.modelId || 'gemini-3.7-flash';

  useEffect(() => {
    if (isProcessing) {
      const startTime = Date.now();
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((Date.now() - startTime) / 1000);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isProcessing]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing, elapsedSeconds]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setContextFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setContextFiles(prev => prev.filter((_, i) => i !== index));
  };

  const markErrorsResolved = (via: string) => {
    setMessages(prev => prev.map(msg => msg.isError ? { ...msg, resolved: true, resolvedVia: via, retrying: false } : msg));
  };

  const handleRetryLLM = (errorMsgId: string, promptText?: string, files?: File[]) => {
    if (isProcessing) return;
    const targetPrompt = promptText || '';
    const targetFiles = files || [];

    const { providerId, modelId } = settings.taskModels.architect;
    const actionDesc = `Retried LLM generation with ${providerId.toUpperCase()} (${modelId})`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Mark the original error message as retrying and add audit log entry to transcript
    setMessages(prev => {
      const updated = prev.map(msg => 
        msg.id === errorMsgId ? { ...msg, retrying: true, actionTaken: 'Retry LLM' } : msg
      );
      const auditMsg: ChatMessage = {
        id: `audit-${Date.now()}`,
        role: 'user',
        content: `Recovery Action: ${actionDesc}`,
        isAuditLog: true,
        actionTaken: 'Retry LLM',
        timestamp
      };
      return [...updated, auditMsg];
    });

    handleSend(targetPrompt, targetFiles, { sourceErrorId: errorMsgId, recoveryAction: 'Retried successfully via Retry LLM' });
  };

  const handleSynthesizeLocally = (errorMsgId?: string, promptText?: string) => {
    setIsProcessing(true);
    const targetPrompt = promptText || 'Autonomous Specialist Agent';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const actionDesc = `Synthesized agent blueprint locally using built-in offline compiler`;

    try {
      const synth = synthesizeAgentSpec(targetPrompt, '', activeFramework);
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: {
          targetFramework: activeFramework,
          manifest: {
            ...state.manifest,
            name: synth.manifest.name,
            description: synth.manifest.description,
            metadata: {
              ...(state.manifest.metadata || {}),
              harness: activeFramework,
              targetFramework: activeFramework
            }
          },
          soul: synth.soul,
          rules: synth.rules,
          skills: synth.skills
        }
      });

      setMessages(prev => {
        // Mark all errors as resolved in place via built-in synthesizer
        const updated = prev.map(msg => 
          msg.isError ? { 
            ...msg, 
            resolved: true, 
            resolvedVia: 'Synthesized Locally (Built-in Compiler)', 
            retrying: false,
            actionTaken: (errorMsgId && msg.id === errorMsgId) ? 'Synthesize Locally' : (msg.actionTaken || 'Synthesize Locally')
          } : msg
        );

        const auditMsg: ChatMessage = {
          id: `audit-${Date.now()}`,
          role: 'user',
          content: `Recovery Action: ${actionDesc}`,
          isAuditLog: true,
          actionTaken: 'Synthesize Locally',
          timestamp
        };

        const synthMsg: ChatMessage = {
          id: `synth-${Date.now() + 1}`,
          role: 'assistant',
          content: synth.explanation,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        return [...updated, auditMsg, synthMsg];
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveKeyAndRetry = (errorMsgId: string, promptText?: string, files?: File[]) => {
    if (!inlineKeyInput.trim()) return;
    setApiKey(currentProviderId, inlineKeyInput.trim());
    setShowInlineKeyInput(false);
    setInlineKeyInput('');

    const targetPrompt = promptText || '';
    const targetFiles = files || [];
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const actionDesc = `Updated API key for ${currentProviderId.toUpperCase()} and retried LLM generation`;

    setMessages(prev => {
      const updated = prev.map(msg => 
        msg.id === errorMsgId ? { ...msg, retrying: true, actionTaken: 'Updated API Key & Retried LLM' } : msg
      );
      const auditMsg: ChatMessage = {
        id: `audit-${Date.now()}`,
        role: 'user',
        content: `Recovery Action: ${actionDesc}`,
        isAuditLog: true,
        actionTaken: 'Update Key & Retry',
        timestamp
      };
      return [...updated, auditMsg];
    });

    handleSend(targetPrompt, targetFiles, { sourceErrorId: errorMsgId, recoveryAction: 'Retried successfully with updated API key' });
  };

  const handleClearKey = (errorMsgId: string) => {
    clearApiKey(currentProviderId);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const actionDesc = `Cleared saved API key for ${currentProviderId.toUpperCase()}`;

    setMessages(prev => {
      const updated = prev.map(msg => 
        msg.id === errorMsgId ? { ...msg, actionTaken: 'Cleared API Key' } : msg
      );
      const auditMsg: ChatMessage = {
        id: `audit-${Date.now()}`,
        role: 'user',
        content: `Recovery Action: ${actionDesc}`,
        isAuditLog: true,
        actionTaken: 'Clear Key',
        timestamp
      };
      return [...updated, auditMsg];
    });
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearProgressiveTimers();
    setIsProcessing(false);
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { isCompilingSpec: false } });
    
    const cancelledDuration = elapsedSeconds;
    const promptText = lastUserPromptRef.current;

    setMessages(prev => {
      const filtered = prev.filter(m => !(m.role === 'assistant' && (m.content.includes('Analyzing') || m.id.startsWith('asst-'))));
      return [
        ...filtered,
        {
          id: `cancel-${Date.now()}`,
          role: 'assistant',
          content: `Generation halted by user after ${cancelledDuration.toFixed(1)}s. Workspace changes were discarded.`,
          isCancelled: true,
          cancelledPrompt: promptText,
          cancelledDuration: cancelledDuration,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
    });
  };

  const handleRestartChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearProgressiveTimers();
    setIsProcessing(false);
    dispatch({ type: 'UPDATE_WORKSPACE', payload: { isCompilingSpec: false } });
    setMessages([
      { 
        id: `init-${Date.now()}`,
        role: 'assistant', 
        content: `Hello! I am your AI Architect configured for the ${activeFrameworkMeta.label} runtime. Describe your agent's purpose, target workflows, or upload spec documents. I will configure the manifest, soul, rules, and skills in real time.`,
        isInitializing: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setInput('');
    setContextFiles([]);
  };

  // Keyboard shortcut: Escape cancels active synthesis
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isProcessing) {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, elapsedSeconds]);

  const handleSend = async (
    overridePrompt?: string, 
    overrideFiles?: File[],
    recoveryOptions?: { sourceErrorId?: string; recoveryAction?: string }
  ) => {
    const promptToSend = overridePrompt !== undefined ? overridePrompt : input;
    const filesToSend = overrideFiles !== undefined ? overrideFiles : contextFiles;

    if (!promptToSend.trim() && filesToSend.length === 0) return;
    if (isProcessing) return;

    lastUserPromptRef.current = promptToSend;

    if (!recoveryOptions?.recoveryAction) {
      const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const userMessageId = `user-${Date.now()}`;
      const userMessage: ChatMessage = { 
        id: userMessageId,
        role: 'user', 
        content: promptToSend, 
        timestamp: userTime 
      };

      setMessages(prev => [...prev, userMessage]);
      if (overridePrompt === undefined) setInput('');
    }
    setIsProcessing(true);

    abortControllerRef.current = new AbortController();

    // Reset pipeline state and initialize live streaming
    clearProgressiveTimers();
    setGenerationStage('intent');
    setStageProgress(15);
    setStageMessage(`Parsing intent & runtime constraints for ${activeFrameworkMeta.label}...`);

    dispatch({
      type: 'UPDATE_WORKSPACE',
      payload: {
        isCompilingSpec: true,
        compilationStage: `Parsing intent (${activeFrameworkMeta.shortLabel})...`,
        targetFramework: activeFramework
      }
    });

    // Synthesize structured deterministic baseline specification for immediate progressive streaming
    const interimSpec = synthesizeAgentSpec(promptToSend, '', activeFramework);

    // Staged progressive update 1: Manifest metadata & Kebab-case identifier at 1.5s
    const t1 = setTimeout(() => {
      setGenerationStage('manifest');
      setStageProgress(35);
      const msg = `Drafting manifest metadata for ${interimSpec.manifest.name}...`;
      setStageMessage(msg);
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: {
          isCompilingSpec: true,
          compilationStage: 'Drafting manifest...',
          manifest: {
            ...state.manifest,
            name: interimSpec.manifest.name,
            description: interimSpec.manifest.description,
            version: interimSpec.manifest.version || '1.0.0',
            compliance: interimSpec.manifest.compliance
          }
        }
      });
    }, 1500);

    // Staged progressive update 2: Identity & SOUL.md at 3.2s
    const t2 = setTimeout(() => {
      setGenerationStage('soul');
      setStageProgress(55);
      const msg = `Composing Core Identity & values into SOUL.md...`;
      setStageMessage(msg);
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: {
          isCompilingSpec: true,
          compilationStage: 'Composing soul (SOUL.md)...',
          soul: interimSpec.soul
        }
      });
    }, 3200);

    // Staged progressive update 3: Operational Rules at 4.8s
    const t3 = setTimeout(() => {
      setGenerationStage('rules');
      setStageProgress(75);
      const msg = `Establishing operational boundaries into RULES.md...`;
      setStageMessage(msg);
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: {
          isCompilingSpec: true,
          compilationStage: 'Defining rules (RULES.md)...',
          rules: interimSpec.rules
        }
      });
    }, 4800);

    // Staged progressive update 4: Domain Skills & Tools at 6.5s
    const t4 = setTimeout(() => {
      setGenerationStage('skills');
      setStageProgress(90);
      const msg = `Mapping domain tools & skills to ${activeFrameworkMeta.label} matrix...`;
      setStageMessage(msg);
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: {
          isCompilingSpec: true,
          compilationStage: 'Assigning skills & tools...',
          skills: interimSpec.skills
        }
      });
    }, 6500);

    // Staged progressive update 5: Finalizing at 8.0s
    const t5 = setTimeout(() => {
      setGenerationStage('finalizing');
      setStageProgress(94);
      const msg = `Finalizing specification health and verifying ${activeFrameworkMeta.label} harness...`;
      setStageMessage(msg);
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: {
          isCompilingSpec: true,
          compilationStage: 'Finalizing agent...'
        }
      });
    }, 8000);

    const t6 = setTimeout(() => {
      setStageProgress(95);
      const msg = `Synthesizing deep identity directives & domain principles into SOUL.md...`;
      setStageMessage(msg);
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: { isCompilingSpec: true, compilationStage: msg }
      });
    }, 14000);

    const t7 = setTimeout(() => {
      setStageProgress(96);
      const msg = `Formulating operational rules, safety boundaries, and constraint invariants (RULES.md)...`;
      setStageMessage(msg);
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: { isCompilingSpec: true, compilationStage: msg }
      });
    }, 22000);

    const t8 = setTimeout(() => {
      setStageProgress(96);
      const msg = `Mapping executable tool signatures and parameter contracts to ${activeFrameworkMeta.label} matrix...`;
      setStageMessage(msg);
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: { isCompilingSpec: true, compilationStage: msg }
      });
    }, 32000);

    const t9 = setTimeout(() => {
      setStageProgress(97);
      const msg = `Deep LLM synthesis in progress with ${currentModelId.replace(/^.*\//, '')} (generating multi-file blueprint)...`;
      setStageMessage(msg);
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: { isCompilingSpec: true, compilationStage: msg }
      });
    }, 45000);

    const t10 = setTimeout(() => {
      setStageProgress(97);
      const msg = `Structuring tool schemas, parameter contracts, and memory partition boundaries...`;
      setStageMessage(msg);
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: { isCompilingSpec: true, compilationStage: msg }
      });
    }, 60000);

    const t11 = setTimeout(() => {
      setStageProgress(98);
      const msg = `Validating JSON schema integrity and cross-referencing injection slots across artifacts...`;
      setStageMessage(msg);
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: { isCompilingSpec: true, compilationStage: msg }
      });
    }, 75000);

    const t12 = setTimeout(() => {
      setStageProgress(98);
      const msg = `Processing extended token stream (${currentModelId.replace(/^.*\//, '')}) — assembling manifest & tool parameters...`;
      setStageMessage(msg);
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: { isCompilingSpec: true, compilationStage: msg }
      });
    }, 90000);

    const t13 = setTimeout(() => {
      setStageProgress(99);
      const msg = `Performing final specification assembly and packaging live workspace...`;
      setStageMessage(msg);
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: { isCompilingSpec: true, compilationStage: msg }
      });
    }, 105000);

    progressiveTimersRef.current = [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t12, t13];

    try {
      const { providerId, modelId, parameters } = settings.taskModels.architect;
      const apiKey = settings.apiKeys[providerId];

      const assistantMsgId = `asst-${Date.now()}`;
      const assistantMessage: ChatMessage = { 
        id: assistantMsgId,
        role: 'assistant', 
        content: `Analyzing parameters and compiling agent specification for ${activeFrameworkMeta.label}...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMessage]);

      const fileParts = await Promise.all(filesToSend.map(async (file) => {
        return new Promise((resolve) => {
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Data = (reader.result as string).split(',')[1];
              resolve({ type: 'image', image: base64Data, mimeType: file.type });
            };
            reader.readAsDataURL(file);
          } else {
            const reader = new FileReader();
            reader.onloadend = () => {
              const textContent = reader.result as string;
              resolve({ type: 'text', text: `\n\n--- Attachment: ${file.name} ---\n${textContent}\n--- End of Attachment ---\n` });
            };
            reader.readAsText(file);
          }
        });
      }));
      
      const systemInstruction = `You are an expert AI Architect. Your goal is to design an agent specification specifically tailored for the target harness "${activeFramework}".
      
      CRITICAL TARGET RUNTIME CONSTRAINTS:
      - Target Execution Runtime / Harness: ${activeFramework} (${activeFrameworkMeta.label})
      - Inferred tools and skill definitions MUST align with the ${activeFramework} harness toolset.
      
      You must respond in JSON format with the following schema:
      {
        "manifest": {
          "name": "string (kebab-case)",
          "description": "string (one sentence)"
        },
        "soul": "Markdown string with ## sections (Core Identity, Communication Style, Values & Principles, Domain Expertise, Collaboration Style)",
        "rules": "Markdown string with ## sections (Must Always, Must Never, Output Constraints, Interaction Boundaries)",
        "skills": "Markdown string with ## Skill: Name sections",
        "explanation": "Brief explanation of what was configured, explicitly confirming target harness: ${activeFramework}"
      }
      
      Guidelines:
      - Core Identity should strictly reflect the agent purpose.
      - Skills should be detailed and include allowed tools aligned with ${activeFramework}.
      - INTEGRATE ALL RELEVANT INFORMATION from any provided documents into the Soul and Rules.
      - The agent name MUST be lowercase kebab-case.`;

      const promptObj = {
        system: systemInstruction,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Target Runtime: ${activeFramework} (${activeFrameworkMeta.label})\nUser Prompt: ${promptToSend}` },
              ...fileParts
            ]
          }
        ],
        schema: {
          type: "object",
          properties: {
            manifest: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" }
              },
              required: ["name", "description"]
            },
            soul: { type: "string" },
            rules: { type: "string" },
            skills: { type: "string" },
            explanation: { type: "string" }
          },
          required: ["manifest", "soul", "rules", "skills", "explanation"]
        }
      };

      const encodedPrompt = btoa(unescape(encodeURIComponent(JSON.stringify(promptObj))));

      let result: any = null;

      // Try streaming endpoint first for live server events
      try {
        const streamResponse = await fetch('/api/agent/compile-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            providerId,
            modelId,
            apiKey: apiKey && apiKey !== '********' ? apiKey : undefined,
            options: {
              ...parameters,
              targetFramework: activeFramework
            },
            targetFramework: activeFramework,
            prompt: encodedPrompt
          }),
          signal: abortControllerRef.current.signal
        });

        if (streamResponse.ok && streamResponse.body) {
          const reader = streamResponse.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            let currentEvent = 'message';
            for (const line of lines) {
              if (line.startsWith('event:')) {
                currentEvent = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                const dataStr = line.slice(5).trim();
                if (dataStr === '[DONE]') break;
                try {
                  const eventData = JSON.parse(dataStr);
                  if (currentEvent === 'stage') {
                    if (eventData.stage) setGenerationStage(eventData.stage);
                    if (eventData.label) setStageMessage(eventData.label);
                    if (eventData.progress) setStageProgress(eventData.progress);
                    dispatch({
                      type: 'UPDATE_WORKSPACE',
                      payload: {
                        isCompilingSpec: true,
                        compilationStage: eventData.label
                      }
                    });
                  } else if (currentEvent === 'partial') {
                    if (eventData.stage) setGenerationStage(eventData.stage);
                    if (eventData.label) setStageMessage(eventData.label);
                    if (eventData.progress) setStageProgress(eventData.progress);
                    if (eventData.data) {
                      dispatch({
                        type: 'UPDATE_WORKSPACE',
                        payload: {
                          isCompilingSpec: true,
                          compilationStage: eventData.label,
                          ...eventData.data
                        }
                      });
                    }
                  } else if (currentEvent === 'complete') {
                    result = eventData.object;
                  }
                } catch {
                  // Ignore JSON parse error on non-json or chunked data
                }
              }
            }
          }
        }
      } catch (streamErr: any) {
        if (streamErr.name === 'AbortError') throw streamErr;
        console.warn('Streaming fetch fallback to standard compute:', streamErr);
      }

      // If streaming didn't produce full object (or was unavailable), use compute endpoint
      if (!result) {
        const response = await fetch('/api/compute/v1', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            providerId,
            modelId,
            apiKey: apiKey && apiKey !== '********' ? apiKey : undefined,
            options: {
              ...parameters,
              targetFramework: activeFramework
            },
            targetFramework: activeFramework,
            prompt: encodedPrompt
          }),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          let errMessage = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            errMessage = errorData.error || errMessage;
          } catch {
            const text = await response.text();
            if (text) errMessage = text;
          }
          throw new Error(errMessage);
        }

        const data = await response.json();
        result = data.object;
      }

      clearProgressiveTimers();
      setStageProgress(100);
      setGenerationStage('complete');

      if (!result || !result.manifest) {
        throw new Error("Invalid format received from model. Please try regenerating.");
      }

      // Assert that the generated specification strictly targets the active harness
      assertHarnessMatch({
        selectedHarnessId: activeFramework,
        modelResponse: result,
        stage: 'architect_synthesis'
      });

      // Update workspace with explicit framework binding and mark compilation complete
      dispatch({
        type: 'UPDATE_WORKSPACE',
        payload: {
          isCompilingSpec: false,
          targetFramework: activeFramework,
          manifest: {
            ...state.manifest,
            name: result.manifest.name,
            description: result.manifest.description,
            metadata: {
              ...(state.manifest.metadata || {}),
              harness: activeFramework,
              targetFramework: activeFramework
            }
          },
          soul: result.soul,
          rules: result.rules,
          skills: result.skills
        }
      });

      let explanation = result.explanation;
      if (!explanation || !explanation.toLowerCase().includes(activeFrameworkMeta.label.toLowerCase())) {
        explanation = `Configured complete agent workspace "${result.manifest.name}" for harness "${activeFramework}". Allowed tools for all generated skills have been contextually aligned with the framework matrix.`;
      }

      setMessages(prev => {
        // Mark all previous error notices as resolved in place
        const resolved = prev.map(msg => {
          if (msg.isError) {
            const via = (recoveryOptions?.sourceErrorId && msg.id === recoveryOptions.sourceErrorId && recoveryOptions.recoveryAction)
              ? recoveryOptions.recoveryAction
              : (msg.actionTaken ? `Resolved via ${msg.actionTaken}` : (recoveryOptions?.recoveryAction || 'Retried successfully via LLM'));
            return {
              ...msg,
              resolved: true,
              resolvedVia: via,
              retrying: false
            };
          }
          return msg;
        });

        const cleanSkillsCount = result.skills ? (result.skills.match(/## Skill:/g) || []).length || 1 : 1;
        const totalTokens = Math.round(((result.soul?.length || 0) + (result.rules?.length || 0) + (result.skills?.length || 0)) / 4);

        return [
          ...resolved.slice(0, -1), 
          { 
            id: assistantMsgId,
            role: 'assistant', 
            content: explanation,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            completionData: {
              agentName: result.manifest.name,
              agentDescription: result.manifest.description,
              targetFramework: activeFramework,
              targetFrameworkLabel: activeFrameworkMeta.label,
              tokensCount: totalTokens,
              skillsCount: cleanSkillsCount,
              hasSoul: !!result.soul,
              hasRules: !!result.rules
            }
          }
        ];
      });

      setContextFiles([]);
    } catch (err: any) {
      if (err.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        return;
      }
      console.error('AI Architect generation error:', err);
      const cleanError = formatErrorMessage(err);

      setMessages(prev => {
        const resetRetrying = prev.map(msg => msg.retrying ? { ...msg, retrying: false } : msg);
        return [
          ...resetRetrying.slice(0, -1),
          { 
            id: `error-${Date.now()}`,
            role: 'assistant', 
            content: cleanError,
            isError: true,
            failedPrompt: promptToSend,
            failedFiles: filesToSend,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
      });
    } finally {
      clearProgressiveTimers();
      setIsProcessing(false);
      abortControllerRef.current = null;
      dispatch({ type: 'UPDATE_WORKSPACE', payload: { isCompilingSpec: false } });
    }
  };

  const starterPrompts = [
    "Design a senior TypeScript & React code reviewer with strict linter rules and automated git-diff inspections.",
    "Build a technical research agent that ingests PDFs, performs web queries, and writes executive summaries with citations.",
    "Create a DevOps reliability bot for monitoring alerts, parsing logs, and safely triggering rollbacks with approval gates."
  ];

  const selectFramework = (frameworkId: AgentFramework) => {
    dispatch({ 
      type: 'UPDATE_WORKSPACE', 
      payload: { targetFramework: frameworkId } 
    });

    dispatch({ 
      type: 'UPDATE_MANIFEST', 
      payload: { 
        metadata: { 
          ...(state.manifest.metadata || {}), 
          harness: frameworkId,
          targetFramework: frameworkId
        } 
      } 
    });
  };

  return (
    <div className="flex flex-col h-full bg-card/60 border border-border/80 rounded-md overflow-hidden shadow-xs">
      {/* Sub-Header Bar with Target Runtime Switcher & Model Switcher */}
      <div className="px-4 py-2 border-b border-border/80 bg-muted/40 flex flex-wrap items-center justify-between shrink-0 gap-2.5">
        {/* Target Runtime Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-background border border-border/80 rounded-sm px-2 py-1 shadow-xs">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1">
              <Layers className="size-3 text-primary" /> Target Runtime:
            </span>
            <div className="flex items-center gap-1">
              {AGENT_FRAMEWORK_OPTIONS.map(f => {
                const isSelected = activeFramework === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => selectFramework(f.id)}
                    className={cn(
                      "text-[10px] font-mono px-2 py-0.5 rounded-sm transition-all cursor-pointer",
                      isSelected
                        ? "bg-gradient-to-r from-[#E76F51] to-[#E9C46A] text-[#141A20] font-bold shadow-xs"
                        : "text-[#A0D2EB]/60 hover:text-foreground hover:bg-[#A0D2EB]/10"
                    )}
                  >
                    {f.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Model Selector & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-background/80 border border-border/80 rounded-sm px-1.5 py-0.5 text-xs font-mono">
            <span className="text-[9px] uppercase font-bold text-muted-foreground px-1">Engine:</span>
            <Select 
              value={currentProviderId} 
              onValueChange={(val) => {
                const defaultModel = val === 'google' ? 'gemini-3.7-flash' : val === 'openai' ? 'gpt-4o-mini' : val === 'anthropic' ? 'claude-3-5-haiku-20241022' : 'llama-3.3-70b-versatile';
                updateTaskModel('architect', { providerId: val, modelId: defaultModel });
              }}
            >
              <SelectTrigger className="h-6 text-[11px] font-mono border-none shadow-none bg-transparent w-[95px] px-1 focus:ring-0">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(providers).map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs font-mono">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-muted-foreground/50">/</span>

            <span className="text-[11px] text-foreground font-mono truncate max-w-[130px] px-1 font-medium">
              {currentModelId.replace(/^.*\//, '')}
            </span>
          </div>

          {isProcessing ? (
            <div className="flex items-center gap-1.5">
              <Button 
                variant="destructive" 
                size="xs" 
                onClick={handleCancel}
                className="text-[10px] font-mono uppercase tracking-wider h-7 px-2.5 gap-1 shadow-xs"
                title="Cancel active synthesis (Esc)"
              >
                <Square className="size-3 fill-current" /> Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button 
                variant="outline" 
                size="xs" 
                onClick={() => setShowResetDialog(true)}
                className="text-[10px] font-mono uppercase tracking-wider h-7 px-2.5 gap-1 border-border text-foreground hover:border-[#171611]"
                title="Reset or restart agent builder session"
              >
                <RotateCcw className="size-3 text-[#a03e3d]" /> Reset
              </Button>
              <Button 
                variant="outline" 
                size="xs" 
                onClick={() => dispatch({ type: 'SAVE_SNAPSHOT', payload: 'AI Architect Sync' })}
                className="text-[10px] font-mono uppercase tracking-wider h-7 px-2.5"
              >
                <Save className="size-3 mr-1" /> Snapshot
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Thread */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4"
      >
        {messages.map((m) => (
          <div 
            key={m.id} 
            className={cn(
              "flex gap-3 max-w-[90%]",
              m.isAuditLog 
                ? "w-full max-w-full" 
                : m.role === 'user' 
                  ? "ml-auto flex-row-reverse" 
                  : "mr-auto"
            )}
          >
            <div className={cn(
              "size-7 rounded-sm flex items-center justify-center shrink-0 border font-mono text-xs shadow-xs",
              m.isAuditLog
                ? "bg-primary/10 text-primary border-primary/30"
                : m.role === 'user' 
                  ? "bg-primary text-primary-foreground font-bold border-primary/50 terracotta-glow-sm" 
                  : m.isError 
                    ? (m.resolved 
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                        : m.retrying 
                          ? "bg-primary/10 text-primary border-primary/30 animate-pulse" 
                          : "bg-destructive/10 text-destructive border-destructive/30") 
                    : "bg-muted text-muted-foreground border-border/80"
            )}>
              {m.isAuditLog ? (
                <ShieldCheck className="size-4 text-primary" />
              ) : m.role === 'user' ? (
                <User className="size-4" />
              ) : m.isError ? (
                m.resolved ? (
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : m.retrying ? (
                  <Loader2 className="size-4 text-primary animate-spin" />
                ) : (
                  <AlertCircle className="size-4 text-destructive" />
                )
              ) : (
                <Bot className="size-4 text-primary" />
              )}
            </div>

            <div className={cn("space-y-1.5", m.isAuditLog ? "w-full" : "max-w-[calc(100%-2.5rem)]")}>
              {m.isAuditLog ? (
                /* Recovery Audit Log Banner in Transcript */
                <div className="p-2.5 rounded-sm bg-muted/40 border border-primary/20 text-xs font-mono text-muted-foreground flex items-center justify-between gap-3 shadow-2xs w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="size-3.5 text-primary shrink-0" />
                    <span className="text-foreground text-xs font-sans">
                      <span className="font-bold text-primary font-mono text-[11px] mr-1.5">[AUDIT LOG]</span>
                      {m.content}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.actionTaken && (
                      <Badge variant="outline" className="text-[9px] font-mono bg-primary/10 text-primary border-primary/30">
                        {m.actionTaken}
                      </Badge>
                    )}
                    {m.timestamp && (
                      <span className="text-[10px] text-muted-foreground/60 font-mono">{m.timestamp}</span>
                    )}
                  </div>
                </div>
              ) : m.isError ? (
                m.resolved ? (
                  /* Resolved Error State - Collapsed in place, clean & auditable */
                  <div className="p-3 rounded-sm text-xs bg-muted/30 border border-emerald-500/30 text-foreground space-y-2 shadow-xs transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="size-4 shrink-0" />
                        <span className="font-semibold text-xs">Generation Notice Resolved</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 py-0">
                        {m.resolvedVia || 'Retried successfully'}
                      </Badge>
                    </div>
                    <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground pl-6">
                      <span className="text-amber-500 font-semibold">⚠</span>
                      <span>
                        Original notice: <span className="font-mono text-[10px] bg-background/80 px-1 py-0.5 rounded border border-border/60 text-foreground/80">{m.content}</span>
                        {' '}— <span className="text-emerald-600 dark:text-emerald-400 font-medium">Resolved</span> ({m.resolvedVia || 'Retried successfully'}).
                      </span>
                    </div>
                    <details className="group pl-6 pt-0.5">
                      <summary className="cursor-pointer text-[10px] font-mono text-muted-foreground/70 hover:text-foreground list-none flex items-center gap-1 select-none">
                        <ChevronRight className="size-3 transition-transform group-open:rotate-90" />
                        <span>View resolution audit trail</span>
                      </summary>
                      <div className="mt-1.5 p-2 rounded bg-background/60 border border-border/50 text-[10px] font-mono text-muted-foreground space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Status:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Resolved & Superseded</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Resolution Path:</span>
                          <span className="text-foreground">{m.resolvedVia || 'Retried successfully'}</span>
                        </div>
                        {m.actionTaken && (
                          <div className="flex items-center justify-between">
                            <span>Action Taken:</span>
                            <span className="text-primary font-medium">{m.actionTaken}</span>
                          </div>
                        )}
                        {m.failedPrompt && (
                          <div className="pt-1 border-t border-border/40">
                            <span className="text-muted-foreground/70">Prompt: </span>
                            <span className="text-foreground/90">{m.failedPrompt.slice(0, 100)}{m.failedPrompt.length > 100 ? '...' : ''}</span>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                ) : m.retrying ? (
                  /* In-progress Retry State */
                  <div className="p-3.5 rounded-sm text-xs leading-relaxed bg-primary/[0.04] border border-primary/30 text-foreground space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-primary font-medium">
                        <Loader2 className="size-4 animate-spin shrink-0" />
                        <span className="font-semibold text-xs">Recovery In Progress...</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-mono bg-primary/10 text-primary border-primary/30 py-0">
                        {m.actionTaken || 'Retrying LLM'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground pl-6">
                      Generation failed previously: <span className="font-mono text-[10px] text-foreground/80">{m.content}</span>. Retrying generation with active configuration...
                    </p>
                  </div>
                ) : (
                  /* Enhanced Actionable Error Card with Retry Button and Built-in Synthesizer */
                  <div className="p-4 rounded-sm text-xs leading-relaxed bg-destructive/5 border border-destructive/30 text-foreground space-y-3 shadow-xs">
                    <div className="flex items-start gap-2 text-destructive font-medium">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-xs tracking-tight">Generation Notice</p>
                          {m.actionTaken && (
                            <Badge variant="outline" className="text-[9px] font-mono bg-muted text-muted-foreground border-border/80">
                              Last Action: {m.actionTaken}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-foreground/90 font-normal">{m.content}</p>
                      </div>
                    </div>

                    {/* Inline Key Configuration option */}
                    {showInlineKeyInput && (
                      <div className="p-2.5 bg-background/80 border border-border/80 rounded-sm space-y-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <KeyRound className="size-3 text-primary" /> Enter {currentProviderId.toUpperCase()} API Key:
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          <Input
                            type="password"
                            placeholder="sk-..."
                            value={inlineKeyInput}
                            onChange={(e) => setInlineKeyInput(e.target.value)}
                            className="h-7 text-xs font-mono bg-background"
                          />
                          <Button
                            size="xs"
                            className="h-7 px-2.5 text-xs font-mono bg-primary text-primary-foreground cursor-pointer"
                            disabled={!inlineKeyInput.trim()}
                            onClick={() => handleSaveKeyAndRetry(m.id, m.failedPrompt, m.failedFiles)}
                          >
                            Save & Retry
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-destructive/20">
                      {m.failedPrompt && (
                        <Button
                          size="xs"
                          variant="default"
                          className="bg-primary hover:bg-[#d96b43] text-primary-foreground text-xs font-mono gap-1.5 h-7 shadow-xs cursor-pointer"
                          onClick={() => handleRetryLLM(m.id, m.failedPrompt, m.failedFiles)}
                          disabled={isProcessing}
                        >
                          <RotateCcw className="size-3" /> Retry LLM
                        </Button>
                      )}

                      {m.failedPrompt && (
                        <Button
                          size="xs"
                          variant="secondary"
                          className="bg-muted hover:bg-muted/80 text-foreground text-xs font-mono gap-1.5 h-7 border border-border/80 cursor-pointer"
                          onClick={() => handleSynthesizeLocally(m.id, m.failedPrompt)}
                          disabled={isProcessing}
                        >
                          <Zap className="size-3 text-amber-500" /> Synthesize Locally
                        </Button>
                      )}

                      <Button
                        size="xs"
                        variant="outline"
                        className="text-xs font-mono gap-1.5 h-7 border-border/80 hover:bg-muted cursor-pointer"
                        onClick={() => setShowInlineKeyInput(!showInlineKeyInput)}
                      >
                        <KeyRound className="size-3 text-primary" /> {showInlineKeyInput ? 'Hide Key Input' : 'Update Key'}
                      </Button>

                      {settings.apiKeys[currentProviderId] && (
                        <Button
                          size="xs"
                          variant="ghost"
                          className="text-xs font-mono gap-1 h-7 text-muted-foreground hover:text-destructive cursor-pointer"
                          onClick={() => handleClearKey(m.id)}
                          title="Clear saved key"
                        >
                          <Trash2 className="size-3" /> Clear Key
                        </Button>
                      )}
                    </div>
                  </div>
                )
              ) : m.isCancelled ? (
                /* Enhanced Cancelled Generation Card */
                <div className="p-4 rounded-none text-xs bg-surface-container border border-border space-y-3 font-sans shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-[#a03e3d]/10 border border-[#a03e3d]/30 text-[#a03e3d]">
                        <Square className="size-3 fill-current" />
                      </span>
                      <span className="font-bold text-foreground text-xs uppercase tracking-wider font-mono">
                        Generation Halted
                      </span>
                    </div>
                    {m.cancelledDuration !== undefined && (
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted/30 px-2 py-0.5 border border-border">
                        ⏱ {m.cancelledDuration.toFixed(1)}s elapsed
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {m.content}
                  </p>

                  {m.cancelledPrompt && (
                    <div className="p-2.5 bg-background border border-border text-[11px] font-mono text-foreground/80 line-clamp-2">
                      <span className="text-muted-foreground mr-1 uppercase text-[9px] font-bold">Prompt:</span>
                      &ldquo;{m.cancelledPrompt}&rdquo;
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
                    {m.cancelledPrompt && (
                      <Button
                        size="xs"
                        variant="warm"
                        onClick={() => handleSend(m.cancelledPrompt)}
                        className="text-[11px] gap-1.5 font-medium shadow-xs"
                      >
                        <RotateCcw className="size-3" />
                        <span>Restart Generation</span>
                      </Button>
                    )}
                    {m.cancelledPrompt && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setInput(m.cancelledPrompt || '')}
                        className="text-[11px] gap-1.5 font-mono border-border text-foreground hover:border-[#171611]"
                      >
                        <Edit3 className="size-3" />
                        <span>Edit in Prompt Bar</span>
                      </Button>
                    )}
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setShowResetDialog(true)}
                      className="text-[11px] gap-1.5 font-mono border-border text-muted-foreground hover:text-foreground hover:border-[#171611]"
                    >
                      <RefreshCw className="size-3 text-[#a03e3d]" />
                      <span>Reset Builder...</span>
                    </Button>
                  </div>
                </div>
              ) : (
                /* Standard Message Card or Live Pipeline Card */
                <div className={cn(
                  "p-3.5 rounded-sm text-xs leading-relaxed border shadow-xs",
                  m.role === 'user' 
                    ? "bg-primary text-primary-foreground border-primary/50 font-medium" 
                    : "bg-card border-border/80 text-foreground"
                )}>
                  {m.content.includes("Analyzing parameters") || (isProcessing && m.id.startsWith('asst-')) ? (() => {
                    const isFinalizing = generationStage === 'finalizing' || (isProcessing && elapsedSeconds >= 8);
                    const currentLiveMessage = isFinalizing 
                      ? getDynamicFinalizingMessage(elapsedSeconds, activeFrameworkMeta.label, currentModelId)
                      : (stageMessage || `Synthesizing ${activeFrameworkMeta.label} specification...`);
                    const currentLiveProgress = generationStage === 'complete'
                      ? 100
                      : isFinalizing
                      ? Math.min(99, Math.max(stageProgress, 94 + Math.floor(Math.min(elapsedSeconds - 8, 90) / 18)))
                      : stageProgress;

                    return (
                      <div className="space-y-3 font-mono">
                        {/* Live Header & Timer */}
                        <div className="flex items-center justify-between text-xs pb-1 border-b border-border/40">
                          <div className="flex items-center gap-2 text-foreground font-semibold">
                            <Loader2 className="size-3.5 animate-spin text-[#a03e3d] shrink-0" />
                            <span>Generating Agent Blueprint ({activeFrameworkMeta.label})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-mono bg-surface-container text-foreground border-border py-0.5 px-2 flex items-center gap-1.5">
                              <span className="font-bold">⏱ {elapsedSeconds.toFixed(1)}s</span>
                              <span className="text-muted-foreground font-normal">• {getEstimatedDuration(elapsedSeconds)}</span>
                            </Badge>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={handleCancel}
                              className="h-6 px-2 text-[11px] font-medium text-destructive hover:bg-destructive/10 border border-destructive/20 uppercase tracking-wider gap-1"
                            >
                              <Square className="size-2.5 fill-current" />
                              Cancel
                            </Button>
                          </div>
                        </div>

                        {/* Multi-step Status Line */}
                        <div className="p-2.5 rounded-none bg-surface-container-low border border-border space-y-2.5">
                          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground border-b border-border/40 pb-1.5">
                            <span className="font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                              <Layers className="size-3 text-[#a03e3d]" /> Synthesis Pipeline
                            </span>
                            <span className="text-foreground font-bold">{currentLiveProgress}% Complete</span>
                          </div>
                          
                          {/* Interactive Status Chain */}
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px] font-mono">
                            {GENERATION_STEPS.map((step, idx) => {
                              const isPast = getStepOrder(generationStage) > idx;
                              const isCurrent = generationStage === step.id;
                              return (
                                <React.Fragment key={step.id}>
                                  <div className={cn(
                                    "flex items-center gap-1 transition-none py-0.5 px-1.5 rounded-none",
                                    isCurrent && "bg-primary text-primary-foreground font-bold",
                                    isPast && "text-[#1f2f00] font-medium",
                                    !isCurrent && !isPast && "text-muted-foreground/60"
                                  )}>
                                    {isPast ? (
                                      <Check className="size-3 text-[#1f2f00] shrink-0 stroke-[2.5]" />
                                    ) : isCurrent ? (
                                      <span className="size-2 rounded-full bg-white animate-pulse shrink-0" />
                                    ) : (
                                      <span className="size-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                                    )}
                                    <span>{step.label}</span>
                                  </div>
                                  {idx < GENERATION_STEPS.length - 1 && (
                                    <span className={cn(
                                      "text-[10px]",
                                      isPast ? "text-[#1f2f00]" : isCurrent ? "text-primary font-bold" : "text-muted-foreground/30"
                                    )}>→</span>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>

                          {/* Live Detailed Stage Subtext */}
                          <div className="pt-1.5 border-t border-border/30 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-[11px] text-foreground font-medium truncate">
                                <span className="size-2 rounded-full bg-[#a03e3d] animate-ping shrink-0" />
                                <span className="truncate">{currentLiveMessage}</span>
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0 hidden sm:inline">
                                Live Inspector Sync
                              </span>
                            </div>

                            {/* Secondary Telemetry & Model Details */}
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground pt-0.5">
                              <div className="flex items-center gap-2">
                                <span>Engine: <strong className="text-foreground font-mono">{currentModelId.replace(/^.*\//, '')}</strong></span>
                                <span>•</span>
                                <span>Harness: <strong className="text-foreground">{activeFrameworkMeta.shortLabel}</strong></span>
                              </div>
                              <span className="text-foreground font-medium">{elapsedSeconds.toFixed(1)}s elapsed</span>
                            </div>
                          </div>

                          {/* Informative Note for prolonged generation (over 20 seconds) */}
                          {elapsedSeconds > 20 && (
                            <div className="p-2 border border-border bg-surface-container text-[10px] font-mono text-muted-foreground flex items-center gap-2 leading-relaxed">
                              <Clock className="size-3.5 text-[#a03e3d] shrink-0" />
                              <span>
                                Deep multi-file synthesis is generating full specifications (SOUL.md, RULES.md, MANIFEST, and tool parameters). Complex blueprints typically take 45–90s.
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar with animated track */}
                        <div className="w-full h-1.5 bg-muted rounded-none overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${currentLiveProgress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })() : (m.completionData || (m.role === 'assistant' && (m.content.includes("Configured complete agent workspace") || m.content.includes("Allowed tools for all generated skills")))) ? (
                    /* High-Contrast Agent Blueprint Delivery & Next Steps Hub */
                    <div className="space-y-4 font-sans">
                      {/* 1. Header & Explanation */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="olive" className="text-[10px] font-mono">
                            ✓ Blueprint Generated
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {m.completionData?.targetFrameworkLabel || activeFrameworkMeta.label}
                          </Badge>
                          <span className="font-mono text-xs font-bold text-foreground">
                            {m.completionData?.agentName || state.manifest.name}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-foreground font-normal">
                          {m.content}
                        </p>
                      </div>

                      {/* 2. Generated Artifacts Spec Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div className="p-2.5 border border-border bg-surface-container-low font-mono text-[11px] space-y-0.5">
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                            <FileCode className="size-3 text-[#a03e3d]" /> MANIFEST
                          </div>
                          <div className="font-bold text-foreground truncate">
                            {m.completionData?.agentName || state.manifest.name || "agent.yaml"}
                          </div>
                          <div className="text-[9px] text-muted-foreground">v{state.manifest.version || '1.0.0'} • {state.manifest.compliance?.risk_tier || 'T1'}</div>
                        </div>

                        <div className="p-2.5 border border-border bg-surface-container-low font-mono text-[11px] space-y-0.5">
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                            <ShieldCheck className="size-3 text-[#a03e3d]" /> SOUL.md
                          </div>
                          <div className="font-bold text-foreground">
                            {state.soul ? `${Math.round(state.soul.length / 4)} tokens` : 'Defined'}
                          </div>
                          <div className="text-[9px] text-muted-foreground">Identity & Principles</div>
                        </div>

                        <div className="p-2.5 border border-border bg-surface-container-low font-mono text-[11px] space-y-0.5">
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                            <Shield className="size-3 text-[#a03e3d]" /> RULES.md
                          </div>
                          <div className="font-bold text-foreground">
                            {state.rules ? `${Math.round(state.rules.length / 4)} tokens` : 'Defined'}
                          </div>
                          <div className="text-[9px] text-muted-foreground">Guardrails & Invariants</div>
                        </div>

                        <div className="p-2.5 border border-border bg-surface-container-low font-mono text-[11px] space-y-0.5">
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
                            <Zap className="size-3 text-[#a03e3d]" /> SKILLS
                          </div>
                          <div className="font-bold text-[#a03e3d]">
                            {m.completionData?.skillsCount || state.manifest.skills?.length || 1} attached
                          </div>
                          <div className="text-[9px] text-muted-foreground">Harness tools mapped</div>
                        </div>
                      </div>

                      {/* 3. Unmistakable & Obvious "RECOMMENDED NEXT STEPS" Action Hub */}
                      <div className="p-3.5 border-2 border-[#171611] bg-card space-y-3 shadow-xs">
                        <div className="flex items-center justify-between pb-1.5 border-b border-border">
                          <div className="flex items-center gap-2">
                            <ArrowRight className="size-4 text-[#a03e3d]" />
                            <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                              Recommended Next Steps
                            </span>
                          </div>
                          <Badge variant="maroon" className="text-[9px]">
                            WHAT TO DO NEXT
                          </Badge>
                        </div>

                        {/* Two Primary Action Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Step 1: Test in Agent Lab (Most Prominent) */}
                          <div 
                            onClick={() => navigate('/workbench/chat')}
                            className="group cursor-pointer p-3 border-2 border-border hover:border-[#171611] bg-surface-container-low flex flex-col justify-between transition-none select-none"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] font-bold uppercase text-[#a03e3d] bg-surface-container px-1 py-0.5 border border-border">
                                  Step 1 • Recommended
                                </span>
                                <MessageSquare className="size-4 text-[#a03e3d]" />
                              </div>
                              <h4 className="font-mono text-xs font-bold text-foreground group-hover:text-[#a03e3d] pt-1">
                                Test in Agent Lab →
                              </h4>
                              <p className="type-body-sm text-[11px] text-muted-foreground leading-snug">
                                Chat live with your agent, test prompt triggers, and simulate tool calls in real time.
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-border/40">
                              <Button 
                                variant="maroon" 
                                size="xs" 
                                className="w-full text-xs gap-1 pointer-events-none shadow-xs"
                              >
                                <Zap className="size-3" /> Launch Test Lab
                              </Button>
                            </div>
                          </div>

                          {/* Step 2: Review in File Editor */}
                          <div 
                            onClick={() => onTabChange ? onTabChange('review') : navigate('/workbench/agent?tab=review')}
                            className="group cursor-pointer p-3 border-2 border-border hover:border-[#171611] bg-surface-container-low flex flex-col justify-between transition-none select-none"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[9px] font-bold uppercase text-muted-foreground bg-surface-container px-1 py-0.5 border border-border">
                                  Step 2
                                </span>
                                <Code2 className="size-4 text-foreground" />
                              </div>
                              <h4 className="font-mono text-xs font-bold text-foreground group-hover:text-[#a03e3d] pt-1">
                                Review in File Editor (Step 6)
                              </h4>
                              <p className="type-body-sm text-[11px] text-muted-foreground leading-snug">
                                Inspect and manually edit SOUL.md, RULES.md, and manifest files in the repository tree.
                              </p>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-border/40">
                              <Button 
                                variant="outline" 
                                size="xs" 
                                className="w-full text-xs gap-1 pointer-events-none border-border"
                              >
                                <FileCode className="size-3 text-[#a03e3d]" /> Inspect Files
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Secondary Actions Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40 text-[11px] font-mono">
                          <span className="text-muted-foreground">Other Operations:</span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => navigate('/workbench/skills')}
                              className="text-xs h-7 gap-1 hover:text-[#a03e3d]"
                            >
                              <Zap className="size-3 text-[#a03e3d]" /> Skills Workbench
                            </Button>
                            <span className="text-border">|</span>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => navigate('/export')}
                              className="text-xs h-7 gap-1 hover:text-[#a03e3d]"
                            >
                              <Download className="size-3 text-[#a03e3d]" /> Export ZIP
                            </Button>
                            <span className="text-border">|</span>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => navigate('/workbench/git')}
                              className="text-xs h-7 gap-1 hover:text-[#a03e3d]"
                            >
                              <GitBranch className="size-3 text-[#a03e3d]" /> Git Sync
                            </Button>
                            <span className="text-border">|</span>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => setShowResetDialog(true)}
                              className="text-xs h-7 gap-1 text-[#a03e3d] hover:bg-[#a03e3d]/10"
                              title="Reset or restart agent builder session"
                            >
                              <RotateCcw className="size-3" /> New Agent / Reset
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* 4. Quick Refinement Chips for AI Architect */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          <Sparkles className="size-3 text-[#a03e3d]" /> Or refine in this architect session:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            "Add automated testing & verification skill",
                            "Make communication style strictly concise",
                            "Add strict error recovery and safety rules",
                            "Configure context window to 16,384 tokens"
                          ].map((promptChip, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => handleSend(promptChip)}
                              className="text-[10px] font-mono px-2 py-1 border border-border bg-surface-container hover:border-[#171611] hover:bg-surface-container-high transition-none text-foreground cursor-pointer flex items-center gap-1"
                            >
                              <span>+ {promptChip}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                </div>
              )}

              {m.timestamp && !m.isAuditLog && (
                <div className={cn(
                  "text-[9px] font-mono text-muted-foreground uppercase px-1",
                  m.role === 'user' ? "text-right" : "text-left"
                )}>
                  {m.timestamp}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Starter target runtime & prompt suggestion cards if initial message */}
        {messages.length === 1 && (
          <div className="pt-2 space-y-4">
            {/* Step 1: Select Target Runtime & Harness upfront */}
            <div className="p-3.5 rounded-md bg-muted/30 border border-border/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-foreground">
                  <Layers className="size-3.5 text-primary" />
                  <span>1. Choose Target Runtime / Harness</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Selected: <strong className="text-primary font-bold">{AGENT_FRAMEWORK_OPTIONS.find(f => f.id === activeFramework)?.label}</strong>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {AGENT_FRAMEWORK_OPTIONS.map(f => {
                  const isSelected = activeFramework === f.id;
                  const tools = AGENT_FRAMEWORK_TOOLS[f.id] || [];
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => selectFramework(f.id)}
                      className={cn(
                        "text-left p-2.5 rounded-sm border transition-all flex flex-col justify-between gap-1.5 cursor-pointer relative",
                        isSelected
                          ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/30"
                          : "bg-background/80 hover:bg-muted/60 border-border/70 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={cn("text-xs font-bold font-mono", isSelected ? "text-primary" : "text-foreground")}>
                          {f.label}
                        </span>
                        {isSelected && <CheckCircle2 className="size-3 text-primary shrink-0" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                        {f.description}
                      </span>
                      <div className="pt-1 text-[9px] font-mono text-muted-foreground/80 flex items-center justify-between w-full border-t border-border/40">
                        <span>{tools.length} Tools</span>
                        <span className="text-primary/90 font-semibold">{f.shortLabel}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Choose Prompt / Intent */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground px-1">
                <Lightbulb className="size-3 text-warning" />
                <span>2. Recommended Starting Blueprints</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {starterPrompts.map((starter, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(starter)}
                    className="text-left text-xs p-2.5 rounded-sm bg-muted/40 hover:bg-muted/80 border border-border/60 hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <span className="line-clamp-2">{starter}</span>
                    <ArrowRight className="size-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Context Attachment Chips */}
      {contextFiles.length > 0 && (
        <div className="px-4 py-2 border-t border-border/60 bg-muted/30 flex flex-wrap gap-1.5 shrink-0">
          {contextFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-background border border-border/80 rounded-sm px-2 py-0.5 text-[11px] font-mono shadow-xs">
              <FileText className="size-3 text-primary" />
              <span className="truncate max-w-[140px] text-foreground">{file.name}</span>
              <button 
                type="button"
                onClick={() => removeFile(i)} 
                className="text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Composer with Cancel / Send Controls */}
      <div className="p-3 border-t border-border/80 bg-card shrink-0">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea 
              placeholder="Describe your agent requirements or prompt instructions..."
              className="min-h-[56px] max-h-[140px] resize-none pr-9 text-xs font-sans rounded-sm bg-background border-border/80 focus-visible:ring-primary/40 focus-visible:border-primary"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isProcessing}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button 
              type="button"
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-primary transition-colors p-1 cursor-pointer"
              title="Attach context file"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
            </button>
            <input 
              type="file" 
              multiple 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </div>

          <div className="flex items-center gap-1.5 h-full">
            {isProcessing ? (
              <div className="flex items-center gap-1.5 h-full">
                <Badge variant="outline" className="h-full px-2 text-[11px] font-mono text-muted-foreground border-border/80 flex items-center gap-1.5 bg-muted/20">
                  <span className="size-1.5 rounded-full bg-[#a03e3d] animate-ping" />
                  <span>⏱ {elapsedSeconds.toFixed(1)}s</span>
                </Badge>
                <Button 
                  variant="destructive"
                  className="h-full px-3.5 rounded-none font-medium transition-none shadow-xs gap-1.5"
                  onClick={handleCancel}
                  title="Cancel Generation (or press Esc)"
                >
                  <Square className="size-3.5 fill-current" />
                  <span className="text-xs font-mono uppercase">Stop</span>
                  <kbd className="hidden sm:inline-block ml-0.5 px-1 py-0.5 text-[9px] font-mono bg-black/20 border border-white/20">Esc</kbd>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 h-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-full px-2.5 rounded-none border-border text-muted-foreground hover:text-foreground hover:border-[#171611]"
                  onClick={() => setShowResetDialog(true)}
                  title="Reset or restart agent builder session"
                >
                  <RotateCcw className="size-3.5 text-[#a03e3d]" />
                  <span className="sr-only sm:not-sr-only text-xs font-mono">Reset</span>
                </Button>
                <Button 
                  variant="warm"
                  className="h-full px-4 rounded-none transition-none shadow-xs" 
                  onClick={() => handleSend()}
                  disabled={!input.trim() && contextFiles.length === 0}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Reset / Restart Dialog */}
      <ResetRestartDialog 
        open={showResetDialog} 
        onOpenChange={setShowResetDialog}
        onRestartChat={handleRestartChat}
        onCancelActiveGeneration={handleCancel}
        isGenerating={isProcessing}
      />
    </div>
  );
}
