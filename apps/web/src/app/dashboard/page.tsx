'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bot,
  DollarSign,
  ArrowLeftRight,
  AlertTriangle,
  ChevronRight,
  Plus,
  Zap,
  Puzzle,
  MessageSquare,
} from 'lucide-react';
import { useApiClient, useApiConfig, useApiFetch } from '@/lib/api-client';
import Link from 'next/link';

// Import dashboard components
import { OnboardingBanner } from '@/components/dashboard/onboarding-banner';
import { ProtocolQuickStats } from '@/components/dashboard/protocol-quick-stats';
import { ProtocolActivityChart } from '@/components/dashboard/protocol-activity-chart';
import { ProtocolStats } from '@/components/dashboard/protocol-stats';
import { ProtocolActivityFeed } from '@/components/dashboard/protocol-activity-feed';
import { RateLimitCard } from '@/components/dashboard/rate-limit-card';
import { RegisterAgentDialog } from '@/components/agents/register-agent-dialog';
import { formatCurrency } from '@sly/ui';

interface Stats {
  agentsRegistered: number;
  totalVolume: number;
  transactions: number;
  pendingFlags: number;
}

export default function DashboardPage() {
  const api = useApiClient();
  const { isConfigured, isLoading: configLoading, authToken, apiEnvironment, apiUrl } = useApiConfig();
  const apiFetch = useApiFetch();

  // Fetch agents count
  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['dashboard', 'agents-count', apiEnvironment],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.agents.list({ limit: 1 });
    },
    enabled: !!api && isConfigured,
    staleTime: 60 * 1000,
  });

  // Fetch transfers count
  const { data: transfersData, isLoading: transfersLoading } = useQuery({
    queryKey: ['dashboard', 'transfers-count', apiEnvironment],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.transfers.list({ limit: 1 });
    },
    enabled: !!api && isConfigured,
    staleTime: 60 * 1000,
  });

  // Fetch total volume from protocol distribution
  const { data: totalVolume, isLoading: volumeLoading } = useQuery({
    queryKey: ['dashboard', 'total-volume', apiEnvironment],
    queryFn: async () => {
      const response = await apiFetch(
        `${apiUrl}/v1/analytics/protocol-distribution?timeRange=30d&metric=volume`,
      );
      if (!response.ok) return 0;
      const json = await response.json();
      const data = json.data || json;
      if (!Array.isArray(data)) return 0;
      return data.reduce((sum: number, d: any) => sum + Number(d.volume_usd || 0), 0);
    },
    enabled: !!authToken && isConfigured,
    staleTime: 60 * 1000,
  });

  // Fetch compliance flags count
  const { data: complianceCount, isLoading: complianceLoading } = useQuery({
    queryKey: ['dashboard', 'compliance-count', apiEnvironment],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.compliance.getOpenFlagsCount();
    },
    enabled: !!api && isConfigured,
    staleTime: 30 * 1000,
  });

  // Fetch A2A stats
  const { data: a2aStats, isLoading: a2aLoading } = useQuery({
    queryKey: ['dashboard', 'a2a-stats', apiEnvironment],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.a2a.getStats();
    },
    enabled: !!api && isConfigured,
    staleTime: 60 * 1000,
  });

  // Fetch A2A sessions count
  const { data: sessionsData } = useQuery({
    queryKey: ['dashboard', 'a2a-sessions', apiEnvironment],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.a2a.listSessions();
    },
    enabled: !!api && isConfigured,
    staleTime: 60 * 1000,
  });

  // Fetch skills count across all agents
  const { data: skillsCount } = useQuery({
    queryKey: ['dashboard', 'skills-count', apiEnvironment],
    queryFn: async () => {
      const response = await apiFetch(`${apiUrl}/v1/agents/stats/skills-count`);
      if (!response.ok) return 0;
      const json = await response.json();
      return json.data?.count ?? json.count ?? 0;
    },
    enabled: !!authToken && isConfigured,
    staleTime: 60 * 1000,
  });

  const [registerOpen, setRegisterOpen] = useState(false);

  const loading = agentsLoading || transfersLoading || volumeLoading || complianceLoading || a2aLoading;

  const stats: Stats = {
    agentsRegistered: (agentsData as any)?.pagination?.total || 0,
    totalVolume: totalVolume || 0,
    transactions: (transfersData as any)?.pagination?.total || 0,
    pendingFlags: complianceCount || 0,
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
          {/* Hero card skeleton */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded-xl mb-4 animate-pulse"></div>
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded mb-2 animate-pulse"></div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
          </div>
          {/* Protocol stats skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded mb-2 animate-pulse"></div>
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
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

          {/* Welcome banner for unconfigured state */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold mb-2">Welcome to Sly</h2>
              <p className="text-blue-100 mb-6">
                Configure your API key to start accepting agentic payments with x402, AP2, ACP, and UCP protocols.
              </p>
              <Link
                href="/dashboard/api-keys"
                className="inline-flex px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
              >
                Configure API Key
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Home</h1>
          <p className="text-gray-600 dark:text-gray-400">{currentDate}</p>
        </div>

        {/* Conditional Onboarding Banner (Story 52.4) */}
        <OnboardingBanner />

        {/* Agents - Hero Row */}
        <div className="mb-6">
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center">
                  <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Agents Registered</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {loading ? '...' : stats.agentsRegistered.toLocaleString()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setRegisterOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Agent
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
              <Link href="/dashboard/agents/a2a/tasks" className="flex items-center gap-3 group">
                <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {loading ? '...' : ((a2aStats as any)?.active ?? 0)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Active Tasks</div>
                </div>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-50 dark:bg-purple-950/50 rounded-lg flex items-center justify-center">
                  <Puzzle className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {skillsCount ?? '...'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Skills</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-teal-50 dark:bg-teal-950/50 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {Array.isArray(sessionsData) ? sessionsData.length : '...'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Sessions</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <RegisterAgentDialog open={registerOpen} onOpenChange={setRegisterOpen} />

        {/* Protocol Quick Stats (Story 52.3) */}
        <div className="mb-6">
          <ProtocolQuickStats />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Volume (30d) */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Volume (30d)</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white truncate" title={loading ? 'Loading...' : formatCurrency(stats.totalVolume, 'USD')}>
              {loading ? '...' : formatCurrency(stats.totalVolume, 'USD')}
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950 rounded-xl flex items-center justify-center">
                <ArrowLeftRight className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Transactions</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : stats.transactions.toLocaleString()}
            </div>
          </div>

          {/* Pending Flags - Clickable link to Compliance */}
          <Link href="/dashboard/compliance" className="block">
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 hover:border-amber-400 dark:hover:border-amber-600 transition-colors cursor-pointer group h-full">
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
                  Click to review
                </div>
              )}
            </div>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Chart + Activity Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Protocol Activity Chart (Story 52.2) */}
            <ProtocolActivityChart />

            {/* Protocol Activity Feed (Story 52.5) */}
            <ProtocolActivityFeed />
          </div>

          {/* Right Column - Protocol Distribution + Rate Limit */}
          <div className="space-y-6">
            {/* Protocol Distribution Widget (Story 52.1) */}
            <ProtocolStats />

            {/* Rate Limit Indicator */}
            <RateLimitCard />
          </div>
        </div>
      </div>
    </div>
  );
}
