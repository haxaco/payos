/**
 * Card Network Types
 * Epic 53: Card Network Integration
 *
 * Shared types for Visa VIC and Mastercard Agent Pay integrations.
 */

// ============================================
// Network Identification
// ============================================

export type CardNetwork = 'visa' | 'mastercard';

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'discover';

// ============================================
// Web Bot Auth (RFC 9421) Types
// ============================================

export interface WebBotAuthParams {
  /** The HTTP method of the request */
  method: string;
  /** The request URL path (without host) */
  path: string;
  /** Request headers to include in signature base */
  headers: Record<string, string>;
  /** The Signature-Input header value */
  signatureInput: string;
  /** The Signature header value */
  signature: string;
}

export interface SignatureComponents {
  /** Component identifiers used in the signature */
  components: string[];
  /** Key ID from the network's key directory */
  keyId: string;
  /** Algorithm used for signing (ed25519, rsa-sha256) */
  algorithm: string;
  /** Creation timestamp (Unix seconds) */
  created: number;
  /** Expiration timestamp (Unix seconds) */
  expires?: number;
  /** Nonce for replay protection */
  nonce?: string;
  /** Tag for signature purpose */
  tag?: string;
}

export interface VerificationResult {
  /** Whether the signature is valid */
  valid: boolean;
  /** The network the signature belongs to */
  network: CardNetwork;
  /** The agent/client key ID */
  keyId: string;
  /** Agent provider name (e.g., "openai", "anthropic") */
  agentProvider?: string;
  /** Error message if verification failed */
  error?: string;
  /** Verification timestamp */
  verifiedAt: string;
}

export interface NetworkPublicKey {
  /** Key ID */
  keyId: string;
  /** Network (visa or mastercard) */
  network: CardNetwork;
  /** Public key in PEM or raw format */
  publicKey: string;
  /** Signature algorithm */
  algorithm: 'ed25519' | 'rsa-sha256' | 'ecdsa-p256';
  /** When the key becomes valid */
  validFrom?: Date;
  /** When the key expires */
  validUntil?: Date;
  /** When this key was fetched from directory */
  fetchedAt: Date;
}

// ============================================
// Visa VIC Types
// ============================================

export interface VisaVICConfig {
  /** API key for Visa Developer Portal */
  apiKey: string;
  /** Shared secret for webhook verification */
  sharedSecret?: string;
  /** Whether to use sandbox environment */
  sandbox: boolean;
  /** Base URL override (optional) */
  baseUrl?: string;
  /** TAP key directory URL */
  tapKeyDirectory?: string;
}

export interface VisaPaymentInstruction {
  /** Unique identifier for this instruction */
  instructionId: string;
  /** Merchant reference */
  merchantRef: string;
  /** Amount in smallest currency unit */
  amount: number;
  /** Currency code (ISO 4217) */
  currency: string;
  /** Merchant details */
  merchant: {
    name: string;
    categoryCode: string;
    country: string;
    url?: string;
  };
  /** Optional card restrictions */
  restrictions?: {
    allowedBins?: string[];
    blockedBins?: string[];
    maxAttempts?: number;
  };
  /** Expiration time for this instruction */
  expiresAt: string;
  /** Metadata */
  metadata?: Record<string, string>;
}

export interface VisaCommerceSignal {
  /** The payment instruction ID */
  instructionId: string;
  /** Agent authentication token (VTS) */
  agentToken: string;
  /** Primary Account Number (for final settlement) */
  pan?: string;
  /** Cryptogram for transaction security */
  cryptogram: string;
  /** Transaction timestamp */
  transactionTime: string;
}

export interface VisaTokenResponse {
  /** Visa Token Service token ID */
  tokenId: string;
  /** Token status */
  status: 'active' | 'suspended' | 'deleted';
  /** Last 4 digits of tokenized card */
  lastFour: string;
  /** Token expiry */
  expiresAt: string;
  /** Associated PAN reference (encrypted) */
  panReference?: string;
}

