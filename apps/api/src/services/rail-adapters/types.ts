/**
 * Rail Adapter Types - Epic 27, Story 27.3
 * 
 * Abstract interfaces for external settlement rails.
 * Each rail (Circle, Pix, SPEI, etc.) implements this interface.
 */

// Rail IDs - support both underscore (code) and hyphen (database) formats
export type RailId = 
  | 'circle_usdc' | 'circle-usdc'    // Circle USDC
  | 'base_chain' | 'base-chain' | 'base-usdc'  // Base L2
  | 'pix'                            // Brazil Pix
  | 'spei'                           // Mexico SPEI
  | 'wire'                           // International wire
  | 'internal';                      // Internal ledger

export type SettlementStatus = 
  | 'pending'      // Submitted, waiting for confirmation
  | 'processing'   // Being processed by rail
  | 'completed'    // Successfully settled
  | 'failed'       // Settlement failed
  | 'reversed'     // Settlement was reversed/refunded
  | 'expired';     // Timed out

export interface RailTransaction {
  /** External transaction ID from the rail */
  externalId: string;
  /** Our internal transfer ID */
  transferId: string;
  /** Rail identifier */
  rail: RailId;
  /** Settlement status */
  status: SettlementStatus;
  /** Amount in source currency */
  amount: number;
  /** Source currency */
  currency: string;
  /** Amount in destination currency (after FX) */
  destinationAmount?: number;
  /** Destination currency */
  destinationCurrency?: string;
  /** FX rate applied */
  fxRate?: number;
  /** Fee charged by rail */
  railFee?: number;
  /** Timestamp when submitted to rail */
  submittedAt: string;
  /** Timestamp when confirmed by rail */
  confirmedAt?: string;
  /** Timestamp when completed */
  completedAt?: string;
  /** Error message if failed */
  errorMessage?: string;
  /** Raw response from rail API */
  rawResponse?: Record<string, any>;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface RailBalance {
  rail: RailId;
  currency: string;
  available: number;
  pending: number;
  reserved: number;
  lastUpdated: string;
}

export interface SubmitSettlementRequest {
  transferId: string;
  tenantId: string;
  amount: number;
  currency: string;
  destinationCurrency?: string;
  destinationAccount?: {
    type: 'bank_account' | 'wallet' | 'pix_key' | 'clabe';
    identifier: string;
    name?: string;
    bankCode?: string;
    country?: string;
  };
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export interface SubmitSettlementResponse {
  success: boolean;
  externalId?: string;
  status: SettlementStatus;
  estimatedCompletionTime?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface GetTransactionRequest {
  externalId?: string;
  transferId?: string;
}

export interface GetTransactionsRequest {
  startDate: string;
  endDate: string;
  status?: SettlementStatus;
  limit?: number;
  cursor?: string;
}

export interface GetTransactionsResponse {
  transactions: RailTransaction[];
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Rail Adapter Interface
 * 
 * All external rails must implement this interface.
 * In sandbox mode, mock implementations are used.
 */
export interface RailAdapter {
  /** Rail identifier */
  readonly railId: RailId;
  
  /** Human-readable name */
  readonly name: string;
  
  /** Whether this is a sandbox/mock adapter */
  readonly isSandbox: boolean;
  
  /**
   * Submit a settlement to this rail
   */
  submitSettlement(request: SubmitSettlementRequest): Promise<SubmitSettlementResponse>;
  
  /**
   * Get a specific transaction by external ID or transfer ID
   */
  getTransaction(request: GetTransactionRequest): Promise<RailTransaction | null>;
  
  /**
   * Get transactions for reconciliation
   */
  getTransactions(request: GetTransactionsRequest): Promise<GetTransactionsResponse>;
  
  /**
   * Get current balance/float on this rail
   */
  getBalance(currency: string): Promise<RailBalance>;
  
  /**
   * Check if rail is healthy/available
   */
  healthCheck(): Promise<{ healthy: boolean; message?: string }>;
  
  /**
   * Cancel a pending settlement (if supported)
   */
  cancelSettlement?(externalId: string): Promise<{ success: boolean; message?: string }>;
}

/**
 * Reconciliation Types
 */
export type DiscrepancyType = 
  | 'missing_in_ledger'     // Rail has record, we don't
  | 'missing_in_rail'       // We have record, rail doesn't
  | 'amount_mismatch'       // Amounts don't match
  | 'status_mismatch'       // Status differs
  | 'duplicate'             // Duplicate transaction detected
  | 'timing_discrepancy';   // Completion time differs significantly

export type DiscrepancySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ReconciliationDiscrepancy {
  id: string;
  rail: RailId;
  type: DiscrepancyType;
  severity: DiscrepancySeverity;
  transferId?: string;
  externalId?: string;
  expectedAmount?: number;
  actualAmount?: number;
  expectedStatus?: string;
  actualStatus?: string;
  description: string;
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
  metadata?: Record<string, any>;
}

export interface ReconciliationReport {
  id: string;
  tenantId: string;
  rail: RailId;
  periodStart: string;
  periodEnd: string;
  status: 'running' | 'completed' | 'failed';
  
  // Summary stats
  totalTransactions: number;
  matchedTransactions: number;
  discrepancyCount: number;
  
  // Amounts
  totalExpectedAmount: number;
  totalActualAmount: number;
  amountDifference: number;
  
  // Discrepancies by type
  discrepanciesByType: Record<DiscrepancyType, number>;
  discrepanciesBySeverity: Record<DiscrepancySeverity, number>;
  
  // Timing
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  
  // Error info
  errorMessage?: string;
}

