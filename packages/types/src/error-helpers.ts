/**
 * PayOS Error Helper Functions
 * 
 * Utility functions for working with error codes and metadata.
 * 
 * @module types/error-helpers
 */

import { ErrorCode, ErrorCategory, ErrorMetadata, ERROR_METADATA, ERROR_CATEGORIES } from './errors.js';
import type { ApiError, RetryGuidance } from './api-responses.js';

// ============================================
// METADATA HELPERS
// ============================================

/**
 * Get metadata for an error code
 */
export function getErrorMetadata(code: ErrorCode): ErrorMetadata {
  const metadata = ERROR_METADATA[code];
  if (!metadata) {
    throw new Error(`No metadata found for error code: ${code}`);
  }
  return metadata;
}

/**
 * Get all error codes in a category
 */
export function getErrorsByCategory(category: ErrorCategory): ErrorCode[] {
  return Object.entries(ERROR_CATEGORIES)
    .filter(([_, cat]) => cat === category)
    .map(([code]) => code as ErrorCode);
}

/**
 * Get HTTP status code for an error
 */
export function getHttpStatus(code: ErrorCode): number {
  return getErrorMetadata(code).httpStatus;
}

/**
 * Get error category for a code
 */
export function getErrorCategory(code: ErrorCode): ErrorCategory {
  return ERROR_CATEGORIES[code];
}

/**
 * Get documentation URL for an error
 */
export function getDocumentationUrl(code: ErrorCode): string {
  return getErrorMetadata(code).docsUrl;
}

// ============================================
// RETRYABILITY HELPERS
// ============================================

/**
 * Check if an error is retryable
 */
export function isRetryable(code: ErrorCode): boolean {
  return getErrorMetadata(code).retryable;
}

/**
 * Check if an error requires an action before retry
 */
export function requiresActionBeforeRetry(code: ErrorCode): boolean {
  const metadata = getErrorMetadata(code);
  return metadata.retryable && !!metadata.retryAfterAction;
}

/**
 * Get the action required before retry
 */
export function getRetryAfterAction(code: ErrorCode): string | undefined {
  return getErrorMetadata(code).retryAfterAction;
}

/**
 * Create retry guidance for an error
 */
export function createRetryGuidance(
  code: ErrorCode,
  options?: {
    retryAfterSeconds?: number;
    maxRetries?: number;
    backoffStrategy?: 'linear' | 'exponential' | 'fixed';
  }
): RetryGuidance {
  const metadata = getErrorMetadata(code);

  return {
    retryable: metadata.retryable,
    retry_after_seconds: options?.retryAfterSeconds,
    retry_after_action: metadata.retryAfterAction,
    max_retries: options?.maxRetries,
    backoff_strategy: options?.backoffStrategy || 'exponential',
  };
}

// ============================================
// ERROR CREATION HELPERS
// ============================================

/**
 * Create a complete API error object
 */
export function createApiError(
  code: ErrorCode,
  options?: {
    details?: Record<string, unknown>;
    message?: string;
    retryAfterSeconds?: number;
    maxRetries?: number;
    includeSuggestions?: boolean;
    includeDocUrl?: boolean;
  }
): ApiError {
  const metadata = getErrorMetadata(code);

  const error: ApiError = {
    code,
    category: metadata.category,
    message: options?.message || metadata.message,
  };

  // Add details if provided
  if (options?.details) {
    error.details = options.details;
  }

  // Add retry guidance if retryable
  if (metadata.retryable) {
    error.retry = createRetryGuidance(code, {
      retryAfterSeconds: options?.retryAfterSeconds,
      maxRetries: options?.maxRetries,
    });
  }

  // Add documentation URL if requested
  if (options?.includeDocUrl !== false) {
    error.documentation_url = metadata.docsUrl;
  }

  return error;
}

// ============================================
// CATEGORY HELPERS
// ============================================

/**
 * Check if an error is in a specific category
 */
export function isErrorInCategory(code: ErrorCode, category: ErrorCategory): boolean {
  return getErrorCategory(code) === category;
}

/**
 * Check if an error is a balance error
 */
export function isBalanceError(code: ErrorCode): boolean {
  return isErrorInCategory(code, ErrorCategory.BALANCE);
}

/**
 * Check if an error is a validation error
 */
export function isValidationError(code: ErrorCode): boolean {
  return isErrorInCategory(code, ErrorCategory.VALIDATION);
}

