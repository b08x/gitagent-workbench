import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats raw error objects, JSON strings, and HTTP exceptions into clean, human-readable strings.
 */
export function formatErrorMessage(rawError: any): string {
  if (!rawError) return "An unexpected error occurred.";

  let msg = typeof rawError === "string" ? rawError : rawError.message || JSON.stringify(rawError);

  // If the message starts with "Error: ", trim it
  if (msg.startsWith("Error: ")) {
    msg = msg.slice(7).trim();
  }

  // Try parsing JSON if the message is a stringified JSON error
  if (msg.startsWith("{") && msg.endsWith("}")) {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.error) {
        if (typeof parsed.error === "string") {
          msg = parsed.error;
        } else if (parsed.error.message) {
          msg = parsed.error.message;
        }
      } else if (parsed.message) {
        msg = parsed.message;
      }
    } catch {
      // Keep original msg if parse fails
    }
  }

  // Common pattern replacements for friendly display
  if (msg.includes("API_KEY_INVALID") || msg.toLowerCase().includes("api key not valid")) {
    return "Invalid API key provided for the model provider. Please verify your API key in Settings or switch to a provider with a valid key.";
  }

  if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate limit")) {
    return "API rate limit or quota exceeded. Please wait a moment or switch to an alternate provider in Settings.";
  }

  if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
    return "Authentication failed for model provider. Please check your API key in Settings.";
  }

  if (msg.includes("specification version")) {
    return "Model protocol compatibility error. The request has been re-routed through the native model engine.";
  }

  return msg;
}
