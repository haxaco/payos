/**
 * React Query hooks for dashboard and treasury reports
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
// Dashboard Types
// ============================================

export interface DashboardSummary {
  accounts: {
    total: number;
    verified: number;
    new_30d: number;
    business: number;
    person: number;
  };
  cards: {
    total: number;
    verified: number;
  };
  compliance: {
    open_flags: number;
    high_risk: number;
    critical: number;
  };
  volume: {
    by_month: Array<{
      month: string;
      total_volume: number;
      transaction_count: number;
      us_arg_volume: number;
      us_col_volume: number;
      us_mex_volume: number;
    }>;
    total_last_30d: number;
    by_corridor?: Array<{
      corridor: string;
      volume: number;
      count: number;
    }>;
  };
  recent_activity: Array<{
    id: string;
    time: string;
    type: string;
    amount: number;
    currency: string;
    from: string;
    to: string;
    status: string;
    is_flagged: boolean;
    risk_level: string | null;
    reason_code: string | null;
  }>;
}

// ============================================
// Treasury Types
// ============================================

export interface TreasurySummary {
  currencies: Array<{
    currency: string;
    total_balance: number;
    available_balance: number;
    balance_in_streams: number;
    account_count: number;
    health_status: 'healthy' | 'adequate' | 'low' | 'critical';
    stream_utilization_pct: number;
  }>;
  netflow: {
    inflow_stream_count: number;
    total_inflow_per_month: number;
    outflow_stream_count: number;
    total_outflow_per_month: number;
    net_flow_per_month: number;
    net_flow_per_day: number;
    net_flow_per_hour: number;
  };
  scheduled_outflows_48h: Array<{
    amount: number;
    currency: string;
    scheduled_for: string;
  }>;
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to fetch dashboard summary data
 * Includes account stats, card stats, compliance flags, volume data, and recent activity
 * 
 * Cache: 30 seconds (React Query staleTime)
 */
export function useDashboardSummary() {
  const api = useApiClient();

  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.get<{ data: DashboardSummary }>('/v1/reports/dashboard/summary'),
    staleTime: 30 * 1000, // Cache for 30 seconds - dashboard doesn't need real-time updates
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    select: (response) => response.data, // Unwrap the data field
  });
}

/**
 * Hook to fetch treasury summary data
 * Includes currency balances, stream netflow, and scheduled transfers
 * 
 * Cache: 5 seconds (more real-time than dashboard)
 */
export function useTreasurySummary() {
  const api = useApiClient();

  return useQuery({
    queryKey: ['treasury', 'summary'],
    queryFn: () => api.get<{ data: TreasurySummary }>('/v1/reports/treasury/summary'),
    staleTime: 5 * 1000, // Shorter cache for treasury - more time-sensitive
    gcTime: 60 * 1000, // Keep in cache for 1 minute
    select: (response) => response.data, // Unwrap the data field
  });
}