// ============================================
// Mastercard Agent Pay Types
// ============================================

export interface MastercardConfig {
  /** Consumer key from Mastercard Developer Portal */
  consumerKey: string;
  /** Keystore path (P12 file) for OAuth 1.0a */
  keystorePath?: string;
  /** Keystore password */
  keystorePassword?: string;
  /** Private key in PEM format (alternative to keystore) */
  privateKeyPem?: string;
  /** Whether to use sandbox */
  sandbox: boolean;
  /** Base URL override */
  baseUrl?: string;
  /** Agent key directory URL */
  agentKeyDirectory?: string;
}

export interface MastercardAgentRegistration {
  /** Agent ID in PayOS */
  agentId: string;
  /** Mastercard-assigned agent ID */
  mcAgentId: string;
  /** Agent public key for verification */
  publicKey: string;
  /** Agent capabilities */
  capabilities: string[];
  /** Registration status */
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  /** Registration timestamp */
  registeredAt: string;
}

export interface MastercardAgenticToken {
  /** Token reference */
  tokenReference: string;
  /** Mastercard agent ID */
  mcAgentId: string;
  /** DTVC (Dynamic Token Verification Code) */
  dtvc?: string;
  /** Token status */
  status: 'active' | 'suspended' | 'expired';
  /** Token expiration */
  expiresAt: string;
}

export interface MastercardPaymentRequest {
  /** Unique request ID */
  requestId: string;
  /** Token reference for payment */
  tokenReference: string;
  /** Amount in smallest currency unit */
  amount: number;
  /** Currency code */
  currency: string;
  /** Merchant details */
  merchant: {
    name: string;
    id: string;
    categoryCode: string;
    country: string;
  };
  /** Optional metadata */
  metadata?: Record<string, string>;
}

// ============================================
// Unified Card Payment Types
// ============================================

export interface CardPaymentIntent {
  /** Unique intent ID */
  id: string;
  /** Card network used */
  network: CardNetwork;
  /** Intent status */
  status: 'created' | 'requires_action' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  /** Amount in smallest currency unit */
  amount: number;
  /** Currency code */
  currency: string;
  /** Merchant details */
  merchant: {
    name: string;
    categoryCode: string;
    country: string;
  };
  /** Network-specific data */
  networkData: {
    /** Visa: instructionId, Mastercard: requestId */
    referenceId: string;
    /** Network-specific token if applicable */
    token?: string;
    /** Cryptogram or DTVC */
    securityCode?: string;
  };
  /** Next action required (if any) */
  nextAction?: {
    type: 'provide_token' | 'confirm_payment' | 'redirect';
    data?: Record<string, unknown>;
  };
  /** Timestamps */
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  completedAt?: string;
  /** Error details if failed */
  error?: {
    code: string;
    message: string;
    declineReason?: string;
  };
  /** Metadata */
  metadata?: Record<string, string>;
}

export interface CardPaymentResult {
  /** Payment intent ID */
  intentId: string;
  /** Payment status */
  status: 'succeeded' | 'failed' | 'pending';
  /** Network used */
  network: CardNetwork;
  /** Final amount charged */
  amount: number;
  /** Currency */
  currency: string;
  /** Network fee */
  fee?: number;
  /** Net amount after fees */
  net?: number;
  /** Authorization code */
  authorizationCode?: string;
  /** Network reference number */
  networkReference?: string;
  /** Settlement timestamp */
  settledAt?: string;
  /** Error if failed */
  error?: {
    code: string;
    message: string;
    declineReason?: string;
  };
}

// ============================================
// Card Vaulting Types (Epic 54)
// ============================================

