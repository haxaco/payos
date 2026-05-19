'use client';

import { useQuery } from '@tanstack/react-query';
import { Skeleton, Badge, Button } from '@sly/ui';
import { AlertTriangle } from 'lucide-react';
import type { TreasuryTransaction } from '@sly/api-client';
import { useApiClient } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatCurrencyStandalone } from '@/lib/locale';

const TYPE_VARIANT: Record<
  TreasuryTransaction['type'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  inbound: 'default',
  rebalance_in: 'default',
  outbound: 'destructive',
  rebalance_out: 'destructive',
  fee: 'secondary',
  adjustment: 'outline',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TransactionsTable() {
  const api = useApiClient();

  const {
    data: transactions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['treasury', 'transactions'],
    queryFn: async () => {
      if (!api) throw new Error('API not initialized');
      return api.treasury.getTransactions({ limit: 50 });
    },
    enabled: !!api,
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }

  if (isError) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 flex flex-col items-center gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {getApiErrorMessage(error, 'Could not load transactions')}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recent Transactions
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance After</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No treasury transactions recorded yet.
                </td>
              </tr>
            ) : (
              transactions.map((tx: TreasuryTransaction) => {
                const isOutflow =
                  tx.type === 'outbound' || tx.type === 'rebalance_out' || tx.type === 'fee';
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Badge variant={TYPE_VARIANT[tx.type] ?? 'secondary'} className="capitalize">
                        {tx.type.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {tx.description || '—'}
                    </td>
                    <td
                      className={`px-6 py-4 text-right text-sm font-medium tabular-nums ${
                        isOutflow
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isOutflow ? '-' : '+'}
                      {formatCurrencyStandalone(Math.abs(tx.amount), tx.currency)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white tabular-nums">
                      {formatCurrencyStandalone(tx.balanceAfter, tx.currency)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                      {tx.referenceType
                        ? `${tx.referenceType}${tx.referenceId ? ` · ${tx.referenceId}` : ''}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(tx.createdAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
