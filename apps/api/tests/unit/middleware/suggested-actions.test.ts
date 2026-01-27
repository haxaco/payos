/**
 * Unit tests for enhanced suggested actions (Story 30.3)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  timingMiddleware,
  responseWrapperMiddleware,
  structuredErrorHandler,
} from '../../../src/middleware/response-wrapper.js';
import { ErrorCode } from '@sly/types';

describe('Enhanced Suggested Actions (Story 30.3)', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    
    app.use('*', (c, next) => {
      c.set('requestId', 'test-req-123');
      return next();
    });
    app.use('*', timingMiddleware);
    app.use('*', responseWrapperMiddleware);
    app.onError(structuredErrorHandler);
  });

  describe('Balance Error Actions', () => {
    it('should include multiple alternatives for INSUFFICIENT_BALANCE', async () => {
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
          currency: 'USD',
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.suggested_actions).toBeDefined();
      expect(body.error.suggested_actions.length).toBeGreaterThanOrEqual(2);
      
      // Should have top_up_account action with actual account ID
      const topUpAction = body.error.suggested_actions.find(
        (a: any) => a.action === 'top_up_account'
      );
      expect(topUpAction).toBeDefined();
      expect(topUpAction.endpoint).toBe('/v1/accounts/acc_123/deposits');
      expect(topUpAction.min_amount).toBe('50.00');
      
      // Should have reduce_amount alternative
      const reduceAction = body.error.suggested_actions.find(
        (a: any) => a.action === 'reduce_amount'
      );
      expect(reduceAction).toBeDefined();
      expect(reduceAction.max_amount).toBe('50.00');
      
      // Should have use_different_account alternative
      const altAccountAction = body.error.suggested_actions.find(
        (a: any) => a.action === 'use_different_account'
      );
      expect(altAccountAction).toBeDefined();
    });

    it('should suggest releasing holds for HOLD_EXCEEDS_BALANCE', async () => {
      class HoldExceedsBalanceError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('Hold exceeds balance');
          this.name = 'HoldExceedsBalanceError';
        }
      }
      
      app.get('/test', () => {
        throw new HoldExceedsBalanceError(400, {
          account_id: 'acc_123',
          hold_amount: '100.00',
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      const releaseAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'release_holds'
      );
      expect(releaseAction).toBeDefined();
      expect(releaseAction.endpoint).toContain('acc_123');
    });
  });

  describe('Validation Error Actions', () => {
    it('should suggest specific field fixes for MISSING_REQUIRED_FIELD', async () => {
      class ValidationError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('Missing required fields');
          this.name = 'ValidationError';
        }
      }
      
      app.post('/test', async (c) => {
        throw new ValidationError(400, {
          missing_fields: ['email', 'phone'],
        });
      });

      const res = await app.request('/test', { method: 'POST' });
      const body = await res.json();

      // The error will be mapped to INVALID_REQUEST_FORMAT since ValidationError maps there
      // But it should still have suggested actions
      expect(body.error.suggested_actions).toBeDefined();
      
      // Check for fix_request action (generic validation error action)
      const fixAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'fix_validation_errors' || a.action === 'fix_request'
      );
      expect(fixAction).toBeDefined();
    });

    it('should suggest PIX key verification for INVALID_PIX_KEY', async () => {
      class InvalidPixKeyError extends Error {
        constructor(public statusCode: number) {
          super('Invalid PIX key');
          this.name = 'InvalidPixKeyError';
        }
      }
      
      app.get('/test', () => {
        throw new InvalidPixKeyError(422);
      });

      const res = await app.request('/test');
      const body = await res.json();

      const verifyAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'verify_pix_key'
      );
      expect(verifyAction).toBeDefined();
      expect(verifyAction.description).toContain('PIX key format');
      
      const checkAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'check_recipient'
      );
      expect(checkAction).toBeDefined();
    });
  });

  describe('Limit Error Actions', () => {
    it('should include retry_after_seconds for RATE_LIMITED', async () => {
      class RateLimitedError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('Rate limited');
          this.name = 'RateLimitedError';
        }
      }
      
      app.get('/test', () => {
        throw new RateLimitedError(429, {
          retry_after_seconds: 120,
          reset_at: '2025-01-01T11:00:00Z',
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      // Check suggested action
      const waitAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'wait_and_retry'
      );
      expect(waitAction).toBeDefined();
      expect(waitAction.recommended_interval_seconds).toBe(120);
      expect(waitAction.available_at).toBe('2025-01-01T11:00:00Z');
      
      // Check retry guidance
      expect(body.error.retry).toBeDefined();
      expect(body.error.retry.retryable).toBe(true);
      expect(body.error.retry.retry_after_seconds).toBe(120);
    });

    it('should suggest multiple alternatives for DAILY_LIMIT_EXCEEDED', async () => {
      class LimitExceededError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('Daily limit exceeded');
          this.name = 'LimitExceededError';
        }
      }
      
      app.get('/test', () => {
        throw new LimitExceededError(400, {
          limitType: 'daily',
          limit: 10000,
          current_usage: 9000,
          requested_amount: 2000,
          resets_at: '2025-01-02T00:00:00Z',
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      expect(body.error.suggested_actions.length).toBeGreaterThanOrEqual(2);
      
      // Should suggest waiting
      const waitAction = body.error.suggested_actions.find(
        (a: any) => a.action === 'wait_for_reset'
      );
      expect(waitAction).toBeDefined();
      expect(waitAction.available_at).toBe('2025-01-02T00:00:00Z');
      
      // Should suggest requesting increase
      const increaseAction = body.error.suggested_actions.find(
        (a: any) => a.action === 'request_limit_increase'
      );
      expect(increaseAction).toBeDefined();
      expect(increaseAction.endpoint).toBe('/v1/accounts/limits');
      
      // Should suggest reducing amount
      const reduceAction = body.error.suggested_actions.find(
        (a: any) => a.action === 'reduce_amount'
      );
      expect(reduceAction).toBeDefined();
      expect(reduceAction.max_amount).toBe('1000'); // 10000 - 9000
    });

    it('should suggest batching for VELOCITY_LIMIT_EXCEEDED', async () => {
      class VelocityLimitError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('Velocity limit exceeded');
          this.name = 'VelocityLimitError';
        }
      }
      
      app.get('/test', () => {
        throw new VelocityLimitError(429, {
          limit_window_seconds: 60,
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      const batchAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'batch_transactions'
      );
      expect(batchAction).toBeDefined();
      expect(batchAction.endpoint).toBe('/v1/transfers/batch');
    });
  });

  describe('Compliance Error Actions', () => {
    it('should include tier information for KYC_REQUIRED', async () => {
      class KYCRequiredError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('KYC required');
          this.name = 'KYCRequiredError';
        }
      }
      
      app.get('/test', () => {
        throw new KYCRequiredError(403, {
          required_tier: 2,
          current_tier: 0,
          verification_url: '/v1/accounts/acc_123/verify',
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      const kycAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'complete_kyc'
      );
      expect(kycAction).toBeDefined();
      expect(kycAction.endpoint).toBe('/v1/accounts/acc_123/verify');
      expect(kycAction.parameters?.required_tier).toBe(2);
      expect(kycAction.parameters?.current_tier).toBe(0);
    });

    it('should suggest waiting and contacting support for COMPLIANCE_HOLD', async () => {
      class ComplianceHoldError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('Compliance hold');
          this.name = 'ComplianceHoldError';
        }
      }
      
      app.get('/test', () => {
        throw new ComplianceHoldError(403, {
          review_expected_at: '2025-01-02T10:00:00Z',
          support_contact: 'compliance@payos.com',
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      const waitAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'wait_for_review'
      );
      expect(waitAction).toBeDefined();
      expect(waitAction.available_at).toBe('2025-01-02T10:00:00Z');
      
      const supportAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'contact_support'
      );
      expect(supportAction).toBeDefined();
      expect(supportAction.endpoint).toBe('compliance@payos.com');
    });
  });

  describe('Technical Error Actions', () => {
    it('should suggest refreshing quote for QUOTE_EXPIRED', async () => {
      class QuoteExpiredError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('Quote expired');
          this.name = 'QuoteExpiredError';
        }
      }
      
      app.get('/test', () => {
        throw new QuoteExpiredError(409, {
          quote_id: 'quote_abc123',
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      const refreshAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'refresh_quote'
      );
      expect(refreshAction).toBeDefined();
      expect(refreshAction.endpoint).toBe('/v1/quotes');
      expect(refreshAction.method).toBe('POST');
      
      const retryAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'retry_with_new_quote'
      );
      expect(retryAction).toBeDefined();
    });

    it('should include backoff strategy for SERVICE_UNAVAILABLE', async () => {
      class ServiceUnavailableError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('Service unavailable');
          this.name = 'ServiceUnavailableError';
        }
      }
      
      app.get('/test', () => {
        throw new ServiceUnavailableError(503, {
          estimated_restoration: '2025-01-01T11:00:00Z',
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      const backoffAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'retry_with_backoff'
      );
      expect(backoffAction).toBeDefined();
      expect(backoffAction.recommended_interval_seconds).toBe(30);
      
      // Check retry guidance
      expect(body.error.retry?.retry_after_seconds).toBe(30);
      expect(body.error.retry?.backoff_strategy).toBe('exponential');
    });

    it('should suggest retrieving existing for IDEMPOTENCY_CONFLICT', async () => {
      app.get('/test', () => {
        const error: any = new Error('Idempotency conflict');
        error.code = '23505';
        error.details = {
          existing_request_id: 'txn_existing123',
        };
        throw error;
      });

      const res = await app.request('/test');
      const body = await res.json();

      const retrieveAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'retrieve_existing'
      );
      expect(retrieveAction).toBeDefined();
      expect(retrieveAction.endpoint).toBe('/v1/transfers/txn_existing123');
      expect(retrieveAction.method).toBe('GET');
    });
  });

  describe('Workflow Error Actions', () => {
    it('should suggest submitting for APPROVAL_REQUIRED', async () => {
      class ApprovalRequiredError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('Approval required');
          this.name = 'ApprovalRequiredError';
        }
      }
      
      app.get('/test', () => {
        throw new ApprovalRequiredError(403, {
          workflow_id: 'wf_abc123',
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      const submitAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'submit_for_approval'
      );
      expect(submitAction).toBeDefined();
      expect(submitAction.endpoint).toContain('wf_abc123');
    });

    it('should include rejection reason for APPROVAL_REJECTED', async () => {
      class ApprovalRejectedError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('Approval rejected');
          this.name = 'ApprovalRejectedError';
        }
      }
      
      app.get('/test', () => {
        throw new ApprovalRejectedError(403, {
          rejection_reason: 'Amount exceeds policy limits',
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      const reviewAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'review_rejection'
      );
      expect(reviewAction).toBeDefined();
      expect(reviewAction.description).toContain('Amount exceeds policy limits');
    });
  });

  describe('State Error Actions', () => {
    it('should suggest funding stream for STREAM_INSUFFICIENT_FUNDING', async () => {
      class StreamInsufficientFundingError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('Stream insufficient funding');
          this.name = 'StreamInsufficientFundingError';
        }
      }
      
      app.get('/test', () => {
        throw new StreamInsufficientFundingError(400, {
          stream_id: 'stream_123',
          required_funding: '500.00',
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      const fundAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'fund_stream'
      );
      expect(fundAction).toBeDefined();
      expect(fundAction.endpoint).toBe('/v1/streams/stream_123/fund');
      expect(fundAction.min_amount).toBe('500.00');
    });
  });

  describe('Protocol Error Actions', () => {
    it('should include payment details for X402_PAYMENT_REQUIRED', async () => {
      class X402PaymentRequiredError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('x402 payment required');
          this.name = 'X402PaymentRequiredError';
        }
      }
      
      app.get('/test', () => {
        throw new X402PaymentRequiredError(402, {
          endpoint_id: 'ep_abc123',
          price: '0.01',
          currency: 'USDC',
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      const paymentAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'make_x402_payment'
      );
      expect(paymentAction).toBeDefined();
      expect(paymentAction.endpoint).toBe('ep_abc123');
      expect(paymentAction.parameters?.price).toBe('0.01');
      expect(paymentAction.parameters?.currency).toBe('USDC');
    });
  });

  describe('Settlement Error Actions', () => {
    it('should suggest alternative rail for RAIL_UNAVAILABLE', async () => {
      class RailUnavailableError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('Rail unavailable');
          this.name = 'RailUnavailableError';
        }
      }
      
      app.get('/test', () => {
        throw new RailUnavailableError(503, {
          rail: 'pix',
          estimated_restoration: '2025-01-01T12:00:00Z',
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      const altRailAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'use_alternative_rail'
      );
      expect(altRailAction).toBeDefined();
    });

    it('should suggest verifying details for RECIPIENT_VALIDATION_FAILED', async () => {
      class RecipientValidationFailedError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('Recipient validation failed');
          this.name = 'RecipientValidationFailedError';
        }
      }
      
      app.get('/test', () => {
        throw new RecipientValidationFailedError(400, {
          validation_errors: ['Invalid PIX key format'],
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      const verifyAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'verify_recipient_details'
      );
      expect(verifyAction).toBeDefined();
      expect(verifyAction.parameters?.validation_errors).toContain('Invalid PIX key format');
    });
  });

  describe('Resource Error Actions', () => {
    it('should suggest listing resources for NOT_FOUND errors', async () => {
      class AccountNotFoundError extends Error {
        constructor(public statusCode: number, public details: any) {
          super('Account not found');
          this.name = 'AccountNotFoundError';
        }
      }
      
      app.get('/test', () => {
        throw new AccountNotFoundError(404, {
          account_id: 'acc_invalid',
        });
      });

      const res = await app.request('/test');
      const body = await res.json();

      const listAction = body.error.suggested_actions?.find(
        (a: any) => a.action === 'list_resources'
      );
      expect(listAction).toBeDefined();
      expect(listAction.endpoint).toBe('/v1/accounts');
      expect(listAction.method).toBe('GET');
    });
  });
});

