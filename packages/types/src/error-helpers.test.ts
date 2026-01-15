/**
 * Unit tests for error helper functions
 */

import { describe, it, expect } from 'vitest';
import { ErrorCode, ErrorCategory } from './errors.js';
import {
  getErrorMetadata,
  getErrorsByCategory,
  getHttpStatus,
  getErrorCategory,
  getDocumentationUrl,
  isRetryable,
  requiresActionBeforeRetry,
  getRetryAfterAction,
  createRetryGuidance,
  createApiError,
  isErrorInCategory,
  isBalanceError,
  isValidationError,
  isLimitError,
  isComplianceError,
  isTechnicalError,
  isWorkflowError,
  isAuthError,
  isResourceError,
  isStateError,
  isProtocolError,
  getErrorCodeCount,
  getErrorCountByCategory,
  getRetryableErrorStats,
  getErrorsByHttpStatus,
  isValidErrorCode,
  parseErrorCode,
  tryParseErrorCode,
  validateErrorMetadata,
  validateAllErrorMetadata,
  searchErrors,
  getErrorsByStatus,
  formatErrorCode,
  getErrorSummary,
  getErrorDescription,
  areErrorsRelated,
  getSimilarErrors,
  getErrorTaxonomySummary,
} from './error-helpers.js';

