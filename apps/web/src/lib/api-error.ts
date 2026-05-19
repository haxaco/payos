/**
 * Extract the most useful, user-facing message from an API/client error.
 *
 * The api-client throws SlyError, whose `.message` already carries the API's
 * specific message (e.g. "Mandate amount $500 exceeds KYA tier 1
 * per-transaction limit of $100"). Forms historically swallowed this with a
 * generic "Failed to create X" toast — this helper surfaces the real reason
 * (plus any `details.message`) while still degrading gracefully for unknown
 * error shapes.
 */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (!err) return fallback;

  // SlyError / Error: .message is the resolved API message.
  const anyErr = err as {
    message?: unknown;
    details?: unknown;
    error?: unknown;
  };

  // Prefer a nested details.message when it's more specific than .message.
  const details = anyErr.details as { message?: unknown } | undefined;
  const detailMsg =
    details && typeof details.message === 'string' && details.message.trim()
      ? details.message.trim()
      : undefined;

  const baseMsg =
    typeof anyErr.message === 'string' && anyErr.message.trim() && anyErr.message !== 'Unknown error'
      ? anyErr.message.trim()
      : undefined;

  // Some endpoints return { error: "..." } directly on the thrown object.
  const rawError =
    typeof anyErr.error === 'string' && anyErr.error.trim() ? anyErr.error.trim() : undefined;

  const resolved = baseMsg || rawError || detailMsg;
  if (!resolved) return fallback;

  // If both exist and the detail adds info beyond the base, append it.
  if (detailMsg && baseMsg && detailMsg !== baseMsg && !baseMsg.includes(detailMsg)) {
    return `${baseMsg} — ${detailMsg}`;
  }
  return resolved;
}
