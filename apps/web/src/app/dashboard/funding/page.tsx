'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import Link from 'next/link';
import {
  CreditCard,
  Landmark,
  Globe,
  Wallet,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Activity,
  Zap,
} from 'lucide-react';

type Tab = 'sources' | 'transactions' | 'providers';

export default function FundingPage() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('sources');

  // Fetch funding sources
  const { data: sourcesData, isLoading: sourcesLoading } = useQuery({
    queryKey: ['funding', 'sources'],
    queryFn: async () => {
      if (!api) throw new Error('API not initialized');
      const res = await fetch(`${api.baseUrl}/v1/funding/sources`, {
        headers: { Authorization: `Bearer ${api.apiKey}` },
      });
      return res.json();
    },
    enabled: !!api,
    staleTime: 10_000,
  });

  // Fetch funding transactions
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['funding', 'transactions'],
    queryFn: async () => {
      if (!api) throw new Error('API not initialized');
      const res = await fetch(`${api.baseUrl}/v1/funding/transactions`, {
        headers: { Authorization: `Bearer ${api.apiKey}` },
      });
      return res.json();
    },
    enabled: !!api,
    staleTime: 10_000,
  });

  // Fetch providers
  const { data: providersData } = useQuery({
    queryKey: ['funding', 'providers'],
    queryFn: async () => {
      if (!api) throw new Error('API not initialized');
      const res = await fetch(`${api.baseUrl}/v1/funding/providers`, {
        headers: { Authorization: `Bearer ${api.apiKey}` },
      });
      return res.json();
    },
    enabled: !!api,
    staleTime: 60_000,
  });

  const sources = sourcesData?.data || [];
  const transactions = txData?.data || [];
  const providers = providersData?.data || [];

  const sourceTypeIcon = (type: string) => {
    switch (type) {
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'bank_account_us':
      case 'bank_account_eu':
      case 'bank_account_latam':
        return <Landmark className="h-4 w-4" />;
      case 'crypto_wallet': return <Wallet className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
      verifying: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      suspended: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      removed: 'bg-gray-100 text-gray-400',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
        {status === 'active' || status === 'completed' ? <CheckCircle className="h-3 w-3" /> :
         status === 'failed' ? <XCircle className="h-3 w-3" /> :
         status === 'processing' ? <Activity className="h-3 w-3 animate-spin" /> :
         <Clock className="h-3 w-3" />}
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const totalFunded = transactions
    .filter((t: any) => t.status === 'completed')
    .reduce((sum: number, t: any) => sum + (t.converted_amount_cents || t.amount_cents || 0), 0);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <DollarSign className="h-8 w-8" />
              Funding
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage funding sources and on-ramp transactions
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
            <div className="text-sm text-gray-500">Active Sources</div>
            <div className="text-2xl font-bold">
              {sources.filter((s: any) => s.status === 'active').length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
            <div className="text-sm text-gray-500">Total Funded</div>
            <div className="text-2xl font-bold text-green-600">
              ${(totalFunded / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
            <div className="text-sm text-gray-500">Pending Transactions</div>
            <div className="text-2xl font-bold text-blue-600">
              {transactions.filter((t: any) => ['pending', 'processing'].includes(t.status)).length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
            <div className="text-sm text-gray-500">Providers</div>
            <div className="text-2xl font-bold">
              {providers.filter((p: any) => p.available).length}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-4">
          <div className="flex gap-4">
            {(['sources', 'transactions', 'providers'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'sources' && <CreditCard className="h-4 w-4 inline mr-1" />}
                {tab === 'transactions' && <Activity className="h-4 w-4 inline mr-1" />}
                {tab === 'providers' && <Zap className="h-4 w-4 inline mr-1" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Sources Tab */}
        {activeTab === 'sources' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border">
            {sourcesLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : sources.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No funding sources</p>
                <p className="text-sm mt-1">Add a card, bank account, or crypto wallet to fund your account</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Total Funded</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source: any) => (
                    <tr key={source.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {sourceTypeIcon(source.type)}
                          <span className="font-medium">{source.display_name || source.id.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{source.type.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-sm capitalize">{source.provider}</td>
                      <td className="px-4 py-3">{statusBadge(source.status)}</td>
                      <td className="px-4 py-3 text-sm">
                        ${((source.usage?.total_funded || 0) / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(source.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border">
            {txLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No funding transactions</p>
                <p className="text-sm mt-1">Initiate a funding to see transactions here</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Converted</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Fees</th>
                    <th className="px-4 py-3">Initiated</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx: any) => (
                    <tr key={tx.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-mono text-sm">{tx.id.slice(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm font-medium">
                        ${(tx.amount_cents / 100).toFixed(2)} {tx.currency}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {tx.converted_amount_cents
                          ? `$${(tx.converted_amount_cents / 100).toFixed(2)} USDC`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">{tx.provider}</td>
                      <td className="px-4 py-3">{statusBadge(tx.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        ${((tx.fees?.total || 0) / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(tx.initiated_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Providers Tab */}
        {activeTab === 'providers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((provider: any) => (
              <div key={provider.name + provider.displayName} className="bg-white dark:bg-gray-900 rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{provider.displayName}</h3>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                    provider.available
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {provider.available ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {provider.available ? 'Available' : 'Not Configured'}
                  </span>
                </div>
                <div className="space-y-2">
                  {provider.capabilities.map((cap: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {sourceTypeIcon(cap.sourceType)}
                        <span className="text-gray-600 dark:text-gray-300">
                          {cap.sourceType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {cap.currencies.join(', ')} · {cap.settlementTime}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
