import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buildQueryString } from './useApi';
import { useAuth } from '../useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Helper to make authenticated API calls
function useApiClient() {
  const { accessToken } = useAuth();

  const makeRequest = async <T,>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    return response.json();
  };

  return {
    get: <T,>(endpoint: string) => makeRequest<T>(endpoint, { method: 'GET' }),
    post: <T,>(endpoint: string, body?: any) =>
      makeRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    patch: <T,>(endpoint: string, body?: any) =>
      makeRequest<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
    del: <T,>(endpoint: string) => makeRequest<T>(endpoint, { method: 'DELETE' }),
  };
}

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Types
// ============================================

export interface ComplianceFlag {
  id: string;
  tenant_id: string;
  flag_type: 'transaction' | 'account' | 'pattern';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'pending_review' | 'under_investigation' | 'resolved' | 'dismissed' | 'escalated';
  
  // References
  account_id?: string;
  transfer_id?: string;
  
  // Details
  reason_code: string;
  reasons: string[];
  description?: string;
  
  // AI Analysis
  ai_analysis?: {
    risk_score: number;
    risk_explanation: string;
    pattern_matches?: Array<{
      description: string;
      percentage: number;
    }>;
    suggested_actions?: Array<{
      action: string;
      completed: boolean;
    }>;
    confidence_level?: number;
  };
  
  // Resolution
  resolution_action?: 'approved' | 'rejected' | 'manual_review' | 'escalated' | 'no_action';
  resolution_notes?: string;
  resolved_by_user_id?: string;
  resolved_at?: string;
  
  // Review tracking
  assigned_to_user_id?: string;
  reviewed_by_user_id?: string;
  review_notes?: string;
  reviewed_at?: string;
  
  // Due dates
  due_date?: string;
  escalated_at?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Joined data
  accounts?: {
    id: string;
    name: string;
    type: string;
    email?: string;
  };
  transfers?: {
    id: string;
    from_account_id: string;
    from_account_name: string;
    to_account_id: string;
    to_account_name: string;
    amount: number;
    currency: string;
  };
}

export interface ComplianceFlagFilters {
  status?: string;
  risk_level?: string;
  flag_type?: string;
  account_id?: string;
  transfer_id?: string;
  assigned_to?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateFlagPayload {
  flag_type: 'transaction' | 'account' | 'pattern';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  reason_code: string;
  reasons: string[];
  description?: string;
  account_id?: string;
  transfer_id?: string;
  ai_analysis?: ComplianceFlag['ai_analysis'];
  due_date?: string;
  assigned_to_user_id?: string;
}

export interface UpdateFlagPayload {
  status?: string;
  assigned_to_user_id?: string;
  review_notes?: string;
  resolution_action?: string;
  resolution_notes?: string;
}

export interface ResolveFlagPayload {
  action: 'approved' | 'rejected' | 'manual_review' | 'escalated' | 'no_action';
  notes?: string;
}

export interface ComplianceStats {
  total: number;
  by_status: {
    open: number;
    pending_review: number;
    under_investigation: number;
    escalated: number;
    resolved: number;
    dismissed: number;
  };
  by_risk_level: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  due_soon: number;
}

// ============================================
// Query Keys
// ============================================

const COMPLIANCE_QUERY_KEYS = {
  all: ['compliance'] as const,
  lists: () => [...COMPLIANCE_QUERY_KEYS.all, 'list'] as const,
  list: (filters: ComplianceFlagFilters) => [...COMPLIANCE_QUERY_KEYS.lists(), filters] as const,
  details: () => [...COMPLIANCE_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...COMPLIANCE_QUERY_KEYS.details(), id] as const,
  stats: () => [...COMPLIANCE_QUERY_KEYS.all, 'stats'] as const,
};

// ============================================
// Hooks
// ============================================

/**
 * Hook to fetch list of compliance flags
 */
export function useComplianceFlags(filters: ComplianceFlagFilters = {}) {
  const apiClient = useApiClient();
  const queryString = buildQueryString(filters);
  
  return useQuery<PaginatedResponse<ComplianceFlag>, Error>({
    queryKey: COMPLIANCE_QUERY_KEYS.list(filters),
    queryFn: async () => {
      return apiClient.get<PaginatedResponse<ComplianceFlag>>(`/v1/compliance/flags${queryString}`);
    },
    staleTime: 30 * 1000, // 30 seconds
    keepPreviousData: true,
  });
}

/**
 * Hook to fetch a single compliance flag
 */
export function useComplianceFlag(id?: string) {
  const apiClient = useApiClient();
  
  return useQuery<ApiResponse<ComplianceFlag>, Error>({
    queryKey: COMPLIANCE_QUERY_KEYS.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Flag ID is required');
      return apiClient.get<ApiResponse<ComplianceFlag>>(`/v1/compliance/flags/${id}`);
    },
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch compliance statistics
 */
export function useComplianceStats() {
  const apiClient = useApiClient();
  
  return useQuery<ApiResponse<ComplianceStats>, Error>({
    queryKey: COMPLIANCE_QUERY_KEYS.stats(),
    queryFn: async () => {
      return apiClient.get<ApiResponse<ComplianceStats>>('/v1/compliance/stats');
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Mutation to create a new compliance flag
 */
export function useCreateComplianceFlag() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation<ApiResponse<ComplianceFlag>, Error, CreateFlagPayload>({
    mutationFn: async (payload) => {
      return apiClient.post<ApiResponse<ComplianceFlag>>('/v1/compliance/flags', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMPLIANCE_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: COMPLIANCE_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation to update a compliance flag
 */
export function useUpdateComplianceFlag() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation<ApiResponse<ComplianceFlag>, Error, { id: string; payload: UpdateFlagPayload }>({
    mutationFn: async ({ id, payload }) => {
      return apiClient.patch<ApiResponse<ComplianceFlag>>(`/v1/compliance/flags/${id}`, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: COMPLIANCE_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: COMPLIANCE_QUERY_KEYS.detail(data.data.id) });
      queryClient.invalidateQueries({ queryKey: COMPLIANCE_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation to resolve a compliance flag
 */
export function useResolveComplianceFlag() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation<ApiResponse<ComplianceFlag>, Error, { id: string; payload: ResolveFlagPayload }>({
    mutationFn: async ({ id, payload }) => {
      return apiClient.post<ApiResponse<ComplianceFlag>>(`/v1/compliance/flags/${id}/resolve`, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: COMPLIANCE_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: COMPLIANCE_QUERY_KEYS.detail(data.data.id) });
      queryClient.invalidateQueries({ queryKey: COMPLIANCE_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Mutation to assign a compliance flag to a user
 */
export function useAssignComplianceFlag() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation<ApiResponse<ComplianceFlag>, Error, { id: string; user_id: string }>({
    mutationFn: async ({ id, user_id }) => {
      return apiClient.post<ApiResponse<ComplianceFlag>>(`/v1/compliance/flags/${id}/assign`, { user_id });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: COMPLIANCE_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: COMPLIANCE_QUERY_KEYS.detail(data.data.id) });
      queryClient.invalidateQueries({ queryKey: COMPLIANCE_QUERY_KEYS.stats() });
    },
  });
}

