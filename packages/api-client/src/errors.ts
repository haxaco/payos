/**
 * PayOS API Error
 */
export class PayOSError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'PayOSError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static fromResponse(response: { error: string; code?: string; details?: unknown }, status: number) {
    return new PayOSError(response.error, status, response.code, response.details);
  }
}

export function isPayOSError(error: unknown): error is PayOSError {
  return error instanceof PayOSError;
}

