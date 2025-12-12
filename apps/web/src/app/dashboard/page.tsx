'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  CreditCard, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

const volumeData = [
  { month: 'Jan', value: 28000 },
  { month: 'Feb', value: 35000 },
  { month: 'Mar', value: 42000 },
  { month: 'Apr', value: 45000 },
  { month: 'May', value: 48000 },
  { month: 'Jun', value: 38000 },
  { month: 'Jul', value: 32000 },
  { month: 'Aug', value: 35000 },
  { month: 'Sep', value: 52000 },
];

interface Stats {
  totalVolume: string;
  activeAccounts: number;
  activeAgents: number;
  revenue: string;
}

export default function DashboardPage() {
  const api = useApiClient();
  const { isConfigured } = useApiConfig();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!api) {
        setLoading(false);
        return;
      }

      try {
        const [accountsRes, agentsRes] = await Promise.all([
          api.accounts.list({ limit: 1 }),
          api.agents.list({ limit: 1 }),
        ]);

        setStats({
          totalVolume: '$2.1M',
          activeAccounts: accountsRes?.pagination?.total || 0,
          activeAgents: agentsRes?.pagination?.total || 0,
          revenue: '$24.5K',
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [api]);

  if (!isConfigured) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-[1600px] mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Welcome to PayOS!</p>
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
    <div className="flex-1 overflow-auto">
      <div className="p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Welcome back! Here's what's happening with your platform.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Stats */}
          <div className="xl:col-span-2 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Total Volume */}
              <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full">
                    ↑ 3.5%
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Volume</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : stats?.totalVolume}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Increase than last week</div>
              </div>

              {/* Active Accounts */}
              <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full">
                    ↑ 12%
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Accounts</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : stats?.activeAccounts}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Increase than last week</div>
              </div>

              {/* Active Agents */}
              <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full">
                    ↑ 5%
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Agents</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : stats?.activeAgents}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Increase than last week</div>
              </div>

              {/* Revenue */}
              <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full">
                    ↑ 8%
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Revenue (MTD)</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : stats?.revenue}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Increase than last week</div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Volume Overview</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Achieved</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Target</span>
                    </div>
                  </div>
                </div>
                <select className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Monthly</option>
                  <option>Weekly</option>
                  <option>Yearly</option>
                </select>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#10b981" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* AI Alert */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-6 border border-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">AI Compliance Alert</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">3 transactions flagged for review. AI Copilot has analyzed the risk patterns and prepared recommendations.</p>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                      Review Flags
                    </button>
                    <button className="px-4 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-gray-200 dark:border-gray-800">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions & Recent */}
          <div className="space-y-6">
            {/* Quick Actions Card */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              
              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/dashboard/accounts"
                  className="px-4 py-3 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Accounts
                </Link>
                <Link
                  href="/dashboard/agents"
                  className="px-4 py-3 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  Agents
                </Link>
                <Link
                  href="/dashboard/streams"
                  className="px-4 py-3 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Streams
                </Link>
                <Link
                  href="/dashboard/transfers"
                  className="px-4 py-3 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  Transfers
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                    💸
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">Stream created</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">2 minutes ago</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    $500/mo
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                    👤
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">New account created</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">15 minutes ago</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                    🤖
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">Agent verified</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">1 hour ago</div>
                  </div>
                  <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    Tier 2
                  </div>
                </div>
              </div>

              <button className="w-full mt-4 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                See More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
