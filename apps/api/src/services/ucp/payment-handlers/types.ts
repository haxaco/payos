/**
 * UCP Payment Handler Types
 *
 * Defines the interface for pluggable payment handlers.
 * Handlers process payments for different methods (cards, wallets, settlement).
 *
 * @see Phase 2: Payment Handlers Architecture
 * @see https://ucp.dev/specification/checkout/#payment-handlers
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * Payment handler interface
 */
export interface PaymentHandler {
  /** Unique handler ID (e.g., 'payos', 'stripe', 'google_pay') */
  id: string;

  /** Handler name in reverse-DNS format (e.g., 'com.payos.payment') */
  name: string;

  /** Handler version */
  version: string;

  /** Supported payment method types */
  supportedTypes: string[];

  /** Supported currencies */
  supportedCurrencies: string[];

  /**
   * Acquire a payment instrument
   * Creates or tokenizes a payment method for use in checkout
   */
  acquireInstrument(
    request: AcquireInstrumentRequest
  ): Promise<AcquireInstrumentResult>;

  /**
   * Process a payment
   * Charges the payment instrument
   */
  processPayment(request: ProcessPaymentRequest): Promise<ProcessPaymentResult>;

  /**
   * Refund a payment
   */
  refundPayment(request: RefundPaymentRequest): Promise<RefundPaymentResult>;

  /**
   * Get payment status
   */
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
}

// =============================================================================
// Request/Response Types
// =============================================================================

/**
 * Request to acquire a payment instrument
 */
export interface AcquireInstrumentRequest {
  /** Type of instrument to acquire */
  type: string;
  /** Handler-specific configuration */
  config: Record<string, unknown>;
  /** Currency for the payment */
  currency: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of acquiring a payment instrument
 */
export interface AcquireInstrumentResult {
  success: boolean;
  instrument?: PaymentInstrument;
  error?: PaymentError;
}

/**
 * Payment instrument (tokenized payment method)
 */
export interface PaymentInstrument {
  /** Unique instrument ID */
  id: string;
  /** Handler that created this instrument */
  handler: string;
  /** Instrument type (e.g., 'card', 'pix', 'bank_account') */
  type: string;
  /** Last 4 digits (for display) */
  last4?: string;
  /** Brand (for cards) */
  brand?: string;
  /** Expiration (for cards) */
  expiresAt?: string;
  /** Whether this can be reused */
  reusable: boolean;
  /** Handler-specific data */
  data?: Record<string, unknown>;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Request to process a payment
 */
export interface ProcessPaymentRequest {
  /** Instrument to charge */
  instrumentId: string;
  /** Amount in smallest currency unit (cents) */
  amount: number;
  /** Currency code */
  currency: string;
  /** Idempotency key */
  idempotencyKey?: string;
  /** Capture method */
  captureMethod?: 'automatic' | 'manual';
  /** Description */
  description?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of processing a payment
 */
export interface ProcessPaymentResult {
  success: boolean;
  payment?: Payment;
  error?: PaymentError;
}

/**
 * Payment record
 */
export interface Payment {
  /** Unique payment ID */
  id: string;
  /** Handler that processed this */
  handler: string;
  /** Instrument used */
  instrumentId: string;
  /** Amount charged */
  amount: number;
  /** Currency */
  currency: string;
  /** Payment status */
  status: PaymentStatusType;
  /** Capture status (for auth + capture flow) */
  captureStatus?: 'pending' | 'captured' | 'voided';
  /** Settlement reference (for PayOS) */
  settlementId?: string;
  /** External reference (from handler) */
  externalId?: string;
  /** Failure reason */
  failureReason?: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

export type PaymentStatusType =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

/**
 * Request to refund a payment
 */
export interface RefundPaymentRequest {
  /** Payment ID to refund */
  paymentId: string;
  /** Amount to refund (partial refund if less than original) */
  amount?: number;
  /** Reason for refund */
  reason?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of refunding a payment
 */
export interface RefundPaymentResult {
  success: boolean;
  refund?: Refund;
  error?: PaymentError;
}

/**
 * Refund record
 */
export interface Refund {
  /** Unique refund ID */
  id: string;
  /** Original payment ID */
  paymentId: string;
  /** Refund amount */
  amount: number;
  /** Currency */
  currency: string;
  /** Refund status */
  status: 'pending' | 'succeeded' | 'failed';
  /** Reason */
  reason?: string;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Payment status response
 */
export interface PaymentStatus {
  paymentId: string;
  status: PaymentStatusType;
  amount: number;
  currency: string;
  captureStatus?: 'pending' | 'captured' | 'voided';
  refundedAmount?: number;
  updatedAt: string;
}

/**
 * Payment error
 */
export interface PaymentError {
  /** Error code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Whether this error is retryable */
  retryable: boolean;
  /** Decline code (for card declines) */
  declineCode?: string;
  /** Additional details */
  details?: Record<string, unknown>;
}

// =============================================================================
// Handler Registration
// =============================================================================

/**
 * Handler registration info
 */
export interface HandlerRegistration {
  id: string;
  name: string;
  version: string;
  supportedTypes: string[];
  supportedCurrencies: string[];
  configSchema?: string; // URL to JSON Schema
  instrumentSchemas?: string[]; // URLs to instrument schemas
}
