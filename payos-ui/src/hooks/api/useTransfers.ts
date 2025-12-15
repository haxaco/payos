import { useMemo } from 'react';
import { useApi, buildQueryString, ApiResponse } from './useApi';
import { Transfer, TransfersResponse, TransferFilters } from '../../types/api';

/**
 * Hook to fetch transfers list with optional filters
 */
export function useTransfers(filters: TransferFilters = {}): ApiResponse<TransfersResponse> {
  const queryString = useMemo(() => buildQueryString(filters), [filters]);
  const endpoint = `/v1/transfers${queryString}`;
  
  return useApi<TransfersResponse>(endpoint);
}

/**
 * Hook to fetch a single transfer by ID
 */
export function useTransfer(transferId: string | undefined, options?: { skip?: boolean }): ApiResponse<Transfer> {
  const endpoint = transferId ? `/v1/transfers/${transferId}` : '';
  
  return useApi<Transfer>(endpoint, {
    skip: !transferId || options?.skip,
  });
}

