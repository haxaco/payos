/**
 * Report Generation Hooks
 * For generating and managing CSV/PDF reports (separate from dashboard summaries)
 */

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
    post: <T>(endpoint: string, body?: any) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
  };
}

// ============================================
// Types
// ============================================

export interface Report {
  id: string;
  type: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  downloadUrl?: string;
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to fetch list of generated reports
 */
export function useReports(params?: { limit?: number }) {
  const api = useApiClient();
  const query = useQuery({
    queryKey: ['reports', params],
    queryFn: () => api.get<{ data: Report[] }>('/v1/reports'),
    select: (response) => response.data || [],
  });

  return {
    data: { data: query.data || [] },
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch a single report
 */
export function useReport(id: string) {
  const api = useApiClient();

  return useQuery({
    queryKey: ['reports', id],
    queryFn: () => api.get<{ data: Report }>(`/v1/reports/${id}`),
    enabled: !!id,
    select: (response) => response.data,
  });
}

/**
 * Hook to fetch summary report
 */
export function useSummaryReport() {
  const api = useApiClient();

  return useQuery({
    queryKey: ['reports', 'summary'],
    queryFn: () => api.get<{ data: any }>('/v1/reports/summary'),
    select: (response) => response.data,
  });
}

/**
 * Hook to generate a new report
 */
export function generateReport() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      type: string;
      format: string;
      dateRange?: { start: string; end: string };
    }) => {
      return api.post<{ data: Report }>('/v1/reports', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

/**
 * Download a report
 */
export async function downloadReport(reportId: string): Promise<void> {
  // TODO: Implement download functionality
  throw new Error('Download not yet implemented');
}

/**
 * Delete a report
 */
export function deleteReport() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      return api.delete(`/v1/reports/${reportId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
