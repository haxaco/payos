'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Zap,
  Shield,
  ShoppingCart,
  Globe,
  AlertCircle,
  Check,
  X,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import type { Approval, ApprovalStatus, PaymentProtocol, PendingApprovalsSummary } from '@sly/api-client';
import { CardListSkeleton } from '@/components/ui/skeletons';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { toast } from 'sonner';
import { cn } from '@sly/ui';

// Protocol configuration
const PROTOCOL_CONFIG: Record<PaymentProtocol, { name: string; icon: typeof Zap; color: string; bgColor: string }> = {
  x402: {
    name: 'x402',
    icon: Zap,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-950',
  },
  ap2: {
    name: 'AP2',
    icon: Shield,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-950',
  },
  acp: {
    name: 'ACP',
    icon: ShoppingCart,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-950',
  },
  ucp: {
    name: 'UCP',
    icon: Globe,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-950',
  },
};

// Status configuration
const STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  pending: {
    label: 'Pending',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-950',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-950',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-950',
    icon: XCircle,
  },
  expired: {
    label: 'Expired',
    color: 'text-gray-700 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: AlertCircle,
  },
  executed: {
    label: 'Executed',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-950',
    icon: CheckCircle2,
  },
};

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRecipientDisplay(approval: Approval): string {
  if (!approval.recipient) return 'Unknown';

  const r = approval.recipient;
  if (r.endpoint_path) return r.endpoint_path;
  if (r.merchant_name) return r.merchant_name;
  if (r.merchant) return r.merchant;
  if (r.vendor) return r.vendor;
  if (r.name) return r.name;
  return 'Unknown recipient';
}

