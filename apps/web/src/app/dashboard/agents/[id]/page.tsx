'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApiClient } from '@/lib/api-client';
import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  Building2,
  Shield,
  Activity,
  Key,
  History,
  MoreVertical,
  CheckCircle,
  Pause,
  Play,
  RefreshCw,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import type { Agent, Stream, AgentLimits } from '@payos/api-client';

type TabType = 'overview' | 'streams' | 'kya' | 'activity';

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const api = useApiClient();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [limits, setLimits] = useState<AgentLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [actionLoading, setActionLoading] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!api) return;

      try {
        const [agentData, streamsData, limitsData] = await Promise.all([
          api.agents.get(agentId),
          api.agents.getStreams(agentId, { limit: 50 }),
          api.agents.getLimits(agentId),
        ]);

        setAgent(agentData);
        setStreams(streamsData.data || []);
        setLimits(limitsData);
      } catch (error) {
        console.error('Failed to fetch agent:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [api, agentId]);

  const handleVerify = async (tier: number) => {
    if (!api || !agent) return;
    setActionLoading(true);
    try {
      const updated = await api.agents.verify(agentId, tier);
      setAgent(updated);
    } catch (error) {
      console.error('Failed to verify agent:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!api || !agent) return;
    setActionLoading(true);
    try {
      const updated = await api.agents.suspend(agentId);
      setAgent(updated);
    } catch (error) {
      console.error('Failed to suspend agent:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!api || !agent) return;
    setActionLoading(true);
    try {
      const updated = await api.agents.activate(agentId);
      setAgent(updated);
    } catch (error) {
      console.error('Failed to activate agent:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRotateToken = async () => {
    if (!api || !agent) return;
    if (!confirm('Are you sure you want to rotate the token? The current token will be revoked.')) return;
    
    setActionLoading(true);
    try {
      const result = await api.agents.rotateToken(agentId);
      setNewToken(result.credentials.token);
    } catch (error) {
      console.error('Failed to rotate token:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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

  if (!agent) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Agent not found</h2>
        <Link href="/dashboard/agents" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to agents
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Bot },
    { id: 'streams' as TabType, label: 'Streams', icon: Activity, count: streams.length },
    { id: 'kya' as TabType, label: 'KYA', icon: Shield },
    { id: 'activity' as TabType, label: 'Activity', icon: History },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* New Token Alert */}
      {newToken && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                New Token Generated
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Save this token now. It will not be shown again!
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-yellow-100 dark:bg-yellow-900 rounded font-mono text-sm break-all">
                  {newToken}
                </code>
                <button
                  onClick={() => copyToClipboard(newToken)}
                  className="p-2 hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded"
                >
                  <Copy className="h-4 w-4 text-yellow-700" />
                </button>
              </div>
            </div>
            <button
              onClick={() => setNewToken(null)}
              className="text-yellow-600 hover:text-yellow-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Back button */}
      <Link
        href="/dashboard/agents"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to agents
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950 rounded-2xl flex items-center justify-center">
            <Bot className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{agent.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {agent.description || 'No description'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${
            agent.status === 'active'
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
              : agent.status === 'paused'
              ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400'
              : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
          }`}>
            {agent.status}
          </span>

          <div className="relative group">
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <MoreVertical className="h-5 w-5 text-gray-500" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {agent.status !== 'active' && (
                <button
                  onClick={handleActivate}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                >
                  <Play className="h-4 w-4 text-emerald-500" />
                  Activate Agent
                </button>
              )}
              {agent.status === 'active' && (
                <button
                  onClick={handleSuspend}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-red-600"
                >
                  <Pause className="h-4 w-4" />
                  Suspend Agent
                </button>
              )}
              <hr className="my-1 border-gray-200 dark:border-gray-800" />
              <button
                onClick={() => handleVerify(1)}
                disabled={actionLoading}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4 text-blue-500" />
                Set KYA Tier 1
              </button>
              <button
                onClick={() => handleVerify(2)}
                disabled={actionLoading}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4 text-blue-500" />
                Set KYA Tier 2
              </button>
              <button
                onClick={() => handleVerify(3)}
                disabled={actionLoading}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4 text-blue-500" />
                Set KYA Tier 3
              </button>
              <hr className="my-1 border-gray-200 dark:border-gray-800" />
              <button
                onClick={handleRotateToken}
                disabled={actionLoading}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-orange-600"
              >
                <RefreshCw className="h-4 w-4" />
                Rotate Token
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">KYA Tier</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Tier {agent.kyaTier}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Active Streams</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {streams.filter(s => s.status === 'active').length}
          </div>
        </div>
        <Link
          href={`/dashboard/accounts/${agent.parentAccountId}`}
          className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-shadow"
        >
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Parent Account</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-500" />
            {agent.parentAccount?.name || 'View Account'}
          </div>
        </Link>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Daily Limit</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            ${limits?.effectiveLimits?.daily.toLocaleString() || '0'}
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
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
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
        <OverviewTab agent={agent} limits={limits} />
      )}
      {activeTab === 'streams' && (
        <StreamsTab streams={streams} />
      )}
      {activeTab === 'kya' && (
        <KYATab agent={agent} limits={limits} />
      )}
      {activeTab === 'activity' && (
        <ActivityTab />
      )}
    </div>
  );
}

// Overview Tab
function OverviewTab({ agent, limits }: { agent: Agent; limits: AgentLimits | null }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Agent Details</h3>
        <dl className="space-y-4">
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Agent ID</dt>
            <dd className="font-mono text-sm text-gray-900 dark:text-white">{agent.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Status</dt>
            <dd className="capitalize text-gray-900 dark:text-white">{agent.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">KYA Tier</dt>
            <dd className="text-gray-900 dark:text-white">Tier {agent.kyaTier}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Created</dt>
            <dd className="text-gray-900 dark:text-white">
              {new Date(agent.createdAt).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>

      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Permissions</h3>
        <div className="flex flex-wrap gap-2">
          {agent.permissions?.map((perm) => (
            <span
              key={perm}
              className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded-full"
            >
              {perm}
            </span>
          )) || (
            <span className="text-gray-500">No permissions configured</span>
          )}
        </div>
      </div>
    </div>
  );
}

// Streams Tab
function StreamsTab({ streams }: { streams: Stream[] }) {
  if (streams.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No streams</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          This agent is not managing any streams.
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
      {streams.map((stream) => (
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
                ${stream.flowRate.perMonth.toLocaleString()}/month
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  ${stream.streamed.total.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">streamed</div>
              </div>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getHealthColor(stream.health)}`}>
                {stream.health}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// KYA Tab
function KYATab({ agent, limits }: { agent: Agent; limits: AgentLimits | null }) {
  const tiers = [
    { tier: 1, name: 'Basic', daily: 1000, monthly: 10000, perTx: 500 },
    { tier: 2, name: 'Standard', daily: 10000, monthly: 100000, perTx: 5000 },
    { tier: 3, name: 'Premium', daily: 100000, monthly: 1000000, perTx: 50000 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Current KYA Status
        </h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center">
            <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              Tier {agent.kyaTier}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {tiers.find(t => t.tier === agent.kyaTier)?.name || 'Unknown'} Verification Level
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Effective Limits
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Daily Limit</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              ${limits?.effectiveLimits?.daily.toLocaleString() || '0'}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Monthly Limit</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              ${limits?.effectiveLimits?.monthly.toLocaleString() || '0'}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Per Transaction</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              ${limits?.effectiveLimits?.perTransaction.toLocaleString() || '0'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Usage Statistics
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500 dark:text-gray-400">Daily Usage</span>
              <span className="text-gray-900 dark:text-white">
                ${limits?.usage?.daily.toLocaleString() || '0'} / ${limits?.effectiveLimits?.daily.toLocaleString() || '0'}
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  width: `${limits?.effectiveLimits?.daily ? (limits.usage.daily / limits.effectiveLimits.daily) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500 dark:text-gray-400">Monthly Usage</span>
              <span className="text-gray-900 dark:text-white">
                ${limits?.usage?.monthly.toLocaleString() || '0'} / ${limits?.effectiveLimits?.monthly.toLocaleString() || '0'}
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  width: `${limits?.effectiveLimits?.monthly ? (limits.usage.monthly / limits.effectiveLimits.monthly) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Activity Tab
function ActivityTab() {
  // Placeholder - would integrate with audit logs in a real implementation
  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
      <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Log</h3>
      <p className="text-gray-500 dark:text-gray-400 mt-2">
        Agent activity history will appear here.
      </p>
    </div>
  );
}

