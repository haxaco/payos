import { PayOSError } from './errors';
import type {
  PaginatedResponse,
  Account,
  AccountBalance,
  CreateAccountInput,
  AccountsListParams,
  Agent,
  AgentLimits,
  CreateAgentInput,
  CreateAgentResponse,
  AgentsListParams,
  Stream,
  StreamEvent,
  StreamStats,
  CreateStreamInput,
  StreamsListParams,
  Transfer,
  CreateTransferInput,
  CreateInternalTransferInput,
  TransfersListParams,
  Quote,
  CreateQuoteInput,
  Report,
  CreateReportInput,
  ReportsListParams,
  AuditLogEntry,
  AuditLogsParams,
  LedgerEntry,
  PaginationParams,
  // New types for Phase 2
  Refund,
  CreateRefundInput,
  RefundsListParams,
  ScheduledTransfer,
  CreateScheduledTransferInput,
  ScheduledTransfersListParams,
  TransactionExport,
  GenerateExportInput,
  PaymentMethod,
  CreatePaymentMethodInput,
  PaymentMethodsListParams,
  // x402 types
  X402Endpoint,
  CreateX402EndpointInput,
  UpdateX402EndpointInput,
  X402EndpointsListParams,
  Wallet,
  CreateWalletInput,
  UpdateWalletInput,
  WalletsListParams,
  WalletDepositInput,
  WalletWithdrawInput,
  X402Quote,
  X402PaymentInput,
  X402PaymentResponse,
  X402VerifyPaymentInput,
  X402VerifyPaymentResponse,
} from './types';

export interface PayOSClientConfig {
  baseUrl: string;
  apiKey: string;
  onError?: (error: PayOSError) => void;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  idempotencyKey?: string;
};

/**
 * PayOS API Client
 * 
 * A fully typed client for the PayOS API.
 * 
 * @example
 * ```typescript
 * const client = createPayOSClient({
 *   baseUrl: 'http://localhost:4000',
 *   apiKey: 'pk_test_...',
 * });
 * 
 * const accounts = await client.accounts.list();
 * const stream = await client.streams.create({ ... });
 * ```
 */
export class PayOSClient {
  private config: PayOSClientConfig;

  constructor(config: PayOSClientConfig) {
    this.config = config;
  }

  // ============================================
  // Internal HTTP Methods
  // ============================================

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', body, params, headers = {}, idempotencyKey } = options;

    // Build URL with query params
    const url = new URL(`/v1${endpoint}`, this.config.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    // Build headers
    const requestHeaders: Record<string, string> = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      ...headers,
    };

    if (idempotencyKey) {
      requestHeaders['X-Idempotency-Key'] = idempotencyKey;
    }

    // Make request
    const response = await fetch(url.toString(), {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Parse response
    const data = await response.json();

    // Handle errors
    if (!response.ok) {
      const error = PayOSError.fromResponse(data, response.status, response.headers);
      this.config.onError?.(error);
      throw error;
    }

    return data;
  }

  private get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined> | object) {
    return this.request<T>(endpoint, { params: params as Record<string, string | number | boolean | undefined> | undefined });
  }

  private post<T>(endpoint: string, body?: unknown, options?: { idempotencyKey?: string }) {
    return this.request<T>(endpoint, { method: 'POST', body, ...options });
  }

  private patch<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  private delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ============================================
  // Accounts API
  // ============================================

