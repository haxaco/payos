'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@payos/ui';
import { Users, Bot, Activity, Wallet } from 'lucide-react';
import { useApiClient } from '@/lib/api-client';

interface DashboardStatsData {
  totalAccounts: number;
  activeAgents: number;
  activeStreams: number;
  totalBalance: number;
  accountsTrend: number;
  agentsTrend: number;
  streamsTrend: number;
  balanceTrend: number;
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const api = useApiClient();

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch data from multiple endpoints
        const [accountsRes, agentsRes, streamsRes] = await Promise.all([
          api?.accounts.list({ limit: 1 }),
          api?.agents.list({ limit: 1 }),
          api?.streams.list({ limit: 1 }),
        ]);

        setStats({
          totalAccounts: accountsRes?.pagination?.total || 0,
          activeAgents: agentsRes?.pagination?.total || 0,
          activeStreams: streamsRes?.pagination?.total || 0,
          totalBalance: 0, // Would need a dedicated endpoint
          accountsTrend: 12,
          agentsTrend: 5,
          streamsTrend: -2,
          balanceTrend: 8,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [api]);

  if (loading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Accounts"
        value={stats.totalAccounts.toLocaleString()}
        icon={<Users className="h-5 w-5" />}
        trend={{ value: stats.accountsTrend, label: 'vs last month' }}
      />
      <StatCard
        title="Active Agents"
        value={stats.activeAgents.toLocaleString()}
        icon={<Bot className="h-5 w-5" />}
        trend={{ value: stats.agentsTrend, label: 'vs last month' }}
      />
      <StatCard
        title="Active Streams"
        value={stats.activeStreams.toLocaleString()}
        icon={<Activity className="h-5 w-5" />}
        trend={{ value: stats.streamsTrend, label: 'vs last month' }}
      />
      <StatCard
        title="Total Balance"
        value={`$${stats.totalBalance.toLocaleString()}`}
        icon={<Wallet className="h-5 w-5" />}
        trend={{ value: stats.balanceTrend, label: 'vs last month' }}
      />
    </div>
  );
}

