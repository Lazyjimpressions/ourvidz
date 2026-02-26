/**
 * Maps known generation error codes/details to user-friendly messages.
 */

const ERROR_MAP: Record<string, string> = {
  content_policy_violation:
    'This prompt was flagged by the model\'s content filter. Try adjusting appearance tags or switching to a Flux model.',
  rate_limit:
    'Too many requests. Please wait a moment and try again.',
  '429':
    'Too many requests. Please wait a moment and try again.',
  timeout:
    'Generation timed out. Try again or use a faster model.',
  '504':
    'Generation timed out. Try again or use a faster model.',
  invalid_input:
    'Invalid generation settings. Try different options.',
  '422':
    'Invalid generation settings. Try different options.',
};

const FALLBACK_MESSAGE = 'Generation failed. Please try again or switch models.';

/**
 * Resolve a user-friendly error description from a raw error details string.
 * Checks for exact key match first, then substring match.
 */
export function mapGenerationError(details?: string | null): string {
  if (!details) return FALLBACK_MESSAGE;

  const lower = details.toLowerCase();

  // Exact key match
  if (ERROR_MAP[lower]) return ERROR_MAP[lower];

  // Substring match for known patterns
  for (const [key, message] of Object.entries(ERROR_MAP)) {
    if (lower.includes(key)) return message;
  }

  return FALLBACK_MESSAGE;
}

/**
 * Extract the most specific error detail from a Supabase edge function response.
 * Returns the `details` field if present, otherwise the `error` message.
 */
export function extractErrorDetails(
  data: Record<string, unknown> | null | undefined,
  error: { message?: string } | null | undefined
): string | null {
  // Prefer structured details from response body
  if (data?.details && typeof data.details === 'string') return data.details;
  if (data?.error && typeof data.error === 'string') return data.error;
  // Fall back to the SDK error
  if (error?.message) return error.message;
  return null;
}
