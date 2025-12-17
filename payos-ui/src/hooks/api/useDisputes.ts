import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../useAuth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// ============================================
// Helper for authenticated API calls
// ============================================
function useApiClient() {
  const { accessToken, logout } = useAuth();

  const request = async <T>(endpoint: string): Promise<T> => {
    if (!accessToken) {
      logout();
      throw new Error('No access token available. Please log in.');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
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

