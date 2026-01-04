/**
 * ACP protocol support (Stripe/OpenAI Agentic Commerce Protocol)
 * 
 * Provides SDK methods for:
 * - Creating and managing checkout sessions
 * - Completing payments with SharedPaymentToken
 * - Managing shopping carts and items
 */

export * from './types';
export { ACPClient } from './client';

// Re-export for backward compatibility
export type { Checkout, CheckoutItem, CreateCheckoutRequest, CompleteCheckoutRequest } from './types';

