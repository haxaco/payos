/**
 * Card Network Types
 *
 * Type definitions for Visa VIC and Mastercard Agent Pay integration
 */

/**
 * Supported card networks
 */
export type CardNetwork = 'visa' | 'mastercard';

/**
 * Card network status
 */
export type NetworkStatus = 'active' | 'inactive' | 'not_configured';

/**
 * Agent signature verification request
 */
export interface VerifyAgentSignatureRequest {
  /** HTTP method (GET, POST, etc.) */
  method: string;
  /** Request path */
  path: string;
  /** Request headers */
  headers: Record<string, string>;
  /** Signature-Input header value */
  signatureInput: string;
  /** Signature header value */
  signature: string;
  /** Optional: specify which network to verify against */
  network?: CardNetwork;
}

/**
 * Agent signature verification result
 */
export interface VerifyAgentSignatureResult {
  /** Whether the signature is valid */
  valid: boolean;
  /** Detected card network */
  network?: CardNetwork;
  /** Key ID from the signature */
  keyId?: string;
  /** AI agent provider (e.g., 'anthropic', 'openai') */
  agentProvider?: string;
  /** Error message if verification failed */
  error?: string;
  /** Verification timestamp */
  verifiedAt?: string;
}

/**
 * Individual network configuration
 */
export interface NetworkConfig {
  /** Whether the network is configured */
  configured: boolean;
  /** Network status */
  status: NetworkStatus;
  /** Connected account ID */
  accountId: string | null;
  /** Whether using sandbox mode */
  sandbox: boolean;
  /** When the network was connected */
  connectedAt: string | null;
}

/**
 * Card networks response
 */
export interface CardNetworksResponse {
  /** Network configurations */
  networks: {
    visa: NetworkConfig;
    mastercard: NetworkConfig;
  };
  /** Available capabilities based on configuration */
  capabilities: {
    webBotAuth: boolean;
    paymentInstructions: boolean;
    agentRegistration: boolean;
    tokenization: boolean;
  };
}

/**
 * Verification statistics
 */
export interface VerificationStats {
  /** Total verification attempts */
  total: number;
  /** Successful verifications */
  successful: number;
  /** Failed verifications */
  failed: number;
  /** Breakdown by network */
  byNetwork: {
    visa: number;
    mastercard: number;
  };
  /** Breakdown by AI provider */
  byProvider: Record<string, number>;
}

/**
 * Transaction statistics
 */
export interface TransactionStats {
  /** Total transactions */
  total: number;
  /** Total volume in USD */
  volume: number;
  /** Breakdown by status */
  byStatus: {
    completed: number;
    pending: number;
    failed: number;
  };
  /** Breakdown by network */
  byNetwork: {
    visa: number;
    mastercard: number;
  };
}

/**
 * Recent transaction
 */
export interface RecentTransaction {
  id: string;
  network: CardNetwork;
  amount: number;
  currency: string;
  merchantName: string;
  status: string;
  createdAt: string;
}

/**
 * Card analytics response
 */
export interface CardAnalyticsResponse {
  /** Verification statistics */
  verifications: VerificationStats & { successRate: number };
  /** Transaction statistics */
  transactions: TransactionStats;
  /** Recent transactions */
  recentTransactions: RecentTransaction[];
  /** Analytics period */
  period: {
    days: number;
    from: string;
    to: string;
  };
}

/**
 * Merchant information for Visa instructions
 */
export interface VisaMerchant {
  /** Merchant name */
  name: string;
  /** MCC code */
  categoryCode: string;
  /** Country code (default: US) */
  country?: string;
  /** Merchant URL */
  url?: string;
}

/**
 * Payment restrictions for Visa instructions
 */
export interface VisaRestrictions {
  /** Maximum transaction amount */
  maxAmount?: number;
  /** Allowed merchant categories */
  allowedCategories?: string[];
  /** Blocked merchant categories */
  blockedCategories?: string[];
  /** Allowed countries */
  allowedCountries?: string[];
}

