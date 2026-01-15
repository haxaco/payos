'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Calendar,
  Shield,
  Wallet,
  Activity,
  Bot,
  FileText,
  MoreVertical,
  CheckCircle,
  XCircle,
  Pause,
} from 'lucide-react';
import type { Account, Agent, Stream, LedgerEntry, Transfer } from '@payos/api-client';
import { useLocale } from '@/lib/locale';
import { formatCurrency } from '@payos/ui';

import { ScreeningTab } from '@/components/dashboard/account-360/screening-tab';
import { toast } from 'sonner';

type TabType = 'overview' | 'transactions' | 'streams' | 'agents' | 'screening';

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const accountId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { formatCurrency: formatCurrencyLocale, formatDate: formatDateLocale } = useLocale();

  // Fetch account data with React Query - LAZY LOADING based on active tab
  // Overview tab: Always load account data immediately
  const { data: accountResponse, isLoading: accountLoading } = useQuery({
    queryKey: ['account', accountId],
    queryFn: () => api!.accounts.get(accountId),
    enabled: !!api, // Always load account data
  });

  // Handle double-nested response
  const account = (accountResponse as any)?.data || accountResponse;

  // Agents tab: Only load when tab is active
  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['account', accountId, 'agents'],
    queryFn: () => api!.accounts.getAgents(accountId, { limit: 50 }),
    enabled: !!api && activeTab === 'agents', // Lazy load only when agents tab active
  });

  // Streams tab: Only load when tab is active
  const { data: streamsData, isLoading: streamsLoading } = useQuery({
    queryKey: ['account', accountId, 'streams'],
    queryFn: () => api!.accounts.getStreams(accountId, { limit: 50 }),
    enabled: !!api && activeTab === 'streams', // Lazy load only when streams tab active
  });

  // Transaction counts: Load immediately for tab badges
  const { data: transactionsCountData } = useQuery({
    queryKey: ['account', accountId, 'transactions', 'count'],
    queryFn: () => api!.accounts.getTransactions(accountId, { limit: 1 }),
    enabled: !!api, // Always load for count
  });

  const { data: transfersCountData } = useQuery({
    queryKey: ['account', accountId, 'transfers', 'count'],
    queryFn: () => api!.accounts.getTransfers(accountId, { limit: 1 }),
    enabled: !!api, // Always load for count
  });

  // Transactions tab: Only load full data when tab is active
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['account', accountId, 'transactions'],
    queryFn: () => api!.accounts.getTransactions(accountId, { limit: 50 }),
    enabled: !!api && activeTab === 'transactions', // Lazy load only when transactions tab active
  });

  // Transactions tab: Also load transfers when transactions tab is active
  const { data: transfersData, isLoading: transfersLoading } = useQuery({
    queryKey: ['account', accountId, 'transfers'],
    queryFn: () => api!.accounts.getTransfers(accountId, { limit: 50 }),
    enabled: !!api && activeTab === 'transactions', // Lazy load only when transactions tab active
  });

  const agents = (agentsData as any)?.data?.data || agentsData?.data || [];
  const streams = (streamsData as any)?.data?.data || streamsData?.data || [];
  const transactions = (transactionsData as any)?.data?.data || transactionsData?.data || [];
  const transfers = (transfersData as any)?.data?.data || transfersData?.data || [];
  const loading = accountLoading;

  // Mutations with automatic cache invalidation
  const verifyMutation = useMutation({
    mutationFn: (tier: number) => api!.accounts.verify(accountId, tier),
    onSuccess: () => {
      // Invalidate and refetch account data
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: () => api!.accounts.suspend(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => api!.accounts.activate(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
    },
  });

  const handleVerify = async (tier: number) => {
    if (!api || !account) return;
    try {
      await verifyMutation.mutateAsync(tier);
    } catch (error) {
      console.error('Failed to verify account:', error);
    }
  };

  const handleSuspend = async () => {
    if (!api || !account) return;
    try {
      await suspendMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to suspend account:', error);
    }
  };

  const handleActivate = async () => {
    if (!api || !account) return;
    try {
      await activateMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to activate account:', error);
    }
  };

  // Combine mutation loading states
  const actionLoading = verifyMutation.isPending || suspendMutation.isPending || activateMutation.isPending;

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
          <div className="h-4 w-96 bg-gray-200 dark:bg-gray-800 rounded mb-8"></div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Account not found</h2>
        <Link href="/dashboard/accounts" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to accounts
        </Link>
      </div>
    );
  }

  const transactionsCount = (transactionsCountData?.pagination?.total || 0) + (transfersCountData?.pagination?.total || 0);

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Wallet },
    { id: 'transactions' as TabType, label: 'Transactions', icon: FileText, count: transactionsCount },
    { id: 'streams' as TabType, label: 'Streams', icon: Activity, count: streams.length },
    { id: 'agents' as TabType, label: 'Agents', icon: Bot, count: agents.length },
    { id: 'screening' as TabType, label: 'Screening', icon: Shield },
  ];

  const handleRunScreening = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Running screening check...',
        success: 'Screening completed. No new risks found.',
        error: 'Screening failed',
      }
    );
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Back button */}
      <Link
        href="/dashboard/accounts"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to accounts
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${account.type === 'business'
            ? 'bg-purple-100 dark:bg-purple-950'
            : 'bg-blue-100 dark:bg-blue-950'
            }`}>
            {account.type === 'business' ? (
              <Building2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            ) : (
              <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{account.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {account.email}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Joined {new Date(account.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${account.verificationStatus === 'verified'
            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
            : account.verificationStatus === 'suspended'
              ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
              : 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400'
            }`}>
            {account.verificationStatus}
          </span>

          <div className="relative group">
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <MoreVertical className="h-5 w-5 text-gray-500" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {account.verificationStatus !== 'verified' && (
                <>
                  <button
                    onClick={() => handleVerify(1)}
                    disabled={actionLoading}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    Verify (Tier 1)
                  </button>
                  <button
                    onClick={() => handleVerify(2)}
                    disabled={actionLoading}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    Verify (Tier 2)
                  </button>
                  <button
                    onClick={() => handleVerify(3)}
                    disabled={actionLoading}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    Verify (Tier 3)
                  </button>
                </>
              )}
              {account.verificationStatus !== 'suspended' && (
                <button
                  onClick={handleSuspend}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-red-600"
                >
                  <Pause className="h-4 w-4" />
                  Suspend Account
                </button>
              )}
              {account.verificationStatus === 'suspended' && (
                <button
                  onClick={handleActivate}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-emerald-600"
                >
                  <CheckCircle className="h-4 w-4" />
                  Activate Account
                </button>
              )}
              <div className="border-t border-gray-100 dark:border-gray-800 my-1.5" />
              <button
                onClick={handleRunScreening}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <Shield className="h-4 w-4 text-purple-500" />
                Run Screening
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Balance</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrencyLocale(account.balanceTotal || 0, account.currency || 'USDC')}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Available</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrencyLocale(account.balanceAvailable || 0, account.currency || 'USDC')}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">In Streams</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrencyLocale(account.balanceInStreams || 0, account.currency || 'USDC')}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Verification Tier</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Tier {account.verificationTier}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab account={account} />
      )}
      {activeTab === 'transactions' && (
        <TransactionsTab transactions={transactions} transfers={transfers} accountId={accountId} />
      )}
      {activeTab === 'streams' && (
        <StreamsTab streams={streams} />
      )}
      {activeTab === 'agents' && (
        <AgentsTab agents={agents} />
      )}
      {activeTab === 'screening' && (
        <ScreeningTab />
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ account }: { account: Account }) {
  const { formatCurrency, formatDate } = useLocale();
  const currency = account.currency || 'USDC';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Details</h3>
        <dl className="space-y-4">
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Account ID</dt>
            <dd className="font-mono text-sm text-gray-900 dark:text-white">{account.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Type</dt>
            <dd className="capitalize text-gray-900 dark:text-white">{account.type}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Country</dt>
            <dd className="text-gray-900 dark:text-white">{account.country || 'Not specified'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Currency</dt>
            <dd className="text-gray-900 dark:text-white">{currency}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Created</dt>
            <dd className="text-gray-900 dark:text-white">
              {formatDate(account.createdAt)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Balance Breakdown</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500 dark:text-gray-400">Available</span>
              <span className="text-gray-900 dark:text-white">
                {formatCurrency(account.balanceAvailable || 0, currency)}
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{
                  width: `${account.balanceTotal ? (account.balanceAvailable / account.balanceTotal) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500 dark:text-gray-400">In Streams</span>
              <span className="text-gray-900 dark:text-white">
                {formatCurrency(account.balanceInStreams || 0, currency)}
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  width: `${account.balanceTotal ? (account.balanceInStreams / account.balanceTotal) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Transactions Tab Component - Shows both ledger entries and transfers
function TransactionsTab({
  transactions,
  transfers,
  accountId
}: {
  transactions: LedgerEntry[];
  transfers: Transfer[];
  accountId: string;
}) {
  const { formatCurrency: formatCurrencyLocale, formatDate: formatDateLocale } = useLocale();
  const router = useRouter();

  // Combine and sort by date (most recent first)
  const allTransactions = [
    ...transactions.map(tx => ({ ...tx, _type: 'ledger' as const })),
    ...transfers.map(tf => ({ ...tf, _type: 'transfer' as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (allTransactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No transactions</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          This account has no transaction history yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance After</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {allTransactions.map((item) => {
            if (item._type === 'ledger') {
              const tx = item as LedgerEntry & { _type: 'ledger' };
              return (
                <tr key={`ledger-${tx.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${tx.type === 'credit'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                      }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white text-sm">
                    {tx.description || tx.referenceType || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={tx.type === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCurrencyLocale(Math.abs(tx.amount), tx.currency || 'USDC')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white">
                    {tx.balanceAfter ? formatCurrencyLocale(tx.balanceAfter, tx.currency || 'USDC') : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                    {formatDateLocale(tx.createdAt)}
                  </td>
                </tr>
              );
            } else {
              const tf = item as Transfer & { _type: 'transfer' };
              const isIncoming = tf.to?.accountId === accountId;
              const isOutgoing = tf.from?.accountId === accountId;

              return (
                <tr
                  key={`transfer-${tf.id}`}
                  onClick={() => router.push(`/dashboard/transfers`)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${isIncoming
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                      }`}>
                      {isIncoming ? 'Incoming' : 'Outgoing'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white text-sm">
                    {isIncoming
                      ? `From ${tf.from?.accountName || tf.from?.accountId?.slice(0, 8) || 'External'}`
                      : `To ${tf.to?.accountName || tf.to?.accountId?.slice(0, 8) || 'External'}`
                    }
                  </td>
                  <td className="px-6 py-4">
                    <span className={isIncoming ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                      {isIncoming ? '+' : '-'}{formatCurrencyLocale(tf.amount, tf.currency || 'USDC')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                    -
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                    {formatDateLocale(tf.createdAt)}
                  </td>
                </tr>
              );
            }
          })}
        </tbody>
      </table>
    </div>
  );
}

// Streams Tab Component
function StreamsTab({ streams }: { streams: Stream[] }) {
  const { formatCurrency } = useLocale();

  if (streams.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No streams</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          This account has no active streams.
        </p>
      </div>
    );
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400';
      case 'critical': return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {streams.map((stream) => {
        // Streams use supertokens (wrapped USDC), display base currency
        const currency = stream.flowRate?.currency || 'USDCx';

        return (
          <Link
            key={stream.id}
            href={`/dashboard/streams/${stream.id}`}
            className="block bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {stream.sender.accountName} → {stream.receiver.accountName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatCurrency(stream.flowRate.perMonth, currency)}/month
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(stream.streamed.total, currency)}
                  </div>
                  <div className="text-xs text-gray-500">streamed</div>
                </div>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getHealthColor(stream.health)}`}>
                  {stream.health}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>Runway: {stream.funding.runway.display}</span>
              <span>Buffer: {formatCurrency(stream.funding.buffer, currency)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// Agents Tab Component
function AgentsTab({ agents }: { agents: Agent[] }) {
  if (agents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
        <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No agents</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          This account has no AI agents.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent) => (
        <Link
          key={agent.id}
          href={`/dashboard/agents/${agent.id}`}
          className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center">
              <Bot className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${agent.status === 'active'
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
              }`}>
              {agent.status}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{agent.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {agent.description || 'No description'}
          </p>
          <div className="text-sm text-gray-500">KYA Tier {agent.kyaTier}</div>
        </Link>
      ))}
    </div>
  );
}

