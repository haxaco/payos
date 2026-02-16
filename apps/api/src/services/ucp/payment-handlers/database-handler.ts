/**
 * Database-Driven Payment Handler
 *
 * Generic handler that reads config from payment_handlers table
 * and writes instruments/payments to handler_payment_instruments / handler_payments.
 *
 * Supports three integration modes:
 * - demo:    Simulated success (for demos/testing)
 * - webhook: Forward requests to external URLs (future)
 * - custom:  Delegate to a registered TypeScript handler
 */

import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PaymentHandler,
  AcquireInstrumentRequest,
  AcquireInstrumentResult,
  ProcessPaymentRequest,
  ProcessPaymentResult,
  RefundPaymentRequest,
  RefundPaymentResult,
  PaymentStatus,
} from './types.js';

// =============================================================================
// Types
// =============================================================================

/** Row shape from payment_handlers table */
export interface PaymentHandlerRow {
  id: string;
  tenant_id: string | null;
  name: string;
  display_name: string;
  version: string;
  status: string;
  supported_types: string[];
  supported_currencies: string[];
  id_prefix: string;
  integration_mode: 'demo' | 'webhook' | 'custom';
  webhook_config: Record<string, unknown>;
  profile_metadata: Record<string, unknown>;
  validation_config: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

// =============================================================================
// ID Generation
// =============================================================================

function generateId(prefix: string, category: string): string {
  const hash = createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, 20);
  // e.g., pi_invu_abc123..., pay_invu_abc123...
  const fullPrefix = prefix ? `${category}_${prefix}_` : `${category}_`;
  return `${fullPrefix}${hash}`;
}

// =============================================================================
// Database Handler Factory
// =============================================================================

/**
 * Create a PaymentHandler backed by DB tables.
 *
 * For 'custom' mode, a code handler can be provided and will be called
 * instead of the default DB-only logic.
 */
