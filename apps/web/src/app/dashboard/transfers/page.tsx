'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { 
  ArrowLeftRight, 
  Plus, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  X,
  ChevronDown,
  ExternalLink,
  Copy,
  CheckCircle,
  Bot,
  User,
} from 'lucide-react';
import Link from 'next/link';
import type { Transfer, TransferStatus, TransferType } from '@payos/api-client';
import { InitiatedByBadgeCompact } from '@/components/transactions/initiated-by-badge';
import { TableSkeleton } from '@/components/ui/skeletons';
import { TransactionsEmptyState, SearchEmptyState } from '@/components/ui/empty-state';
import { RefundModal } from '@/components/transfers/refund-modal';
import { ExportModal } from '@/components/transfers/export-modal';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';

export default function TransfersPage() {
  const api = useApiClient();
  const { isConfigured } = useApiConfig();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [initiatedByFilter, setInitiatedByFilter] = useState<string>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [refundTransfer, setRefundTransfer] = useState<Transfer | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch total count for pagination
  const { data: countData } = useQuery({
    queryKey: ['transfers', 'count'],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.transfers.list({ limit: 1 });
    },
    enabled: !!api && isConfigured,
    staleTime: 60 * 1000, // 1 minute
  });

  // Initialize pagination
  const pagination = usePagination({
    totalItems: countData?.pagination?.total || 0,
    initialPageSize: 50,
  });

  // Fetch transfers for current page with filters
  const { data: transfersData, isLoading: loading } = useQuery({
    queryKey: [
      'transfers',
      'page',
      pagination.page,
      pagination.pageSize,
      statusFilter,
      typeFilter,
    ],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.transfers.list({
        page: pagination.page,
        limit: pagination.pageSize,
        status: statusFilter !== 'all' ? (statusFilter as TransferStatus) : undefined,
        type: typeFilter !== 'all' ? (typeFilter as TransferType) : undefined,
      });
    },
    enabled: !!api && isConfigured && pagination.totalItems > 0,
    staleTime: 30 * 1000,
  });

  const transfers = transfersData?.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400';
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400';
      case 'processing': return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400';
      case 'failed': return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
    }
  };

  // Client-side filtering for search and initiatedBy (not yet supported by API)
  const filteredTransfers = transfers.filter(transfer => {
    const matchesSearch = 
      !search ||
      transfer.from?.accountName?.toLowerCase().includes(search.toLowerCase()) ||
      transfer.to?.accountName?.toLowerCase().includes(search.toLowerCase()) ||
      transfer.id.toLowerCase().includes(search.toLowerCase());
    
    const matchesInitiatedBy = initiatedByFilter === 'all' || transfer.initiatedBy?.type === initiatedByFilter;
    
    return matchesSearch && matchesInitiatedBy;
  });

  const exportData = (format: 'csv' | 'json' | 'pdf') => {
    const data = filteredTransfers.map(t => ({
      id: t.id,
      type: t.type,
      from: t.from?.accountName || 'External',
      to: t.to?.accountName || 'External',
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      createdAt: t.createdAt,
    }));

    if (format === 'csv') {
      const headers = ['ID', 'Type', 'From', 'To', 'Amount', 'Currency', 'Status', 'Date'];
      const rows = data.map(d => [d.id, d.type, d.from, d.to, d.amount, d.currency, d.status, d.createdAt]);
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      downloadFile(csv, 'transactions.csv', 'text/csv');
    } else if (format === 'json') {
      const json = JSON.stringify(data, null, 2);
      downloadFile(json, 'transactions.json', 'application/json');
    } else {
      // For PDF, we'd typically use a library like jsPDF
      alert('PDF export coming soon!');
    }
    setShowExportMenu(false);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConfigured) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <ArrowLeftRight className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configure API Key</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Please configure your API key to view transactions.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Transactions</h1>
          <p className="text-gray-600 dark:text-gray-400">View and manage all transfers</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-4 w-4" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-10">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-medium text-gray-500 uppercase">Quick Export</span>
                </div>
                <button
                  onClick={() => { exportData('csv'); setShowExportMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  Export as CSV
                </button>
                <button
                  onClick={() => { exportData('json'); setShowExportMenu(false); }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                >
                  <FileJson className="h-4 w-4 text-blue-500" />
                  Export as JSON
                </button>
                <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                  <button
                    onClick={() => { setShowExportModal(true); setShowExportMenu(false); }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-blue-600"
                  >
                    <FileText className="h-4 w-4" />
                    Advanced Export (Accounting)
                  </button>
                </div>
              </div>
            )}
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            New Transfer
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="internal">Internal</option>
          <option value="cross_border">Cross-border</option>
        </select>
        {/* NEW: Initiated By Filter */}
        <select
          value={initiatedByFilter}
          onChange={(e) => setInitiatedByFilter(e.target.value)}
          className="px-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Initiators</option>
          <option value="agent">🤖 Agent</option>
          <option value="user">👤 Manual</option>
        </select>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Showing {filteredTransfers.length} of {transfers.length} transactions
      </div>

      {/* Transfers Table */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : filteredTransfers.length === 0 ? (
          (search || statusFilter !== 'all' || typeFilter !== 'all') ? (
            <SearchEmptyState query={search || 'filtered results'} />
          ) : (
            <TransactionsEmptyState />
          )
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">From / To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Initiated By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredTransfers.map((transfer) => (
                <tr 
                  key={transfer.id} 
                  onClick={() => setSelectedTransfer(transfer)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {transfer.type === 'internal' ? (
                        <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                      )}
                      <span className="text-sm text-gray-900 dark:text-white capitalize">{transfer.type.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900 dark:text-white">{transfer.from?.accountName || 'External'}</div>
                      <div className="text-gray-500 dark:text-gray-400">→ {transfer.to?.accountName || 'External'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      ${transfer.amount.toLocaleString()} {transfer.currency}
                    </div>
                    {transfer.feeAmount > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Fee: ${transfer.feeAmount.toLocaleString()}
                      </div>
                    )}
                  </td>
                  {/* NEW: Initiated By Column */}
                  <td className="px-6 py-4">
                    {transfer.initiatedBy ? (
                      <InitiatedByBadgeCompact initiatedBy={transfer.initiatedBy} />
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
                        <User className="w-3 h-3" />
                        Manual
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(transfer.status)}`}>
                      {transfer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(transfer.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && filteredTransfers.length > 0 && (
        <PaginationControls
          pagination={pagination}
          className="mt-6"
        />
      )}

      {/* Transfer Detail Modal */}
      {selectedTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-950 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Transfer Details</h2>
              <button 
                onClick={() => setSelectedTransfer(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Status Banner */}
              <div className={`p-4 rounded-xl ${
                selectedTransfer.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-950' :
                selectedTransfer.status === 'failed' ? 'bg-red-50 dark:bg-red-950' :
                'bg-yellow-50 dark:bg-yellow-950'
              }`}>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`h-5 w-5 ${
                    selectedTransfer.status === 'completed' ? 'text-emerald-600' :
                    selectedTransfer.status === 'failed' ? 'text-red-600' :
                    'text-yellow-600'
                  }`} />
                  <span className="font-medium capitalize">{selectedTransfer.status}</span>
                </div>
              </div>

              {/* Amount */}
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-gray-900 dark:text-white">
                  ${selectedTransfer.amount.toLocaleString()}
                </div>
                <div className="text-gray-500 dark:text-gray-400 mt-1">
                  {selectedTransfer.currency}
                </div>
              </div>

              {/* Details */}
              <dl className="space-y-4">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Transfer ID</dt>
                  <dd className="flex items-center gap-2">
                    <code className="text-sm font-mono text-gray-900 dark:text-white">
                      {selectedTransfer.id.slice(0, 8)}...
                    </code>
                    <button 
                      onClick={() => copyToClipboard(selectedTransfer.id)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Type</dt>
                  <dd className="capitalize text-gray-900 dark:text-white">
                    {selectedTransfer.type.replace('_', ' ')}
                  </dd>
                </div>
                {/* NEW: Initiated By in detail modal */}
                <div className="flex justify-between items-center">
                  <dt className="text-gray-500 dark:text-gray-400">Initiated By</dt>
                  <dd>
                    {selectedTransfer.initiatedBy ? (
                      selectedTransfer.initiatedBy.type === 'agent' ? (
                        <Link 
                          href={`/dashboard/agents/${selectedTransfer.initiatedBy.id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors"
                        >
                          <Bot className="w-3 h-3" />
                          <span>{selectedTransfer.initiatedBy.name}</span>
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium">
                          <User className="w-3 h-3" />
                          Manual
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium">
                        <User className="w-3 h-3" />
                        Manual
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">From</dt>
                  <dd>
                    {selectedTransfer.from?.accountId ? (
                      <Link 
                        href={`/dashboard/accounts/${selectedTransfer.from.accountId}`}
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {selectedTransfer.from.accountName}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-gray-900 dark:text-white">External</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">To</dt>
                  <dd>
                    {selectedTransfer.to?.accountId ? (
                      <Link 
                        href={`/dashboard/accounts/${selectedTransfer.to.accountId}`}
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {selectedTransfer.to.accountName}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-gray-900 dark:text-white">External</span>
                    )}
                  </dd>
                </div>
                {selectedTransfer.feeAmount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Fee</dt>
                    <dd className="text-gray-900 dark:text-white">
                      ${selectedTransfer.feeAmount.toLocaleString()} {selectedTransfer.currency}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Created</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {new Date(selectedTransfer.createdAt).toLocaleString()}
                  </dd>
                </div>
                {selectedTransfer.completedAt && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Completed</dt>
                    <dd className="text-gray-900 dark:text-white">
                      {new Date(selectedTransfer.completedAt).toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
                {selectedTransfer.status === 'completed' && (
                  <button 
                    onClick={() => {
                      setRefundTransfer(selectedTransfer);
                      setSelectedTransfer(null);
                    }}
                    className="w-full px-4 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    Issue Refund
                  </button>
                )}
                {selectedTransfer.status === 'pending' && (
                  <button className="w-full px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 text-red-700 dark:text-red-300 rounded-lg transition-colors">
                    Cancel Transfer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundTransfer && (
        <RefundModal
          transfer={refundTransfer}
          onClose={() => setRefundTransfer(null)}
          onSuccess={async () => {
            setRefundTransfer(null);
            // Invalidate transfers queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['transfers'] });
          }}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}
