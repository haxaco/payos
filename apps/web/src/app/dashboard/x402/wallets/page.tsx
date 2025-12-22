'use client';

import { useState, useEffect } from 'react';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { Wallet as WalletIcon, Plus, Search, Filter, TrendingUp, ArrowUp, ArrowDown, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import type { Wallet } from '@payos/api-client';
import { CardListSkeleton } from '@/components/ui/skeletons';

export default function WalletsPage() {
  const api = useApiClient();
  const { isConfigured } = useApiConfig();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function fetchWallets() {
      if (!api) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.wallets.list({ limit: 50 });
        setWallets(response.data || []);
      } catch (error) {
        console.error('Failed to fetch wallets:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchWallets();
  }, [api]);

  const filteredWallets = wallets.filter(wallet =>
    (wallet.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (wallet.purpose?.toLowerCase() || '').includes(search.toLowerCase())
  );

  // Calculate totals
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const activeWallets = wallets.filter(w => w.status === 'active').length;

  if (!isConfigured) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <WalletIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configure API Key</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Please configure your API key to manage wallets.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Wallets</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage stablecoin wallets for x402 payments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Wallet
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Wallets</span>
            <WalletIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{wallets.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activeWallets} active</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Balance</span>
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Across all wallets</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Agent-Managed</span>
            <WalletIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {wallets.filter(w => w.managedByAgentId).length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">With spending policies</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search wallets..."
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

      {/* Wallets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full">
            <CardListSkeleton count={6} />
          </div>
        ) : filteredWallets.length === 0 ? (
          <div className="col-span-full">
            {search ? (
              <div className="p-12 text-center bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No results found</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Try a different search term</p>
              </div>
            ) : (
              <div className="col-span-full p-12 text-center bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-5xl mb-4">💳</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No wallets yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 mb-4">
                  Create your first wallet to start making x402 payments
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Create Wallet
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredWallets.map((wallet) => (
            <div
              key={wallet.id}
              className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <WalletIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    wallet.status === 'active'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      : wallet.status === 'frozen'
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                      : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                  }`}>
                    {wallet.status}
                  </span>
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <MoreVertical className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {wallet.name || 'Unnamed Wallet'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {wallet.purpose || 'No description'}
              </p>

              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Balance</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{wallet.currency}</div>
              </div>

              {wallet.spendingPolicy && (
                <div className="mb-4 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <span>Policy:</span>
                    {wallet.spendingPolicy.dailyLimit && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded">
                        ${wallet.spendingPolicy.dailyLimit}/day
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
                  <ArrowDown className="h-4 w-4" />
                  Deposit
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                  <ArrowUp className="h-4 w-4" />
                  Withdraw
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal (placeholder) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Create Wallet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Coming soon: UI for creating wallets. Use the API for now.
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