export function createDatabaseHandler(
  row: PaymentHandlerRow,
  supabase: SupabaseClient,
  customHandler?: PaymentHandler,
): PaymentHandler {
  // For 'custom' mode with a registered code handler, delegate entirely
  if (row.integration_mode === 'custom' && customHandler) {
    return customHandler;
  }

  return {
    id: row.id,
    name: row.name,
    version: row.version,
    supportedTypes: row.supported_types,
    supportedCurrencies: row.supported_currencies,

    async acquireInstrument(
      request: AcquireInstrumentRequest,
    ): Promise<AcquireInstrumentResult> {
      const { type, config, currency } = request;

      // Validate type
      if (!row.supported_types.includes(type)) {
        return {
          success: false,
          error: {
            code: 'INVALID_INSTRUMENT_TYPE',
            message: `Handler "${row.id}" does not support type: ${type}. Supported: ${row.supported_types.join(', ')}`,
            retryable: false,
          },
        };
      }

      // Validate currency
      if (!row.supported_currencies.includes(currency)) {
        return {
          success: false,
          error: {
            code: 'INVALID_CURRENCY',
            message: `Handler "${row.id}" does not support currency: ${currency}. Supported: ${row.supported_currencies.join(', ')}`,
            retryable: false,
          },
        };
      }

      const instrumentId = generateId(row.id_prefix, 'pi');
      const tenantId = (config.tenantId as string) || 'unknown';
      const now = new Date().toISOString();

      // Build display info
      let last4: string | undefined;
      let brand: string | undefined = row.display_name;
      const recipient = config.recipient as Record<string, unknown> | undefined;
      if (recipient?.pix_key) {
        last4 = (recipient.pix_key as string).slice(-4);
      } else if (recipient?.clabe) {
        last4 = (recipient.clabe as string).slice(-4);
      } else if (recipient?.last4) {
        last4 = recipient.last4 as string;
      }

      // Persist instrument to DB
      const { error: insertError } = await supabase
        .from('handler_payment_instruments')
        .insert({
          id: instrumentId,
          tenant_id: tenantId,
          handler_id: row.id,
          checkout_id: (config.checkoutId as string) || null,
          type,
          status: 'active',
          last4,
          brand,
          reusable: false,
          data: {
            corridor: config.corridor || type,
            recipient,
            ...(config.data as Record<string, unknown> || {}),
          },
        });

      if (insertError) {
        console.error(`[DB Handler:${row.id}] Failed to insert instrument:`, insertError.message);
        return {
          success: false,
          error: {
            code: 'INSTRUMENT_CREATION_FAILED',
            message: `Failed to create instrument: ${insertError.message}`,
            retryable: true,
          },
        };
      }

      console.log(`[DB Handler:${row.id}] Created instrument ${instrumentId} type=${type}`);

      return {
        success: true,
        instrument: {
          id: instrumentId,
          handler: row.id,
          type,
          last4,
          brand,
          reusable: false,
          data: { corridor: config.corridor || type, recipient },
          createdAt: now,
        },
      };
    },

    async processPayment(
      request: ProcessPaymentRequest,
    ): Promise<ProcessPaymentResult> {
      const { instrumentId, amount, currency, idempotencyKey, metadata } = request;

      if (amount <= 0) {
        return {
          success: false,
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be greater than 0',
            retryable: false,
          },
        };
      }

      // Check idempotency
      if (idempotencyKey) {
        const { data: existing } = await supabase
          .from('handler_payments')
          .select('*')
          .eq('handler_id', row.id)
          .eq('idempotency_key', idempotencyKey)
          .single();

        if (existing) {
          return {
            success: true,
            payment: {
              id: existing.id,
              handler: row.id,
              instrumentId: existing.instrument_id,
              amount: existing.amount,
              currency: existing.currency,
              status: existing.status,
              settlementId: existing.settlement_id,
              externalId: existing.external_id,
              createdAt: existing.created_at,
              updatedAt: existing.updated_at,
            },
          };
        }
      }

      const paymentId = generateId(row.id_prefix, 'pay');
      const settlementId = generateId(row.id_prefix, 'stl');
      const tenantId = (metadata?.tenantId as string) || 'unknown';
      const checkoutId = (metadata?.checkoutId as string) || null;
      const now = new Date().toISOString();

      // Auto-persist instrument if it doesn't exist in DB yet
      // (instruments may come from checkout JSONB without going through acquireInstrument)
      if (instrumentId) {
        const { data: existingInstrument } = await supabase
          .from('handler_payment_instruments')
          .select('id')
          .eq('id', instrumentId)
          .single();

        if (!existingInstrument) {
          const { error: upsertErr } = await supabase
            .from('handler_payment_instruments')
            .insert({
              id: instrumentId,
              tenant_id: tenantId,
              handler_id: row.id,
              checkout_id: checkoutId,
              type: row.supported_types[0] || 'unknown',
              status: 'active',
              brand: row.display_name,
              data: {},
            });
          if (upsertErr) {
            console.warn(`[DB Handler:${row.id}] Could not auto-persist instrument ${instrumentId}: ${upsertErr.message}`);
          } else {
            console.log(`[DB Handler:${row.id}] Auto-persisted instrument ${instrumentId}`);
          }
        }
      }

      // For demo mode: simulate instant success
      // For webhook mode: would forward to external URL (future)
      const status = row.integration_mode === 'demo' ? 'succeeded' : 'pending';

      const { error: insertError } = await supabase
        .from('handler_payments')
        .insert({
          id: paymentId,
          tenant_id: tenantId,
          handler_id: row.id,
          instrument_id: instrumentId,
          checkout_id: checkoutId,
          amount,
          currency,
          status,
          settlement_id: settlementId,
          idempotency_key: idempotencyKey || null,
          metadata: metadata || {},
        });

      if (insertError) {
        console.error(`[DB Handler:${row.id}] Failed to insert payment:`, insertError.message);
        return {
          success: false,
          error: {
            code: 'PAYMENT_PROCESSING_FAILED',
            message: `Failed to process payment: ${insertError.message}`,
            retryable: true,
          },
        };
      }

      console.log(`[DB Handler:${row.id}] Payment ${paymentId} ${status} for ${amount} ${currency}`);

      return {
        success: true,
        payment: {
          id: paymentId,
          handler: row.id,
          instrumentId,
          amount,
          currency,
          status,
          settlementId,
          createdAt: now,
          updatedAt: now,
        },
      };
    },

    async refundPayment(
      request: RefundPaymentRequest,
    ): Promise<RefundPaymentResult> {
      const { paymentId, amount, reason } = request;

      // Look up payment
      const { data: payment, error: fetchError } = await supabase
        .from('handler_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (fetchError || !payment) {
        return {
          success: false,
          error: {
            code: 'PAYMENT_NOT_FOUND',
            message: 'Payment not found',
            retryable: false,
          },
        };
      }

      if (payment.status !== 'succeeded') {
        return {
          success: false,
          error: {
            code: 'INVALID_PAYMENT_STATUS',
            message: `Cannot refund payment in ${payment.status} status`,
            retryable: false,
          },
        };
      }

      const refundAmount = amount || payment.amount;
      if (refundAmount > payment.amount - (payment.refunded_amount || 0)) {
        return {
          success: false,
          error: {
            code: 'INVALID_REFUND_AMOUNT',
            message: 'Refund amount exceeds remaining payment amount',
            retryable: false,
          },
        };
      }

      const refundId = generateId(row.id_prefix, 'ref');
      const newRefundedTotal = (payment.refunded_amount || 0) + refundAmount;
      const newStatus = newRefundedTotal >= payment.amount ? 'refunded' : payment.status;

      await supabase
        .from('handler_payments')
        .update({
          status: newStatus,
          refunded_amount: newRefundedTotal,
        })
        .eq('id', paymentId);

      console.log(`[DB Handler:${row.id}] Refunded ${refundAmount} ${payment.currency} for payment ${paymentId}`);

      return {
        success: true,
        refund: {
          id: refundId,
          paymentId,
          amount: refundAmount,
          currency: payment.currency,
          status: 'succeeded',
          reason,
          createdAt: new Date().toISOString(),
        },
      };
    },

    async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
      const { data: payment, error } = await supabase
        .from('handler_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error || !payment) {
        throw new Error(`Payment not found: ${paymentId}`);
      }

      return {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        refundedAmount: payment.refunded_amount || 0,
        updatedAt: payment.updated_at,
      };
    },
  };
}
