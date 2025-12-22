'use client';

import { CreditCard, Plus, TrendingUp, TrendingDown, AlertCircle, Search, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { useState } from 'react';
import { Button } from '@payos/ui';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface CardTransaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  merchantName?: string;
  merchantCategory?: string;
  cardLastFour?: string;
  declineReason?: string;
  isDisputed: boolean;
  transactionTime: string;
}

interface CardStats {
  totalSpent: number;
  totalTransactions: number;
  totalPurchases: number;
  totalRefunds: number;
  totalDeclines: number;
  purchaseAmount: number;
  refundAmount: number;
}

export default function CardsPage() {
  const api = useApiClient();
  const { isConfigured } = useApiConfig();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Fetch total count
  const { data: countData } = useQuery({
    queryKey: ['card-transactions', 'count'],
    queryFn: () => api!.cards.listTransactions({ limit: 1 }),
    enabled: !!api && isConfigured,
    staleTime: 60 * 1000,
  });

  // Initialize pagination
  const pagination = usePagination({
    totalItems: countData?.pagination?.total || 0,
    initialPageSize: 50,
  });

  // Fetch card transactions for current page
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['card-transactions', 'page', pagination.page, pagination.pageSize],
    queryFn: () => api!.cards.listTransactions({
      page: pagination.page,
      limit: pagination.pageSize,
    }),
    enabled: !!api && isConfigured && pagination.totalItems > 0,
    staleTime: 30 * 1000,
  });

  // Fetch card stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['card-stats'],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/v1/card-transactions/stats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('payos_api_key')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch card stats');
      return response.json();
    },
    enabled: !!api && isConfigured,
    staleTime: 30 * 1000,
  });

  const transactions: CardTransaction[] = transactionsData?.data || [];
  const stats: CardStats = statsData?.stats || {
    totalSpent: 0,
    totalTransactions: 0,
    totalPurchases: 0,
    totalRefunds: 0,
    totalDeclines: 0,
    purchaseAmount: 0,
    refundAmount: 0,
  };

  const loading = transactionsLoading || statsLoading;

  // Filter transactions based on search and type
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      !searchTerm ||
      tx.merchantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.merchantCategory?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType =
      filterType === 'all' || tx.type === filterType;

    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'refund':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'decline':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
      case 'completed':
        return <span className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400`}>Completed</span>;
      case 'pending':
        return <span className={`${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400`}>Pending</span>;
      case 'failed':
        return <span className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400`}>Failed</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-400`}>{status}</span>;
    }
  };

  if (!isConfigured) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Configuration Required</h2>
          <p className="text-gray-600 dark:text-gray-400">Please configure your API key to access card data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Cards</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor card transactions and spending</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Issue Card
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Spent</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? '...' : `$${stats.totalSpent.toFixed(2)}`}
          </div>
          <div className="text-xs text-gray-500 mt-1">{stats.totalTransactions} transactions</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Purchases</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? '...' : stats.totalPurchases}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">${stats.purchaseAmount.toFixed(2)}</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Refunds</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? '...' : stats.totalRefunds}
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">${stats.refundAmount.toFixed(2)}</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Declined</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? '...' : stats.totalDeclines}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400 mt-1">Failed transactions</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by merchant or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="purchase">Purchases</option>
          <option value="refund">Refunds</option>
          <option value="decline">Declined</option>
        </select>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Merchant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading transactions...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(tx.type)}
                        <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {tx.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {tx.merchantName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {tx.merchantCategory || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(tx.transactionTime).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={tx.type === 'refund' ? 'text-green-600' : tx.type === 'decline' ? 'text-gray-400' : 'text-gray-900 dark:text-white'}>
                        {tx.type === 'decline' ? '-' : `$${tx.amount.toFixed(2)}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(tx.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {!transactionsLoading && filteredTransactions.length > 0 && (
        <PaginationControls
          pagination={pagination}
          className="mt-6"
        />
      )}
    </div>
  );
}
