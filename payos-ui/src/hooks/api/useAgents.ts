import { useMemo } from 'react';
import { useApi, buildQueryString, ApiResponse } from './useApi';
import { Agent, AgentsResponse, AgentFilters } from '../../types/api';

/**
 * Hook to fetch agents list with optional filters
 */
export function useAgents(filters: AgentFilters = {}): ApiResponse<AgentsResponse> {
  const queryString = useMemo(() => buildQueryString(filters), [filters]);
  const endpoint = `/v1/agents${queryString}`;
  
  return useApi<AgentsResponse>(endpoint);
}

/**
 * Hook to fetch a single agent by ID
 */
export function useAgent(agentId: string | undefined, options?: { skip?: boolean }): ApiResponse<Agent> {
  const endpoint = agentId ? `/v1/agents/${agentId}` : '';
  
  return useApi<Agent>(endpoint, {
    skip: !agentId || options?.skip,
  });
}

