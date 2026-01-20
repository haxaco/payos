/**
 * UCP (Universal Commerce Protocol) Types
 *
 * Google+Shopify's protocol for agentic commerce (January 2026).
 *
 * @see Epic 43: UCP Integration
 * @see https://ucp.dev/specification/overview/
 */

// =============================================================================
// UCP Profile Types
// =============================================================================

/**
 * UCP Profile - Published at /.well-known/ucp
 */
export interface UCPProfile {
  ucp: {
    version: string;
    services: Record<string, UCPService>;
    capabilities: UCPCapability[];
  };
  payment?: {
    handlers: UCPPaymentHandler[];
  };
  signing_keys?: UCPSigningKey[];
}

/**
 * UCP Service Definition
 */
export interface UCPService {
  version: string;
  spec: string;
  rest?: {
    schema: string;
    endpoint: string;
  };
  mcp?: {
    endpoint: string;
    tools: string[];
  };
}

/**
 * UCP Capability - What this service can do
 * @see https://ucp.dev/specification/overview/#capabilities
 */
export interface UCPCapability {
  /** Capability name in reverse-DNS format (e.g., dev.ucp.shopping.checkout) */
  name: string;
  /** Version in YYYY-MM-DD format */
  version: string;
  /** URL to capability specification */
  spec?: string;
  /** Human-readable description */
  description?: string;
  /** Extensions this capability supports */
  extensions?: string[];
}

/**
 * UCP Payment Handler Definition
 */
export interface UCPPaymentHandler {
  id: string;
  name: string;
  version: string;
  spec: string;
  config_schema: string;
  instrument_schemas: string[];
  supported_currencies: string[];
  supported_corridors: UCPCorridor[];
}

/**
 * Settlement Corridor
 */
export interface UCPCorridor {
  id: string;
  name: string;
  source_currency: string;
  destination_currency: string;
  destination_country: string;
  rail: 'pix' | 'spei' | 'wire' | 'usdc';
  estimated_settlement: string;
}

/**
 * UCP Signing Key for webhook verification
 */
export interface UCPSigningKey {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n?: string;
  e?: string;
  x?: string;
  y?: string;
  crv?: string;
}

// =============================================================================
// UCP Version Negotiation
// =============================================================================

/**
 * UCP-Agent header parsed info
 */
export interface UCPAgentHeader {
  name: string;
  version: string;
  profileUrl?: string;
}

/**
 * Negotiated capabilities between platform and PayOS
 */
export interface UCPNegotiatedCapabilities {
  version: string;
  capabilities: string[];
  handlers: string[];
}

// =============================================================================
// UCP Settlement Token Types
// =============================================================================

/**
 * Settlement Token Request
 */
export interface UCPTokenRequest {
  corridor: 'pix' | 'spei';
  amount: number;
  currency: string;
  recipient: UCPRecipient;
  metadata?: Record<string, unknown>;
}

/**
 * Settlement Token Response
 */
export interface UCPToken {
  token: string;
  settlement_id: string;
  quote: {
    from_amount: number;
    from_currency: string;
    to_amount: number;
    to_currency: string;
    fx_rate: number;
    fees: number;
  };
  expires_at: string;
  created_at: string;
}

/**
 * UCP Recipient (Pix or SPEI)
 */
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

// =============================================================================
// UCP Settlement Types
// =============================================================================

/**
 * Settlement Request with Token
 */
export interface UCPSettleRequest {
  token: string;
  idempotency_key?: string;
}

/**
 * Settlement with AP2 Mandate
 */
export interface UCPMandateSettleRequest {
  mandate_token: string;
  amount: number;
  currency: string;
  corridor: 'pix' | 'spei';
  recipient: UCPRecipient;
  idempotency_key?: string;
}

/**
 * Settlement Response
 */
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

// =============================================================================
// UCP Webhook Types
// =============================================================================

export type UCPWebhookEventType =
  | 'settlement.created'
  | 'settlement.processing'
  | 'settlement.completed'
  | 'settlement.failed';

export interface UCPWebhookEvent {
  id: string;
  type: UCPWebhookEventType;
  timestamp: string;
  data: {
    settlement_id: string;
    status: string;
    [key: string]: unknown;
  };
  signature?: string;
}

// =============================================================================
// UCP Client Types (for consuming UCP merchants)
// =============================================================================

/**
 * Merchant UCP Profile (fetched via discovery)
 */
export interface UCPMerchantProfile {
  ucp: {
    version: string;
    services: Record<string, UCPService>;
    capabilities: UCPCapability[];
  };
  business?: {
    name: string;
    logo_url?: string;
    support_email?: string;
    tos_url?: string;
    privacy_url?: string;
  };
  checkout?: {
    endpoint: string;
    supported_currencies: string[];
    payment_handlers: string[];
  };
}

/**
 * UCP Checkout Session
 */
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
  buyer?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  payment_handlers: string[];
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface UCPLineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  image_url?: string;
  product_url?: string;
}

/**
 * UCP Order (result of completed checkout)
 */
export interface UCPOrder {
  id: string;
  checkout_id: string;
  merchant_url: string;
  status: 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
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
    status: 'pending' | 'completed' | 'failed';
    settlement_id?: string;
  };
  shipping?: {
    address?: UCPAddress;
    method?: string;
    tracking_number?: string;
    tracking_url?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface UCPAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
}

// =============================================================================
// UCP Error Types
// =============================================================================

export interface UCPError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type UCPErrorCode =
  | 'version_unsupported'
  | 'capability_unsupported'
  | 'handler_not_found'
  | 'token_expired'
  | 'token_invalid'
  | 'settlement_failed'
  | 'mandate_invalid'
  | 'mandate_expired'
  | 'amount_exceeded'
  | 'corridor_unavailable'
  | 'recipient_invalid';
