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
 * Epic 50.3: corridor now optional, defaults to 'auto' for rules-based settlement
 */
export interface UCPSettlementTokenRequest {
  corridor?: 'pix' | 'spei' | 'auto'; // Optional, defaults to 'auto'
  amount: number;
  currency: string;
  recipient: UCPRecipient;
  metadata?: Record<string, unknown>;
  defer_settlement?: boolean; // If true, create transfer only, defer settlement to rules engine
}

// Legacy alias for backward compatibility
export type UCPTokenRequest = UCPSettlementTokenRequest;

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
 * Epic 50.3: corridor now optional, defaults to 'auto' for rules-based settlement
 */
export interface UCPMandateSettleRequest {
  mandate_token: string;
  amount: number;
  currency: string;
  corridor?: 'pix' | 'spei' | 'auto'; // Optional, defaults to 'auto'
  recipient: UCPRecipient;
  idempotency_key?: string;
  defer_settlement?: boolean; // If true, create transfer only, defer settlement to rules engine
}

/**
 * Settlement Response
 * Epic 50.3: Added 'deferred' status and 'auto' corridor for rules-based settlement
 */
export interface UCPSettlement {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'deferred'; // Added 'deferred' for rules-based
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
  corridor: 'pix' | 'spei' | 'auto'; // Can be 'auto' when deferred to rules
  estimated_completion?: string;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
  deferred_to_rules?: boolean; // Epic 50.3: Whether settlement is managed by rules engine
  settlement_rule_id?: string; // Epic 50.3: Which rule will handle this settlement
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

// =============================================================================
// UCP Checkout Types (Phase 2)
// =============================================================================

/**
 * Checkout Status
 */
export type CheckoutStatus =
  | 'incomplete'
  | 'requires_escalation'
  | 'ready_for_complete'
  | 'complete_in_progress'
  | 'completed'
  | 'canceled';

/**
 * UCP Checkout Session
 */
export interface UCPCheckoutSession {
  id: string;
  tenant_id: string;
  status: CheckoutStatus;
  currency: string;
  line_items: UCPLineItem[];
  totals: UCPTotal[];
  buyer?: UCPBuyer | null;
  shipping_address?: UCPAddress | null;
  billing_address?: UCPAddress | null;
  payment_config: UCPPaymentConfig;
  payment_instruments: UCPPaymentInstrument[];
  selected_instrument_id?: string | null;
  messages: UCPCheckoutMessage[];
  continue_url?: string | null;
  cancel_url?: string | null;
  links: UCPLink[];
  metadata: Record<string, unknown>;
  order_id?: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Legacy UCPCheckout interface (for backward compatibility)
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

/**
 * Buyer information
 */
export interface UCPBuyer {
  email?: string;
  name?: string;
  phone?: string;
}

/**
 * Checkout total line
 */
export interface UCPTotal {
  type: 'subtotal' | 'tax' | 'shipping' | 'discount' | 'total' | string;
  amount: number;
  label: string;
}

/**
 * Payment configuration
 */
export interface UCPPaymentConfig {
  handlers: string[];
  default_handler?: string;
  capture_method?: 'automatic' | 'manual';
}

/**
 * Payment instrument (acquired during checkout)
 */
export interface UCPPaymentInstrument {
  id: string;
  handler: string;
  type: string;
  last4?: string;
  brand?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Checkout message (error, warning, info)
 */
export interface UCPCheckoutMessage {
  id: string;
  type: 'error' | 'warning' | 'info';
  code: string;
  severity?: 'recoverable' | 'requires_buyer_input' | 'requires_buyer_review';
  path?: string;
  content: string;
  content_type: 'plain' | 'markdown';
  created_at: string;
}

/**
 * Link (terms, privacy, support)
 */
export interface UCPLink {
  rel: string;
  href: string;
  title?: string;
}

/**
 * Create checkout request
 */
export interface CreateCheckoutRequest {
  currency: string;
  line_items?: UCPLineItem[];
  buyer?: UCPBuyer;
  shipping_address?: UCPAddress;
  billing_address?: UCPAddress;
  payment_config?: Partial<UCPPaymentConfig>;
  continue_url?: string;
  cancel_url?: string;
  links?: UCPLink[];
  metadata?: Record<string, unknown>;
  expires_in_hours?: number;
}

/**
 * Update checkout request
 */
export interface UpdateCheckoutRequest {
  line_items?: UCPLineItem[];
  buyer?: UCPBuyer;
  shipping_address?: UCPAddress | null;
  billing_address?: UCPAddress | null;
  payment_instruments?: UCPPaymentInstrument[];
  selected_instrument_id?: string | null;
  continue_url?: string;
  cancel_url?: string;
  metadata?: Record<string, unknown>;
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
 * Order status
 */
export type OrderStatus =
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

/**
 * UCP Order (result of completed checkout)
 */
export interface UCPOrder {
  id: string;
  tenant_id: string;
  checkout_id: string;
  status: OrderStatus;
  currency: string;
  line_items: UCPLineItem[];
  totals: UCPTotal[];
  buyer?: UCPBuyer | null;
  shipping_address?: UCPAddress | null;
  billing_address?: UCPAddress | null;
  payment: UCPOrderPayment;
  expectations: UCPExpectation[];
  events: UCPFulfillmentEvent[];
  adjustments: UCPAdjustment[];
  permalink_url?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Order payment info
 */
export interface UCPOrderPayment {
  handler_id: string;
  instrument_id?: string;
  status: 'pending' | 'completed' | 'failed';
  settlement_id?: string;
  amount: number;
  currency: string;
}

/**
 * Fulfillment expectation (delivery promise)
 */
export interface UCPExpectation {
  id: string;
  type: 'delivery' | 'pickup' | string;
  description: string;
  estimated_date?: string;
  tracking_url?: string;
}

/**
 * Fulfillment event
 */
export interface UCPFulfillmentEvent {
  id: string;
  type: 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'returned' | string;
  timestamp: string;
  description: string;
  tracking_number?: string;
  carrier?: string;
}

/**
 * Order adjustment (refund, return, etc.)
 */
export interface UCPAdjustment {
  id: string;
  type: 'refund' | 'return' | 'credit' | string;
  amount: number;
  reason?: string;
  created_at: string;
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

// =============================================================================
// UCP Identity Linking Types (Phase 4)
// =============================================================================

/**
 * OAuth 2.0 Scopes for identity linking
 */
export type UCPIdentityScope =
  | 'profile.read'           // Read buyer profile
  | 'profile.write'          // Update buyer profile
  | 'addresses.read'         // Read saved addresses
  | 'addresses.write'        // Manage addresses
  | 'payment_methods.read'   // Read saved payment methods
  | 'payment_methods.write'  // Manage payment methods
  | 'orders.read'            // Read order history
  | 'checkout.create'        // Create checkouts on behalf of user
  | 'checkout.complete';     // Complete checkouts on behalf of user

/**
 * Linked Account - Relationship between platform/agent and buyer
 */
export interface UCPLinkedAccount {
  id: string;
  tenant_id: string;
  /** Platform/agent identifier (who is linking) */
  platform_id: string;
  /** Platform name for display */
  platform_name: string;
  /** PayOS buyer account ID */
  buyer_id: string;
  /** Buyer email for reference */
  buyer_email?: string;
  /** Granted scopes */
  scopes: UCPIdentityScope[];
  /** Current access token hash (for validation) */
  access_token_hash: string;
  /** Refresh token hash */
  refresh_token_hash: string;
  /** Access token expiration */
  access_token_expires_at: string;
  /** Refresh token expiration */
  refresh_token_expires_at: string;
  /** Whether the link is currently active */
  is_active: boolean;
  /** When the account was linked */
  linked_at: string;
  /** When last used */
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * OAuth 2.0 Authorization Request
 */
export interface UCPAuthorizationRequest {
  /** OAuth 2.0 response type (always 'code' for authorization code flow) */
  response_type: 'code';
  /** Client/platform identifier */
  client_id: string;
  /** Redirect URI for callback */
  redirect_uri: string;
  /** Requested scopes (space-separated) */
  scope: string;
  /** CSRF protection state */
  state: string;
  /** PKCE code challenge */
  code_challenge?: string;
  /** PKCE code challenge method */
  code_challenge_method?: 'S256' | 'plain';
}

/**
 * OAuth 2.0 Authorization Response (success)
 */
export interface UCPAuthorizationResponse {
  /** Authorization code */
  code: string;
  /** State from request (echoed back) */
  state: string;
}

/**
 * OAuth 2.0 Token Request
 */
export interface UCPTokenRequest {
  /** Grant type */
  grant_type: 'authorization_code' | 'refresh_token';
  /** Client/platform identifier */
  client_id: string;
  /** Client secret (for confidential clients) */
  client_secret?: string;
  /** Authorization code (for authorization_code grant) */
  code?: string;
  /** Redirect URI (must match authorization request) */
  redirect_uri?: string;
  /** PKCE code verifier */
  code_verifier?: string;
  /** Refresh token (for refresh_token grant) */
  refresh_token?: string;
}

/**
 * OAuth 2.0 Token Response
 */
export interface UCPTokenResponse {
  /** Access token */
  access_token: string;
  /** Token type (always 'Bearer') */
  token_type: 'Bearer';
  /** Expires in seconds */
  expires_in: number;
  /** Refresh token */
  refresh_token: string;
  /** Granted scopes (space-separated) */
  scope: string;
}

/**
 * OAuth 2.0 Revoke Request
 */
export interface UCPRevokeRequest {
  /** Token to revoke */
  token: string;
  /** Token type hint */
  token_type_hint?: 'access_token' | 'refresh_token';
  /** Client identifier */
  client_id: string;
  /** Client secret */
  client_secret?: string;
}

/**
 * Authorization Code (temporary, stored during OAuth flow)
 */
export interface UCPAuthorizationCode {
  code: string;
  tenant_id: string;
  client_id: string;
  buyer_id: string;
  redirect_uri: string;
  scopes: UCPIdentityScope[];
  code_challenge?: string;
  code_challenge_method?: 'S256' | 'plain';
  state: string;
  expires_at: string;
  created_at: string;
  used: boolean;
}

/**
 * Registered OAuth Client/Platform
 */
export interface UCPOAuthClient {
  id: string;
  tenant_id: string;
  /** Client identifier (public) */
  client_id: string;
  /** Client secret hash (for confidential clients) */
  client_secret_hash?: string;
  /** Client name for display */
  name: string;
  /** Client logo URL */
  logo_url?: string;
  /** Allowed redirect URIs */
  redirect_uris: string[];
  /** Allowed scopes */
  allowed_scopes: UCPIdentityScope[];
  /** Client type */
  client_type: 'public' | 'confidential';
  /** Whether client is active */
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Identity Error Codes
 */
export type UCPIdentityErrorCode =
  | 'invalid_request'
  | 'unauthorized_client'
  | 'access_denied'
  | 'unsupported_response_type'
  | 'invalid_scope'
  | 'server_error'
  | 'temporarily_unavailable'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unsupported_grant_type';