export interface VaultedCard {
  /** Vault ID */
  id: string;
  /** Tenant ID */
  tenantId: string;
  /** Account ID (card owner) */
  accountId: string;
  /** External processor for PCI storage */
  processor: 'stripe' | 'basis_theory' | 'spreedly';
  /** External processor token */
  processorToken: string;
  /** Card brand */
  cardBrand: CardBrand;
  /** Last 4 digits */
  lastFour: string;
  /** Expiry month (1-12) */
  expiryMonth: number;
  /** Expiry year (4-digit) */
  expiryYear: number;
  /** Cardholder name */
  cardholderName?: string;
  /** Network tokens */
  networkTokens: {
    visaVts?: {
      tokenId: string;
      expiresAt: string;
    };
    mastercardMdes?: {
      tokenId: string;
      expiresAt: string;
    };
  };
  /** Label for identification */
  label?: string;
  /** Card status */
  status: 'active' | 'inactive' | 'expired';
  /** Timestamps */
  createdAt: string;
  updatedAt: string;
}

export interface AgentCardAccess {
  /** Access record ID */
  id: string;
  /** Tenant ID */
  tenantId: string;
  /** Agent ID */
  agentId: string;
  /** Vaulted card ID */
  vaultedCardId: string;
  /** Permission flags */
  permissions: {
    canBrowse: boolean;   // Price comparison without purchase
    canPurchase: boolean; // Complete transactions
  };
  /** Spending limits (null = no limit) */
  limits: {
    perTransaction?: number;
    daily?: number;
    monthly?: number;
  };
  /** MCC restrictions */
  mccRestrictions: {
    allowed?: string[];   // Only allow these MCCs
    blocked?: string[];   // Block these MCCs (takes precedence)
  };
  /** Approval settings */
  approvalSettings: {
    requireAbove?: number;        // Require approval above this amount
    autoApproveMerchants?: string[]; // Auto-approve these merchants
  };
  /** Time restrictions */
  validFrom: string;
  validUntil?: string;
  /** Spending tracking */
  spending: {
    dailySpent: number;
    monthlySpent: number;
    dailyResetAt: string;
    monthlyResetAt: string;
  };
  /** Access status */
  status: 'active' | 'suspended' | 'revoked';
  /** Timestamps */
  createdAt: string;
}

export interface CardTransaction {
  /** Transaction ID */
  id: string;
  /** Tenant ID */
  tenantId: string;
  /** Vaulted card ID */
  vaultedCardId: string;
  /** Agent that made the purchase */
  agentId: string;
  /** Agent card access record */
  agentCardAccessId?: string;
  /** Transaction amount */
  amount: number;
  /** Currency */
  currency: string;
  /** Merchant details */
  merchant: {
    name: string;
    domain?: string;
    categoryCode: string;
  };
  /** Network used */
  network: CardNetwork;
  /** Network token used */
  networkTokenUsed?: string;
  /** Network transaction ID */
  networkTransactionId?: string;
  /** Authorization code */
  authorizationCode?: string;
  /** Transaction status */
  status: 'pending' | 'approved' | 'declined' | 'completed' | 'refunded' | 'disputed';
  /** Approval details */
  approval?: {
    required: boolean;
    approvedBy?: string;
    approvedAt?: string;
    notes?: string;
  };
  /** Decline details */
  decline?: {
    reason: string;
    code: string;
  };
  /** Timestamps */
  createdAt: string;
  completedAt?: string;
}

// ============================================
// Handler Types
// ============================================

export interface CardNetworkCredentials {
  /** Credential type */
  type: 'visa_vic' | 'mastercard_agent_pay';
  /** Visa-specific credentials */
  visa?: VisaVICConfig;
  /** Mastercard-specific credentials */
  mastercard?: MastercardConfig;
}

export interface CardHandlerCapabilities {
  /** Supported networks */
  networks: CardNetwork[];
  /** Supported currencies */
  currencies: string[];
  /** Supports recurring payments */
  supportsRecurring: boolean;
  /** Supports refunds */
  supportsRefunds: boolean;
  /** Supports partial refunds */
  supportsPartialRefunds: boolean;
  /** Supports webhooks */
  supportsWebhooks: boolean;
  /** Min/max amounts per currency */
  limits: Record<string, { min: number; max: number }>;
}
