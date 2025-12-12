'use client';

import { useState, useEffect } from 'react';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { Bot, Plus, Search, Filter } from 'lucide-react';
import Link from 'next/link';
import type { Agent } from '@payos/api-client';

export default function AgentsPage() {
  const api = useApiClient();
  const { isConfigured } = useApiConfig();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchAgents() {
      if (!api) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.agents.list({ limit: 50 });
        setAgents(response.data || []);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAgents();
  }, [api]);

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(search.toLowerCase())
  );

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

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-pulse">
              <div className="h-12 w-12 bg-gray-200 dark:bg-gray-800 rounded-xl mb-4"></div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
              <div className="h-3 w-48 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </div>
          ))
        ) : filteredAgents.length === 0 ? (
          <div className="col-span-full p-8 text-center">
            <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No agents found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {search ? 'Try a different search term' : 'Create your first agent to get started'}
            </p>
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <div 
              key={agent.id} 
              onClick={() => window.location.href = `/dashboard/agents/${agent.id}`}
              className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center">
                  <Bot className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  agent.status === 'active'
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
    </div>
  );
}

