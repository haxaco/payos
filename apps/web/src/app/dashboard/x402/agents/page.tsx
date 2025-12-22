'use client';

import { useState, useEffect } from 'react';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { Bot, Plus, Search, Filter, Wallet as WalletIcon, Settings, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import type { Agent, Wallet } from '@payos/api-client';
import { CardListSkeleton } from '@/components/ui/skeletons';

interface AgentWithWallet extends Agent {
  wallet?: Wallet | null;
}

export default function X402AgentsPage() {
  const api = useApiClient();
  const { isConfigured } = useApiConfig();
  const [agents, setAgents] = useState<AgentWithWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function fetchAgentsWithWallets() {
      if (!api) {
        setLoading(false);
        return;
      }

      try {
        // Fetch agents
        const agentsResponse = await api.agents.list({ limit: 50 });
        const agentsData = agentsResponse.data || [];

        // Fetch wallets
        const walletsResponse = await api.wallets.list({ limit: 100 });
        const walletsData = walletsResponse.data || [];

        // Match agents with their wallets
        const agentsWithWallets = agentsData.map(agent => {
          const wallet = walletsData.find(w => w.managedByAgentId === agent.id);
          return { ...agent, wallet };
        });

        setAgents(agentsWithWallets);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAgentsWithWallets();
  }, [api]);

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate stats
  const agentsWithWallets = agents.filter(a => a.wallet).length;
  const totalWalletBalance = agents.reduce((sum, a) => sum + (a.wallet?.balance || 0), 0);

  if (!isConfigured) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configure API Key</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Please configure your API key to manage agent x402 configuration.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Agent x402 Configuration</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage autonomous agents with x402 payment capabilities
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Register Agent
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Agents</span>
            <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{agents.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {agents.filter(a => a.status === 'active').length} active
          </div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">With Wallets</span>
            <WalletIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{agentsWithWallets}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">x402-enabled</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Wallet Balance</span>
            <WalletIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            ${totalWalletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Across all agents</div>
        </div>
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
          <div className="col-span-full">
            <CardListSkeleton count={6} />
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="col-span-full">
            {search ? (
              <div className="p-12 text-center bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No results found</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Try a different search term</p>
              </div>
            ) : (
              <div className="col-span-full p-12 text-center bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-5xl mb-4">🤖</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No agents yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 mb-4">
                  Register your first autonomous agent with x402 capabilities
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Register Agent
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center">
                  <Bot className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    agent.status === 'active'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                      : agent.status === 'paused'
                      ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400'
                      : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                  }`}>
                    {agent.status}
                  </span>
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <MoreVertical className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{agent.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {agent.description || 'No description'}
              </p>

              {/* Wallet Info */}
              {agent.wallet ? (
                <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <WalletIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">x402 Wallet</span>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">
                    ${agent.wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {agent.wallet.currency}
                    {agent.wallet.spendingPolicy?.dailyLimit && (
                      <> • ${agent.wallet.spendingPolicy.dailyLimit}/day limit</>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">No wallet configured</div>
                  <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    Create wallet
                  </button>
                </div>
              )}

              {/* KYA Tier */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">KYA Tier {agent.kyaTier}</span>
                <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <Settings className="h-3 w-3" />
                  Configure
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
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Register Agent with x402</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Coming soon: UI for registering agents with wallets. Use the API for now.
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

