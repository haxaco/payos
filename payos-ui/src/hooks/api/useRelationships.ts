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
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
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
    post: <T>(endpoint: string, body: any) => request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    patch: <T>(endpoint: string, body: any) => request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    delete: <T>(endpoint: string) => request<T>(endpoint, {
      method: 'DELETE',
    }),
  };
}

// ============================================
// Types
// ============================================
export interface AccountRelationship {
  id: string;
  accountId: string;
  relatedAccountId: string;
  relatedAccountName: string;
  relatedAccountType: string;
  relatedAccountEmail?: string;
  relationshipType: 'contractor' | 'employer' | 'vendor' | 'customer' | 'partner';
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contractor {
  id: string;
  accountId: string;
  name: string;
  type: string;
  email?: string;
  verificationStatus?: string;
  verificationTier?: number;
  notes?: string;
  relationshipCreatedAt: string;
}

export interface Employer {
  id: string;
  accountId: string;
  name: string;
  type: string;
  email?: string;
  verificationStatus?: string;
  verificationTier?: number;
  notes?: string;
  relationshipCreatedAt: string;
}

interface ApiResponse<T> {
  data: T;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CreateRelationshipInput {
  relatedAccountId: string;
  relationshipType: 'contractor' | 'employer' | 'vendor' | 'customer' | 'partner';
  notes?: string;
}

interface UpdateRelationshipInput {
  relationshipType?: 'contractor' | 'employer' | 'vendor' | 'customer' | 'partner';
  status?: 'active' | 'inactive';
  notes?: string;
}

// ============================================
// Query Keys
// ============================================
const RELATIONSHIP_QUERY_KEYS = {
  all: ['relationships'] as const,
  account: (accountId: string) => [...RELATIONSHIP_QUERY_KEYS.all, 'account', accountId] as const,
  contractors: (accountId: string) => [...RELATIONSHIP_QUERY_KEYS.all, 'contractors', accountId] as const,
  employers: (accountId: string) => [...RELATIONSHIP_QUERY_KEYS.all, 'employers', accountId] as const,
};

// ============================================
// Hooks
// ============================================

/**
 * Hook to fetch all relationships for an account
 */
export function useAccountRelationships(accountId?: string, filters?: {
  type?: string;
  status?: string;
}) {
  const apiClient = useApiClient();
  
  // Build query string
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  const queryString = params.toString();
  
  return useQuery<PaginatedResponse<AccountRelationship>, Error>({
    queryKey: [...RELATIONSHIP_QUERY_KEYS.account(accountId || ''), filters],
    queryFn: async () => {
      if (!accountId) throw new Error('Account ID is required');
      const endpoint = `/v1/accounts/${accountId}/relationships${queryString ? `?${queryString}` : ''}`;
      return apiClient.get<PaginatedResponse<AccountRelationship>>(endpoint);
    },
    enabled: !!accountId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch contractors for an account
 */
export function useAccountContractors(accountId?: string) {
  const apiClient = useApiClient();
  
  return useQuery<ApiResponse<Contractor[]>, Error>({
    queryKey: RELATIONSHIP_QUERY_KEYS.contractors(accountId || ''),
    queryFn: async () => {
      if (!accountId) throw new Error('Account ID is required');
      return apiClient.get<ApiResponse<Contractor[]>>(`/v1/accounts/${accountId}/contractors`);
    },
    enabled: !!accountId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch employers for an account
 */
export function useAccountEmployers(accountId?: string) {
  const apiClient = useApiClient();
  
  return useQuery<ApiResponse<Employer[]>, Error>({
    queryKey: RELATIONSHIP_QUERY_KEYS.employers(accountId || ''),
    queryFn: async () => {
      if (!accountId) throw new Error('Account ID is required');
      return apiClient.get<ApiResponse<Employer[]>>(`/v1/accounts/${accountId}/employers`);
    },
    enabled: !!accountId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to create a new relationship
 */
export function useCreateRelationship(accountId: string) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation<ApiResponse<AccountRelationship>, Error, CreateRelationshipInput>({
    mutationFn: async (input) => {
      return apiClient.post<ApiResponse<AccountRelationship>>(
        `/v1/accounts/${accountId}/relationships`,
        input
      );
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: RELATIONSHIP_QUERY_KEYS.account(accountId) });
      queryClient.invalidateQueries({ queryKey: RELATIONSHIP_QUERY_KEYS.contractors(accountId) });
      queryClient.invalidateQueries({ queryKey: RELATIONSHIP_QUERY_KEYS.employers(accountId) });
    },
  });
}

/**
 * Hook to update an existing relationship
 */
export function useUpdateRelationship(accountId: string, relationshipId: string) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation<ApiResponse<AccountRelationship>, Error, UpdateRelationshipInput>({
    mutationFn: async (input) => {
      return apiClient.patch<ApiResponse<AccountRelationship>>(
        `/v1/accounts/${accountId}/relationships/${relationshipId}`,
        input
      );
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: RELATIONSHIP_QUERY_KEYS.account(accountId) });
      queryClient.invalidateQueries({ queryKey: RELATIONSHIP_QUERY_KEYS.contractors(accountId) });
      queryClient.invalidateQueries({ queryKey: RELATIONSHIP_QUERY_KEYS.employers(accountId) });
    },
  });
}

/**
 * Hook to delete a relationship
 */
export function useDeleteRelationship(accountId: string) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  return useMutation<{ message: string; success: boolean }, Error, string>({
    mutationFn: async (relationshipId) => {
      return apiClient.delete<{ message: string; success: boolean }>(
        `/v1/accounts/${accountId}/relationships/${relationshipId}`
      );
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: RELATIONSHIP_QUERY_KEYS.account(accountId) });
      queryClient.invalidateQueries({ queryKey: RELATIONSHIP_QUERY_KEYS.contractors(accountId) });
      queryClient.invalidateQueries({ queryKey: RELATIONSHIP_QUERY_KEYS.employers(accountId) });
    },
  });
}


