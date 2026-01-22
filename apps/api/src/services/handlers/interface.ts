/**
 * Payment Handler Interface
 * Epic 48, Story 48.4: Abstraction layer for payment handlers
 *
 * Defines the contract that all payment handlers must implement.
 */

export type PaymentMethod = 'card' | 'bank_transfer' | 'pix' | 'spei' | 'usdc' | 'wallet';
export type Currency = 'USD' | 'BRL' | 'MXN' | 'EUR' | 'USDC';

export interface PaymentIntentParams {
  amount: number; // In smallest currency unit (cents)
  currency: Currency;
  method: PaymentMethod;
  description?: string;
  metadata?: Record<string, string>;
  customer?: {
    id?: string;
    email?: string;
    name?: string;
  };
  returnUrl?: string;
}

export interface PaymentIntent {
  id: string;
  handler: string;
  status: 'pending' | 'requires_action' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  amount: number;
  currency: Currency;
  clientSecret?: string; // For client-side confirmation
  nextAction?: {
    type: 'redirect' | 'display_qr' | 'await_payment';
    redirectUrl?: string;
    qrCode?: string;
    expiresAt?: string;
  };
  metadata?: Record<string, string>;
  createdAt: string;
}

export interface PaymentResult {
  id: string;
  handler: string;
  status: 'succeeded' | 'failed' | 'pending';
  amount: number;
  currency: Currency;
  fee?: number;
  net?: number;
  failureCode?: string;
  failureMessage?: string;
  metadata?: Record<string, string>;
  capturedAt?: string;
}

export interface RefundResult {
  id: string;
  handler: string;
  paymentId: string;
  status: 'pending' | 'succeeded' | 'failed';
  amount: number;
  currency: Currency;
  reason?: string;
  failureCode?: string;
  failureMessage?: string;
  createdAt: string;
}

export interface WebhookEvent {
  id: string;
  handler: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface HandlerCapabilities {
  supportedMethods: PaymentMethod[];
  supportedCurrencies: Currency[];
  supportsRefunds: boolean;
  supportsPartialRefunds: boolean;
  supportsRecurring: boolean;
  supportsWebhooks: boolean;
  minAmount: Record<Currency, number>;
  maxAmount: Record<Currency, number>;
}

/**
 * Payment Handler Interface
 * All payment handlers must implement this interface.
 */
export interface PaymentHandler {
  /** Unique identifier for this handler */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Handler capabilities */
  readonly capabilities: HandlerCapabilities;

  /**
   * Check if handler supports a payment method
   */
  supportsMethod(method: PaymentMethod): boolean;

  /**
   * Check if handler supports a currency
   */
  supportsCurrency(currency: Currency): boolean;

  /**
   * Create a payment intent (start payment flow)
   */
  createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntent>;

  /**
   * Capture a previously authorized payment
   */
  capturePayment(intentId: string, amount?: number): Promise<PaymentResult>;

  /**
   * Cancel a payment intent
   */
  cancelPayment(intentId: string): Promise<void>;

  /**
   * Refund a completed payment
   */
  refundPayment(paymentId: string, amount?: number, reason?: string): Promise<RefundResult>;

  /**
   * Get payment details
   */
  getPayment(paymentId: string): Promise<PaymentResult | null>;

  /**
   * Verify a webhook signature
   */
  verifyWebhook(payload: string | Buffer, signature: string): boolean;

  /**
   * Parse a webhook event
   */
  parseWebhookEvent(payload: string | Buffer): WebhookEvent;
}

/**
 * Handler credentials for different providers
 */
export interface StripeCredentials {
  api_key: string;
  webhook_secret?: string;
}

export interface PayPalCredentials {
  client_id: string;
  client_secret: string;
  sandbox?: boolean;
}

export interface CircleCredentials {
  api_key: string;
  entity_id?: string;
  sandbox?: boolean;
}

export interface PayOSNativeCredentials {
  pix_key?: string;
  pix_key_type?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  clabe?: string;
}

export type HandlerCredentials =
  | StripeCredentials
  | PayPalCredentials
  | CircleCredentials
  | PayOSNativeCredentials;
