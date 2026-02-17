/**
 * Connected Account Bridge
 *
 * Bridges UCP payment handler calls to Epic 48 handler instances.
 * When a UCP checkout uses a handler with integration_mode='connected_account',
 * this module:
 *   1. Resolves the handler type from the payment_handlers row metadata
 *   2. Looks up the tenant's connected_accounts credentials via Epic 48 registry
 *   3. Creates a real Stripe/PayPal/Circle handler instance
 *   4. Calls createPaymentIntent + capturePayment
 *   5. Maps the result back to UCP ProcessPaymentResult / RefundPaymentResult
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaymentHandlerRow } from './database-handler.js';
import type {
  ProcessPaymentRequest,
  ProcessPaymentResult,
  RefundPaymentRequest,
  RefundPaymentResult,
} from './types.js';
import { getHandler as getEpic48Handler, type HandlerType } from '../../handlers/registry.js';
import type { PaymentMethod, Currency, PaymentIntent } from '../../handlers/interface.js';

// =============================================================================
// Payment Processing Bridge
// =============================================================================

/**
 * Process a UCP payment via the tenant's connected account.
 *
 * Resolves the Epic 48 handler type from the payment_handlers row,
 * looks up credentials in connected_accounts, creates a provider handler,
 * then calls createPaymentIntent → capturePayment.
 */
