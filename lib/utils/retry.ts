export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelay: number = 1000,
  factor: number = 2
): Promise<T> {
  let attempt = 0;
  let lastError: any;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      lastError = error;
      
      // Check if it's a rate limit error or something retryable
      const isRateLimit = error.message?.toLowerCase().includes('rate limit') || 
                          error.message?.toLowerCase().includes('429') ||
                          error.message?.toLowerCase().includes('temporarily rate-limited');
      
      if (!isRateLimit && attempt < maxAttempts) {
        // If it's not a rate limit, we might still want to retry on network errors etc.
        // But for now let's follow the prompt's focus on rate limiting.
      }

      if (attempt >= maxAttempts) {
        break;
      }

      const delay = initialDelay * Math.pow(factor, attempt - 1);
      console.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  const errorMessage = `Failed after ${maxAttempts} attempts. Last error: ${lastError?.message || 'Unknown error'}`;
  throw new Error(errorMessage);
}