export default function ApprovalsPage() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { isConfigured, isLoading: isAuthLoading } = useApiConfig();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | ''>('');
  const [protocolFilter, setProtocolFilter] = useState<PaymentProtocol | ''>('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch pending summary
  const { data: summaryData } = useQuery({
    queryKey: ['approvals', 'pending-summary'],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.approvals.getPending();
    },
    enabled: !!api && isConfigured,
    staleTime: 30 * 1000,
  });

  // Fetch total count
  const { data: countData } = useQuery({
    queryKey: ['approvals', 'count', statusFilter, protocolFilter],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.approvals.list({
        limit: 1,
        status: statusFilter || undefined,
        protocol: protocolFilter || undefined,
      });
    },
    enabled: !!api && isConfigured,
    staleTime: 60 * 1000,
  });

  // Initialize pagination
  const pagination = usePagination({
    totalItems: (countData as any)?.pagination?.total || 0,
    initialPageSize: 20,
  });

  // Fetch approvals for current page
  const { data: approvalsData, isLoading: loading } = useQuery({
    queryKey: ['approvals', 'page', pagination.page, pagination.pageSize, statusFilter, protocolFilter],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.approvals.list({
        page: pagination.page,
        limit: pagination.pageSize,
        status: statusFilter || undefined,
        protocol: protocolFilter || undefined,
      });
    },
    enabled: !!api && isConfigured,
    staleTime: 30 * 1000,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!api) throw new Error('API client not initialized');
      return api.approvals.approve(id);
    },
    onMutate: (id) => {
      setProcessingId(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast.success('Approval granted', {
        description: 'The payment has been approved.',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to approve', {
        description: error.message || 'An error occurred while approving.',
      });
    },
    onSettled: () => {
      setProcessingId(null);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!api) throw new Error('API client not initialized');
      return api.approvals.reject(id);
    },
    onMutate: (id) => {
      setProcessingId(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      toast.success('Approval rejected', {
        description: 'The payment has been rejected.',
      });
    },
    onError: (error: any) => {
      toast.error('Failed to reject', {
        description: error.message || 'An error occurred while rejecting.',
      });
    },
    onSettled: () => {
      setProcessingId(null);
    },
  });

  const approvals: Approval[] = (approvalsData as any)?.data || [];
  const summary: PendingApprovalsSummary | undefined = summaryData;

  const filteredApprovals = approvals.filter((approval) => {
    const recipient = getRecipientDisplay(approval).toLowerCase();
    const requester = approval.requestedBy?.name?.toLowerCase() || '';
    return recipient.includes(search.toLowerCase()) || requester.includes(search.toLowerCase());
  });

  if (isAuthLoading) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Approvals</h1>
            <p className="text-gray-600 dark:text-gray-400">Review and manage payment approvals</p>
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
          <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configure API Key</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Please configure your API key to view approvals.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Approvals</h1>
          <p className="text-gray-600 dark:text-gray-400">Review and manage payment approvals</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && summary.count > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Pending</span>
            </div>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{summary.count}</div>
            <div className="text-sm text-amber-600 dark:text-amber-400">
              {formatCurrency(summary.totalAmount)}
            </div>
          </div>
          {(['x402', 'ap2', 'acp', 'ucp'] as PaymentProtocol[]).map((protocol) => {
            const config = PROTOCOL_CONFIG[protocol];
            const Icon = config.icon;
            const data = summary.byProtocol?.[protocol];
            if (!data || data.count === 0) return null;
            return (
              <div key={protocol} className={cn('rounded-xl border p-4', config.bgColor, 'border-transparent')}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn('h-4 w-4', config.color)} />
                  <span className={cn('text-sm font-medium', config.color)}>{config.name}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.count}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formatCurrency(data.totalAmount)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search approvals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ApprovalStatus | '')}
          className="px-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
          <option value="executed">Executed</option>
        </select>
        <select
          value={protocolFilter}
          onChange={(e) => setProtocolFilter(e.target.value as PaymentProtocol | '')}
          className="px-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Protocols</option>
          <option value="x402">x402</option>
          <option value="ap2">AP2</option>
          <option value="acp">ACP</option>
          <option value="ucp">UCP</option>
        </select>
      </div>

      {/* Top Pagination Controls */}
      {!loading && filteredApprovals.length > 0 && (
        <PaginationControls
          pagination={pagination}
          className="mb-4"
        />
      )}

      {/* Approvals List */}
      <div className="space-y-4">
        {loading ? (
          <CardListSkeleton count={6} />
        ) : filteredApprovals.length === 0 ? (
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            {search || statusFilter || protocolFilter ? (
              <>
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No results found</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Try adjusting your filters or search term
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No approvals yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Approvals will appear here when agents request payments above their limits
                </p>
              </>
            )}
          </div>
        ) : (
          filteredApprovals.map((approval) => {
            const protocolConfig = PROTOCOL_CONFIG[approval.protocol];
            const statusConfig = STATUS_CONFIG[approval.status];
            const ProtocolIcon = protocolConfig.icon;
            const StatusIcon = statusConfig.icon;
            const isProcessing = processingId === approval.id;

            return (
              <div
                key={approval.id}
                className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Protocol Icon */}
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', protocolConfig.bgColor)}>
                      <ProtocolIcon className={cn('h-6 w-6', protocolConfig.color)} />
                    </div>

                    {/* Details */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white text-lg">
                          {formatCurrency(approval.amount, approval.currency)}
                        </span>
                        <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', statusConfig.bgColor, statusConfig.color)}>
                          <StatusIcon className="inline-block w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {getRecipientDisplay(approval)}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                        <span>
                          Requested by {approval.requestedBy?.name || 'Unknown'}
                        </span>
                        <span>
                          {formatDate(approval.createdAt)}
                        </span>
                        {approval.expiresAt && approval.status === 'pending' && (
                          <span className="text-amber-600 dark:text-amber-400">
                            Expires {formatDate(approval.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {approval.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => rejectMutation.mutate(approval.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors disabled:opacity-50"
                      >
                        {isProcessing && rejectMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                        Reject
                      </button>
                      <button
                        onClick={() => approveMutation.mutate(approval.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors disabled:opacity-50"
                      >
                        {isProcessing && approveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Approve
                      </button>
                    </div>
                  )}

                  {/* Decision info for non-pending */}
                  {approval.status !== 'pending' && approval.decidedBy && (
                    <div className="text-right text-xs text-gray-500 dark:text-gray-500">
                      <div>by {approval.decidedBy}</div>
                      {approval.decidedAt && <div>{formatDate(approval.decidedAt)}</div>}
                      {approval.decisionReason && (
                        <div className="mt-1 text-gray-400">
                          "{approval.decisionReason}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Pagination Controls */}
      {!loading && filteredApprovals.length > 0 && (
        <PaginationControls
          pagination={pagination}
          className="mt-6"
        />
      )}
    </div>
  );
}
