/**
 * Unit tests for API schemas
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  ErrorCodeSchema,
  ErrorCategorySchema,
  SuggestedActionSchema,
  RetryGuidanceSchema,
  ApiErrorSchema,
  ApiErrorResponseSchema,
  ResponseMetaSchema,
  ApiSuccessResponseSchema,
  PaginationMetaSchema,
  PaginationLinksSchema,
  ApiPaginatedResponseSchema,
  createSuccessResponseSchema,
  createPaginatedResponseSchema,
  createApiResponseSchema,
  validateApiResponse,
  validatePaginatedResponse,
  validateErrorResponse,
  safeParseApiResponse,
  AccountIdSchema,
  TransferIdSchema,
  CurrencyCodeSchema,
  MonetaryAmountSchema,
  PositiveMonetaryAmountSchema,
  TimestampSchema,
} from './api-schemas.js';
import { ErrorCode, ErrorCategory } from './errors.js';

describe('API Schemas', () => {
  describe('Error Schemas', () => {
    it('should validate error code enum', () => {
      expect(() => ErrorCodeSchema.parse('INSUFFICIENT_BALANCE')).not.toThrow();
      expect(() => ErrorCodeSchema.parse('INVALID_CODE')).toThrow();
    });

    it('should validate error category enum', () => {
      expect(() => ErrorCategorySchema.parse('balance')).not.toThrow();
      expect(() => ErrorCategorySchema.parse('invalid_category')).toThrow();
    });

    it('should validate suggested action', () => {
      const validAction = {
        action: 'top_up_account',
        description: 'Add funds to account',
        endpoint: '/v1/accounts/acc_123/deposits',
        method: 'POST' as const,
      };

      expect(() => SuggestedActionSchema.parse(validAction)).not.toThrow();
    });

    it('should reject invalid suggested action', () => {
      const invalidAction = {
        action: 'top_up_account',
        // Missing description
      };

      expect(() => SuggestedActionSchema.parse(invalidAction)).toThrow();
    });

    it('should validate retry guidance', () => {
      const validGuidance = {
        retryable: true,
        retry_after_seconds: 60,
        backoff_strategy: 'exponential' as const,
      };

      expect(() => RetryGuidanceSchema.parse(validGuidance)).not.toThrow();
    });

    it('should validate API error', () => {
      const validError = {
        code: 'INSUFFICIENT_BALANCE',
        category: 'balance',
        message: 'Insufficient balance',
        details: {
          required_amount: '100.00',
          available_amount: '50.00',
        },
      };

      expect(() => ApiErrorSchema.parse(validError)).not.toThrow();
    });

    it('should validate error response', () => {
      const validResponse = {
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          category: 'balance',
          message: 'Insufficient balance',
        },
        request_id: 'req_abc123',
        timestamp: '2025-01-01T10:00:00Z',
      };

      expect(() => ApiErrorResponseSchema.parse(validResponse)).not.toThrow();
    });
  });

  describe('Success Response Schemas', () => {
    it('should validate response metadata', () => {
      const validMeta = {
        request_id: 'req_abc123',
        timestamp: '2025-01-01T10:00:00Z',
        processing_time_ms: 145,
      };

      expect(() => ResponseMetaSchema.parse(validMeta)).not.toThrow();
    });

    it('should validate success response', () => {
      const validResponse = {
        success: true,
        data: { id: 'acc_123', name: 'Test Account' },
        meta: {
          request_id: 'req_abc123',
          timestamp: '2025-01-01T10:00:00Z',
        },
      };

      expect(() => ApiSuccessResponseSchema.parse(validResponse)).not.toThrow();
    });

    it('should reject success response with wrong success flag', () => {
      const invalidResponse = {
        success: false, // Should be true
        data: { id: 'acc_123' },
        meta: {
          request_id: 'req_abc123',
          timestamp: '2025-01-01T10:00:00Z',
        },
      };

      expect(() => ApiSuccessResponseSchema.parse(invalidResponse)).toThrow();
    });

    it('should validate response with next actions', () => {
      const validResponse = {
        success: true,
        data: { id: 'txn_123' },
        meta: {
          request_id: 'req_abc123',
          timestamp: '2025-01-01T10:00:00Z',
        },
        next_actions: [
          {
            action: 'check_status',
            description: 'Poll for status',
            endpoint: '/v1/transfers/txn_123',
          },
        ],
      };

      expect(() => ApiSuccessResponseSchema.parse(validResponse)).not.toThrow();
    });
  });

  describe('Paginated Response Schemas', () => {
    it('should validate pagination metadata', () => {
      const validPagination = {
        page: 1,
        page_size: 20,
        total_count: 100,
        total_pages: 5,
        has_next_page: true,
        has_previous_page: false,
      };

      expect(() => PaginationMetaSchema.parse(validPagination)).not.toThrow();
    });

    it('should validate pagination links', () => {
      const validLinks = {
        self: '/v1/transfers?page=1',
        first: '/v1/transfers?page=1',
        next: '/v1/transfers?page=2',
        last: '/v1/transfers?page=5',
      };

      expect(() => PaginationLinksSchema.parse(validLinks)).not.toThrow();
    });

    it('should validate paginated response', () => {
      const validResponse = {
        success: true,
        data: [
          { id: 'txn_1', amount: '100.00' },
          { id: 'txn_2', amount: '200.00' },
        ],
        meta: {
          request_id: 'req_abc123',
          timestamp: '2025-01-01T10:00:00Z',
        },
        pagination: {
          page: 1,
          page_size: 20,
          total_count: 2,
          total_pages: 1,
          has_next_page: false,
          has_previous_page: false,
        },
        links: {
          self: '/v1/transfers?page=1',
        },
      };

      expect(() => ApiPaginatedResponseSchema.parse(validResponse)).not.toThrow();
    });
  });

  describe('Schema Factories', () => {
    it('should create typed success response schema', () => {
      const accountSchema = z.object({
        id: z.string(),
        name: z.string(),
      });

      const responseSchema = createSuccessResponseSchema(accountSchema);
      const validResponse = {
        success: true,
        data: { id: 'acc_123', name: 'Test' },
        meta: {
          request_id: 'req_abc123',
          timestamp: '2025-01-01T10:00:00Z',
        },
      };

      expect(() => responseSchema.parse(validResponse)).not.toThrow();
    });

    it('should reject success response with wrong data type', () => {
      const accountSchema = z.object({
        id: z.string(),
        name: z.string(),
      });

      const responseSchema = createSuccessResponseSchema(accountSchema);
      const invalidResponse = {
        success: true,
        data: { id: 123 }, // Should be string
        meta: {
          request_id: 'req_abc123',
          timestamp: '2025-01-01T10:00:00Z',
        },
      };

      expect(() => responseSchema.parse(invalidResponse)).toThrow();
    });

    it('should create typed paginated response schema', () => {
      const itemSchema = z.object({
        id: z.string(),
        amount: z.string(),
      });

      const responseSchema = createPaginatedResponseSchema(itemSchema);
      const validResponse = {
        success: true,
        data: [{ id: 'txn_1', amount: '100.00' }],
        meta: {
          request_id: 'req_abc123',
          timestamp: '2025-01-01T10:00:00Z',
        },
        pagination: {
          page: 1,
          page_size: 20,
          total_count: 1,
          total_pages: 1,
          has_next_page: false,
          has_previous_page: false,
        },
        links: {
          self: '/v1/transfers',
        },
      };

      expect(() => responseSchema.parse(validResponse)).not.toThrow();
    });

    it('should create API response schema (union)', () => {
      const dataSchema = z.object({ id: z.string() });
      const responseSchema = createApiResponseSchema(dataSchema);

      const successResponse = {
        success: true,
        data: { id: 'acc_123' },
        meta: {
          request_id: 'req_abc123',
          timestamp: '2025-01-01T10:00:00Z',
        },
      };

      const errorResponse = {
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          category: 'resource',
          message: 'Account not found',
        },
        request_id: 'req_abc123',
        timestamp: '2025-01-01T10:00:00Z',
      };

      expect(() => responseSchema.parse(successResponse)).not.toThrow();
      expect(() => responseSchema.parse(errorResponse)).not.toThrow();
    });
  });

  describe('Validation Helpers', () => {
    it('should validate API response', () => {
      const dataSchema = z.object({ id: z.string() });
      const response = {
        success: true,
        data: { id: 'acc_123' },
        meta: {
          request_id: 'req_abc123',
          timestamp: '2025-01-01T10:00:00Z',
        },
      };

      expect(() => validateApiResponse(response, dataSchema)).not.toThrow();
    });

    it('should validate paginated response', () => {
      const itemSchema = z.object({ id: z.string() });
      const response = {
        success: true,
        data: [{ id: 'txn_1' }],
        meta: {
          request_id: 'req_abc123',
          timestamp: '2025-01-01T10:00:00Z',
        },
        pagination: {
          page: 1,
          page_size: 20,
          total_count: 1,
          total_pages: 1,
          has_next_page: false,
          has_previous_page: false,
        },
        links: {
          self: '/v1/transfers',
        },
      };

      expect(() => validatePaginatedResponse(response, itemSchema)).not.toThrow();
    });

    it('should validate error response', () => {
      const response = {
        success: false,
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          category: 'resource',
          message: 'Account not found',
        },
        request_id: 'req_abc123',
        timestamp: '2025-01-01T10:00:00Z',
      };

      expect(() => validateErrorResponse(response)).not.toThrow();
    });

    it('should safely parse valid response', () => {
      const dataSchema = z.object({ id: z.string() });
      const response = {
        success: true,
        data: { id: 'acc_123' },
        meta: {
          request_id: 'req_abc123',
          timestamp: '2025-01-01T10:00:00Z',
        },
      };

      const result = safeParseApiResponse(response, dataSchema);
      expect(result.success).toBe(true);
    });

    it('should safely parse invalid response', () => {
      const dataSchema = z.object({ id: z.string() });
      const response = {
        success: true,
        data: { id: 123 }, // Wrong type
        meta: {
          request_id: 'req_abc123',
          timestamp: '2025-01-01T10:00:00Z',
        },
      };

      const result = safeParseApiResponse(response, dataSchema);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });
  });

  describe('Common Data Schemas', () => {
    it('should validate account ID', () => {
      expect(() => AccountIdSchema.parse('acc_abc123')).not.toThrow();
      expect(() => AccountIdSchema.parse('invalid_id')).toThrow();
      expect(() => AccountIdSchema.parse('txn_123')).toThrow();
    });

    it('should validate transfer ID', () => {
      expect(() => TransferIdSchema.parse('txn_abc123')).not.toThrow();
      expect(() => TransferIdSchema.parse('acc_123')).toThrow();
    });

    it('should validate currency code', () => {
      expect(() => CurrencyCodeSchema.parse('USD')).not.toThrow();
      expect(() => CurrencyCodeSchema.parse('BRL')).not.toThrow();
      expect(() => CurrencyCodeSchema.parse('INVALID')).toThrow();
      expect(() => CurrencyCodeSchema.parse('us')).toThrow();
    });

    it('should validate monetary amounts', () => {
      expect(() => MonetaryAmountSchema.parse('100.00')).not.toThrow();
      expect(() => MonetaryAmountSchema.parse('0.99')).not.toThrow();
      expect(() => MonetaryAmountSchema.parse('100')).toThrow();
      expect(() => MonetaryAmountSchema.parse('100.0')).toThrow();
      expect(() => MonetaryAmountSchema.parse('100.999')).toThrow();
    });

    it('should validate positive monetary amounts', () => {
      expect(() => PositiveMonetaryAmountSchema.parse('100.00')).not.toThrow();
      expect(() => PositiveMonetaryAmountSchema.parse('0.01')).not.toThrow();
      expect(() => PositiveMonetaryAmountSchema.parse('0.00')).toThrow();
      expect(() => PositiveMonetaryAmountSchema.parse('-100.00')).toThrow();
    });

    it('should validate timestamps', () => {
      expect(() => TimestampSchema.parse('2025-01-01T10:00:00Z')).not.toThrow();
      expect(() => TimestampSchema.parse('2025-01-01T10:00:00.000Z')).not.toThrow();
      expect(() => TimestampSchema.parse('2025-01-01')).toThrow();
      expect(() => TimestampSchema.parse('invalid')).toThrow();
    });
  });

  describe('Rate Limit Schema', () => {
    it('should validate rate limit info', () => {
      const validRateLimit = {
        limit: 100,
        remaining: 95,
        reset_at: '2025-01-01T11:00:00Z',
      };

      const meta = {
        request_id: 'req_abc123',
        timestamp: '2025-01-01T10:00:00Z',
        rate_limit: validRateLimit,
      };

      expect(() => ResponseMetaSchema.parse(meta)).not.toThrow();
    });
  });

  describe('Deprecation Schema', () => {
    it('should validate deprecation warning', () => {
      const validDeprecation = {
        deprecated: true,
        sunset_date: '2025-12-31T23:59:59Z',
        replacement_endpoint: '/v2/accounts',
        message: 'This endpoint will be removed',
      };

      const meta = {
        request_id: 'req_abc123',
        timestamp: '2025-01-01T10:00:00Z',
        deprecation: validDeprecation,
      };

      expect(() => ResponseMetaSchema.parse(meta)).not.toThrow();
    });
  });
});



