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

export type AccountType = 'person' | 'business' | 'agent';
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

export type TransferType = 'cross_border' | 'internal' | 'stream_start' | 'stream_withdraw' | 'deposit' | 'withdrawal' | 'x402' | 'payout' | 'refund' | 'wallet_transfer';
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
    type: 'user' | 'agent' | 'system' | 'api_key';
    id: string;
    name?: string | null;
  };
  amount: number;
  currency: string;
  destinationAmount?: number;
  destinationCurrency?: string;
  fxRate?: number;
  feeAmount: number;
  fees?: {
    amount: number;
    currency: string;
    breakdown?: Array<{ type: string; amount: number }>;
  };
  description?: string;
  createdAt: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
  idempotencyKey?: string;
  streamId?: string;
  x402Metadata?: {
    endpoint_id?: string;
    endpoint_path?: string;
    endpoint_method?: string;
    wallet_id?: string;
    request_id?: string;
    timestamp?: string;
    price_calculated?: number;
    volume_tier?: number;
    settlement_fee?: number;
    settlement_net_amount?: number;
    metadata?: Record<string, unknown>;
    fee_calculation?: {
      grossAmount?: number;
      feeAmount?: number;
      netAmount?: number;
      feeType?: string;
    };
  };
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
  endpointId?: string;
  x402_endpoint_id?: string;
  x402_provider_account_id?: string;
  x402_consumer_account_id?: string;
  x402_wallet_id?: string;
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

// ============================================
// Refund Types
// ============================================

export type RefundStatus = 'pending' | 'completed' | 'failed';
export type RefundReason = 'duplicate_payment' | 'service_not_rendered' | 'customer_request' | 'error' | 'other';

export interface Refund {
  id: string;
  tenantId: string;
  originalTransferId: string;
  status: RefundStatus;
  amount: number;
  currency: string;
  reason: RefundReason;
  reasonDetails?: string;
  fromAccountId: string;
  toAccountId: string;
  idempotencyKey?: string;
  createdAt: string;
  completedAt?: string;
  failedAt?: string;
  failureReason?: string;
}

export interface CreateRefundInput {
  originalTransferId: string;
  amount?: number; // Optional for full refund
  reason: RefundReason;
  reasonDetails?: string;
}

export interface RefundsListParams extends PaginationParams {
  status?: RefundStatus;
  originalTransferId?: string;
  accountId?: string;
  fromDate?: string;
  toDate?: string;
}

// ============================================
// Scheduled Transfer Types
// ============================================

export type ScheduleStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type ScheduleFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

export interface ScheduledTransfer {
  id: string;
  tenantId: string;
  fromAccountId: string;
  toAccountId?: string;
  toPaymentMethodId?: string;
  amount: number;
  currency: string;
  description?: string;
  frequency: ScheduleFrequency;
  intervalValue: number;
  dayOfMonth?: number;
  dayOfWeek?: number;
  timezone: string;
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
  status: ScheduleStatus;
  occurrencesCompleted: number;
  nextExecution?: string;
  lastExecution?: string;
  createdAt: string;
  updatedAt: string;
  executions?: Transfer[]; // Populated on single GET
}

export interface CreateScheduledTransferInput {
  fromAccountId: string;
  toAccountId?: string;
  toPaymentMethodId?: string;
  amount: number;
  currency?: string;
  description?: string;
  frequency: ScheduleFrequency;
  intervalValue?: number;
  dayOfMonth?: number;
  dayOfWeek?: number;
  timezone?: string;
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
}

export interface ScheduledTransfersListParams extends PaginationParams {
  status?: ScheduleStatus;
  fromAccountId?: string;
  toAccountId?: string;
}

// ============================================
// Transaction Export Types
// ============================================

export type ExportFormat = 'quickbooks' | 'quickbooks4' | 'xero' | 'netsuite' | 'payos';
export type DateFormatType = 'US' | 'UK';
export type ExportStatus = 'processing' | 'ready' | 'failed';

export interface TransactionExport {
  exportId: string;
  status: ExportStatus;
  format: ExportFormat;
  recordCount: number;
  downloadUrl?: string;
  expiresAt?: string;
}

export interface GenerateExportInput {
  startDate: string;
  endDate: string;
  format: ExportFormat;
  dateFormat?: DateFormatType;
  includeRefunds?: boolean;
  includeStreams?: boolean;
  includeFees?: boolean;
  accountId?: string;
  corridor?: string;
  currency?: string;
}

// ============================================
// Payment Method Types
// ============================================

export type PaymentMethodType = 'bank_account' | 'wallet' | 'card';
export type WalletNetwork = 'base' | 'polygon' | 'ethereum';

