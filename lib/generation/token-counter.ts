import { getEncoding } from 'js-tiktoken';

const enc = getEncoding('cl100k_base');

/**
 * Counts tokens in a string using tiktoken (cl100k_base encoding).
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  try {
    return enc.encode(text).length;
  } catch (err) {
    console.error('Token calculation failed:', err);
    // Fallback to rough approximation
    return Math.ceil(text.length / 4);
  }
}

/**
 * Checks if a prompt exceeds a conservative limit and throws if it does.
 */
export function validateContextLength(text: string, limit = 100000) {
  const tokens = countTokens(text);
  if (tokens > limit) {
    throw new Error(`Context length exceeded: ${tokens} tokens (limit: ${limit}). Please reduce the size of your context files.`);
  }
  return tokens;
}
