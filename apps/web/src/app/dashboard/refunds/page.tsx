'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import {
  ArrowLeft,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { Input, cn } from '@sly/ui';
import { formatCurrency } from '@sly/ui';
import type { Refund, Transfer } from '@sly/api-client';
import { TableSkeleton } from '@/components/ui/skeletons';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { RefundModal } from '@/components/transfers/refund-modal';

const REASON_LABELS: Record<string, string> = {
  customer_request: 'Customer Request',
  duplicate_payment: 'Duplicate Payment',
  service_not_rendered: 'Service Not Rendered',
  error: 'Processing Error',
  other: 'Other',
};

export default function RefundsPage() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { isConfigured, isLoading: isAuthLoading } = useApiConfig();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewRefundModal, setShowNewRefundModal] = useState(false);
  const [showTransferSelector, setShowTransferSelector] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  // Fetch total count
  const { data: countData } = useQuery({
    queryKey: ['refunds', 'count'],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.refunds.list({ limit: 1 });
    },
    enabled: !!api && isConfigured,
    staleTime: 60 * 1000,
  });

  // Initialize pagination
  const pagination = usePagination({
    totalItems: (countData as any)?.data?.pagination?.total || (countData as any)?.pagination?.total || 0,
    initialPageSize: 50,
  });

  // Fetch refunds for current page
  const { data: refundsData, isLoading: loading } = useQuery({
    queryKey: ['refunds', 'page', pagination.page, pagination.pageSize],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.refunds.list({
        page: pagination.page,
        limit: pagination.pageSize,
      });
    },
    enabled: !!api && isConfigured,
    staleTime: 30 * 1000,
  });

  // Fetch completed transfers for refund selection (MUST be before any conditional returns!)
  const { data: transfersData } = useQuery({
    queryKey: ['transfers', 'completed'],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.transfers.list({ status: 'completed', limit: 100 });
    },
    enabled: !!api && isConfigured && showTransferSelector,
    staleTime: 30 * 1000,
  });

  const completedTransfers = Array.isArray((transfersData as any)?.data?.data)
    ? (transfersData as any).data.data
    : Array.isArray((transfersData as any)?.data)
    ? (transfersData as any).data
    : [];

  const rawData = (refundsData as any)?.data;
  const refunds = Array.isArray(rawData)
    ? rawData
    : (Array.isArray((rawData as any)?.data)
      ? (rawData as any).data
      : []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400';
      case 'failed': return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400';
      default: return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400';
    }
  };

  const filteredRefunds = refunds.filter((refund: any) => {
    const matchesSearch = refund.id.toLowerCase().includes(search.toLowerCase()) ||
      (refund.originalTransferId || refund.original_transfer_id || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || refund.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isAuthLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Refunds</h1>
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Refunds</h1>
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Refunds</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track and manage issued refunds</p>
        </div>
        <button
          onClick={() => setShowTransferSelector(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          New Refund
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
              <ArrowLeft className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{refunds.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Refunds</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {refunds.filter((r: any) => r.status === 'completed').length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-950 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {refunds.filter((r: any) => r.status === 'pending').length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950 rounded-lg flex items-center justify-center">
              <ArrowLeft className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(
                  refunds.filter((r: any) => r.status === 'completed').reduce((acc: number, r: any) => acc + r.amount, 0),
                  'USDC'
                )}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Refunded</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by ID or transfer ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Top Pagination Controls */}
      {!loading && refunds.length > 0 && (
        <PaginationControls
          pagination={pagination}
          className="mb-4"
        />
      )}

      {/* Refunds List */}
      {filteredRefunds.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <ArrowLeft className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Refunds Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Refunds will appear here when issued from completed transactions.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Refund ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Original Transfer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRefunds.map((refund: any) => (
                <tr key={refund.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/refunds/${refund.id}`} className="block group">
                      <code className="text-sm font-mono text-blue-600 dark:text-blue-400 group-hover:underline">
                        {refund.id.slice(0, 8)}...
                      </code>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/transfers/${refund.originalTransferId || refund.original_transfer_id || ''}`}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {(refund.originalTransferId || refund.original_transfer_id)?.slice(0, 8) || 'N/A'}...
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(refund.amount, refund.currency)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {(REASON_LABELS[refund.reason] || refund.reason || 'Unknown').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1', getStatusColor(refund.status))}>
                      {getStatusIcon(refund.status)}
                      <span className="capitalize">{refund.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(refund.createdAt || refund.created_at || Date.now()).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && refunds.length > 0 && (
        <PaginationControls
          pagination={pagination}
          className="mt-6"
        />
      )}

      {/* Transfer Selector Modal */}
      {showTransferSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-950 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Select Transfer to Refund</h2>
                <button
                  onClick={() => setShowTransferSelector(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {completedTransfers.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No completed transfers available for refund
                </p>
              ) : (
                <div className="space-y-2">
                  {completedTransfers.map((transfer: Transfer) => (
                    <button
                      key={transfer.id}
                      onClick={() => {
                        setSelectedTransfer(transfer);
                        setShowTransferSelector(false);
                      }}
                      className="w-full p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(parseFloat(transfer.amount?.toString() || '0'), transfer.currency)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(transfer.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {transfer.id.slice(0, 8)}...
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {selectedTransfer && (
        <RefundModal
          transfer={selectedTransfer}
          onClose={() => setSelectedTransfer(null)}
          onSuccess={async () => {
            setSelectedTransfer(null);
            queryClient.invalidateQueries({ queryKey: ['refunds'] });
          }}
        />
      )}
    </div>
  );
}