  accounts = {
    /**
     * List all accounts
     */
    list: (params?: AccountsListParams) =>
      this.get<PaginatedResponse<Account>>('/accounts', params),

    /**
     * Get a single account by ID
     */
    get: (id: string) =>
      this.get<{ data: Account }>(`/accounts/${id}`).then(r => r.data),

    /**
     * Create a new account
     */
    create: (input: CreateAccountInput) =>
      this.post<{ data: Account }>('/accounts', input).then(r => r.data),

    /**
     * Update an account
     */
    update: (id: string, input: Partial<CreateAccountInput>) =>
      this.patch<{ data: Account }>(`/accounts/${id}`, input).then(r => r.data),

    /**
     * Delete an account
     */
    delete: (id: string) =>
      this.delete<{ success: boolean }>(`/accounts/${id}`),

    /**
     * Get account balance breakdown
     */
    getBalance: (id: string) =>
      this.get<{ data: AccountBalance }>(`/accounts/${id}/balances`).then(r => r.data),

    /**
     * Get account transactions (ledger entries)
     */
    getTransactions: (id: string, params?: PaginationParams & { referenceType?: string }) =>
      this.get<PaginatedResponse<LedgerEntry>>(`/accounts/${id}/transactions`, params),

    /**
     * Get account transfers (sent & received)
     * More efficient than filtering all transfers client-side
     */
    getTransfers: (id: string, params?: PaginationParams & { 
      type?: string; 
      status?: string; 
      direction?: 'sent' | 'received' | 'all' 
    }) =>
      this.get<PaginatedResponse<Transfer>>(`/accounts/${id}/transfers`, params),

    /**
     * Get agents under this account
     */
    getAgents: (id: string, params?: PaginationParams) =>
      this.get<PaginatedResponse<Agent>>(`/accounts/${id}/agents`, params),

    /**
     * Get streams for this account
     */
    getStreams: (id: string, params?: PaginationParams) =>
      this.get<PaginatedResponse<Stream>>(`/accounts/${id}/streams`, params),

    /**
     * Verify account (mock KYC/KYB)
     */
    verify: (id: string, tier: number) =>
      this.post<{ data: Account }>(`/accounts/${id}/verify`, { tier }).then(r => r.data),

    /**
     * Suspend account (cascades to agents)
     */
    suspend: (id: string) =>
      this.post<{ data: { accountId: string; status: string; cascadedAgents: number } }>(`/accounts/${id}/suspend`).then(r => r.data),

    /**
     * Activate account
     */
    activate: (id: string) =>
      this.post<{ data: { accountId: string; status: string } }>(`/accounts/${id}/activate`).then(r => r.data),
  };

  // ============================================
  // Agents API
  // ============================================

  agents = {
    /**
     * List all agents
     */
    list: (params?: AgentsListParams) =>
      this.get<PaginatedResponse<Agent>>('/agents', params),

    /**
     * Get a single agent by ID
     */
    get: (id: string) =>
      this.get<{ data: Agent }>(`/agents/${id}`).then(r => r.data),

    /**
     * Create a new agent (returns token ONCE)
     */
    create: (input: CreateAgentInput) =>
      this.post<CreateAgentResponse>('/agents', input),

    /**
     * Update an agent
     */
    update: (id: string, input: Partial<Omit<CreateAgentInput, 'parentAccountId'>>) =>
      this.patch<{ data: Agent }>(`/agents/${id}`, input).then(r => r.data),

    /**
     * Delete an agent
     */
    delete: (id: string) =>
      this.delete<{ success: boolean }>(`/agents/${id}`),

    /**
     * Get agent limits and usage
     */
    getLimits: (id: string) =>
      this.get<{ data: AgentLimits }>(`/agents/${id}/limits`).then(r => r.data),

    /**
     * Get agent's streams
     */
    getStreams: (id: string, params?: PaginationParams) =>
      this.get<PaginatedResponse<Stream>>(`/agents/${id}/streams`, params),

    /**
     * Suspend agent
     */
    suspend: (id: string) =>
      this.post<{ data: Agent }>(`/agents/${id}/suspend`).then(r => r.data),

    /**
     * Activate agent
     */
    activate: (id: string) =>
      this.post<{ data: Agent }>(`/agents/${id}/activate`).then(r => r.data),

    /**
     * Mock KYA verification
     */
    verify: (id: string, tier: number) =>
      this.post<{ data: Agent }>(`/agents/${id}/verify`, { tier }).then(r => r.data),

    /**
     * Rotate agent token (returns new token ONCE)
     */
    rotateToken: (id: string) =>
      this.post<{ success: boolean; credentials: { token: string; prefix: string; warning: string }; previousTokenRevoked: boolean }>(`/agents/${id}/rotate-token`),
  };

  // ============================================
  // Streams API
  // ============================================

