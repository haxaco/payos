import { useApi } from './useApi';

export interface Report {
  id: string;
  name: string;
  type: 'transactions' | 'streams' | 'accounts' | 'agents' | 'compliance' | 'financial_summary';
  format: 'csv' | 'json' | 'pdf';
  status: 'pending' | 'processing' | 'ready' | 'failed';
  rowCount?: number;
  dateRange?: {
    from: string;
    to: string;
  };
  generatedAt: string;
  expiresAt: string;
  downloadUrl?: string;
  createdAt: string;
}

export interface CreateReportInput {
  type: 'transactions' | 'streams' | 'accounts' | 'agents' | 'compliance' | 'financial_summary';
  format: 'csv' | 'json' | 'pdf';
  dateRange?: {
    from: string;
    to: string;
  };
  filters?: Record<string, any>;
}

export interface SummaryReport {
  period: {
    start: string;
    end: string;
  };
  totals: {
    transfersOut: number;
    transfersIn: number;
    refundsIssued: number;
    feesPaid: number;
    streamsActive: number;
    streamsTotalFlowed: number;
  };
  byCorridor: Array<{
    corridor: string;
    volume: number;
    count: number;
  }>;
  byAccountType: Array<{
    type: string;
    volume: number;
  }>;
}

/**
 * Fetch a list of generated reports
 */
export function useReports(params?: { type?: string; status?: string; page?: number; limit?: number }) {
  const queryString = new URLSearchParams();
  if (params?.type) queryString.append('type', params.type);
  if (params?.status) queryString.append('status', params.status);
  if (params?.page) queryString.append('page', params.page.toString());
  if (params?.limit) queryString.append('limit', params.limit.toString());

  return useApi<{ data: Report[]; pagination: any }>(`/v1/reports?${queryString}`);
}

/**
 * Fetch a single report by ID
 */
export function useReport(id: string | undefined) {
  return useApi<{ data: Report }>(id ? `/v1/reports/${id}` : null);
}

/**
 * Fetch summary report for a period
 */
export function useSummaryReport(params?: { 
  period?: 'day' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
}) {
  const queryString = new URLSearchParams();
  if (params?.period) queryString.append('period', params.period);
  if (params?.startDate) queryString.append('startDate', params.startDate);
  if (params?.endDate) queryString.append('endDate', params.endDate);

  return useApi<{ data: SummaryReport }>(`/v1/reports/summary?${queryString}`);
}

/**
 * Generate a new report (POST request)
 */
export async function generateReport(input: CreateReportInput): Promise<{ data: Report }> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/v1/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to generate report' }));
    throw new Error(error.error || 'Failed to generate report');
  }

  return response.json();
}

/**
 * Delete a report
 */
export async function deleteReport(id: string): Promise<void> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/v1/reports/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete report' }));
    throw new Error(error.error || 'Failed to delete report');
  }
}

/**
 * Download a report
 */
export function downloadReport(id: string) {
  const token = localStorage.getItem('accessToken');
  window.open(`${import.meta.env.VITE_API_URL}/v1/reports/${id}/download?token=${token}`, '_blank');
}

