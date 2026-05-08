/**
 * Sanitizes input text to prevent simple prompt injection attacks 
 * and strips common jailbreak patterns.
 */
export function sanitizePromptContent(content: string): string {
  if (!content) return '';
  
  // 1. Strip suspicious markdown/instruction headers that try to reset context
  let sanitized = content.replace(/(?:\r?\n|^)\s*(?:system|user|assistant|instruction|ignore all|you are now)\s*[:=]\s*/gi, '[INVALID_HEADER]');
  
  // 2. Limit content length to prevent DOS/extreme token usage
  const MAX_FILE_CHAR_LIMIT = 50000;
  if (sanitized.length > MAX_FILE_CHAR_LIMIT) {
    sanitized = sanitized.slice(0, MAX_FILE_CHAR_LIMIT) + '\n... [CONTENT_TRUNCATED_FOR_SAFETY]';
  }

  // 3. Simple jailbreak pattern removal (e.g. "Ignore previous instructions")
  const jailbreakPatterns = [
    /ignore all previous instructions/gi,
    /forget everything you were told/gi,
    /disregard the rules/gi,
    /start acting as/gi,
    /DAN mode/gi
  ];

  jailbreakPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED_INSTRUCTION]');
  });

  return sanitized;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
}
