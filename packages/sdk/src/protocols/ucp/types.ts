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

// =============================================================================
// PayOS-Hosted Checkout Types (Phase 2)
// =============================================================================

/**
 * Checkout status state machine
 */
export type PayOSCheckoutStatus =
  | 'incomplete'
  | 'requires_escalation'
  | 'ready_for_complete'
  | 'complete_in_progress'
  | 'completed'
  | 'canceled';

/**
 * PayOS-hosted checkout session
 */
export interface PayOSCheckout {
  id: string;
  tenant_id: string;
  status: PayOSCheckoutStatus;
  currency: string;
  line_items: PayOSLineItem[];
  totals: PayOSTotal[];
  buyer?: PayOSBuyer | null;
  shipping_address?: UCPAddress | null;
  billing_address?: UCPAddress | null;
  payment_config: PayOSPaymentConfig;
  payment_instruments: PayOSPaymentInstrument[];
  selected_instrument_id?: string | null;
  messages: PayOSCheckoutMessage[];
  continue_url?: string | null;
  cancel_url?: string | null;
  links: PayOSLink[];
  metadata: Record<string, unknown>;
  order_id?: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface PayOSLineItem {
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

export interface PayOSTotal {
  type: 'subtotal' | 'tax' | 'shipping' | 'discount' | 'total' | string;
  amount: number;
  label: string;
  currency?: string;
}

export interface PayOSBuyer {
  email?: string;
  name?: string;
  phone?: string;
}

export interface PayOSPaymentConfig {
  handlers: string[];
  default_handler?: string;
  capture_method?: 'automatic' | 'manual';
}

export interface PayOSPaymentInstrument {
  id: string;
  handler: string;
  type: string;
  last4?: string;
  brand?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface PayOSCheckoutMessage {
  id: string;
  type: 'error' | 'warning' | 'info';
  code: string;
  severity?: 'recoverable' | 'requires_buyer_input' | 'requires_buyer_review';
  path?: string;
  content: string;
  content_type: 'plain' | 'markdown';
  created_at: string;
}

export interface PayOSLink {
  rel: string;
  href: string;
  title?: string;
}

export interface CreatePayOSCheckoutRequest {
  currency: string;
  line_items?: PayOSLineItem[];
  totals?: PayOSTotal[];
  buyer?: PayOSBuyer;
  shipping_address?: UCPAddress;
  billing_address?: UCPAddress;
  payment_config?: Partial<PayOSPaymentConfig>;
  continue_url?: string;
  cancel_url?: string;
  links?: PayOSLink[];
  metadata?: Record<string, unknown>;
  expires_in_hours?: number;
}

export interface UpdatePayOSCheckoutRequest {
  line_items?: PayOSLineItem[];
  totals?: PayOSTotal[];
  buyer?: PayOSBuyer;
  shipping_address?: UCPAddress | null;
  billing_address?: UCPAddress | null;
  selected_instrument_id?: string | null;
  continue_url?: string;
  cancel_url?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// PayOS Order Types (Phase 3)
// =============================================================================

export type PayOSOrderStatus =
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface PayOSOrder {
  id: string;
  tenant_id: string;
  checkout_id: string;
  status: PayOSOrderStatus;
  currency: string;
  line_items: PayOSLineItem[];
  totals: PayOSTotal[];
  buyer?: PayOSBuyer | null;
  shipping_address?: UCPAddress | null;
  billing_address?: UCPAddress | null;
  payment: PayOSOrderPayment;
  expectations: PayOSExpectation[];
  events: PayOSFulfillmentEvent[];
  adjustments: PayOSAdjustment[];
  permalink_url?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PayOSOrderPayment {
  handler: string;
  instrument_id?: string;
  transaction_id?: string;
  status: 'pending' | 'captured' | 'failed';
  captured_at?: string;
}

export interface PayOSExpectation {
  id: string;
  type: string;
  description: string;
  estimated_date?: string;
  tracking_url?: string;
}

export interface PayOSFulfillmentEvent {
  id: string;
  type: string;
  timestamp: string;
  description: string;
  tracking_number?: string;
  carrier?: string;
}

export interface PayOSAdjustment {
  id: string;
  type: 'refund' | 'return' | 'credit';
  amount: number;
  reason?: string;
  created_at: string;
}

export interface ListPayOSOrdersOptions {
  status?: PayOSOrderStatus;
  limit?: number;
  offset?: number;
}

export interface ListPayOSOrdersResponse {
  data: PayOSOrder[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    total_pages: number;
  };
}

// =============================================================================
// Identity Linking Types (Phase 4)
// =============================================================================

export type UCPIdentityScope =
  | 'profile.read'
  | 'profile.write'
  | 'addresses.read'
  | 'addresses.write'
  | 'payment_methods.read'
  | 'payment_methods.write'
  | 'orders.read'
  | 'checkout.create'
  | 'checkout.complete';

export interface UCPOAuthClient {
  id: string;
  client_id: string;
  name: string;
  logo_url?: string;
  redirect_uris: string[];
  allowed_scopes: UCPIdentityScope[];
  client_type: 'public' | 'confidential';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegisterOAuthClientRequest {
  name: string;
  redirect_uris: string[];
  allowed_scopes?: UCPIdentityScope[];
  client_type?: 'public' | 'confidential';
  logo_url?: string;
}

export interface RegisterOAuthClientResponse {
  client: UCPOAuthClient;
  client_secret?: string;
}

export interface UCPLinkedAccount {
  id: string;
  platform_id: string;
  platform_name: string;
  buyer_id?: string;
  buyer_email?: string;
  scopes: UCPIdentityScope[];
  linked_at: string;
  last_used_at?: string;
}

export interface UCPTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface UCPAuthorizationInfo {
  client: {
    id: string;
    name: string;
    logo_url?: string;
  };
  requested_scopes: string[];
  redirect_uri: string;
  state: string;
  code_challenge?: string;
  code_challenge_method?: 'S256' | 'plain';
}

export interface UCPConsentRequest {
  client_id: string;
  redirect_uri: string;
  scope: string;
  state: string;
  code_challenge?: string;
  code_challenge_method?: 'S256' | 'plain';
  buyer_id: string;
  approved: boolean;
}

export interface UCPConsentResponse {
  redirect_uri: string;
}

export interface UCPScopeInfo {
  name: UCPIdentityScope;
  description: string;
}