/**
 * Create Visa payment instruction request
 */
export interface CreateVisaInstructionRequest {
  /** Payment amount */
  amount: number;
  /** Currency code */
  currency: string;
  /** Merchant information */
  merchant: VisaMerchant;
  /** Payment restrictions */
  restrictions?: VisaRestrictions;
  /** Expiration time in seconds (default: 900) */
  expiresInSeconds?: number;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Visa payment instruction
 */
export interface VisaPaymentInstruction {
  /** Instruction ID */
  instructionId: string;
  /** Merchant reference */
  merchantRef: string;
  /** Payment amount */
  amount: number;
  /** Currency code */
  currency: string;
  /** Merchant information */
  merchant: VisaMerchant;
  /** Payment restrictions */
  restrictions?: VisaRestrictions;
  /** Instruction status */
  status: string;
  /** Expiration timestamp */
  expiresAt: string;
  /** Creation timestamp */
  createdAt: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * Create Visa token request
 */
export interface CreateVisaTokenRequest {
  /** Payment instruction ID */
  instructionId: string;
  /** Card token */
  cardToken: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Visa token
 */
export interface VisaToken {
  /** VTS token ID */
  tokenId: string;
  /** Instruction ID */
  instructionId: string;
  /** Last 4 digits of card */
  cardLastFour: string;
  /** Token status */
  status: string;
  /** Expiration timestamp */
  expiresAt?: string;
  /** Provisioned timestamp */
  provisionedAt: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Register Mastercard agent request
 */
export interface RegisterMastercardAgentRequest {
  /** PayOS agent ID */
  agentId: string;
  /** Agent display name */
  agentName?: string;
  /** Agent's public key for signing */
  publicKey: string;
  /** Agent capabilities */
  capabilities?: string[];
  /** AI provider name */
  provider?: string;
  /** Callback URL for notifications */
  callbackUrl?: string;
}

/**
 * Mastercard agent registration
 */
export interface MastercardAgentRegistration {
  /** PayOS agent ID */
  agentId: string;
  /** Mastercard agent ID */
  mcAgentId: string;
  /** Agent display name */
  agentName: string;
  /** Agent's public key */
  publicKey: string;
  /** Agent capabilities */
  capabilities: string[];
  /** Registration status */
  status: string;
  /** AI provider name */
  provider?: string;
  /** Callback URL */
  callbackUrl?: string;
  /** Registration timestamp */
  registeredAt: string;
}

/**
 * Create Mastercard token request
 */
export interface CreateMastercardTokenRequest {
  /** PayOS agent ID */
  agentId: string;
  /** Card token */
  cardToken: string;
  /** Expiration time in seconds (default: 3600) */
  expiresInSeconds?: number;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Mastercard agentic token
 */
export interface MastercardToken {
  /** Token reference */
  tokenReference: string;
  /** Mastercard agent ID */
  mcAgentId: string;
  /** Dynamic Transaction Verification Code */
  dtvc: string;
  /** Last 4 digits of card */
  cardLastFour: string;
  /** Token status */
  status: string;
  /** Expiration timestamp */
  expiresAt: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Card network transaction
 */
export interface CardTransaction {
  id: string;
  network: CardNetwork;
  status: string;
  amount: number;
  currency: string;
  merchantName?: string;
  createdAt: string;
}

/**
 * Network test result
 */
export interface NetworkTestResult {
  success: boolean;
  error?: string;
}

/**
 * Network configure request
 */
export interface ConfigureVisaRequest {
  api_key: string;
  shared_secret?: string;
  sandbox?: boolean;
}

/**
 * Network configure request
 */
export interface ConfigureMastercardRequest {
  consumer_key: string;
  private_key_pem?: string;
  sandbox?: boolean;
}

/**
 * Configure result
 */
export interface ConfigureResult {
  id: string;
  message: string;
}
