/**
 * UCP (Universal Commerce Protocol) Types for SDK
 *
 * Types for interacting with PayOS UCP settlement and merchant discovery.
 *
 * @see Story 43.9: UCP Client Module
 */

// =============================================================================
// Discovery Types
// =============================================================================

/**
 * UCP Profile - fetched from /.well-known/ucp
 */
export interface UCPProfile {
  ucp: {
    version: string;
    services: Record<string, UCPService>;
    capabilities: UCPCapability[];
  };
  business?: {
    name: string;
    logo_url?: string;
    support_email?: string;
  };
  payment?: {
    handlers: UCPPaymentHandler[];
  };
  checkout?: {
    endpoint: string;
    supported_currencies: string[];
    payment_handlers: string[];
  };
}

export interface UCPService {
  version: string;
  spec?: string;
  rest?: {
    schema: string;
    endpoint: string;
  };
  mcp?: {
    endpoint: string;
    tools: string[];
  };
}

export interface UCPCapability {
  name: string;
  version: string;
  description?: string;
}

export interface UCPPaymentHandler {
  id: string;
  name: string;
  version: string;
  spec?: string;
  supported_currencies: string[];
  supported_corridors: UCPCorridor[];
}

export interface UCPCorridor {
  id: string;
  name: string;
  source_currency: string;
  destination_currency: string;
  destination_country: string;
  rail: 'pix' | 'spei' | 'wire' | 'usdc';
  estimated_settlement: string;
}

// =============================================================================
// Quote Types
// =============================================================================

export interface UCPQuoteRequest {
  corridor: 'pix' | 'spei';
  amount: number;
  currency: 'USD' | 'USDC';
}

export interface UCPQuote {
  from_amount: number;
  from_currency: string;
  to_amount: number;
  to_currency: string;
  fx_rate: number;
  fees: number;
  expires_at: string;
}

// =============================================================================
// Token Types
// =============================================================================

export interface UCPTokenRequest {
  corridor: 'pix' | 'spei';
  amount: number;
  currency: 'USD' | 'USDC';
  recipient: UCPRecipient;
  metadata?: Record<string, unknown>;
}

export type UCPRecipient = UCPPixRecipient | UCPSpeiRecipient;

export interface UCPPixRecipient {
  type: 'pix';
  pix_key: string;
  pix_key_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'evp';
  name: string;
  tax_id?: string;
}

export interface UCPSpeiRecipient {
  type: 'spei';
  clabe: string;
  name: string;
  rfc?: string;
}

export interface UCPToken {
  token: string;
  settlement_id: string;
  quote: UCPQuote;
  expires_at: string;
  created_at: string;
}

// =============================================================================
// Settlement Types
// =============================================================================

export interface UCPSettleRequest {
  token: string;
  idempotency_key?: string;
}

export interface UCPSettlement {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  token: string;
  transfer_id?: string;
  amount: {
    source: number;
    source_currency: string;
    destination: number;
    destination_currency: string;
    fx_rate: number;
    fees: number;
  };
  recipient: UCPRecipient;
  corridor: 'pix' | 'spei';
  estimated_completion?: string;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ListSettlementsOptions {
  status?: string;
  corridor?: string;
  limit?: number;
  offset?: number;
}

export interface ListSettlementsResponse {
  data: UCPSettlement[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

// =============================================================================
// Checkout Types (for consuming UCP merchants)
// =============================================================================

export interface UCPCheckoutRequest {
  line_items: UCPLineItem[];
  buyer?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  shipping_address?: UCPAddress;
}

export interface UCPLineItem {
  product_id?: string;
  name?: string;
  description?: string;
  quantity: number;
  unit_price?: number;
  currency?: string;
  variant?: Record<string, string>;
}

export interface UCPAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
}

export interface UCPCheckout {
  id: string;
  merchant_url: string;
  status: 'open' | 'completed' | 'cancelled' | 'expired';
  line_items: UCPLineItem[];
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    currency: string;
  };
  payment_handlers: string[];
  expires_at: string;
  created_at: string;
}

export interface UCPCompleteCheckoutRequest {
  payment_handler: string;
  payment_data: {
    token: string;
  };
  shipping_address?: UCPAddress;
}

export interface UCPOrder {
  id: string;
  checkout_id: string;
  status: 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  line_items: UCPLineItem[];
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    currency: string;
  };
  payment: {
    handler_id: string;
    status: string;
    settlement_id?: string;
  };
  created_at: string;
}

// =============================================================================
// Handler Info
// =============================================================================

export interface UCPHandlerInfo {
  handler: {
    id: string;
    name: string;
    version: string;
  };
  supported_corridors: string[];
  supported_currencies: string[];
  token_expiry_seconds: number;
}