export interface PaymentMethod {
  id: string;
  tenantId: string;
  accountId: string;
  type: PaymentMethodType;
  label?: string;
  isDefault: boolean;
  isVerified: boolean;
  // Bank account fields
  bankCountry?: string;
  bankCurrency?: string;
  bankAccountLastFour?: string;
  bankRoutingLastFour?: string;
  bankName?: string;
  bankAccountHolder?: string;
  // Wallet fields
  walletNetwork?: WalletNetwork;
  walletAddress?: string;
  // Card fields
  cardId?: string;
  cardLastFour?: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface CreatePaymentMethodInput {
  type: PaymentMethodType;
  label?: string;
  isDefault?: boolean;
  // Bank account fields
  bankCountry?: string;
  bankCurrency?: string;
  bankAccountLastFour?: string;
  bankRoutingLastFour?: string;
  bankName?: string;
  bankAccountHolder?: string;
  // Wallet fields
  walletNetwork?: WalletNetwork;
  walletAddress?: string;
}

export interface PaymentMethodsListParams extends PaginationParams {
  type?: PaymentMethodType;
  isDefault?: boolean;
  isVerified?: boolean;
}

// ============================================
// x402 Types
// ============================================

export type X402EndpointMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ANY';
export type X402EndpointStatus = 'active' | 'paused' | 'disabled';
export type X402Currency = 'USDC' | 'EURC';
export type WalletStatus = 'active' | 'frozen' | 'depleted';

export interface X402Endpoint {
  id: string;
  tenantId: string;
  accountId: string;
  name: string;
  path: string;
  method: X402EndpointMethod;
  description?: string;
  basePrice: number;
  currency: X402Currency;
  volumeDiscounts?: Array<{ threshold: number; priceMultiplier: number }>;
  paymentAddress?: string;
  assetAddress?: string;
  network: string;
  totalCalls: number;
  totalRevenue: number;
  status: X402EndpointStatus;
  webhookUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateX402EndpointInput {
  accountId: string;
  name: string;
  path: string;
  method: X402EndpointMethod;
  description?: string;
  basePrice: number;
  currency?: X402Currency;
  volumeDiscounts?: Array<{ threshold: number; priceMultiplier: number }>;
  paymentAddress?: string;
  assetAddress?: string;
  network?: string;
  webhookUrl?: string;
}

export interface UpdateX402EndpointInput {
  name?: string;
  description?: string;
  basePrice?: number;
  volumeDiscounts?: Array<{ threshold: number; priceMultiplier: number }>;
  status?: X402EndpointStatus;
  webhookUrl?: string;
}

export interface X402EndpointsListParams extends PaginationParams {
  accountId?: string;
  status?: X402EndpointStatus;
  method?: X402EndpointMethod;
}

export interface Wallet {
  id: string;
  tenantId: string;
  ownerAccountId: string;
  managedByAgentId?: string;
  balance: number;
  currency: X402Currency;
  walletAddress?: string;
  network?: string;
  spendingPolicy?: {
    dailyLimit?: number;
    monthlyLimit?: number;
    approvedEndpoints?: string[];
    autoFund?: { threshold: number; amount: number };
  };
  status: WalletStatus;
  name?: string;
  purpose?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWalletInput {
  ownerAccountId: string;
  managedByAgentId?: string;
  currency?: X402Currency;
  spendingPolicy?: {
    dailyLimit?: number;
    monthlyLimit?: number;
    approvedEndpoints?: string[];
    autoFund?: { threshold: number; amount: number };
  };
  name?: string;
  purpose?: string;
}

export interface UpdateWalletInput {
  spendingPolicy?: {
    dailyLimit?: number;
    monthlyLimit?: number;
    approvedEndpoints?: string[];
    autoFund?: { threshold: number; amount: number };
  };
  name?: string;
  purpose?: string;
  status?: WalletStatus;
}

export interface WalletsListParams extends PaginationParams {
  ownerAccountId?: string;
  managedByAgentId?: string;
  status?: WalletStatus;
  currency?: X402Currency;
}

export interface WalletDepositInput {
  amount: number;
}

export interface WalletWithdrawInput {
  amount: number;
}

export interface X402Quote {
  endpointId: string;
  basePrice: number;
  finalPrice: number;
  currency: X402Currency;
  discount?: number;
  totalCalls?: number;
}

export interface X402PaymentInput {
  endpointId: string;
  walletId: string;
  requestId: string;
  amount?: number;
  metadata?: Record<string, unknown>;
}

export interface X402PaymentResponse {
  success: boolean;
  transferId: string;
  walletBalance: number;
  endpointTotalCalls: number;
  endpointTotalRevenue: number;
}

export interface X402VerifyPaymentInput {
  transferId: string;
}

export interface X402VerifyPaymentResponse {
  verified: boolean;
  transfer: Transfer;
}

