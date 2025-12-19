import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// ============================================
// Helper for authenticated API calls
// ============================================
function useApiClient() {
  const { accessToken, logout } = useAuth();

  const request = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
    if (!accessToken) {
      logout();
      throw new Error('No access token available. Please log in.');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: options?.method || 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: options?.body,
    });

    if (response.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown API error' }));
      throw new Error(errorData.error || errorData.message || `API Error: ${response.status}`);
    }

    return response.json();
  };

  return {
    get: <T>(endpoint: string) => request<T>(endpoint),
    post: <T>(endpoint: string, body?: any) =>
      request<T>(endpoint, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      }),
    patch: <T>(endpoint: string, body?: any) =>
      request<T>(endpoint, {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      }),
    delete: <T>(endpoint: string) =>
      request<T>(endpoint, {
        method: 'DELETE',
      }),
  };
}

// ============================================
// Types
// ============================================
export interface DisputeStats {
  total: number;
  byStatus: {
    open: number;
    underReview: number;
    escalated: number;
    resolved: number;
  };
  totalAmountDisputed: number;
  byReason: Record<string, number>;
  byResolution: Record<string, number>;
  averageResolutionDays: number;
}

interface ApiResponse<T> {
  data: T;
}

// ============================================
// Query Keys
// ============================================
const DISPUTE_QUERY_KEYS = {
  all: ['disputes'] as const,
  stats: () => [...DISPUTE_QUERY_KEYS.all, 'stats'] as const,
};

// ============================================
// Hooks
// ============================================

// Dispute type
export interface Dispute {
  id: string;
  transferId: string;
  status: 'open' | 'under_review' | 'escalated' | 'resolved';
  reason: string;
  description: string;
  claimantAccountId: string;
  claimantAccountName: string;
  claimantAccountType: string;
  respondentAccountId: string;
  respondentAccountName: string;
  respondentAccountType: string;
  amountDisputed: number;
  requestedResolution?: string;
  requestedAmount?: number;
  resolution?: string;
  resolutionAmount?: number;
  resolutionNotes?: string;
  dueDate: string;
  createdAt: string;
  resolvedAt?: string;
  escalatedAt?: string;
  respondentResponse?: string;
  claimantEvidence?: any[];
  respondentEvidence?: any[];
  transfer?: {
    amount: number;
    currency: string;
    completedAt: string;
  };
}

interface DisputesListResponse {
  data: Dispute[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface DisputeFilters {
  status?: string;
  accountId?: string;
  transferId?: string;
  reason?: string;
  dueSoon?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Hook to fetch dispute statistics
 */
export function useDisputeStats() {
  const apiClient = useApiClient();
  
  return useQuery<ApiResponse<DisputeStats>, Error>({
    queryKey: DISPUTE_QUERY_KEYS.stats(),
    queryFn: async () => {
      return apiClient.get<ApiResponse<DisputeStats>>('/v1/disputes/stats/summary');
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch list of disputes with filtering
 */
export function useDisputes(filters: DisputeFilters = {}) {
  const apiClient = useApiClient();
  
  // Build query string
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.accountId) params.append('accountId', filters.accountId);
  if (filters.transferId) params.append('transferId', filters.transferId);
  if (filters.reason) params.append('reason', filters.reason);
  if (filters.dueSoon) params.append('dueSoon', 'true');
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  
  const queryString = params.toString();
  const endpoint = `/v1/disputes${queryString ? `?${queryString}` : ''}`;
  
  return useQuery<DisputesListResponse, Error>({
    queryKey: [...DISPUTE_QUERY_KEYS.all, filters],
    queryFn: async () => {
      return apiClient.get<DisputesListResponse>(endpoint);
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch a single dispute by ID
 */
export function useDispute(id?: string) {
  const apiClient = useApiClient();
  
  return useQuery<ApiResponse<Dispute>, Error>({
    queryKey: [...DISPUTE_QUERY_KEYS.all, id],
    queryFn: async () => {
      if (!id) throw new Error('Dispute ID is required');
      return apiClient.get<ApiResponse<Dispute>>(`/v1/disputes/${id}`);
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

// ============================================
// MUTATIONS
// ============================================

interface ResolveDisputeInput {
  resolution: 'refund_issued' | 'partial_refund' | 'credit_issued' | 'no_action';
  resolutionAmount?: number;
  resolutionNotes?: string;
  issueRefund?: boolean;
}

interface RespondToDisputeInput {
  response: string;
  evidence?: Array<{
    type: string;
    description: string;
    url?: string;
    content?: string;
  }>;
  acceptClaim?: boolean;
  counterOffer?: {
    resolution: string;
    amount?: number;
    notes?: string;
  };
}

/**
 * Hook to resolve a dispute
 */
export function useResolveDispute() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ResolveDisputeInput }) => {
      return apiClient.post(`/v1/disputes/${id}/resolve`, data);
    },
    onSuccess: () => {
      // Invalidate disputes queries to refetch data
      queryClient.invalidateQueries({ queryKey: DISPUTE_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DISPUTE_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Hook to respond to a dispute
 */
export function useRespondToDispute() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RespondToDisputeInput }) => {
      return apiClient.post(`/v1/disputes/${id}/respond`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISPUTE_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DISPUTE_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Hook to escalate a dispute
 */
export function useEscalateDispute() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.post(`/v1/disputes/${id}/escalate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISPUTE_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: DISPUTE_QUERY_KEYS.stats() });
    },
  });
}