/**
 * Check if an error is a limit error
 */
export function isLimitError(code: ErrorCode): boolean {
  return isErrorInCategory(code, ErrorCategory.LIMITS);
}

/**
 * Check if an error is a compliance error
 */
export function isComplianceError(code: ErrorCode): boolean {
  return isErrorInCategory(code, ErrorCategory.COMPLIANCE);
}

/**
 * Check if an error is a technical error
 */
export function isTechnicalError(code: ErrorCode): boolean {
  return isErrorInCategory(code, ErrorCategory.TECHNICAL);
}

/**
 * Check if an error is a workflow error
 */
export function isWorkflowError(code: ErrorCode): boolean {
  return isErrorInCategory(code, ErrorCategory.WORKFLOW);
}

/**
 * Check if an error is an auth error
 */
export function isAuthError(code: ErrorCode): boolean {
  return isErrorInCategory(code, ErrorCategory.AUTH);
}

/**
 * Check if an error is a resource error (404)
 */
export function isResourceError(code: ErrorCode): boolean {
  return isErrorInCategory(code, ErrorCategory.RESOURCE);
}

/**
 * Check if an error is a state error
 */
export function isStateError(code: ErrorCode): boolean {
  return isErrorInCategory(code, ErrorCategory.STATE);
}

/**
 * Check if an error is a protocol error
 */
export function isProtocolError(code: ErrorCode): boolean {
  return isErrorInCategory(code, ErrorCategory.PROTOCOL);
}

// ============================================
// STATISTICS HELPERS
// ============================================

/**
 * Get count of all error codes
 */
export function getErrorCodeCount(): number {
  return Object.keys(ErrorCode).length;
}

/**
 * Get count of errors in each category
 */
export function getErrorCountByCategory(): Record<ErrorCategory, number> {
  const counts: Record<ErrorCategory, number> = {
    [ErrorCategory.BALANCE]: 0,
    [ErrorCategory.VALIDATION]: 0,
    [ErrorCategory.LIMITS]: 0,
    [ErrorCategory.COMPLIANCE]: 0,
    [ErrorCategory.TECHNICAL]: 0,
    [ErrorCategory.WORKFLOW]: 0,
    [ErrorCategory.AUTH]: 0,
    [ErrorCategory.RESOURCE]: 0,
    [ErrorCategory.STATE]: 0,
    [ErrorCategory.PROTOCOL]: 0,
  };

  Object.values(ErrorCode).forEach((code) => {
    const category = getErrorCategory(code as ErrorCode);
    counts[category]++;
  });

  return counts;
}

/**
 * Get count of retryable vs non-retryable errors
 */
export function getRetryableErrorStats(): {
  retryable: number;
  nonRetryable: number;
  total: number;
  retryablePercentage: number;
} {
  let retryable = 0;
  let nonRetryable = 0;

  Object.values(ErrorCode).forEach((code) => {
    if (isRetryable(code as ErrorCode)) {
      retryable++;
    } else {
      nonRetryable++;
    }
  });

  const total = retryable + nonRetryable;

  return {
    retryable,
    nonRetryable,
    total,
    retryablePercentage: (retryable / total) * 100,
  };
}

/**
 * Get all error codes with their HTTP status
 */