describe('Error Helper Functions', () => {
  describe('Metadata Helpers', () => {
    it('should get metadata for any error code', () => {
      const metadata = getErrorMetadata(ErrorCode.INSUFFICIENT_BALANCE);
      expect(metadata).toBeDefined();
      expect(metadata.message).toBeTruthy();
      expect(metadata.category).toBe(ErrorCategory.BALANCE);
    });

    it('should throw for invalid error code', () => {
      expect(() => getErrorMetadata('INVALID_CODE' as ErrorCode)).toThrow();
    });

    it('should get errors by category', () => {
      const balanceErrors = getErrorsByCategory(ErrorCategory.BALANCE);
      expect(balanceErrors.length).toBeGreaterThan(0);
      balanceErrors.forEach((code) => {
        expect(getErrorCategory(code)).toBe(ErrorCategory.BALANCE);
      });
    });

    it('should get HTTP status for error code', () => {
      expect(getHttpStatus(ErrorCode.INSUFFICIENT_BALANCE)).toBe(400);
      expect(getHttpStatus(ErrorCode.ACCOUNT_NOT_FOUND)).toBe(404);
      expect(getHttpStatus(ErrorCode.RATE_LIMITED)).toBe(429);
    });

    it('should get error category', () => {
      expect(getErrorCategory(ErrorCode.INSUFFICIENT_BALANCE)).toBe(ErrorCategory.BALANCE);
      expect(getErrorCategory(ErrorCode.INVALID_AMOUNT)).toBe(ErrorCategory.VALIDATION);
      expect(getErrorCategory(ErrorCode.RATE_LIMITED)).toBe(ErrorCategory.LIMITS);
    });

    it('should get documentation URL', () => {
      const url = getDocumentationUrl(ErrorCode.INSUFFICIENT_BALANCE);
      expect(url).toMatch(/^https:\/\/docs\.payos\.com\/errors\//);
      expect(url).toContain('INSUFFICIENT_BALANCE');
    });
  });

  describe('Retryability Helpers', () => {
    it('should correctly identify retryable errors', () => {
      expect(isRetryable(ErrorCode.INSUFFICIENT_BALANCE)).toBe(true);
      expect(isRetryable(ErrorCode.RATE_LIMITED)).toBe(true);
      expect(isRetryable(ErrorCode.ACCOUNT_NOT_FOUND)).toBe(false);
      expect(isRetryable(ErrorCode.INVALID_AMOUNT)).toBe(false);
    });

    it('should identify errors requiring action before retry', () => {
      expect(requiresActionBeforeRetry(ErrorCode.INSUFFICIENT_BALANCE)).toBe(true);
      expect(requiresActionBeforeRetry(ErrorCode.ACCOUNT_NOT_FOUND)).toBe(false);
    });

    it('should get retry after action', () => {
      expect(getRetryAfterAction(ErrorCode.INSUFFICIENT_BALANCE)).toBe('top_up_account');
      expect(getRetryAfterAction(ErrorCode.RATE_LIMITED)).toBe('wait');
      expect(getRetryAfterAction(ErrorCode.ACCOUNT_NOT_FOUND)).toBeUndefined();
    });

    it('should create retry guidance', () => {
      const guidance = createRetryGuidance(ErrorCode.INSUFFICIENT_BALANCE, {
        retryAfterSeconds: 60,
        maxRetries: 3,
      });

      expect(guidance.retryable).toBe(true);
      expect(guidance.retry_after_seconds).toBe(60);
      expect(guidance.retry_after_action).toBe('top_up_account');
      expect(guidance.max_retries).toBe(3);
    });

    it('should create retry guidance with default backoff', () => {
      const guidance = createRetryGuidance(ErrorCode.RATE_LIMITED);
      expect(guidance.backoff_strategy).toBe('exponential');
    });
  });

  describe('Error Creation Helpers', () => {
    it('should create complete API error', () => {
      const error = createApiError(ErrorCode.INSUFFICIENT_BALANCE, {
        details: {
          required_amount: '100.00',
          available_amount: '50.00',
          shortfall: '50.00',
        },
      });

      expect(error.code).toBe(ErrorCode.INSUFFICIENT_BALANCE);
      expect(error.category).toBe(ErrorCategory.BALANCE);
      expect(error.message).toBeTruthy();
      expect(error.details).toBeDefined();
      expect(error.retry).toBeDefined();
      expect(error.documentation_url).toBeDefined();
    });

    it('should create error without details', () => {
      const error = createApiError(ErrorCode.ACCOUNT_NOT_FOUND);

      expect(error.code).toBe(ErrorCode.ACCOUNT_NOT_FOUND);
      expect(error.details).toBeUndefined();
      expect(error.retry).toBeUndefined(); // Not retryable
    });

    it('should allow custom message', () => {
      const customMessage = 'Custom error message';
      const error = createApiError(ErrorCode.INSUFFICIENT_BALANCE, {
        message: customMessage,
      });

      expect(error.message).toBe(customMessage);
    });
  });

  describe('Category Check Helpers', () => {
    it('should check if error is in category', () => {
      expect(isErrorInCategory(ErrorCode.INSUFFICIENT_BALANCE, ErrorCategory.BALANCE)).toBe(true);
      expect(isErrorInCategory(ErrorCode.INSUFFICIENT_BALANCE, ErrorCategory.VALIDATION)).toBe(false);
    });

    it('should identify balance errors', () => {
      expect(isBalanceError(ErrorCode.INSUFFICIENT_BALANCE)).toBe(true);
      expect(isBalanceError(ErrorCode.INVALID_AMOUNT)).toBe(false);
    });

    it('should identify validation errors', () => {
      expect(isValidationError(ErrorCode.INVALID_AMOUNT)).toBe(true);
      expect(isValidationError(ErrorCode.INSUFFICIENT_BALANCE)).toBe(false);
    });

    it('should identify limit errors', () => {
      expect(isLimitError(ErrorCode.RATE_LIMITED)).toBe(true);
      expect(isLimitError(ErrorCode.INVALID_AMOUNT)).toBe(false);
    });

    it('should identify compliance errors', () => {
      expect(isComplianceError(ErrorCode.KYC_REQUIRED)).toBe(true);
      expect(isComplianceError(ErrorCode.INVALID_AMOUNT)).toBe(false);
    });

    it('should identify technical errors', () => {
      expect(isTechnicalError(ErrorCode.SERVICE_UNAVAILABLE)).toBe(true);
      expect(isTechnicalError(ErrorCode.INVALID_AMOUNT)).toBe(false);
    });

    it('should identify workflow errors', () => {
      expect(isWorkflowError(ErrorCode.APPROVAL_REQUIRED)).toBe(true);
      expect(isWorkflowError(ErrorCode.INVALID_AMOUNT)).toBe(false);
    });

    it('should identify auth errors', () => {
      expect(isAuthError(ErrorCode.UNAUTHORIZED)).toBe(true);
      expect(isAuthError(ErrorCode.INVALID_AMOUNT)).toBe(false);
    });

    it('should identify resource errors', () => {
      expect(isResourceError(ErrorCode.ACCOUNT_NOT_FOUND)).toBe(true);
      expect(isResourceError(ErrorCode.INVALID_AMOUNT)).toBe(false);
    });

    it('should identify state errors', () => {
      expect(isStateError(ErrorCode.ACCOUNT_SUSPENDED)).toBe(true);
      expect(isStateError(ErrorCode.INVALID_AMOUNT)).toBe(false);
    });

    it('should identify protocol errors', () => {
      expect(isProtocolError(ErrorCode.X402_PAYMENT_REQUIRED)).toBe(true);
      expect(isProtocolError(ErrorCode.INVALID_AMOUNT)).toBe(false);
    });
  });

  describe('Statistics Helpers', () => {
    it('should get error code count', () => {
      const count = getErrorCodeCount();
      expect(count).toBeGreaterThanOrEqual(50);
    });

    it('should get error count by category', () => {
      const counts = getErrorCountByCategory();

      expect(counts[ErrorCategory.BALANCE]).toBeGreaterThan(0);
      expect(counts[ErrorCategory.VALIDATION]).toBeGreaterThan(0);
      expect(counts[ErrorCategory.LIMITS]).toBeGreaterThan(0);

      // Total should match error code count
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(getErrorCodeCount());
    });

    it('should get retryable error stats', () => {
      const stats = getRetryableErrorStats();

      expect(stats.retryable).toBeGreaterThan(0);
      expect(stats.nonRetryable).toBeGreaterThan(0);
      expect(stats.total).toBe(getErrorCodeCount());
      expect(stats.retryablePercentage).toBeGreaterThan(0);
      expect(stats.retryablePercentage).toBeLessThan(100);
    });

    it('should get errors by HTTP status', () => {
      const byStatus = getErrorsByHttpStatus();

      expect(byStatus.has(400)).toBe(true);
      expect(byStatus.has(404)).toBe(true);
      expect(byStatus.has(429)).toBe(true);

      // Each status should have at least one error
      byStatus.forEach((errors) => {
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Validation Helpers', () => {
    it('should validate valid error codes', () => {
      expect(isValidErrorCode('INSUFFICIENT_BALANCE')).toBe(true);
      expect(isValidErrorCode('INVALID_CODE')).toBe(false);
    });

    it('should parse valid error codes', () => {
      const code = parseErrorCode('INSUFFICIENT_BALANCE');
      expect(code).toBe(ErrorCode.INSUFFICIENT_BALANCE);
    });

    it('should throw on invalid error code parse', () => {
      expect(() => parseErrorCode('INVALID_CODE')).toThrow();
    });

    it('should safely parse error codes', () => {
      const valid = tryParseErrorCode('INSUFFICIENT_BALANCE');
      expect(valid).toBe(ErrorCode.INSUFFICIENT_BALANCE);

      const invalid = tryParseErrorCode('INVALID_CODE');
      expect(invalid).toBeNull();
    });

    it('should validate error metadata', () => {
      const validation = validateErrorMetadata(ErrorCode.INSUFFICIENT_BALANCE);
      expect(validation.valid).toBe(true);
      expect(validation.missing).toHaveLength(0);
    });

    it('should validate all error metadata', () => {
      const validation = validateAllErrorMetadata();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Search Helpers', () => {
    it('should search errors by query', () => {
      const results = searchErrors('balance');
      expect(results.length).toBeGreaterThan(0);
      expect(results).toContain(ErrorCode.INSUFFICIENT_BALANCE);
    });

    it('should search errors case-insensitively', () => {
      const lower = searchErrors('balance');
      const upper = searchErrors('BALANCE');
      expect(lower).toEqual(upper);
    });

    it('should get errors by status code', () => {
      const notFoundErrors = getErrorsByStatus(404);
      expect(notFoundErrors.length).toBeGreaterThan(0);
      expect(notFoundErrors).toContain(ErrorCode.ACCOUNT_NOT_FOUND);
    });
  });

  describe('Formatting Helpers', () => {
    it('should format error code as human-readable', () => {
      expect(formatErrorCode(ErrorCode.INSUFFICIENT_BALANCE)).toBe('Insufficient Balance');
      expect(formatErrorCode(ErrorCode.RATE_LIMITED)).toBe('Rate Limited');
    });

    it('should get error summary', () => {
      const summary = getErrorSummary(ErrorCode.INSUFFICIENT_BALANCE);
      expect(summary).toContain('INSUFFICIENT_BALANCE');
      expect(summary).toContain('Insufficient balance');
    });

    it('should get error description', () => {
      const description = getErrorDescription(ErrorCode.INSUFFICIENT_BALANCE);
      expect(description).toContain('INSUFFICIENT_BALANCE');
      expect(description).toContain('balance');
      expect(description).toContain('Resolution Steps');
    });
  });

  describe('Comparison Helpers', () => {
    it('should check if errors are related', () => {
      expect(areErrorsRelated(
        ErrorCode.INSUFFICIENT_BALANCE,
        ErrorCode.HOLD_EXCEEDS_BALANCE
      )).toBe(true);

      expect(areErrorsRelated(
        ErrorCode.INSUFFICIENT_BALANCE,
        ErrorCode.INVALID_AMOUNT
      )).toBe(false);
    });

    it('should get similar errors', () => {
      const similar = getSimilarErrors(ErrorCode.INSUFFICIENT_BALANCE);
      expect(similar.length).toBeGreaterThan(0);
      expect(similar).not.toContain(ErrorCode.INSUFFICIENT_BALANCE);

      // All similar errors should be in the same category
      similar.forEach((code) => {
        expect(getErrorCategory(code)).toBe(ErrorCategory.BALANCE);
      });
    });
  });

  describe('Taxonomy Summary', () => {
    it('should get complete taxonomy summary', () => {
      const summary = getErrorTaxonomySummary();

      expect(summary.totalErrors).toBeGreaterThanOrEqual(50);
      expect(summary.categoryCounts).toBeDefined();
      expect(summary.retryableStats).toBeDefined();
      expect(summary.statusCodes.length).toBeGreaterThan(0);
      expect(summary.categories).toHaveLength(10);
    });

    it('should have consistent summary counts', () => {
      const summary = getErrorTaxonomySummary();

      const categoryTotal = Object.values(summary.categoryCounts).reduce(
        (sum, count) => sum + count,
        0
      );
      expect(categoryTotal).toBe(summary.totalErrors);
    });
  });
});



