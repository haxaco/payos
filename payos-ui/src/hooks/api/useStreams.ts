import { useMemo } from 'react';
import { useApi, buildQueryString, ApiResponse } from './useApi';
import { Stream, StreamsResponse, StreamFilters } from '../../types/api';

/**
 * Hook to fetch streams list with optional filters
 */
export function useStreams(filters: StreamFilters = {}): ApiResponse<StreamsResponse> {
  const queryString = useMemo(() => buildQueryString(filters), [filters]);
  const endpoint = `/v1/streams${queryString}`;
  
  return useApi<StreamsResponse>(endpoint);
}

/**
 * Hook to fetch a single stream by ID
 */
export function useStream(streamId: string | undefined, options?: { skip?: boolean }): ApiResponse<Stream> {
  const endpoint = streamId ? `/v1/streams/${streamId}` : '';
  
  return useApi<Stream>(endpoint, {
    skip: !streamId || options?.skip,
  });
}

/**
 * Hook to fetch streams for a specific account
 */
export function useAccountStreams(accountId: string | undefined): ApiResponse<StreamsResponse> {
  const endpoint = accountId ? `/v1/streams?sender_account_id=${accountId}` : '';
  
  return useApi<StreamsResponse>(endpoint, {
    skip: !accountId,
  });
}

