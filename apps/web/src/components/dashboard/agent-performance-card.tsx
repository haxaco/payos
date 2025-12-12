'use client';

import Link from 'next/link';
import { Bot, TrendingUp, Activity, DollarSign } from 'lucide-react';
import type { AgentStats } from '@/lib/mock-data/agent-stats';

interface AgentPerformanceCardProps {
  stats: AgentStats;
}

export function AgentPerformanceCard({ stats }: AgentPerformanceCardProps) {
  return (
    <Link href="/dashboard/agents" className="block group">
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg hover:border-blue-500 dark:hover:border-blue-500 transition-all">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              🤖 Agent Performance
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">Today</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.activeAgents}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              of {stats.totalAgents} agents active
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-1">
              {stats.actionsToday}
              {stats.actionsTrend > 0 && (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              )}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              actions today
              {stats.actionsTrend > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400 ml-1">
                  +{stats.actionsTrend}%
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-1">
              {stats.successRate}%
              <Activity className="w-4 h-4 text-emerald-500" />
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">success rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-1">
              ${stats.volumeProcessed.toLocaleString()}
              <DollarSign className="w-4 h-4 text-blue-500" />
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">volume processed</p>
          </div>
        </div>
        
        <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">Top agent:</span>{' '}
              <span className="font-medium text-gray-900 dark:text-white">{stats.topAgent.name}</span>
              <span className="text-gray-500 dark:text-gray-400"> ({stats.topAgent.actions} actions)</span>
            </p>
            <span className="text-blue-600 dark:text-blue-400 text-sm group-hover:underline">
              View All →
            </span>
          </div>
        </div>
        
        {/* Action breakdown pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded-full">
            {stats.byType.transfers} transfers
          </span>
          <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 rounded-full">
            {stats.byType.streams} streams
          </span>
          <span className="px-2 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full">
            {stats.byType.topUps} top-ups
          </span>
        </div>
      </div>
    </Link>
  );
}