export function getErrorsByHttpStatus(): Map<number, ErrorCode[]> {
  const byStatus = new Map<number, ErrorCode[]>();

  Object.values(ErrorCode).forEach((code) => {
    const status = getHttpStatus(code as ErrorCode);
    const existing = byStatus.get(status) || [];
    existing.push(code as ErrorCode);
    byStatus.set(status, existing);
  });

  return byStatus;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Check if a string is a valid error code
 */
export function isValidErrorCode(code: string): code is ErrorCode {
  return code in ErrorCode;
}

/**
 * Parse a string to an error code (throws if invalid)
 */
export function parseErrorCode(code: string): ErrorCode {
  if (!isValidErrorCode(code)) {
    throw new Error(`Invalid error code: ${code}`);
  }
  return code as ErrorCode;
}

/**
 * Safely parse a string to an error code
 */
export function tryParseErrorCode(code: string): ErrorCode | null {
  return isValidErrorCode(code) ? (code as ErrorCode) : null;
}

/**
 * Check if all required error metadata fields are present
 */
export function validateErrorMetadata(code: ErrorCode): {
  valid: boolean;
  missing: string[];
} {
  const metadata = getErrorMetadata(code);
  const missing: string[] = [];

  // Check required fields
  if (!metadata.message) missing.push('message');
  if (!metadata.description) missing.push('description');
  if (!metadata.httpStatus) missing.push('httpStatus');
  if (!metadata.category) missing.push('category');
  if (metadata.retryable === undefined) missing.push('retryable');
  if (!metadata.detailFields) missing.push('detailFields');
  if (!metadata.resolutionSteps || metadata.resolutionSteps.length === 0) {
    missing.push('resolutionSteps');
  }
  if (!metadata.docsUrl) missing.push('docsUrl');

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validate all error metadata
 */
export function validateAllErrorMetadata(): {
  valid: boolean;
  errors: Array<{ code: ErrorCode; missing: string[] }>;
} {
  const errors: Array<{ code: ErrorCode; missing: string[] }> = [];

  Object.values(ErrorCode).forEach((code) => {
    const validation = validateErrorMetadata(code as ErrorCode);
    if (!validation.valid) {
      errors.push({
        code: code as ErrorCode,
        missing: validation.missing,
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// SEARCH HELPERS
// ============================================

/**
 * Search error codes by message or description
 */
export function searchErrors(query: string): ErrorCode[] {
  const lowercaseQuery = query.toLowerCase();
  const results: ErrorCode[] = [];

  Object.values(ErrorCode).forEach((code) => {
    const metadata = getErrorMetadata(code as ErrorCode);
    if (
      metadata.message.toLowerCase().includes(lowercaseQuery) ||
      metadata.description.toLowerCase().includes(lowercaseQuery) ||
      code.toLowerCase().includes(lowercaseQuery)
    ) {
      results.push(code as ErrorCode);
    }
  });

  return results;
}

/**
 * Get errors by HTTP status code
 */
export function getErrorsByStatus(status: number): ErrorCode[] {
  return Object.values(ErrorCode).filter((code) => getHttpStatus(code as ErrorCode) === status) as ErrorCode[];
}

// ============================================
// FORMATTING HELPERS
// ============================================

/**
 * Format error code as human-readable string
 */
export function formatErrorCode(code: ErrorCode): string {
  return code
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get a short summary of an error
 */
export function getErrorSummary(code: ErrorCode): string {
  const metadata = getErrorMetadata(code);
  return `[${code}] ${metadata.message}`;
}

/**
 * Get a detailed description of an error
 */
export function getErrorDescription(code: ErrorCode): string {
  const metadata = getErrorMetadata(code);
  return `
${formatErrorCode(code)} (${code})

${metadata.description}

Category: ${metadata.category}
HTTP Status: ${metadata.httpStatus}
Retryable: ${metadata.retryable ? 'Yes' : 'No'}
${metadata.retryAfterAction ? `Retry After: ${metadata.retryAfterAction}` : ''}

Resolution Steps:
${metadata.resolutionSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

Documentation: ${metadata.docsUrl}
  `.trim();
}

// ============================================
// COMPARISON HELPERS
// ============================================

/**
 * Check if two errors are in the same category
 */
export function areErrorsRelated(code1: ErrorCode, code2: ErrorCode): boolean {
  return getErrorCategory(code1) === getErrorCategory(code2);
}

/**
 * Get similar errors (same category)
 */
export function getSimilarErrors(code: ErrorCode): ErrorCode[] {
  const category = getErrorCategory(code);
  return getErrorsByCategory(category).filter((c) => c !== code);
}

// ============================================
// EXPORT SUMMARY INFORMATION
// ============================================

/**
 * Get a summary of the error taxonomy
 */
export function getErrorTaxonomySummary(): {
  totalErrors: number;
  categoryCounts: Record<ErrorCategory, number>;
  retryableStats: ReturnType<typeof getRetryableErrorStats>;
  statusCodes: number[];
  categories: ErrorCategory[];
} {
  return {
    totalErrors: getErrorCodeCount(),
    categoryCounts: getErrorCountByCategory(),
    retryableStats: getRetryableErrorStats(),
    statusCodes: Array.from(new Set(Object.values(ErrorCode).map((code) => getHttpStatus(code as ErrorCode)))).sort(
      (a, b) => a - b
    ),
    categories: Object.values(ErrorCategory),
  };
}



