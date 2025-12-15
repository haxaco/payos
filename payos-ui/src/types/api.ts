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
  tenant_id: string;
  type: AccountType;
  name: string;
  email: string | null;
  
  // Verification
  verification_tier: number;
  verification_status: VerificationStatus;
  verification_type: VerificationType | null;
  
  // Balances
  balance_total: number;
  balance_available: number;
  balance_in_streams: number;
  balance_buffer: number;
  
  created_at: string;
  updated_at: string;
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
  tenant_id: string;
  type: TransferType;
  status: TransferStatus;
  
  // Parties
  from_account_id: string | null;
  from_account_name: string | null;
  to_account_id: string | null;
  to_account_name: string | null;
  
  // Attribution
  initiated_by_type: 'user' | 'agent';
  initiated_by_id: string;
  initiated_by_name: string | null;
  
  // Amount
  amount: number;
  currency: string;
  
  // Additional info
  description: string | null;
  
  created_at: string;
  updated_at: string | null;
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

