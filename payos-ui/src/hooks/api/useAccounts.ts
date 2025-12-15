import { useMemo } from 'react';
import { useApi, buildQueryString, ApiResponse } from './useApi';
import { Account, AccountsResponse, AccountFilters } from '../../types/api';

/**
 * Hook to fetch accounts list with optional filters
 */
export function useAccounts(filters: AccountFilters = {}): ApiResponse<AccountsResponse> {
  const queryString = useMemo(() => buildQueryString(filters), [filters]);
  const endpoint = `/v1/accounts${queryString}`;
  
  return useApi<AccountsResponse>(endpoint);
}

/**
 * Hook to fetch a single account by ID
 */
export function useAccount(accountId: string | undefined, options?: { skip?: boolean }): ApiResponse<Account> {
  const endpoint = accountId ? `/v1/accounts/${accountId}` : '';
  
  return useApi<Account>(endpoint, {
    skip: !accountId || options?.skip,
  });
}

