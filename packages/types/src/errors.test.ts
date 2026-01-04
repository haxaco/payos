/**
 * Unit tests for error taxonomy
 */

import { describe, it, expect } from 'vitest';
import { ErrorCode, ErrorCategory, ERROR_METADATA, ERROR_CATEGORIES } from './errors.js';

describe('Error Taxonomy', () => {
  describe('ErrorCode enum', () => {
    it('should have at least 50 error codes', () => {
      const errorCodeCount = Object.keys(ErrorCode).length;
      expect(errorCodeCount).toBeGreaterThanOrEqual(50);
    });

    it('should have unique error codes', () => {
      const codes = Object.values(ErrorCode);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should use SCREAMING_SNAKE_CASE for all codes', () => {
      Object.values(ErrorCode).forEach((code) => {
        expect(code).toMatch(/^[A-Z0-9_]+$/);
      });
    });
  });

  describe('Error Categories', () => {
    it('should have exactly 10 categories', () => {
      const categories = Object.values(ErrorCategory);
      expect(categories).toHaveLength(10);
    });

    it('should use lowercase for all categories', () => {
      Object.values(ErrorCategory).forEach((category) => {
        expect(category).toMatch(/^[a-z]+$/);
      });
    });

    it('should map every error code to a category', () => {
      Object.values(ErrorCode).forEach((code) => {
        const category = ERROR_CATEGORIES[code as ErrorCode];
        expect(category).toBeDefined();
        expect(Object.values(ErrorCategory)).toContain(category);
      });
    });
  });

  describe('Error Metadata', () => {
    it('should have metadata for every error code', () => {
      Object.values(ErrorCode).forEach((code) => {
        const metadata = ERROR_METADATA[code as ErrorCode];
        expect(metadata).toBeDefined();
      });
    });

    it('should have complete metadata for every error code', () => {
      Object.values(ErrorCode).forEach((code) => {
        const metadata = ERROR_METADATA[code as ErrorCode];

        // Check all required fields
        expect(metadata.message).toBeTruthy();
        expect(metadata.description).toBeTruthy();
        expect(metadata.httpStatus).toBeGreaterThanOrEqual(400);
        expect(metadata.httpStatus).toBeLessThan(600);
        expect(metadata.category).toBeTruthy();
        expect(typeof metadata.retryable).toBe('boolean');
        expect(Array.isArray(metadata.detailFields)).toBe(true);
        expect(Array.isArray(metadata.resolutionSteps)).toBe(true);
        expect(metadata.resolutionSteps.length).toBeGreaterThan(0);
        expect(metadata.docsUrl).toBeTruthy();
        expect(metadata.docsUrl).toMatch(/^https:\/\//);
      });
    });

    it('should have valid HTTP status codes', () => {
      const validStatuses = [400, 401, 402, 403, 404, 409, 422, 429, 500, 502, 503, 504];

      Object.values(ErrorCode).forEach((code) => {
        const metadata = ERROR_METADATA[code as ErrorCode];
        expect(validStatuses).toContain(metadata.httpStatus);
      });
    });

    it('should have retry_after_action only for retryable errors', () => {
      Object.values(ErrorCode).forEach((code) => {
        const metadata = ERROR_METADATA[code as ErrorCode];
        if (metadata.retryAfterAction) {
          expect(metadata.retryable).toBe(true);
        }
      });
    });

    it('should have consistent category mapping', () => {
      Object.values(ErrorCode).forEach((code) => {
        const metadataCategory = ERROR_METADATA[code as ErrorCode].category;
        const mappedCategory = ERROR_CATEGORIES[code as ErrorCode];
        expect(metadataCategory).toBe(mappedCategory);
      });
    });
  });

  describe('Error Code Coverage', () => {
    it('should have BALANCE errors', () => {
      const balanceErrors = Object.values(ErrorCode).filter(
        (code) => ERROR_CATEGORIES[code as ErrorCode] === ErrorCategory.BALANCE
      );
      expect(balanceErrors.length).toBeGreaterThan(0);
    });

    it('should have VALIDATION errors', () => {
      const validationErrors = Object.values(ErrorCode).filter(
        (code) => ERROR_CATEGORIES[code as ErrorCode] === ErrorCategory.VALIDATION
      );
      expect(validationErrors.length).toBeGreaterThan(0);
    });

    it('should have LIMITS errors', () => {
      const limitErrors = Object.values(ErrorCode).filter(
        (code) => ERROR_CATEGORIES[code as ErrorCode] === ErrorCategory.LIMITS
      );
      expect(limitErrors.length).toBeGreaterThan(0);
    });

    it('should have COMPLIANCE errors', () => {
      const complianceErrors = Object.values(ErrorCode).filter(
        (code) => ERROR_CATEGORIES[code as ErrorCode] === ErrorCategory.COMPLIANCE
      );
      expect(complianceErrors.length).toBeGreaterThan(0);
    });

    it('should have TECHNICAL errors', () => {
      const technicalErrors = Object.values(ErrorCode).filter(
        (code) => ERROR_CATEGORIES[code as ErrorCode] === ErrorCategory.TECHNICAL
      );
      expect(technicalErrors.length).toBeGreaterThan(0);
    });

    it('should have WORKFLOW errors', () => {
      const workflowErrors = Object.values(ErrorCode).filter(
        (code) => ERROR_CATEGORIES[code as ErrorCode] === ErrorCategory.WORKFLOW
      );
      expect(workflowErrors.length).toBeGreaterThan(0);
    });

    it('should have AUTH errors', () => {
      const authErrors = Object.values(ErrorCode).filter(
        (code) => ERROR_CATEGORIES[code as ErrorCode] === ErrorCategory.AUTH
      );
      expect(authErrors.length).toBeGreaterThan(0);
    });

    it('should have RESOURCE errors', () => {
      const resourceErrors = Object.values(ErrorCode).filter(
        (code) => ERROR_CATEGORIES[code as ErrorCode] === ErrorCategory.RESOURCE
      );
      expect(resourceErrors.length).toBeGreaterThan(0);
    });

    it('should have STATE errors', () => {
      const stateErrors = Object.values(ErrorCode).filter(
        (code) => ERROR_CATEGORIES[code as ErrorCode] === ErrorCategory.STATE
      );
      expect(stateErrors.length).toBeGreaterThan(0);
    });

    it('should have PROTOCOL errors', () => {
      const protocolErrors = Object.values(ErrorCode).filter(
        (code) => ERROR_CATEGORIES[code as ErrorCode] === ErrorCategory.PROTOCOL
      );
      expect(protocolErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Specific Error Codes', () => {
    it('should have INSUFFICIENT_BALANCE error with correct metadata', () => {
      const metadata = ERROR_METADATA[ErrorCode.INSUFFICIENT_BALANCE];

      expect(metadata.category).toBe(ErrorCategory.BALANCE);
      expect(metadata.httpStatus).toBe(400);
      expect(metadata.retryable).toBe(true);
      expect(metadata.retryAfterAction).toBe('top_up_account');
      expect(metadata.detailFields).toContain('required_amount');
      expect(metadata.detailFields).toContain('available_amount');
      expect(metadata.detailFields).toContain('shortfall');
    });

    it('should have RATE_LIMITED error with correct metadata', () => {
      const metadata = ERROR_METADATA[ErrorCode.RATE_LIMITED];

      expect(metadata.category).toBe(ErrorCategory.LIMITS);
      expect(metadata.httpStatus).toBe(429);
      expect(metadata.retryable).toBe(true);
      expect(metadata.retryAfterAction).toBe('wait');
    });

    it('should have ACCOUNT_NOT_FOUND error with correct metadata', () => {
      const metadata = ERROR_METADATA[ErrorCode.ACCOUNT_NOT_FOUND];

      expect(metadata.category).toBe(ErrorCategory.RESOURCE);
      expect(metadata.httpStatus).toBe(404);
      expect(metadata.retryable).toBe(false);
    });

    it('should have X402_PAYMENT_REQUIRED error with correct metadata', () => {
      const metadata = ERROR_METADATA[ErrorCode.X402_PAYMENT_REQUIRED];

      expect(metadata.category).toBe(ErrorCategory.PROTOCOL);
      expect(metadata.httpStatus).toBe(402);
      expect(metadata.retryable).toBe(true);
    });

    it('should have INVALID_PIX_KEY error with correct metadata', () => {
      const metadata = ERROR_METADATA[ErrorCode.INVALID_PIX_KEY];

      expect(metadata.category).toBe(ErrorCategory.VALIDATION);
      expect(metadata.httpStatus).toBe(422);
      expect(metadata.retryable).toBe(false);
    });
  });

  describe('Retryability', () => {
    it('should have both retryable and non-retryable errors', () => {
      const retryable = Object.values(ErrorCode).filter(
        (code) => ERROR_METADATA[code as ErrorCode].retryable
      );
      const nonRetryable = Object.values(ErrorCode).filter(
        (code) => !ERROR_METADATA[code as ErrorCode].retryable
      );

      expect(retryable.length).toBeGreaterThan(0);
      expect(nonRetryable.length).toBeGreaterThan(0);
    });

    it('should mark resource errors (404) as non-retryable', () => {
      const resourceErrors = Object.values(ErrorCode).filter(
        (code) => ERROR_CATEGORIES[code as ErrorCode] === ErrorCategory.RESOURCE
      );

      resourceErrors.forEach((code) => {
        const metadata = ERROR_METADATA[code as ErrorCode];
        expect(metadata.retryable).toBe(false);
      });
    });

    it('should mark most validation errors as non-retryable', () => {
      const validationErrors = Object.values(ErrorCode).filter(
        (code) => ERROR_CATEGORIES[code as ErrorCode] === ErrorCategory.VALIDATION
      );

      const nonRetryableValidation = validationErrors.filter(
        (code) => !ERROR_METADATA[code as ErrorCode].retryable
      );

      // Most validation errors should be non-retryable
      expect(nonRetryableValidation.length).toBeGreaterThan(validationErrors.length * 0.8);
    });
  });

  describe('Documentation URLs', () => {
    it('should have unique documentation URLs', () => {
      const urls = Object.values(ErrorCode).map(
        (code) => ERROR_METADATA[code as ErrorCode].docsUrl
      );
      const uniqueUrls = new Set(urls);
      expect(uniqueUrls.size).toBe(urls.length);
    });

    it('should follow consistent URL pattern', () => {
      Object.values(ErrorCode).forEach((code) => {
        const url = ERROR_METADATA[code as ErrorCode].docsUrl;
        expect(url).toMatch(/^https:\/\/docs\.payos\.com\/errors\/[A-Z0-9_]+$/);
      });
    });
  });

  describe('Detail Fields', () => {
    it('should have meaningful detail field names', () => {
      Object.values(ErrorCode).forEach((code) => {
        const detailFields = ERROR_METADATA[code as ErrorCode].detailFields;

        detailFields.forEach((field) => {
          // Should be snake_case
          expect(field).toMatch(/^[a-z][a-z0-9_]*$/);
          // Should not be empty
          expect(field.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have no duplicate detail fields per error', () => {
      Object.values(ErrorCode).forEach((code) => {
        const detailFields = ERROR_METADATA[code as ErrorCode].detailFields;
        const uniqueFields = new Set(detailFields);
        expect(uniqueFields.size).toBe(detailFields.length);
      });
    });
  });

  describe('Resolution Steps', () => {
    it('should have at least one resolution step per error', () => {
      Object.values(ErrorCode).forEach((code) => {
        const steps = ERROR_METADATA[code as ErrorCode].resolutionSteps;
        expect(steps.length).toBeGreaterThan(0);
      });
    });

    it('should have meaningful resolution steps', () => {
      Object.values(ErrorCode).forEach((code) => {
        const steps = ERROR_METADATA[code as ErrorCode].resolutionSteps;

        steps.forEach((step) => {
          // Should be a non-empty string
          expect(step.length).toBeGreaterThan(10);
          // Should start with capital letter
          expect(step[0]).toMatch(/[A-Z]/);
        });
      });
    });
  });
});