export async function processPaymentViaConnectedAccount(
  row: PaymentHandlerRow,
  request: ProcessPaymentRequest,
  supabase: SupabaseClient,
): Promise<ProcessPaymentResult> {
  const tenantId = (request.metadata?.tenantId as string) || null;
  if (!tenantId) {
    return {
      success: false,
      error: {
        code: 'MISSING_TENANT_ID',
        message: 'tenantId is required in metadata for connected_account payments',
        retryable: false,
      },
    };
  }

  // Resolve which Epic 48 handler type to use (stripe, paypal, circle)
  const handlerType = resolveHandlerType(row);
  if (!handlerType) {
    return {
      success: false,
      error: {
        code: 'INVALID_HANDLER_CONFIG',
        message: `No connected_handler_type in metadata for handler "${row.id}"`,
        retryable: false,
      },
    };
  }

  // Get the Epic 48 handler (reads connected_accounts, decrypts credentials)
  let epic48Handler;
  try {
    epic48Handler = await getEpic48Handler(tenantId, handlerType);
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'HANDLER_INIT_FAILED',
        message: `Failed to initialize ${handlerType} handler: ${err.message}`,
        retryable: true,
      },
    };
  }

  if (!epic48Handler) {
    return {
      success: false,
      error: {
        code: 'NO_CONNECTED_ACCOUNT',
        message: `No active ${handlerType} account connected for this tenant. Connect one via the dashboard.`,
        retryable: false,
      },
    };
  }

  // Resolve payment method from the instrument in DB
  const paymentMethod = await resolvePaymentMethod(request.instrumentId, supabase, row);

  // Create payment intent via the real provider
  let intent: PaymentIntent;
  try {
    intent = await epic48Handler.createPaymentIntent({
      amount: request.amount,
      currency: request.currency as Currency,
      method: paymentMethod,
      description: request.description,
      metadata: {
        ...(request.metadata ? Object.fromEntries(
          Object.entries(request.metadata).map(([k, v]) => [k, String(v)])
        ) : {}),
        ucp_checkout: 'true',
      },
    });
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'PAYMENT_INTENT_FAILED',
        message: `${handlerType} createPaymentIntent failed: ${err.message}`,
        retryable: true,
      },
    };
  }

  // Handle the intent status
  if (intent.status === 'succeeded') {
    // Auto-captured (e.g., Circle payments)
    return {
      success: true,
      payment: {
        id: intent.id,
        handler: row.id,
        instrumentId: request.instrumentId,
        amount: intent.amount,
        currency: intent.currency,
        status: 'succeeded',
        externalId: intent.id,
        createdAt: intent.createdAt,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  if (intent.status === 'requires_action') {
    // 3DS or redirect-based flow — not supported in server-side UCP
    return {
      success: false,
      error: {
        code: 'REQUIRES_ACTION',
        message: `Payment requires user action (e.g., 3D Secure). This is not supported in server-side checkout.`,
        retryable: false,
        details: { nextAction: intent.nextAction },
      },
    };
  }

  if (intent.status === 'failed' || intent.status === 'canceled') {
    return {
      success: false,
      error: {
        code: 'PAYMENT_FAILED',
        message: `${handlerType} payment ${intent.status}`,
        retryable: false,
      },
    };
  }

  // For pending/processing — attempt capture
  try {
    const captureResult = await epic48Handler.capturePayment(intent.id, request.amount);

    if (captureResult.status === 'succeeded') {
      return {
        success: true,
        payment: {
          id: captureResult.id,
          handler: row.id,
          instrumentId: request.instrumentId,
          amount: captureResult.amount,
          currency: captureResult.currency,
          status: 'succeeded',
          externalId: captureResult.id,
          createdAt: intent.createdAt,
          updatedAt: captureResult.capturedAt || new Date().toISOString(),
        },
      };
    }

    if (captureResult.status === 'pending') {
      return {
        success: true,
        payment: {
          id: captureResult.id,
          handler: row.id,
          instrumentId: request.instrumentId,
          amount: captureResult.amount,
          currency: captureResult.currency,
          status: 'processing',
          externalId: captureResult.id,
          createdAt: intent.createdAt,
          updatedAt: new Date().toISOString(),
        },
      };
    }

    // Capture failed
    return {
      success: false,
      error: {
        code: 'CAPTURE_FAILED',
        message: captureResult.failureMessage || `${handlerType} capture failed`,
        retryable: false,
        details: { failureCode: captureResult.failureCode },
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'CAPTURE_ERROR',
        message: `${handlerType} capturePayment failed: ${err.message}`,
        retryable: true,
      },
    };
  }
}

// =============================================================================
// Refund Bridge
// =============================================================================

/**
 * Refund a payment via the tenant's connected account.
 *
 * Maps UCP RefundPaymentRequest → Epic 48 refundPayment → UCP RefundPaymentResult.
 */
export async function refundPaymentViaConnectedAccount(
  row: PaymentHandlerRow,
  request: RefundPaymentRequest,
  externalId: string,
  tenantId: string,
): Promise<RefundPaymentResult> {
  const handlerType = resolveHandlerType(row);
  if (!handlerType) {
    return {
      success: false,
      error: {
        code: 'INVALID_HANDLER_CONFIG',
        message: `No connected_handler_type in metadata for handler "${row.id}"`,
        retryable: false,
      },
    };
  }

  let epic48Handler;
  try {
    epic48Handler = await getEpic48Handler(tenantId, handlerType);
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'HANDLER_INIT_FAILED',
        message: `Failed to initialize ${handlerType} handler for refund: ${err.message}`,
        retryable: true,
      },
    };
  }

  if (!epic48Handler) {
    return {
      success: false,
      error: {
        code: 'NO_CONNECTED_ACCOUNT',
        message: `No active ${handlerType} account connected for this tenant`,
        retryable: false,
      },
    };
  }

  try {
    const refundResult = await epic48Handler.refundPayment(
      externalId,
      request.amount,
      request.reason,
    );

    return {
      success: true,
      refund: {
        id: refundResult.id,
        paymentId: request.paymentId,
        amount: refundResult.amount,
        currency: refundResult.currency,
        status: refundResult.status,
        reason: request.reason,
        createdAt: refundResult.createdAt,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'REFUND_FAILED',
        message: `${handlerType} refund failed: ${err.message}`,
        retryable: true,
      },
    };
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract the connected handler type from the payment_handlers row metadata.
 */
function resolveHandlerType(row: PaymentHandlerRow): HandlerType | null {
  const type = row.metadata?.connected_handler_type as string | undefined;
  if (!type) return null;
  return type as HandlerType;
}

/**
 * Look up the instrument type from handler_payment_instruments to determine
 * the Epic 48 PaymentMethod (card, pix, bank_transfer, etc.).
 */
async function resolvePaymentMethod(
  instrumentId: string,
  supabase: SupabaseClient,
  row: PaymentHandlerRow,
): Promise<PaymentMethod> {
  if (instrumentId) {
    const { data: instrument } = await supabase
      .from('handler_payment_instruments')
      .select('type')
      .eq('id', instrumentId)
      .single();

    if (instrument?.type) {
      // Map UCP instrument types to Epic 48 PaymentMethod
      const typeMap: Record<string, PaymentMethod> = {
        card: 'card',
        bank_transfer: 'bank_transfer',
        pix: 'pix',
        spei: 'spei',
        usdc: 'usdc',
        wallet: 'wallet',
      };
      return typeMap[instrument.type] || 'card';
    }
  }

  // Default to card if we can't determine the type
  return row.supported_types.includes('card') ? 'card' : (row.supported_types[0] as PaymentMethod) || 'card';
}
