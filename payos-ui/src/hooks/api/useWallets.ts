import { useMemo } from 'react';
import { useApi, buildQueryString, ApiResponse } from './useApi';

/**
 * Wallet Types
 */
export interface SpendingPolicy {
  dailySpendLimit?: number;
  dailySpent?: number;
  dailyResetAt?: string;
  monthlySpendLimit?: number;
  monthlySpent?: number;
  monthlyResetAt?: string;
  approvalThreshold?: number;
  requiresApprovalAbove?: number;
  approvedVendors?: string[];
  approvedCategories?: string[];
  approvedEndpoints?: string[];
}

export interface Wallet {
  id: string;
  tenant_id: string;
  owner_account_id: string;
  managed_by_agent_id?: string;
  balance: number;
  currency: string;
  wallet_address?: string;
  network?: string;
  spending_policy?: SpendingPolicy;
  status: 'active' | 'frozen' | 'depleted';
  name?: string;
  purpose?: string;
  wallet_type?: string;
  blockchain?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  owner_account_name?: string;
  agent_name?: string;
}

export interface WalletsResponse {
  data: Wallet[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface WalletFilters {
  status?: string;
  currency?: string;
  managed_by_agent_id?: string;
  owner_account_id?: string;
  limit?: number;
  offset?: number;
}

/**
 * Hook to fetch wallets list with optional filters
 */
export function useWallets(filters: WalletFilters = {}): ApiResponse<WalletsResponse> {
  const queryString = useMemo(() => buildQueryString(filters), [filters]);
  const endpoint = `/v1/wallets${queryString}`;
  
  return useApi<WalletsResponse>(endpoint);
}

/**
 * Hook to fetch a single wallet by ID
 */
export function useWallet(walletId: string | undefined, options?: { skip?: boolean }): ApiResponse<Wallet> {
  const endpoint = walletId ? `/v1/wallets/${walletId}` : '';
  
  const response = useApi<{ data: Wallet }>(endpoint, {
    skip: !walletId || options?.skip,
  });
  
  return {
    ...response,
    data: response.data?.data || null,
  };
}

/**
 * Hook to fetch wallets managed by agents (agent wallets)
 */
export function useAgentWallets(filters: WalletFilters = {}): ApiResponse<WalletsResponse> {
  // Filter to only show wallets with managed_by_agent_id
  const agentFilters = useMemo(() => ({
    ...filters,
    has_agent: 'true', // Server-side filter for agent-managed wallets
  }), [filters]);
  
  const queryString = useMemo(() => buildQueryString(agentFilters), [agentFilters]);
  const endpoint = `/v1/wallets${queryString}`;
  
  return useApi<WalletsResponse>(endpoint);
}