  streams = {
    /**
     * List all streams
     */
    list: (params?: StreamsListParams) =>
      this.get<PaginatedResponse<Stream>>('/streams', params),

    /**
     * Get a single stream (with real-time balance)
     */
    get: (id: string) =>
      this.get<{ data: Stream }>(`/streams/${id}`).then(r => r.data),

    /**
     * Create a new stream
     */
    create: (input: CreateStreamInput, idempotencyKey?: string) =>
      this.post<{ data: Stream }>('/streams', input, { idempotencyKey }).then(r => r.data),

    /**
     * Pause a stream
     */
    pause: (id: string) =>
      this.post<{ data: Stream }>(`/streams/${id}/pause`).then(r => r.data),

    /**
     * Resume a stream
     */
    resume: (id: string) =>
      this.post<{ data: Stream }>(`/streams/${id}/resume`).then(r => r.data),

    /**
     * Cancel a stream
     */
    cancel: (id: string) =>
      this.post<{ data: Stream }>(`/streams/${id}/cancel`).then(r => r.data),

    /**
     * Top up a stream
     */
    topUp: (id: string, amount: number) =>
      this.post<{ data: Stream }>(`/streams/${id}/top-up`, { amount }).then(r => r.data),

    /**
     * Withdraw from a stream
     */
    withdraw: (id: string, amount: number) =>
      this.post<{ data: Stream }>(`/streams/${id}/withdraw`, { amount }).then(r => r.data),

    /**
     * Get stream events
     */
    getEvents: (id: string, params?: PaginationParams) =>
      this.get<PaginatedResponse<StreamEvent>>(`/streams/${id}/events`, params),

    /**
     * Get stream stats
     */
    getStats: () =>
      this.get<{ data: StreamStats }>('/streams/stats').then(r => r.data),
  };

  // ============================================
  // Transfers API
  // ============================================

  transfers = {
    /**
     * List all transfers
     */
    list: (params?: TransfersListParams) =>
      this.get<PaginatedResponse<Transfer>>('/transfers', params),

    /**
     * Get a single transfer
     */
    get: (id: string) =>
      this.get<{ data: Transfer }>(`/transfers/${id}`).then(r => r.data),

    /**
     * Create a cross-border transfer
     */
    create: (input: CreateTransferInput, idempotencyKey?: string) =>
      this.post<{ data: Transfer }>('/transfers', input, { idempotencyKey }).then(r => r.data),

    /**
     * Cancel a pending transfer
     */
    cancel: (id: string) =>
      this.post<{ data: Transfer }>(`/transfers/${id}/cancel`).then(r => r.data),

    /**
     * Create an internal transfer
     */
    createInternal: (input: CreateInternalTransferInput, idempotencyKey?: string) =>
      this.post<{ data: Transfer }>('/internal-transfers', input, { idempotencyKey }).then(r => r.data),
  };

  // ============================================
  // Quotes API
  // ============================================

  quotes = {
    /**
     * Create a quote
     */
    create: (input: CreateQuoteInput) =>
      this.post<{ data: Quote }>('/quotes', input).then(r => r.data),

    /**
     * Get a quote by ID
     */
    get: (id: string) =>
      this.get<{ data: Quote }>(`/quotes/${id}`).then(r => r.data),

    /**
     * Get current FX rates
     */
    getRates: () =>
      this.get<{ data: { rates: Record<string, number>; updatedAt: string } }>('/quotes/rates').then(r => r.data),
  };

  // ============================================
  // Reports API
  // ============================================

  reports = {
    /**
     * List all reports
     */
    list: (params?: ReportsListParams) =>
      this.get<PaginatedResponse<Report>>('/reports', params),

    /**
     * Get a report by ID
     */
    get: (id: string) =>
      this.get<{ data: Report }>(`/reports/${id}`).then(r => r.data),

    /**
     * Generate a report
     */
    create: (input: CreateReportInput) =>
      this.post<{ data: Report }>('/reports', input).then(r => r.data),

    /**
     * Delete a report
     */
    delete: (id: string) =>
      this.delete<{ success: boolean }>(`/reports/${id}`),

    /**
     * Download report content
     */
    download: async (id: string): Promise<{ content: unknown; format: string; filename: string }> => {
      const response = await this.get<{ data: { content: unknown; format: string; filename: string } }>(`/reports/${id}/download`);
      return response.data;
    },

    /**
     * Get audit logs
     */
    getAuditLogs: (params?: AuditLogsParams) =>
      this.get<PaginatedResponse<AuditLogEntry>>('/reports/audit-logs', params),
  };

