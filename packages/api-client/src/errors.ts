/**
 * Sly API Error
 */
export class SlyError extends Error {
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
    this.name = 'SlyError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
  }

  static fromResponse(
    response: { 
      error: string | { message?: string; code?: string; details?: unknown; [key: string]: unknown }; 
      code?: string; 
      details?: unknown 
    }, 
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

    // Handle structured error response (Epic 30 format)
    // { success: false, error: { code, message, details, ... } }
    if (typeof response.error === 'object' && response.error !== null) {
      const errorObj = response.error;
      const message = errorObj.message || 'Unknown error';
      const code = errorObj.code || response.code;
      const details = errorObj.details || response.details;
      return new SlyError(message, status, code, details, retryAfter);
    }

    // Handle simple error response (legacy format)
    // { error: "message", code: "CODE" }
    return new SlyError(response.error || 'Unknown error', status, response.code, response.details, retryAfter);
  }

  /**
   * Check if this is a rate limit error
   */
  isRateLimitError(): boolean {
    return this.status === 429;
  }
}

export function isSlyError(error: unknown): error is SlyError {
  return error instanceof SlyError;
}

// Backward compatibility aliases
export { SlyError as PayOSError };
export { isSlyError as isPayOSError };

