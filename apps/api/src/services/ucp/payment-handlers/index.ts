/**
 * UCP Payment Handlers Registry
 *
 * Central registry for pluggable payment handlers.
 * Handlers can be registered and looked up by ID.
 *
 * @see Phase 2: Payment Handlers Architecture
 */

import type {
  PaymentHandler,
  HandlerRegistration,
  AcquireInstrumentRequest,
  AcquireInstrumentResult,
  ProcessPaymentRequest,
  ProcessPaymentResult,
  RefundPaymentRequest,
  RefundPaymentResult,
  PaymentStatus,
} from './types.js';
import { payosHandler, clearPayosStores } from './payos.js';

// Re-export types
export * from './types.js';

// =============================================================================
// Handler Registry
// =============================================================================

const handlers = new Map<string, PaymentHandler>();

/**
 * Register a payment handler
 */
export function registerHandler(handler: PaymentHandler): void {
  if (handlers.has(handler.id)) {
    console.warn(`[Payment Handlers] Handler ${handler.id} is being re-registered`);
  }
  handlers.set(handler.id, handler);
  console.log(`[Payment Handlers] Registered handler: ${handler.id} (${handler.name})`);
}

/**
 * Get a handler by ID
 */
export function getHandler(handlerId: string): PaymentHandler | undefined {
  return handlers.get(handlerId);
}

/**
 * Get all registered handlers
 */
export function getAllHandlers(): PaymentHandler[] {
  return Array.from(handlers.values());
}

/**
 * Get handler registrations (for profile/discovery)
 */
export function getHandlerRegistrations(): HandlerRegistration[] {
  return getAllHandlers().map((h) => ({
    id: h.id,
    name: h.name,
    version: h.version,
    supportedTypes: h.supportedTypes,
    supportedCurrencies: h.supportedCurrencies,
  }));
}

/**
 * Check if a handler is registered
 */
export function hasHandler(handlerId: string): boolean {
  return handlers.has(handlerId);
}

// =============================================================================
// Handler Operations (Convenience wrappers)
// =============================================================================

/**
 * Acquire a payment instrument using a specific handler
 */
export async function acquireInstrument(
  handlerId: string,
  request: AcquireInstrumentRequest
): Promise<AcquireInstrumentResult> {
  const handler = getHandler(handlerId);
  if (!handler) {
    return {
      success: false,
      error: {
        code: 'HANDLER_NOT_FOUND',
        message: `Payment handler not found: ${handlerId}`,
        retryable: false,
      },
    };
  }
  return handler.acquireInstrument(request);
}

/**
 * Process a payment using a specific handler
 */
export async function processPayment(
  handlerId: string,
  request: ProcessPaymentRequest
): Promise<ProcessPaymentResult> {
  const handler = getHandler(handlerId);
  if (!handler) {
    return {
      success: false,
      error: {
        code: 'HANDLER_NOT_FOUND',
        message: `Payment handler not found: ${handlerId}`,
        retryable: false,
      },
    };
  }
  return handler.processPayment(request);
}

/**
 * Refund a payment using a specific handler
 */
export async function refundPayment(
  handlerId: string,
  request: RefundPaymentRequest
): Promise<RefundPaymentResult> {
  const handler = getHandler(handlerId);
  if (!handler) {
    return {
      success: false,
      error: {
        code: 'HANDLER_NOT_FOUND',
        message: `Payment handler not found: ${handlerId}`,
        retryable: false,
      },
    };
  }
  return handler.refundPayment(request);
}

/**
 * Get payment status from a specific handler
 */
export async function getPaymentStatus(
  handlerId: string,
  paymentId: string
): Promise<PaymentStatus> {
  const handler = getHandler(handlerId);
  if (!handler) {
    throw new Error(`Payment handler not found: ${handlerId}`);
  }
  return handler.getPaymentStatus(paymentId);
}

// =============================================================================
// Handler Selection
// =============================================================================

/**
 * Find handlers that support a specific type and currency
 */
export function findHandlers(options: {
  type?: string;
  currency?: string;
}): PaymentHandler[] {
  const { type, currency } = options;

  return getAllHandlers().filter((handler) => {
    if (type && !handler.supportedTypes.includes(type)) {
      return false;
    }
    if (currency && !handler.supportedCurrencies.includes(currency)) {
      return false;
    }
    return true;
  });
}

/**
 * Get the default handler for a type and currency
 */
export function getDefaultHandler(options: {
  type?: string;
  currency?: string;
}): PaymentHandler | undefined {
  const matching = findHandlers(options);
  // Return PayOS handler if available, otherwise first matching
  return matching.find((h) => h.id === 'payos') || matching[0];
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize built-in handlers
 */
export function initializeHandlers(): void {
  // Register PayOS handler
  registerHandler(payosHandler);

  // Future: Register other handlers
  // registerHandler(stripeHandler);
  // registerHandler(googlePayHandler);

  console.log(`[Payment Handlers] Initialized ${handlers.size} handler(s)`);
}

/**
 * Clear all handlers and stores (for testing)
 */
export function clearHandlers(): void {
  handlers.clear();
  clearPayosStores();
}

// Auto-initialize on module load
initializeHandlers();
