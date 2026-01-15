'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  DollarSign,
  CreditCard,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Check,
} from 'lucide-react';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import Link from 'next/link';

// Import mock data and new components
import { mockAiInsights } from '@/lib/mock-data/ai-insights';
import { mockAgentStats } from '@/lib/mock-data/agent-stats';

import { AiInsightsPanel } from '@/components/dashboard/ai-insights-panel';
import { AgentPerformanceCard } from '@/components/dashboard/agent-performance-card';
import { ProtocolStats } from '@/components/dashboard/protocol-stats';
import { RateLimitCard } from '@/components/dashboard/rate-limit-card';
import { formatCurrency } from '@payos/ui';

// Mock data for volume by corridor
const corridorData = [
  { corridor: 'US → ARG', color: '#3b82f6', values: [800, 950, 1100, 1250, 1400, 1300, 1200] },
  { corridor: 'US → COL', color: '#8b5cf6', values: [600, 750, 800, 900, 1000, 950, 900] },
  { corridor: 'US → MEX', color: '#ec4899', values: [400, 500, 550, 600, 700, 650, 600] },
];

const recentActivity = [
  { time: '14:32', type: 'Transfer', from: 'TechCorp', to: 'Maria G.', amount: '$4,800', status: 'success', initiatedBy: { type: 'agent' as const, name: 'Payroll Bot' } },
  { time: '14:28', type: 'Card Spend', from: 'Carlos M.', to: 'Amazon', amount: '$127.50', status: 'success', initiatedBy: { type: 'user' as const, name: 'Manual' } },
  { time: '14:15', type: 'Deposit', from: 'External', to: 'TechCorp', amount: '$10,000', status: 'pending', initiatedBy: { type: 'agent' as const, name: 'Treasury Bot' } },
];

interface Stats {
  accounts: number;
  totalBalance: number;
  volume: string;
  cards: number;
  pendingFlags: number;
}

export default function DashboardPage() {
  const api = useApiClient();
  const { isConfigured, isLoading: configLoading } = useApiConfig();
  const [chartPeriod, setChartPeriod] = useState<'7D' | '30D' | '90D'>('7D');

  // Use React Query to fetch dashboard stats with caching
  const { data: accountsData, isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ['dashboard', 'accounts-aggregated'],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      // Fetch up to 50 accounts to aggregate balances client-side for "Real Balance Aggregation" (Story 42.14)
      const result = await api.accounts.list({ limit: 50 });
      return result;
    },
    enabled: !!api && isConfigured,
    staleTime: 60 * 1000,
  });

  // Debug logging
  if (accountsError) {
    console.error('[Dashboard] Error fetching accounts:', accountsError);
  }
  if (accountsData) {
    console.log('[Dashboard] Accounts data:', accountsData);
  }

  // Fetch compliance flags count
  const { data: complianceCount, isLoading: complianceLoading } = useQuery({
    queryKey: ['dashboard', 'compliance-count'],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.compliance.getOpenFlagsCount();
    },
    enabled: !!api && isConfigured,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  const loading = accountsLoading || complianceLoading;

  // Stats (mixing real and mock data)
  // Note: API response is double-nested: data.data.pagination
  // Calculate total balance from fetched accounts
  const aggregatedBalance = (accountsData as any)?.data?.reduce((sum: number, account: any) => {
    return sum + (Number(account.balanceAvailable) || 0);
  }, 0) || 0;

  const stats: Stats = {
    accounts: (accountsData as any)?.pagination?.total || 0,
    totalBalance: aggregatedBalance,
    volume: '$2.4M',
    cards: 8234,
    pendingFlags: complianceCount || 0, // Real compliance count!
  };

  // Get current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Show loading skeleton while initializing
  if (configLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-[1600px] mx-auto">
          <div className="mb-8">
            <div className="h-9 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-2"></div>
            <div className="h-5 w-64 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"></div>
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded-xl mb-4 animate-pulse"></div>
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded mb-2 animate-pulse"></div>
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-[1600px] mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Home</h1>
            <p className="text-gray-600 dark:text-gray-400">{currentDate}</p>
          </div>

          {/* API Key Required */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-6 border border-blue-200 dark:border-blue-900">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Configure API Key</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  To view your dashboard data, you need to configure your PayOS API key first.
                </p>
                <Link
                  href="/dashboard/api-keys"
                  className="inline-flex px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Configure API Key
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto" >
      <div className="p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Home</h1>
          <p className="text-gray-600 dark:text-gray-400">{currentDate}</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Accounts */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center gap-1">
                ↗ 847 MTD
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Accounts</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : stats?.accounts.toLocaleString()}
            </div>
          </div>

          {/* Total Balance (Aggregated) */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center gap-1">
                ↗ 12% MTD
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Balance</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white truncate" title={loading ? 'Loading...' : formatCurrency(stats.totalBalance, 'USDC')}>
              {loading ? '...' : formatCurrency(stats.totalBalance, 'USDC')}
            </div>
          </div>

          {/* Cards */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center gap-1">
                ↗ 312 MTD
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cards</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : stats?.cards.toLocaleString()}
            </div>
          </div>

          {/* Pending Flags - Clickable link to Compliance */}
          <Link href="/dashboard/compliance" className="block">
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-amber-400 dark:hover:border-amber-600 transition-colors cursor-pointer group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950 rounded-xl flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-900 transition-colors">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Compliance Flags</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {loading ? '...' : stats?.pendingFlags}
              </div>
              {stats?.pendingFlags > 0 && (
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Click to review →
                </div>
              )}
            </div>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - AI Insights + Agent Performance + Chart */}
          <div className="lg:col-span-2 space-y-6">
            {/* NEW: AI Insights Panel - Using PRD component */}
            <AiInsightsPanel insights={mockAiInsights} maxItems={4} />

            {/* NEW: Agent Performance Card - Using PRD component */}
            <AgentPerformanceCard stats={mockAgentStats} />

            {/* Volume by Corridor Chart */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Volume by Corridor</h3>
                  <div className="flex items-center gap-4">
                    {corridorData.map((c) => (
                      <div key={c.corridor} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.color }} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{c.corridor}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex rounded-lg bg-gray-100 dark:bg-gray-900 p-1">
                  {(['7D', '30D', '90D'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setChartPeriod(period)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${chartPeriod === period
                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simple Line Chart Visualization */}
              <div className="h-64 relative">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>$1800K</span>
                  <span>$1350K</span>
                  <span>$900K</span>
                  <span>$450K</span>
                </div>
                {/* Chart area */}
                <div className="ml-16 h-full border-l border-b border-gray-200 dark:border-gray-800 relative">
                  {/* Grid lines */}
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-dashed border-gray-200 dark:border-gray-800"
                      style={{ top: `${i * 25}%` }}
                    />
                  ))}
                  {/* Simplified representation - in real app would use proper charting library */}
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {corridorData.map((c, idx) => {
                      const points = c.values.map((v, i) => {
                        const x = (i / (c.values.length - 1)) * 100;
                        const y = 100 - (v / 1500) * 100;
                        return `${x},${y}`;
                      }).join(' ');
                      return (
                        <polyline
                          key={idx}
                          points={points}
                          fill="none"
                          stroke={c.color}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Requires Attention + Recent Activity */}
          {/* Right Column - New Widgets */}
          <div className="space-y-6">
            {/* Protocol Distribution Widget (Story 42.15) */}
            <ProtocolStats />

            {/* Rate Limit Indicator (Story 42.16) */}
            <RateLimitCard />
          </div>
        </div>
      </div>
    </div >
  );
}
