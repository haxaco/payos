'use client';

import { Shield, AlertTriangle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { CardListSkeleton } from '@/components/ui/skeletons';

export default function CompliancePage() {
  const api = useApiClient();
  const { isConfigured, isLoading: isAuthLoading } = useApiConfig();

  // Fetch total count
  const { data: countData } = useQuery({
    queryKey: ['compliance', 'count'],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.compliance.listFlags({ limit: 1 });
    },
    enabled: !!api && isConfigured,
    staleTime: 60 * 1000,
  });

  // Initialize pagination
  const pagination = usePagination({
    totalItems: (countData as any)?.data?.pagination?.total || (countData as any)?.pagination?.total || 0,
    initialPageSize: 50,
  });

  // Fetch compliance flags for current page
  const { data: flagsData, isLoading: loading } = useQuery({
    queryKey: ['compliance', 'page', pagination.page, pagination.pageSize],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.compliance.listFlags({
        limit: pagination.pageSize,
        offset: (pagination.page - 1) * pagination.pageSize,
      });
    },
    enabled: !!api && isConfigured,
    staleTime: 30 * 1000,
  });

  // Handle both array and object responses - API may return { data: [...] } or [...]
  const rawFlags = (flagsData as any)?.data;
  const flags = Array.isArray(rawFlags) ? rawFlags : (Array.isArray((rawFlags as any)?.data) ? (rawFlags as any).data : []);

  // Fetch stats (global counts)
  const { data: statsData } = useQuery({
    queryKey: ['compliance', 'stats'],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.compliance.getStats();
    },
    enabled: !!api && isConfigured,
    staleTime: 60 * 1000,
  });

  const stats = (statsData as any)?.data || {};

  const highRisk = stats?.by_risk_level?.high + (stats?.by_risk_level?.critical || 0) || 0;
  const mediumRisk = stats?.by_risk_level?.medium || 0;
  const lowRisk = stats?.by_risk_level?.low || 0;

  if (isAuthLoading) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Compliance</h1>
            <p className="text-gray-600 dark:text-gray-400">Monitor and manage compliance flags</p>
          </div>
        </div>
        <div className="p-6">
          <CardListSkeleton count={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Compliance</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor and manage compliance flags</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Export Report
        </button>
      </div>

      {/* Top Pagination Controls */}
      {!loading && flags.length > 0 && (
        <PaginationControls
          pagination={pagination}
          className="mb-6"
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? '...' : flags.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending flags</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs font-medium text-red-600 dark:text-red-400">Urgent</span>
          </div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {loading ? '...' : highRisk}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">High risk</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Review</span>
          </div>
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
            {loading ? '...' : mediumRisk}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Medium risk</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Monitor</span>
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {loading ? '...' : lowRisk}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Low risk</div>
        </div>
      </div>

      {/* Flags List */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Compliance Flags</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:border-gray-800">
          {loading ? (
            <div className="p-6">
              <CardListSkeleton count={5} />
            </div>
          ) : flags.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Compliance Flags
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                All clear! No compliance issues detected.
              </p>
            </div>
          ) : (
            flags.map((flag: any) => (
              <div
                key={flag.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer flex items-start gap-4"
              >
                <div className={`w-2 h-2 rounded-full mt-2 ${flag.riskLevel === 'high' || flag.riskLevel === 'critical'
                  ? 'bg-red-500'
                  : flag.riskLevel === 'medium'
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                  }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="space-y-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {(flag.reasonCode || flag.reason_code || 'Unknown reason').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </h3>
                      {Array.isArray(flag.reasons) && flag.reasons.length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 pl-1">
                          {flag.reasons.map((reason: string, idx: number) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      ) : (
                        flag.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {flag.description}
                          </p>
                        )
                      )}
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0 ${flag.riskLevel === 'high' || flag.riskLevel === 'critical'
                      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                      : flag.riskLevel === 'medium'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                      }`}>
                      {flag.riskLevel}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(flag.createdAt || flag.created_at || Date.now()).toLocaleString()}
                    </span>
                    {flag.status && (
                      <span className={`px-2 py-0.5 rounded-full ${flag.status === 'resolved'
                        ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                        : flag.status === 'under_investigation'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                        {flag.status?.replace(/_/g, ' ') || flag.status}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {!loading && flags.length > 0 && (
        <PaginationControls
          pagination={pagination}
          className="mt-6"
        />
      )}
    </div>
  );
}
