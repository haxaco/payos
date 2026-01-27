import { useMemo, useState, useCallback } from 'react';
import { useApi, buildQueryString, ApiResponse } from './useApi';

/**
 * Approval Types
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'executed';
export type PaymentProtocol = 'x402' | 'ap2' | 'acp' | 'ucp';

export interface ApprovalRecipient {
  endpoint_id?: string;
  endpoint_path?: string;
  vendor?: string;
  mandate_id?: string;
  merchant?: string;
  checkout_id?: string;
  merchant_id?: string;
  merchant_name?: string;
  corridor?: string;
  settlement_id?: string;
  name?: string;
}

export interface Approval {
  id: string;
  walletId: string;
  agentId?: string;
  protocol: PaymentProtocol;
  amount: number;
  currency: string;
  recipient: ApprovalRecipient | null;
  status: ApprovalStatus;
  expiresAt: string;
  decidedBy?: string;
  decidedAt?: string;
  decisionReason?: string;
  executedTransferId?: string;
  executedAt?: string;
  executionError?: string;
  requestedBy: {
    type?: string;
    id?: string;
    name?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalsResponse {
  data: Approval[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface PendingSummary {
  count: number;
  totalAmount: number;
  byProtocol: Record<string, { count: number; totalAmount: number }>;
  oldestPending: string | null;
  newestPending: string | null;
}

export interface ApprovalFilters {
  status?: ApprovalStatus;
  walletId?: string;
  agentId?: string;
  protocol?: PaymentProtocol;
  limit?: number;
  offset?: number;
}

/**
 * Hook to fetch approvals list with optional filters
 */
export function useApprovals(filters: ApprovalFilters = {}): ApiResponse<ApprovalsResponse> {
  const queryString = useMemo(() => buildQueryString(filters), [filters]);
  const endpoint = `/v1/approvals${queryString}`;
  
  return useApi<ApprovalsResponse>(endpoint);
}

/**
 * Hook to fetch pending approvals summary
 */
export function usePendingApprovalsSummary(): ApiResponse<{ data: PendingSummary }> {
  return useApi<{ data: PendingSummary }>('/v1/approvals/pending');
}

/**
 * Hook to fetch a single approval by ID
 */
export function useApproval(approvalId: string | undefined, options?: { skip?: boolean }): ApiResponse<Approval> {
  const endpoint = approvalId ? `/v1/approvals/${approvalId}` : '';
  
  const response = useApi<{ data: Approval }>(endpoint, {
    skip: !approvalId || options?.skip,
  });
  
  return {
    ...response,
    data: response.data?.data || null,
  };
}

/**
 * Hook to approve or reject an approval
 */
export function useApprovalActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const approve = useCallback(async (approvalId: string, reason?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve');
      }
      
      return await response.json();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reject = useCallback(async (approvalId: string, reason?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/approvals/${approvalId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject');
      }
      
      return await response.json();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    approve,
    reject,
    loading,
    error,
  };
}