  // ============================================
  // Compliance API
  // ============================================

  compliance = {
    /**
     * List compliance flags with filters
     */
    listFlags: (params?: {
      status?: string;
      risk_level?: string;
      flag_type?: string;
      limit?: number;
      offset?: number;
    }) =>
      this.get<PaginatedResponse<any>>('/compliance/flags', params),

    /**
     * Get count of open compliance flags
     */
    getOpenFlagsCount: async () => {
      const response = await this.get<PaginatedResponse<any>>('/compliance/flags', {
        status: 'open',
        limit: 1,
      });
      return response.pagination?.total || 0;
    },
  };

  // ============================================
  // Refunds API
  // ============================================

  refunds = {
    /**
     * List all refunds
     */
    list: (params?: RefundsListParams) =>
      this.get<PaginatedResponse<Refund>>('/refunds', params),

    /**
     * Get a single refund
     */
    get: (id: string) =>
      this.get<{ data: Refund }>(`/refunds/${id}`).then(r => r.data),

    /**
     * Create a refund
     */
    create: (input: CreateRefundInput, idempotencyKey?: string) =>
      this.post<{ data: Refund }>('/refunds', input, { idempotencyKey }).then(r => r.data),
  };

  // ============================================
  // Scheduled Transfers API
  // ============================================

  scheduledTransfers = {
    /**
     * List all scheduled transfers
     */
    list: (params?: ScheduledTransfersListParams) =>
      this.get<PaginatedResponse<ScheduledTransfer>>('/scheduled-transfers', params),

    /**
     * Get a single scheduled transfer with execution history
     */
    get: (id: string) =>
      this.get<{ data: ScheduledTransfer }>(`/scheduled-transfers/${id}`).then(r => r.data),

    /**
     * Create a scheduled transfer
     */
    create: (input: CreateScheduledTransferInput) =>
      this.post<{ data: ScheduledTransfer }>('/scheduled-transfers', input).then(r => r.data),

    /**
     * Pause a scheduled transfer
     */
    pause: (id: string) =>
      this.post<{ data: ScheduledTransfer }>(`/scheduled-transfers/${id}/pause`).then(r => r.data),

    /**
     * Resume a paused scheduled transfer
     */
    resume: (id: string) =>
      this.post<{ data: ScheduledTransfer }>(`/scheduled-transfers/${id}/resume`).then(r => r.data),

    /**
     * Cancel a scheduled transfer
     */
    cancel: (id: string) =>
      this.post<{ data: ScheduledTransfer }>(`/scheduled-transfers/${id}/cancel`).then(r => r.data),

    /**
     * Execute a scheduled transfer immediately (demo only)
     */
    executeNow: (id: string) =>
      this.post<{ data: ScheduledTransfer; message: string }>(`/scheduled-transfers/${id}/execute-now`),
  };

  // ============================================
  // Exports API
  // ============================================

