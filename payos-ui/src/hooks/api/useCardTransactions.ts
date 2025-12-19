/**
 * React Query hooks for card transactions
 */

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

export interface CardTransaction {
  id: string;
  type: 'purchase' | 'refund' | 'auth_hold' | 'auth_release' | 'decline' | 'reversal';
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  amount: number;
  currency: string;
  merchant_name: string | null;
  merchant_category: string | null;
  transaction_time: string;
  is_disputed: boolean;
  card_last_four: string | null;
}

export interface CardSpendingSummary {
  total_spent: number;
  transaction_count: number;
  avg_transaction: number;
  largest_transaction: number;
  most_frequent_merchant: string | null;
  merchant_count: number;
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to fetch card transactions for a payment method
 * 
 * @param paymentMethodId - Payment method ID
 * @param options - Query options (limit, offset)
 */
export function useCardTransactions(
  paymentMethodId: string | undefined,
  options?: { limit?: number; offset?: number }
) {
  const api = useApiClient();

  return useQuery({
    queryKey: ['cardTransactions', paymentMethodId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.offset) params.set('offset', options.offset.toString());

      const queryString = params.toString();
      const endpoint = `/v1/payment-methods/${paymentMethodId}/transactions${queryString ? `?${queryString}` : ''}`;

      return api.get<{ data: CardTransaction[]; pagination: { total: number; limit: number; offset: number } }>(endpoint);
    },
    enabled: !!paymentMethodId,
    staleTime: 10 * 1000, // Cache for 10 seconds
    gcTime: 60 * 1000, // Keep in cache for 1 minute
  });
}

/**
 * Hook to fetch card spending summary for a payment method
 * 
 * @param paymentMethodId - Payment method ID
 * @param days - Number of days to include in summary (default: 30)
 */
export function useCardSpendingSummary(
  paymentMethodId: string | undefined,
  days: number = 30
) {
  const api = useApiClient();

  return useQuery({
    queryKey: ['cardSpendingSummary', paymentMethodId, days],
    queryFn: () => api.get<{ data: CardSpendingSummary }>(`/v1/payment-methods/${paymentMethodId}/transactions/spending-summary?days=${days}`),
    enabled: !!paymentMethodId,
    staleTime: 30 * 1000, // Cache for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    select: (response) => response.data, // Unwrap the data field
  });
}

