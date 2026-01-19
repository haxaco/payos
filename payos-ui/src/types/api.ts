/**
 * API Response Types
 * 
 * These types match the API responses from the backend
 */

// ============================================
// Common Types
// ============================================

export type AccountType = 'person' | 'business';
export type AccountStatus = 'active' | 'suspended' | 'closed';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'suspended';
export type VerificationType = 'kyc' | 'kyb';

export type TransferType = 'cross_border' | 'internal' | 'stream_start' | 'stream_withdraw' | 'stream_cancel' | 'wrap' | 'unwrap';
export type TransferStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type PaymentMethodType = 'bank_account' | 'wallet' | 'card';
export type AgentStatus = 'active' | 'paused' | 'suspended';
export type StreamStatus = 'active' | 'paused' | 'cancelled';

// ============================================
// Account Types
// ============================================

export interface Account {
  id: string;
  tenantId: string;
  type: AccountType;
  name: string;
  email: string | null;
  currency: string;
  
  // Verification
  verificationTier: number;
  verificationStatus: VerificationStatus;
  verificationType: VerificationType | null;
  verification?: {
    tier: number;
    status: VerificationStatus;
    type: VerificationType | null;
  };
  
  // Balances
  balanceTotal: number;
  balanceAvailable: number;
  balanceInStreams: number;
  balanceBuffer: number;
  balance?: {
    total: number;
    available: number;
    inStreams: {
      total: number;
      buffer: number;
      streaming: number;
    };
    currency: string;
  };
  
  // Agents
  agents?: {
    count: number;
    active: number;
  };
  
  createdAt: string;
  updatedAt: string;
}

export interface AccountsResponse {
  data: Account[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Transfer Types
// ============================================

export interface Transfer {
  id: string;
  tenantId: string;
  type: TransferType;
  status: TransferStatus;
  
  // Parties (nested objects)
  from: {
    accountId: string;
    accountName: string;
  };
  to: {
    accountId: string;
    accountName: string;
  };
  
  // Attribution (nested object)
  initiatedBy: {
    type: 'user' | 'agent';
    id: string;
    name: string;
  };
  
  // Amount
  amount: number;
  currency: string;
  fees?: number;
  
  // Additional info
  description?: string | null;
  
  createdAt: string;
  updatedAt?: string | null;
}

export interface TransfersResponse {
  data: Transfer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Payment Method Types
// ============================================

export interface PaymentMethod {
  id: string;
  tenant_id: string;
  account_id: string;
  
  type: PaymentMethodType;
  label: string | null;
  is_default: boolean;
  is_verified: boolean;
  
  // Bank account details (masked)
  bank_country: string | null;
  bank_currency: string | null;
  bank_account_last_four: string | null;
  bank_routing_last_four: string | null;
  bank_name: string | null;
  bank_account_holder: string | null;
  
  // Wallet details
  wallet_network: string | null;
  wallet_address: string | null;
  
  // Card spending limits (Story 0.3)
  spending_limit_per_transaction?: number | null;
  spending_limit_daily?: number | null;
  spending_limit_monthly?: number | null;
  spending_used_daily?: number;
  spending_used_monthly?: number;
  spending_period_start_daily?: string | null; // DATE
  spending_period_start_monthly?: string | null; // DATE
  is_frozen?: boolean;
  frozen_reason?: string | null;
  frozen_at?: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodsResponse {
  payment_methods: PaymentMethod[];
  pagination: {
    data: number;
    pagination: {
      total: number;
      totalPages: number | null;
    };
  };
}

// ============================================
// Agent Types
// ============================================

export interface Agent {
  id: string;
  tenant_id: string;
  parent_account_id: string;
  
  name: string;
  description: string | null;
  status: AgentStatus;
  type: 'payment' | 'treasury' | 'compliance' | 'custom';
  
  // Parent Account (joined from API)
  parentAccount?: {
    id: string;
    type: string;
    name: string;
    verificationTier: number;
  };
  
  // KYA
  kya_tier: number;
  kya_status: VerificationStatus;
  kya_verified_at: string | null;
  
  // Limits
  limit_per_transaction: number;
  limit_daily: number;
  limit_monthly: number;
  
  effective_limit_per_tx: number;
  effective_limit_daily: number;
  effective_limit_monthly: number;
  effective_limits_capped: boolean;
  
  // Stream limits
  max_active_streams: number;
  max_flow_rate_per_stream: number;
  max_total_outflow: number;
  
  // Current stream stats
  active_streams_count: number;
  total_stream_outflow: number;
  
  // Protocol Support
  x402_enabled: boolean;
  ap2_enabled: boolean;
  acp_enabled: boolean;
  ucp_enabled: boolean;
  
  // Transaction statistics
  total_volume: number;
  total_transactions: number;
  
  // Auth token (only prefix is exposed)
  auth_token_prefix: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface AgentsResponse {
  data: Agent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Stream Types
// ============================================

export interface Stream {
  id: string;
  tenant_id: string;
  status: StreamStatus;
  
  // Parties
  sender_account_id: string;
  sender_account_name: string;
  receiver_account_id: string;
  receiver_account_name: string;
  
  // Attribution
  initiated_by_type: 'user' | 'agent';
  initiated_by_id: string;
  initiated_by_name: string | null;
  
  managed_by_type: 'user' | 'agent';
  managed_by_id: string;
  managed_by_name: string | null;
  
  // Flow
  flow_rate_per_second: number;
  flow_rate_per_month: number;
  currency: string;
  
  // Balance
  funded_amount: number;
  withdrawn_amount: number;
  balance: number;
  buffer_amount: number;
  
  // Health
  health_status: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface StreamsResponse {
  data: Stream[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Filter Types
// ============================================

export interface AccountFilters {
  type?: AccountType;
  status?: AccountStatus;
  verification_status?: VerificationStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TransferFilters {
  type?: TransferType;
  status?: TransferStatus;
  from_account_id?: string;
  to_account_id?: string;
  from_date?: string;
  to_date?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PaymentMethodFilters {
  type?: PaymentMethodType;
  account_id?: string;
  is_default?: boolean;
  is_verified?: boolean;
  limit?: number;
  offset?: number;
}

export interface AgentFilters {
  parent_account_id?: string;
  type?: 'payment' | 'treasury' | 'compliance' | 'custom';
  status?: AgentStatus;
  kya_status?: VerificationStatus;
  min_kya_tier?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface StreamFilters {
  status?: StreamStatus;
  sender_account_id?: string;
  receiver_account_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

