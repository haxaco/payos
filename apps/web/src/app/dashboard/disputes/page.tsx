'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiConfig, useApiFetch } from '@/lib/api-client';
import { Shield, Search, Filter, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { CardListSkeleton } from '@/components/ui/skeletons';

type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'escalated';

interface Dispute {
  id: string;
  transfer_id: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  amount_disputed: number;
  resolution?: string;
  created_at: string;
  updated_at: string;
}

const STATUS_STYLES: Record<DisputeStatus, string> = {
  open: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
  under_review: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  resolved: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  escalated: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
};

const STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Open',
  under_review: 'Under Review',
  resolved: 'Resolved',
  escalated: 'Escalated',
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatAmount(amount: number | null | undefined) {
  if (amount == null || isNaN(amount)) return '—';
  // Amounts are stored in dollars (not cents)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export default function DisputesPage() {
  const { apiUrl, isConfigured, isLoading: isAuthLoading, apiEnvironment } = useApiConfig();
  const apiFetch = useApiFetch();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | 'all'>('all');

  const { data: disputesData, isLoading: loading } = useQuery({
    queryKey: ['disputes', apiEnvironment],
    queryFn: async () => {
      const r = await apiFetch(`${apiUrl}/v1/disputes`);
      if (!r.ok) throw new Error('Failed to fetch disputes');
      return r.json();
    },
    enabled: !!apiUrl && isConfigured,
    staleTime: 30 * 1000,
  });

  const rawData = disputesData?.data;
  const disputes: Dispute[] = Array.isArray(rawData) ? rawData : [];

  const filteredDisputes = disputes.filter((dispute) => {
    const matchesSearch =
      dispute.reason.toLowerCase().includes(search.toLowerCase()) ||
      dispute.transfer_id.toLowerCase().includes(search.toLowerCase()) ||
      (dispute.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || dispute.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = disputes.reduce(
    (acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    },
    {} as Record<DisputeStatus, number>
  );

  if (isAuthLoading) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Disputes</h1>
            <p className="text-gray-600 dark:text-gray-400">Review and resolve payment disputes</p>
          </div>
        </div>
        <CardListSkeleton count={6} />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configure API Key</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Please configure your API key to view disputes.
          </p>
          <Link
            href="/dashboard/api-keys"
            className="inline-flex mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Configure API Key
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Disputes</h1>
          <p className="text-gray-600 dark:text-gray-400">Review and resolve payment disputes</p>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && disputes.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All
            <span className="text-xs font-semibold">{disputes.length}</span>
          </button>
          {(['open', 'under_review', 'resolved', 'escalated'] as DisputeStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status === statusFilter ? 'all' : status)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === status
                  ? STATUS_STYLES[status] + ' ring-2 ring-offset-1 ring-current'
                  : STATUS_STYLES[status] + ' opacity-70 hover:opacity-100'
              }`}
            >
              {STATUS_LABELS[status]}
              <span className="text-xs font-semibold">{statusCounts[status] || 0}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by reason, transfer ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      {/* Disputes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full">
            <CardListSkeleton count={6} />
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="col-span-full">
            {search || statusFilter !== 'all' ? (
              <div className="p-8 text-center">
                <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No results found</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Try a different search term or filter
                </p>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No disputes filed
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  There are no payment disputes at this time. Disputes will appear here when they are raised.
                </p>
              </div>
            )}
          </div>
        ) : (
          filteredDisputes.map((dispute) => (
            <Link
              key={dispute.id}
              href={`/dashboard/disputes/${dispute.id}`}
              className="block bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <span
                  className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[dispute.status]}`}
                >
                  {STATUS_LABELS[dispute.status]}
                </span>
              </div>

              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                {dispute.reason}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                {dispute.description || 'No description provided'}
              </p>

              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatAmount(dispute.amount_disputed)}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {formatDate(dispute.created_at)}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">
                  Transfer: {dispute.transfer_id}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
