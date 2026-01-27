/**
 * Unit tests for response wrapper middleware (Story 30.2)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  timingMiddleware,
  responseWrapperMiddleware,
  structuredErrorHandler,
} from '../../../src/middleware/response-wrapper.js';
import { ErrorCode } from '@sly/types';
import { ZodError, z } from 'zod';

describe('Response Wrapper Middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    
    // Apply middleware
    app.use('*', (c, next) => {
      c.set('requestId', 'test-req-123');
      return next();
    });
    app.use('*', timingMiddleware);
    app.use('*', responseWrapperMiddleware);
    app.onError(structuredErrorHandler);
  });

  describe('Timing Middleware', () => {
    it('should track processing time', async () => {
      app.get('/test', (c) => c.json({ message: 'ok' }));

      const res = await app.request('/test');
      const body = await res.json();
      
      expect(res.status).toBe(200);
      expect(body.meta.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it('should set start time', async () => {
      app.get('/test', (c) => {
        const startTime = c.get('startTime');
        expect(startTime).toBeGreaterThan(0);
        return c.json({ message: 'ok' });
      });

      await app.request('/test');
    });
  });

  describe('Response Wrapper', () => {
    it('should wrap success responses', async () => {
      app.get('/test', (c) => c.json({ id: 'acc_123', name: 'Test' }));

      const res = await app.request('/test');
      const body = await res.json();

      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body.data).toEqual({ id: 'acc_123', name: 'Test' });
      expect(body).toHaveProperty('meta');
      expect(body.meta).toHaveProperty('request_id', 'test-req-123');
      expect(body.meta).toHaveProperty('timestamp');
      expect(body.meta).toHaveProperty('processing_time_ms');
      expect(body.meta).toHaveProperty('api_version', '1.0');
    });

    it('should include processing time in meta', async () => {
      app.get('/test', (c) => c.json({ message: 'ok' }));

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.meta.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(typeof body.meta.processing_time_ms).toBe('number');
    });

    it('should include environment in meta', async () => {
      app.get('/test', (c) => c.json({ message: 'ok' }));

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.meta.environment).toBeDefined();
      // In tests, NODE_ENV is 'test' which defaults to 'sandbox'
      expect(body.meta.environment).toBeTruthy();
    });

    it('should not double-wrap already wrapped responses', async () => {
      app.get('/test', (c) =>
        c.json({
          success: true,
          data: { id: 'acc_123' },
          meta: { request_id: 'custom-id', timestamp: new Date().toISOString() },
        })
      );

      const res = await app.request('/test');
      const body = await res.json();

      // Should not be double-wrapped
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: 'acc_123' });
      expect(body.meta.request_id).toBe('custom-id');
    });

    it('should handle array responses', async () => {
      app.get('/test', (c) => c.json([{ id: 1 }, { id: 2 }]));

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(2);
    });

    it('should handle null responses', async () => {
      app.get('/test', (c) => c.json(null));

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.data).toBeNull();
    });

    it('should handle empty object responses', async () => {
      app.get('/test', (c) => c.json({}));

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.data).toEqual({});
    });
  });

  describe('Error Transformation', () => {
    it('should transform generic errors to structured format', async () => {
      app.get('/test', () => {
        throw new Error('Something went wrong');
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(body.error.category).toBe('technical');
      expect(body.error.message).toBeDefined();
      expect(body.request_id).toBe('test-req-123');
      expect(body.timestamp).toBeDefined();
    });

    it('should transform Zod validation errors', async () => {
      app.post('/test', async (c) => {
        const schema = z.object({
          name: z.string(),
          email: z.string().email(),
        });

        const body = await c.req.json();
        schema.parse(body); // This will throw ZodError
        return c.json({ ok: true });
      });

      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 123 }), // Invalid
      });

      const body = await res.json();

      expect(body.success).toBe(false);
      expect(body.error.code).toBeDefined();
      expect([ErrorCode.MISSING_REQUIRED_FIELD, ErrorCode.INVALID_REQUEST_FORMAT]).toContain(
        body.error.code
      );
      expect(body.error.details).toBeDefined();
      expect(body.error.details.validation_errors).toBeDefined();
    });

    it('should include suggested actions for balance errors', async () => {
      class InsufficientBalanceError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('Insufficient balance');
          this.name = 'InsufficientBalanceError';
        }
      }
      
      app.get('/test', () => {
        throw new InsufficientBalanceError(400, {
          account_id: 'acc_123',
          required_amount: '100.00',
          available_amount: '50.00',
          shortfall: '50.00',
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.code).toBe(ErrorCode.INSUFFICIENT_BALANCE);
      expect(body.error.suggested_actions).toBeDefined();
      expect(body.error.suggested_actions.length).toBeGreaterThan(0);
      
      const topUpAction = body.error.suggested_actions.find(
        (a: any) => a.action === 'top_up_account'
      );
      expect(topUpAction).toBeDefined();
      expect(topUpAction.endpoint).toContain('acc_123');
    });

    it('should include retry guidance for retryable errors', async () => {
      app.get('/test', () => {
        const error: any = new Error('Rate limited');
        error.statusCode = 429;
        error.details = { retry_after_seconds: 60 };
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry).toBeDefined();
      expect(body.error.retry.retryable).toBe(true);
    });

    it('should include documentation URL', async () => {
      app.get('/test', () => {
        throw new Error('Test error');
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.documentation_url).toBeDefined();
      expect(body.error.documentation_url).toMatch(/^https:\/\/docs\.payos\.com\/errors\//);
    });

    it('should not include stack traces in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.get('/test', () => {
        throw new Error('Test error');
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack traces in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      app.get('/test', () => {
        throw new Error('Test error');
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle NotFoundError correctly', async () => {
      class NotFoundError extends Error {
        constructor(public statusCode: number) {
          super('Account with id acc_123 not found');
          this.name = 'NotFoundError';
        }
      }
      
      app.get('/test', () => {
        throw new NotFoundError(404);
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe(ErrorCode.ACCOUNT_NOT_FOUND);
      expect(body.error.category).toBe('resource');
    });

    it('should handle UnauthorizedError correctly', async () => {
      class UnauthorizedError extends Error {
        constructor(public statusCode: number) {
          super('Unauthorized');
          this.name = 'UnauthorizedError';
        }
      }
      
      app.get('/test', () => {
        throw new UnauthorizedError(401);
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(body.error.category).toBe('auth');
    });

    it('should handle ForbiddenError correctly', async () => {
      class ForbiddenError extends Error {
        constructor(public statusCode: number) {
          super('Forbidden');
          this.name = 'ForbiddenError';
        }
      }
      
      app.get('/test', () => {
        throw new ForbiddenError(403);
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.error.code).toBe(ErrorCode.FORBIDDEN);
      expect(body.error.category).toBe('auth');
    });

    it('should handle LimitExceededError correctly', async () => {
      class LimitExceededError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('Daily limit exceeded');
          this.name = 'LimitExceededError';
        }
      }
      
      app.get('/test', () => {
        throw new LimitExceededError(403, {
          limitType: 'daily',
          limit: 10000,
          requested: 5000,
          current: 8000,
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.code).toBe(ErrorCode.DAILY_LIMIT_EXCEEDED);
      expect(body.error.category).toBe('limits');
      expect(body.error.details).toBeDefined();
    });

    it('should transform Supabase PGRST116 error', async () => {
      app.get('/test', () => {
        const error: any = new Error('No rows found');
        error.code = 'PGRST116';
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error.code).toBe(ErrorCode.ACCOUNT_NOT_FOUND);
    });

    it('should transform Supabase unique violation error', async () => {
      app.get('/test', () => {
        const error: any = new Error('Duplicate key violation');
        error.code = '23505';
        error.constraint = 'unique_constraint';
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.code).toBe(ErrorCode.IDEMPOTENCY_CONFLICT);
      expect(body.error.details.constraint).toBe('unique_constraint');
    });

    it('should transform Supabase foreign key violation error', async () => {
      app.get('/test', () => {
        const error: any = new Error('Foreign key violation');
        error.code = '23503';
        error.constraint = 'fk_constraint';
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.code).toBe(ErrorCode.INVALID_ACCOUNT_ID);
      expect(body.error.details.constraint).toBe('fk_constraint');
    });
  });

  describe('Suggested Actions', () => {
    it('should suggest quote refresh for expired quotes', async () => {
      class QuoteExpiredError extends Error {
        constructor(public statusCode: number) {
          super('Quote expired');
          this.name = 'QuoteExpiredError';
        }
      }
      
      app.get('/test', () => {
        throw new QuoteExpiredError(409);
      });

      const res = await app.request('/test');
      const body = await res.json();

      const refreshAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'refresh_quote'
      );
      expect(refreshAction).toBeDefined();
      expect(refreshAction.endpoint).toBe('/v1/quotes');
      expect(refreshAction.method).toBe('POST');
    });

    it('should suggest verification for KYC errors', async () => {
      class KYCRequiredError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('KYC required');
          this.name = 'KYCRequiredError';
        }
      }
      
      app.get('/test', () => {
        throw new KYCRequiredError(403, { verification_url: '/v1/accounts/verify' });
      });

      const res = await app.request('/test');
      const body = await res.json();

      const verifyAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'complete_kyc'
      );
      expect(verifyAction).toBeDefined();
    });

    it('should suggest fixing request for validation errors', async () => {
      app.post('/test', async (c) => {
        const schema = z.object({ name: z.string() });
        const body = await c.req.json();
        schema.parse(body);
        return c.json({ ok: true });
      });

      const res = await app.request('/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const body = await res.json();

      const fixAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'fix_validation_errors' || a.action === 'add_required_fields'
      );
      expect(fixAction).toBeDefined();
    });
  });

  describe('Request ID', () => {
    it('should use provided request ID', async () => {
      app.get('/test', (c) => c.json({ message: 'ok' }));

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.meta.request_id).toBe('test-req-123');
    });

    it('should include request ID in error responses', async () => {
      app.get('/test', () => {
        throw new Error('Test error');
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.request_id).toBe('test-req-123');
    });
  });

  describe('Timestamp', () => {
    it('should include ISO timestamp in success responses', async () => {
      app.get('/test', (c) => c.json({ message: 'ok' }));

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(new Date(body.meta.timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should include ISO timestamp in error responses', async () => {
      app.get('/test', () => {
        throw new Error('Test error');
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
    });
  });
});

