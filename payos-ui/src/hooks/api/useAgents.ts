import { useMemo } from 'react';
import { useApi, buildQueryString, ApiResponse } from './useApi';
import { Agent, AgentsResponse, AgentFilters } from '../../types/api';

/**
 * Hook to fetch agents list with optional filters
 */
export function useAgents(filters: AgentFilters = {}): ApiResponse<AgentsResponse> {
  // Map snake_case to camelCase for API compatibility
  const apiFilters = useMemo(() => {
    const mapped: any = { ...filters };
    if (filters.parent_account_id) {
      mapped.parentAccountId = filters.parent_account_id;
      delete mapped.parent_account_id;
    }
    if (filters.kya_tier !== undefined) {
      mapped.kyaTier = filters.kya_tier;
      delete mapped.kya_tier;
    }
    return mapped;
  }, [filters]);
  
  const queryString = useMemo(() => buildQueryString(apiFilters), [apiFilters]);
  const endpoint = `/v1/agents${queryString}`;
  
  return useApi<AgentsResponse>(endpoint);
}

/**
 * Hook to fetch a single agent by ID
 */
export function useAgent(agentId: string | undefined, options?: { skip?: boolean }): ApiResponse<Agent> {
  const endpoint = agentId ? `/v1/agents/${agentId}` : '';
  
  const response = useApi<{ data: Agent }>(endpoint, {
    skip: !agentId || options?.skip,
  });
  
  // Unwrap the data field from API response
  return {
    ...response,
    data: response.data?.data || null,
  };
}

