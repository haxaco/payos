/**
 * Tests for retry guidance in structured error responses
 * 
 * Story 30.7: Add Retry Guidance to All Retryable Errors
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { ErrorCode } from '@sly/types';
import {
  timingMiddleware,
  responseWrapperMiddleware,
  structuredErrorHandler,
} from '../../../src/middleware/response-wrapper.js';

describe('Retry Guidance', () => {
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

  // ============================================
  // RATE LIMITING & THROTTLING
  // ============================================

  describe('Rate Limiting Errors', () => {
    it('should include retry_after_seconds for RATE_LIMITED with explicit value', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Rate limit exceeded');
        error.code = ErrorCode.RATE_LIMITED;
        error.details = {
          retry_after_seconds: 120,
          limit: 100,
          window_seconds: 60,
        };
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCode.RATE_LIMITED);
      expect(body.error.retry).toBeDefined();
      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(120);
      expect(body.error.retry.backoff_strategy).toBe('fixed');
    });

    it('should default to 60 seconds for RATE_LIMITED without explicit value', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Rate limit exceeded');
        error.code = ErrorCode.RATE_LIMITED;
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retry_after_seconds).toBe(60);
    });

    it('should include exponential backoff for VELOCITY_LIMIT_EXCEEDED', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Too many transactions');
        error.code = ErrorCode.VELOCITY_LIMIT_EXCEEDED;
        error.details = {
          limit_window_seconds: 30,
        };
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(30);
      expect(body.error.retry.backoff_strategy).toBe('exponential');
    });

    it('should include retry guidance for CONCURRENT_REQUEST_LIMIT', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Too many concurrent requests');
        error.code = ErrorCode.CONCURRENT_REQUEST_LIMIT;
        error.details = {
          limit_window_seconds: 5,
        };
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(5);
      expect(body.error.retry.backoff_strategy).toBe('exponential');
    });
  });

  // ============================================
  // SPENDING & TRANSACTION LIMITS
  // ============================================

  describe('Spending Limit Errors', () => {
    it('should calculate retry_after_seconds from resets_at for DAILY_LIMIT_EXCEEDED', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      app.get('/test', (c) => {
        const error: any = new Error('Daily limit exceeded');
        error.code = ErrorCode.DAILY_LIMIT_EXCEEDED;
        error.details = {
          daily_limit: 1000,
          current_usage: 1000,
          resets_at: tomorrow.toISOString(),
        };
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBeGreaterThan(0);
      expect(body.error.retry.backoff_strategy).toBe('fixed');
      expect(body.error.retry.retry_after_action).toBe('wait_for_reset');
    });

    it('should handle MONTHLY_LIMIT_EXCEEDED with reset time', async () => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);

      app.get('/test', (c) => {
        const error: any = new Error('Monthly limit exceeded');
        error.code = ErrorCode.MONTHLY_LIMIT_EXCEEDED;
        error.details = {
          monthly_limit: 10000,
          current_usage: 10000,
          resets_at: nextMonth.toISOString(),
        };
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBeGreaterThan(0);
      expect(body.error.retry.backoff_strategy).toBe('fixed');
    });

    it('should handle AGENT_SPENDING_LIMIT_EXCEEDED', async () => {
      const resetTime = new Date(Date.now() + 3600000); // 1 hour from now

      app.get('/test', (c) => {
        const error: any = new Error('Agent spending limit exceeded');
        error.code = ErrorCode.AGENT_SPENDING_LIMIT_EXCEEDED;
        error.details = {
          limit_type: 'daily',
          limit_amount: 500,
          current_usage: 500,
          resets_at: resetTime.toISOString(),
        };
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBeGreaterThan(3000); // ~1 hour
      expect(body.error.retry.retry_after_seconds).toBeLessThan(4000);
    });
  });

  // ============================================
  // BALANCE ERRORS
  // ============================================

  describe('Balance Errors', () => {
    it('should allow immediate retry for INSUFFICIENT_BALANCE after top-up', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Insufficient balance');
        error.code = ErrorCode.INSUFFICIENT_BALANCE;
        error.details = {
          required_amount: '100.00',
          available_amount: '50.00',
          shortfall: '50.00',
        };
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(0);
      expect(body.error.retry.retry_after_action).toBe('top_up_account');
      expect(body.error.retry.backoff_strategy).toBe('fixed');
    });

    it('should allow immediate retry for HOLD_EXCEEDS_BALANCE', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Hold exceeds balance');
        error.code = ErrorCode.HOLD_EXCEEDS_BALANCE;
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(0);
      expect(body.error.retry.retry_after_action).toBe('top_up_account');
    });

    it('should allow immediate retry for NEGATIVE_BALANCE_NOT_ALLOWED', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Negative balance not allowed');
        error.code = ErrorCode.NEGATIVE_BALANCE_NOT_ALLOWED;
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(0);
    });
  });

  // ============================================
  // QUOTE & TIMING ERRORS
  // ============================================

  describe('Quote & Timing Errors', () => {
    it('should allow immediate retry for QUOTE_EXPIRED', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Quote expired');
        error.code = ErrorCode.QUOTE_EXPIRED;
        error.details = {
          quote_id: 'quote_123',
          expired_at: new Date().toISOString(),
        };
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(0);
      expect(body.error.retry.backoff_strategy).toBe('fixed');
    });

    it('should allow immediate retry for RATE_EXPIRED', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Rate expired');
        error.code = ErrorCode.RATE_EXPIRED;
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(0);
    });
  });

  // ============================================
  // SERVICE & AVAILABILITY ERRORS
  // ============================================

  describe('Service Availability Errors', () => {
    it('should include exponential backoff for SERVICE_UNAVAILABLE', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Service unavailable');
        error.code = ErrorCode.SERVICE_UNAVAILABLE;
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(30);
      expect(body.error.retry.backoff_strategy).toBe('exponential');
      expect(body.error.retry.max_retries).toBe(5);
    });

    it('should include retry guidance for RAIL_UNAVAILABLE', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Rail unavailable');
        error.code = ErrorCode.RAIL_UNAVAILABLE;
        error.details = {
          rail: 'PIX',
        };
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(30);
      expect(body.error.retry.backoff_strategy).toBe('exponential');
      expect(body.error.retry.max_retries).toBe(5);
    });

    it('should include retry guidance for TIMEOUT', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Request timeout');
        error.code = ErrorCode.TIMEOUT;
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(10);
      expect(body.error.retry.backoff_strategy).toBe('exponential');
      expect(body.error.retry.max_retries).toBe(3);
    });
  });

  // ============================================
  // IDEMPOTENCY & CONCURRENCY
  // ============================================

  describe('Idempotency & Concurrency Errors', () => {
    it('should mark IDEMPOTENCY_CONFLICT as non-retryable but suggest retrieval', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Idempotency conflict');
        error.code = ErrorCode.IDEMPOTENCY_CONFLICT;
        error.details = {
          existing_request_id: 'req_123',
        };
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      // Idempotency conflicts are NOT retryable with the same key
      expect(body.error.retry.retryable).toBe(false);
      // Should have suggested action to retrieve existing
      expect(body.error.suggested_actions).toBeDefined();
      const retrieveAction = body.error.suggested_actions.find(
        (a: any) => a.action === 'retrieve_existing'
      );
      expect(retrieveAction).toBeDefined();
    });

    it('should include quick retry for CONCURRENT_MODIFICATION', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Concurrent modification');
        error.code = ErrorCode.CONCURRENT_MODIFICATION;
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(1);
      expect(body.error.retry.backoff_strategy).toBe('exponential');
      expect(body.error.retry.max_retries).toBe(3);
    });
  });

  // ============================================
  // COMPLIANCE & WORKFLOW
  // ============================================

  describe('Compliance & Workflow Errors', () => {
    it('should include delayed retry for COMPLIANCE_HOLD', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Compliance hold');
        error.code = ErrorCode.COMPLIANCE_HOLD;
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(3600); // 1 hour
      expect(body.error.retry.backoff_strategy).toBe('fixed');
    });

    it('should include delayed retry for APPROVAL_REQUIRED', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Approval required');
        error.code = ErrorCode.APPROVAL_REQUIRED;
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(3600);
    });

    it('should include delayed retry for APPROVAL_PENDING', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Approval pending');
        error.code = ErrorCode.APPROVAL_PENDING;
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(3600);
    });
  });

  // ============================================
  // AP2 & MANDATE ERRORS
  // ============================================

  describe('AP2 & Mandate Errors', () => {
    it('should allow immediate retry for AP2_MANDATE_EXPIRED after renewal', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Mandate expired');
        error.code = ErrorCode.AP2_MANDATE_EXPIRED;
        error.details = {
          mandate_id: 'mandate_123',
        };
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(0);
      expect(body.error.retry.backoff_strategy).toBe('fixed');
    });
  });

  // ============================================
  // NON-RETRYABLE ERRORS
  // ============================================

  describe('Non-Retryable Errors', () => {
    it('should explicitly mark INVALID_REQUEST_FORMAT as non-retryable', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Validation error');
        error.code = ErrorCode.INVALID_REQUEST_FORMAT;
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry).toBeDefined();
      expect(body.error.retry.retryable).toBe(false);
    });

    it('should explicitly mark ACCOUNT_NOT_FOUND as non-retryable', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Not found');
        error.code = ErrorCode.ACCOUNT_NOT_FOUND;
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry).toBeDefined();
      expect(body.error.retry.retryable).toBe(false);
    });

    it('should explicitly mark INVALID_AMOUNT as non-retryable', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Invalid amount');
        error.code = ErrorCode.INVALID_AMOUNT;
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry).toBeDefined();
      expect(body.error.retry.retryable).toBe(false);
    });

    it('should explicitly mark CURRENCY_MISMATCH as non-retryable', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Currency mismatch');
        error.code = ErrorCode.CURRENCY_MISMATCH;
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry).toBeDefined();
      expect(body.error.retry.retryable).toBe(false);
    });
  });

  // ============================================
  // DEFAULT RETRY GUIDANCE
  // ============================================

  describe('Default Retry Guidance', () => {
    it('should provide sensible defaults for retryable errors without specific guidance', async () => {
      app.get('/test', (c) => {
        const error: any = new Error('Some retryable error');
        error.code = ErrorCode.STREAM_INSUFFICIENT_FUNDING; // Retryable but no specific guidance
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(5);
      expect(body.error.retry.backoff_strategy).toBe('exponential');
      expect(body.error.retry.max_retries).toBe(3);
    });
  });
});

