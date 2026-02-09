'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { Bot, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import type { Agent } from '@sly/api-client';
import { AgentsEmptyState } from '@/components/ui/empty-state';
import { CardListSkeleton } from '@/components/ui/skeletons';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { LobsterClaw } from '@/components/icons/lobster-claw';

function getAgentIcon(agentName: string) {
  if (agentName.includes('Inference API Consumer')) {
    return {
      Icon: LobsterClaw,
      bgColor: 'bg-orange-100 dark:bg-orange-950',
      textColor: 'text-orange-600 dark:text-orange-400',
    };
  }
  return {
    Icon: Bot,
    bgColor: 'bg-blue-100 dark:bg-blue-950',
    textColor: 'text-blue-600 dark:text-blue-400',
  };
}

export default function AgentsPage() {
  const api = useApiClient();
  const { isConfigured, isLoading: isAuthLoading } = useApiConfig();
  const [search, setSearch] = useState('');

  // Fetch total count
  const { data: countData } = useQuery({
    queryKey: ['agents', 'count'],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.agents.list({ limit: 1 });
    },
    enabled: !!api && isConfigured,
    staleTime: 60 * 1000,
  });

  // Initialize pagination
  const pagination = usePagination({
    totalItems: (countData as any)?.data?.pagination?.total || (countData as any)?.pagination?.total || 0,
    initialPageSize: 50,
  });

  // Fetch agents for current page
  const { data: agentsData, isLoading: loading } = useQuery({
    queryKey: ['agents', 'page', pagination.page, pagination.pageSize],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.agents.list({
        page: pagination.page,
        limit: pagination.pageSize,
      });
    },
    enabled: !!api && isConfigured,
    staleTime: 30 * 1000,
  });

  const rawData = (agentsData as any)?.data;
  const agents = Array.isArray(rawData)
    ? rawData
    : (Array.isArray((rawData as any)?.data)
      ? (rawData as any).data
      : []);

  const filteredAgents = agents.filter((agent: any) =>
    agent.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isAuthLoading) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Agents</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage AI agents and their permissions</p>
          </div>
        </div>
        <div className="col-span-full">
          <CardListSkeleton count={6} />
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configure API Key</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Please configure your API key to view agents.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Agents</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage AI agents and their permissions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Create Agent
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents..."
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

      {/* Top Pagination Controls */}
      {!loading && filteredAgents.length > 0 && (
        <PaginationControls
          pagination={pagination}
          className="mb-4"
        />
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full">
            <CardListSkeleton count={6} />
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="col-span-full">
            {search ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No results found</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Try a different search term
                </p>
              </div>
            ) : (
              <AgentsEmptyState />
            )}
          </div>
        ) : (
          filteredAgents.map((agent: any) => (
            <div
              key={agent.id}
              onClick={() => window.location.href = `/dashboard/agents/${agent.id}`}
              className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                {(() => {
                  const { Icon, bgColor, textColor } = getAgentIcon(agent.name);
                  return (
                    <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${textColor}`} />
                    </div>
                  );
                })()}
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${agent.status === 'active'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                  : agent.status === 'paused'
                    ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400'
                    : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                  }`}>
                  {agent.status}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{agent.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{agent.description || 'No description'}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">KYA Tier {agent.kyaTier}</span>
                <span className="text-gray-500 dark:text-gray-400">{agent.parentAccount?.name}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && filteredAgents.length > 0 && (
        <PaginationControls
          pagination={pagination}
          className="mt-6"
        />
      )}
    </div>
  );
}