  exports = {
    /**
     * Generate a transaction export
     */
    generate: (params: GenerateExportInput) =>
      this.get<{ data: TransactionExport }>('/exports/transactions', params as unknown as Record<string, string>).then(r => r.data),

    /**
     * Get export status
     */
    getStatus: (id: string) =>
      this.get<{ data: TransactionExport }>(`/exports/${id}`).then(r => r.data),

    /**
     * Download export file
     */
    download: async (id: string): Promise<Blob> => {
      const url = new URL(`/v1/exports/${id}/download`, this.config.baseUrl);
      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
      });
      if (!response.ok) {
        throw new Error('Failed to download export');
      }
      return response.blob();
    },
  };

  // ============================================
  // Payment Methods API
  // ============================================

  paymentMethods = {
    /**
     * List payment methods for an account
     */
    list: (accountId: string, params?: PaymentMethodsListParams) =>
      this.get<{ data: PaymentMethod[] }>(`/accounts/${accountId}/payment-methods`, params).then(r => r.data),

    /**
     * Get a single payment method
     */
    get: (id: string) =>
      this.get<{ data: PaymentMethod }>(`/payment-methods/${id}`).then(r => r.data),

    /**
     * Create a payment method for an account
     */
    create: (accountId: string, input: CreatePaymentMethodInput) =>
      this.post<{ data: PaymentMethod }>(`/accounts/${accountId}/payment-methods`, input).then(r => r.data),

    /**
     * Update a payment method
     */
    update: (id: string, input: Partial<{ label: string; isDefault: boolean }>) =>
      this.patch<{ data: PaymentMethod }>(`/payment-methods/${id}`, input).then(r => r.data),

    /**
     * Delete a payment method
     */
    delete: (id: string) =>
      this.delete<{ success: boolean }>(`/payment-methods/${id}`),
  };

  // ============================================
  // x402 Endpoints API
  // ============================================

  x402Endpoints = {
    /**
     * List all x402 endpoints
     */
    list: (params?: X402EndpointsListParams) =>
      this.get<PaginatedResponse<X402Endpoint>>('/x402/endpoints', params),

    /**
     * Get a single x402 endpoint
     */
    get: (id: string) =>
      this.get<{ data: X402Endpoint }>(`/x402/endpoints/${id}`).then(r => r.data),

    /**
     * Create a new x402 endpoint
     */
    create: (input: CreateX402EndpointInput) =>
      this.post<{ data: X402Endpoint }>('/x402/endpoints', input).then(r => r.data),

    /**
     * Update an x402 endpoint
     */
    update: (id: string, input: UpdateX402EndpointInput) =>
      this.patch<{ data: X402Endpoint }>(`/x402/endpoints/${id}`, input).then(r => r.data),

    /**
     * Delete an x402 endpoint
     */
    delete: (id: string) =>
      this.delete<{ success: boolean }>(`/x402/endpoints/${id}`),
  };

  // ============================================
  // Wallets API
  // ============================================

  wallets = {
    /**
     * List all wallets
     */
    list: (params?: WalletsListParams) =>
      this.get<PaginatedResponse<Wallet>>('/wallets', params),

    /**
     * Get a single wallet
     */
    get: (id: string) =>
      this.get<{ data: Wallet }>(`/wallets/${id}`).then(r => r.data),

    /**
     * Create a new wallet
     */
    create: (input: CreateWalletInput) =>
      this.post<{ data: Wallet }>('/wallets', input).then(r => r.data),

    /**
     * Update a wallet
     */
    update: (id: string, input: UpdateWalletInput) =>
      this.patch<{ data: Wallet }>(`/wallets/${id}`, input).then(r => r.data),

    /**
     * Delete a wallet
     */
    delete: (id: string) =>
      this.delete<{ success: boolean }>(`/wallets/${id}`),

    /**
     * Deposit funds into a wallet
     */
    deposit: (id: string, input: WalletDepositInput) =>
      this.post<{ data: Wallet }>(`/wallets/${id}/deposit`, input).then(r => r.data),

    /**
     * Withdraw funds from a wallet
     */
    withdraw: (id: string, input: WalletWithdrawInput) =>
      this.post<{ data: Wallet }>(`/wallets/${id}/withdraw`, input).then(r => r.data),
  };

  // ============================================
  // x402 Payments API
  // ============================================

  x402Payments = {
    /**
     * Get a quote for an x402 endpoint
     */
    getQuote: (endpointId: string) =>
      this.get<{ data: X402Quote }>(`/x402/quote/${endpointId}`).then(r => r.data),

    /**
     * Process an x402 payment
     */
    pay: (input: X402PaymentInput, idempotencyKey?: string) =>
      this.post<{ data: X402PaymentResponse }>('/x402/pay', input, { idempotencyKey }).then(r => r.data),

    /**
     * Verify an x402 payment
     */
    verify: (input: X402VerifyPaymentInput) =>
      this.post<{ data: X402VerifyPaymentResponse }>('/x402/verify', input).then(r => r.data),
  };
}

/**
 * Create a PayOS client instance
 */
export function createPayOSClient(config: PayOSClientConfig): PayOSClient {
  return new PayOSClient(config);
}

