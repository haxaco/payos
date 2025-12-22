/**
 * PayOS API Error
 */
export class PayOSError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly retryAfter?: number; // Seconds to wait before retrying (for 429 errors)

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'PayOSError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
  }

  static fromResponse(
    response: { error: string; code?: string; details?: unknown }, 
    status: number,
    headers?: Headers
  ) {
    // Extract Retry-After header for 429 errors
    let retryAfter: number | undefined;
    if (status === 429 && headers) {
      const retryAfterHeader = headers.get('Retry-After');
      if (retryAfterHeader) {
        // Retry-After can be seconds (number) or HTTP date
        const parsed = parseInt(retryAfterHeader, 10);
        if (!isNaN(parsed)) {
          retryAfter = parsed;
        }
      }
    }

    return new PayOSError(response.error, status, response.code, response.details, retryAfter);
  }

  /**
   * Check if this is a rate limit error
   */
  isRateLimitError(): boolean {
    return this.status === 429;
  }
}

export function isPayOSError(error: unknown): error is PayOSError {
  return error instanceof PayOSError;
}

