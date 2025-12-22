'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { Users, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import type { Account } from '@payos/api-client';
import { TableSkeleton } from '@/components/ui/skeletons';
import { AccountsEmptyState, SearchEmptyState } from '@/components/ui/empty-state';
import { useLocale } from '@/lib/locale';

export default function AccountsPage() {
  const api = useApiClient();
  const { isConfigured } = useApiConfig();
  const [search, setSearch] = useState('');
  const { formatCurrency } = useLocale();

  // Use React Query for data fetching with caching
  const { data: accountsData, isLoading: loading } = useQuery({
    queryKey: ['accounts', { limit: 50 }],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.accounts.list({ limit: 50 });
    },
    enabled: !!api && isConfigured, // Only fetch if API is ready
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  });

  const accounts = accountsData?.data || [];

  const filteredAccounts = accounts.filter(account => 
    account.name.toLowerCase().includes(search.toLowerCase()) ||
    account.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isConfigured) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configure API Key</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Please configure your API key to view accounts.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Accounts</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage all account holders</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Add Account
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search accounts..."
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

      {/* Accounts Table */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : filteredAccounts.length === 0 ? (
          search ? (
            <SearchEmptyState query={search} />
          ) : (
            <AccountsEmptyState />
          )
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredAccounts.map((account) => (
                <tr 
                  key={account.id} 
                  onClick={() => window.location.href = `/dashboard/accounts/${account.id}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{account.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{account.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      account.type === 'business' 
                        ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400'
                        : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                    }`}>
                      {account.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      account.verificationStatus === 'verified'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                        : account.verificationStatus === 'pending'
                        ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                    }`}>
                      {account.verificationStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {formatCurrency(account.balanceTotal || 0, account.currency || 'USDC')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Tier {account.verificationTier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

