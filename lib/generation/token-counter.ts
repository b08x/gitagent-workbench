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
 * Slices text to stay within a token limit.
 */
export function truncateToLimit(text: string, limit: number): string {
  if (!text) return '';
  try {
    const tokens = enc.encode(text);
    if (tokens.length <= limit) return text;
    const truncated = tokens.slice(0, limit);
    return enc.decode(truncated);
  } catch (err) {
    console.error('Truncation failed:', err);
    return text.slice(0, limit * 3); // Very rough fallback
  }
}

/**
 * Checks if a prompt exceeds a conservative limit and throws if it does.
 */
export function validateContextLength(text: string, limit = 100000): { tokens: number; exceeds: boolean } {
  const tokens = countTokens(text);
  return {
    tokens,
    exceeds: tokens > limit
  };
}
