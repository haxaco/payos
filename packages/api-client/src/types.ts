/**
 * PayOS API Types
 * These types match the API response structures
 */

// ============================================
// Common Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ============================================
// Account Types
// ============================================

export type AccountType = 'person' | 'business';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'suspended';

export interface Account {
  id: string;
  tenantId: string;
  type: AccountType;
  name: string;
  email?: string;
  country?: string;
  currency: string; // 'USDC', 'USDT', etc.
  verificationTier: number;
  verificationStatus: VerificationStatus;
  verificationType?: 'kyc' | 'kyb';
  balanceTotal: number;
  balanceAvailable: number;
  balanceInStreams: number;
  balanceBuffer: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccountBalance {
  total: number;
  available: number;
  inStreams: {
    total: number;
    buffer: number;
    streaming: number;
  };
  currency: string;
}

export interface CreateAccountInput {
  type: AccountType;
  name: string;
  email?: string;
}

export interface AccountsListParams extends PaginationParams {
  type?: AccountType;
  status?: VerificationStatus;
  search?: string;
}

// ============================================
// Agent Types
// ============================================

export type AgentStatus = 'active' | 'paused' | 'suspended';
export type KYAStatus = 'unverified' | 'pending' | 'verified' | 'suspended';

export interface Agent {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: AgentStatus;
  kyaTier: number;
  kyaStatus: KYAStatus;
  parentAccount: {
    id: string;
    type: AccountType;
    name: string;
    verificationTier: number;
  };
  permissions: AgentPermissions;
  createdAt: string;
  updatedAt: string;
}

export interface AgentPermissions {
  transactions: { initiate: boolean; approve: boolean; view: boolean };
  streams: { initiate: boolean; modify: boolean; pause: boolean; terminate: boolean; view: boolean };
  accounts: { view: boolean; create: boolean };
  treasury: { view: boolean; rebalance: boolean };
}

export interface AgentLimits {
  agentId: string;
  kyaTier: number;
  status: AgentStatus;
  limits: {
    perTransaction: number;
    daily: number;
    monthly: number;
  };
  effectiveLimits: {
    perTransaction: number;
    daily: number;
    monthly: number;
    cappedByParent: boolean;
  };
  parentAccount: {
    id: string;
    name: string;
    verificationTier: number;
    verificationStatus: VerificationStatus;
  } | null;
  usage: {
    daily: number;
    monthly: number;
    dailyRemaining: number;
    monthlyRemaining: number;
  };
  streams: {
    active: number;
    maxActive: number;
    totalOutflow: number;
    maxTotalOutflow: number;
  };
}

export interface AgentCredentials {
  token: string;
  prefix: string;
  warning: string;
}

export interface CreateAgentInput {
  parentAccountId: string;
  name: string;
  description?: string;
  permissions?: Partial<AgentPermissions>;
}

export interface CreateAgentResponse {
  data: Agent;
  credentials: AgentCredentials;
}

export interface AgentsListParams extends PaginationParams {
  status?: AgentStatus;
  kyaTier?: number;
  parentAccountId?: string;
}

// ============================================
// Stream Types
// ============================================

export type StreamStatus = 'active' | 'paused' | 'cancelled';
export type StreamHealth = 'healthy' | 'warning' | 'critical';
export type StreamCategory = 'salary' | 'subscription' | 'service' | 'other';

export interface Stream {
  id: string;
  tenantId: string;
  status: StreamStatus;
  sender: {
    accountId: string;
    accountName: string;
  };
  receiver: {
    accountId: string;
    accountName: string;
  };
  initiatedBy: {
    type: 'user' | 'agent';
    id: string;
    name: string;
    timestamp: string;
  };
  managedBy: {
    type: 'user' | 'agent';
    id: string;
    name: string;
    permissions: {
      canModify: boolean;
      canPause: boolean;
      canTerminate: boolean;
    };
  };
  flowRate: {
    perSecond: number;
    perMonth: number;
    currency: string;
  };
  streamed: {
    total: number;
    withdrawn: number;
    available: number;
  };
  funding: {
    wrapped: number;
    buffer: number;
    runway: {
      seconds: number;
      display: string;
    };
  };
  health: StreamHealth;
  description?: string;
  category?: StreamCategory;
  startedAt: string;
  pausedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StreamEvent {
  id: string;
  streamId: string;
  eventType: string;
  actor: {
    type: 'user' | 'agent' | 'system';
    id: string;
    name: string;
  };
  data: Record<string, unknown>;
  createdAt: string;
}

export interface CreateStreamInput {
  senderAccountId: string;
  receiverAccountId: string;
  flowRatePerMonth: number;
  fundingAmount?: number;
  description?: string;
  category?: StreamCategory;
}

export interface StreamsListParams extends PaginationParams {
  status?: StreamStatus;
  health?: StreamHealth;
  category?: StreamCategory;
  senderAccountId?: string;
  receiverAccountId?: string;
}

export interface StreamStats {
  activeCount: number;
  pausedCount: number;
  totalFlowPerMonth: number;
  totalFunded: number;
  totalStreamed: number;
}

// ============================================
// Transfer Types
// ============================================

export type TransferType = 'cross_border' | 'internal' | 'stream_start' | 'stream_withdraw' | 'deposit' | 'withdrawal';
export type TransferStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface Transfer {
  id: string;
  tenantId: string;
  type: TransferType;
  status: TransferStatus;
  from: {
    accountId: string;
    accountName: string;
  } | null;
  to: {
    accountId: string;
    accountName: string;
  } | null;
  initiatedBy: {
    type: 'user' | 'agent' | 'system';
    id: string;
    name: string;
  };
  amount: number;
  currency: string;
  destinationAmount?: number;
  destinationCurrency?: string;
  fxRate?: number;
  feeAmount: number;
  description?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency?: string;
  description?: string;
}

export interface CreateInternalTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency?: string;
  description?: string;
}

export interface TransfersListParams extends PaginationParams {
  status?: TransferStatus;
  type?: TransferType;
  accountId?: string;
}

// ============================================
// Quote Types
// ============================================

export interface Quote {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  fxRate: number;
  feeAmount: number;
  feeBreakdown: Array<{ type: string; amount: number }>;
  expiresAt: string;
  createdAt: string;
}

export interface CreateQuoteInput {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
}

// ============================================
// Report Types
// ============================================

export type ReportType = 'statement' | 'transactions' | 'streams' | 'activity_log' | 'report';
export type ReportStatus = 'generating' | 'ready' | 'failed';
export type ReportFormat = 'pdf' | 'csv' | 'json';

export interface Report {
  id: string;
  tenantId: string;
  type: ReportType;
  name: string;
  status: ReportStatus;
  format?: ReportFormat;
  periodStart?: string;
  periodEnd?: string;
  summary?: Record<string, unknown>;
  createdAt: string;
  generatedAt?: string;
}

export interface CreateReportInput {
  type: ReportType;
  accountId?: string;
  startDate?: string;
  endDate?: string;
  format?: ReportFormat;
}

export interface ReportsListParams extends PaginationParams {
  type?: ReportType;
  status?: ReportStatus;
}

// ============================================
// Audit Log Types
// ============================================

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: {
    type: 'user' | 'agent' | 'system';
    id: string;
    name?: string;
  };
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogsParams extends PaginationParams {
  entityType?: string;
  entityId?: string;
  action?: string;
  actorId?: string;
}

// ============================================
// Ledger Entry Types
// ============================================

export interface LedgerEntry {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string; // 'USDC', 'USDT', etc.
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  description: string;
  createdAt: string;
}

