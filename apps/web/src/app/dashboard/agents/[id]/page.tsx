'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApiClient } from '@/lib/api-client';
import Link from 'next/link';
import { LobsterClaw } from '@/components/icons/lobster-claw';
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
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  RefreshCw,
  Copy,
  AlertTriangle,
  FileText,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import type { Agent, Stream, AgentLimits } from '@sly/api-client';
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sly/ui';
import { AgentActivityFeed } from '@/components/agents/agent-activity-feed';
import { AgentQuickActions } from '@/components/agents/agent-quick-actions';
import { ConfigureAgentDialog } from '@/components/agents/configure-agent-dialog';
import { KyaTierBadge } from '@/components/agents/kya-tier-badge';
import type { AgentAction } from '@/lib/mock-data/agent-activity';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

type TabType = 'overview' | 'streams' | 'mandates' | 'checkouts' | 'permissions' | 'kya' | 'activity';

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
  const [configureOpen, setConfigureOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!api) return;

      try {
        const [agentData, streamsData, limitsData] = await Promise.all([
          api.agents.get(agentId),
          api.agents.getStreams(agentId, { limit: 50 }),
          api.agents.getLimits(agentId),
        ]);

        // Handle potential double-nesting for agent data
        const rawAgent = agentData as any;
        const processedAgent = rawAgent.data?.data || rawAgent.data || rawAgent;
        setAgent(processedAgent);

        // Handle both array and object responses for streams
        const rawStreams = streamsData?.data;
        const streamsArray = Array.isArray(rawStreams) ? rawStreams : (Array.isArray((rawStreams as any)?.data) ? (rawStreams as any).data : []);
        setStreams(streamsArray);

        // Handle limits nesting if needed
        const rawLimits = limitsData as any;
        setLimits(rawLimits.data?.data || rawLimits.data || rawLimits);
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

  const handleDelete = async () => {
    if (!api || !agent) return;
    if (!confirm('Are you sure you want to delete this agent? This cannot be undone.')) return;

    setActionLoading(true);
    try {
      await api.agents.delete(agentId);
      router.push('/dashboard/agents');
    } catch (error) {
      alert(`Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    { id: 'streams' as TabType, label: 'Streams', icon: Activity, count: Array.isArray(streams) ? streams.length : 0 },
    { id: 'mandates' as TabType, label: 'Mandates', icon: FileText },
    { id: 'checkouts' as TabType, label: 'Checkouts', icon: ShoppingCart },
    { id: 'permissions' as TabType, label: 'Permissions', icon: Key },
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
          {(() => {
            const { Icon, bgColor, textColor } = getAgentIcon(agent.name);
            return (
              <div className={`w-16 h-16 ${bgColor} rounded-2xl flex items-center justify-center`}>
                <Icon className={`h-8 w-8 ${textColor}`} />
              </div>
            );
          })()}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{agent.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {agent.description || 'No description'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Actions */}
          <AgentQuickActions
            agent={{ id: agent.id, name: agent.name, status: agent.status }}
            onConfigure={() => setConfigureOpen(true)}
          />
          <ConfigureAgentDialog
            agent={agent}
            limits={limits}
            open={configureOpen}
            onOpenChange={setConfigureOpen}
            onSuccess={async () => {
              if (!api) return;
              const [agentData, limitsData] = await Promise.all([
                api.agents.get(agentId),
                api.agents.getLimits(agentId),
              ]);
              const raw = agentData as any;
              setAgent(raw.data?.data || raw.data || raw);
              const rawL = limitsData as any;
              setLimits(rawL.data?.data || rawL.data || rawL);
            }}
          />

          <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${agent.status === 'active'
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
              <hr className="my-1 border-gray-200 dark:border-gray-800" />
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                Delete Agent
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Daily Limit</div>
          {(() => {
            const dailyLimit = limits?.effectiveLimits?.daily || 0;
            const dailyUsed = limits?.usage?.daily || 0;
            const remaining = Math.max(0, dailyLimit - dailyUsed);
            const pct = dailyLimit ? (dailyUsed / dailyLimit) * 100 : 0;
            const color = pct >= 90 ? 'text-red-600 dark:text-red-400' : pct >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
            const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
            return (
              <>
                <div className={`text-2xl font-bold ${color}`}>
                  ${remaining.toLocaleString()}<span className="text-base text-gray-400">/${dailyLimit.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-2">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="text-xs text-gray-400 mt-1">remaining</div>
              </>
            );
          })()}
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Transactions</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {((agent as any).totalTransactions ?? (agent as any).total_transactions)?.toLocaleString() || '0'}
          </div>
          <div className="text-xs text-gray-400 mt-1">{formatCurrency((agent as any).totalVolume ?? (agent as any).total_volume ?? 0)} volume</div>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">KYA Tier</div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <KyaTierBadge tier={agent.kyaTier} />
          </div>
        </div>
        <Link
          href={`/dashboard/accounts/${agent.parentAccount?.id || (agent as any).parent_account_id || '#'}`}
          className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-shadow"
        >
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Parent Account</div>
          <div className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-500" />
            {agent.parentAccount?.name || 'View Account'}
          </div>
        </Link>
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
        <OverviewTab agent={agent} limits={limits} />
      )}
      {activeTab === 'streams' && (
        <StreamsTab streams={streams} />
      )}
      {activeTab === 'mandates' && (
        <MandatesTab agentId={agentId} />
      )}
      {activeTab === 'checkouts' && (
        <CheckoutsTab agentId={agentId} />
      )}
      {activeTab === 'permissions' && (
        <PermissionsTab agent={agent} />
      )}
      {activeTab === 'kya' && (
        <KYATab agent={agent} limits={limits} />
      )}
      {activeTab === 'activity' && (
        <ActivityTab agentId={agentId} />
      )}
    </div>
  );
}

// Permission categories and their possible permissions
const permissionMatrix: Record<string, string[]> = {
  transactions: ['view', 'initiate', 'approve'],
  streams: ['view', 'create', 'modify', 'pause', 'terminate'],
  accounts: ['view', 'create', 'modify'],
  treasury: ['view', 'manage', 'rebalance'],
};

// Overview Tab
function OverviewTab({ agent, limits }: { agent: Agent; limits: AgentLimits | null }) {
  return (
    <div className="space-y-6">
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
          <div className="flex justify-between items-center">
            <dt className="text-gray-500 dark:text-gray-400">KYA Tier</dt>
            <dd><KyaTierBadge tier={agent.kyaTier} /></dd>
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
        <RecentTransfers agentId={agent.id} />
      </div>
    </div>
    <WalletSpendingPolicies agent={agent} />
    </div>
  );
}

// Recent activity for Overview tab — merges transfers + ACP checkouts + UCP checkouts
function RecentTransfers({ agentId }: { agentId: string }) {
  const api = useApiClient();

  // Fetch transfers initiated by this agent
  const { data: transfersData, isLoading: transfersLoading } = useTanstackQuery({
    queryKey: ['transfers', 'agent', agentId],
    queryFn: async () => {
      if (!api) return [];
      const result = await api.transfers.list({ initiated_by_id: agentId, limit: 10 } as any);
      const raw = result as any;
      return Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.data?.data) ? raw.data.data : []);
    },
    enabled: !!api,
  });

  // Fetch ACP checkouts for this agent
  const { data: acpData, isLoading: acpLoading } = useTanstackQuery({
    queryKey: ['acp-checkouts', 'agent', agentId],
    queryFn: async () => {
      if (!api) return [];
      const result = await api.acp.list({ agent_id: agentId, limit: 20 });
      const raw = result as any;
      return Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.data?.data) ? raw.data.data : []);
    },
    enabled: !!api,
  });

  // Fetch UCP checkouts filtered by agent_id (server-side)
  const { data: ucpData, isLoading: ucpLoading } = useTanstackQuery({
    queryKey: ['ucp-checkouts', 'agent', agentId],
    queryFn: async () => {
      if (!api) return [];
      const result = await api.ucp.checkouts.list({ agent_id: agentId, limit: 100 });
      const raw = result as any;
      return Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.data?.data) ? raw.data.data : []);
    },
    enabled: !!api,
  });

  const isLoading = transfersLoading || acpLoading || ucpLoading;

  // Collect transfer IDs linked to ACP checkouts so we don't show duplicates
  const acpTransferIds = new Set(
    (acpData || []).map((c: any) => c.transfer_id || c.transferId).filter(Boolean)
  );

  // Normalize and merge all sources
  const transfers = (transfersData || [])
    .filter((tx: any) => !acpTransferIds.has(tx.id))
    .map((tx: any) => ({
      id: tx.id,
      type: 'transfer' as const,
      description: tx.description || `${tx.type} transfer`,
      amount: tx.amount ?? 0,
      currency: tx.currency ?? 'USDC',
      status: tx.status,
      date: tx.createdAt || tx.created_at,
    }));

  const acpCheckouts = (acpData || []).map((c: any) => ({
    id: c.id,
    type: 'acp_checkout' as const,
    description: c.merchant_name || c.checkout_id || 'ACP Checkout',
    amount: parseFloat(c.total_amount || c.totalAmount || 0),
    currency: c.currency || 'USD',
    status: c.status,
    date: c.created_at || c.createdAt,
  }));

  const ucpCheckouts = (ucpData || []).map((s: any) => ({
    id: s.id,
    type: 'ucp_checkout' as const,
    description: s.metadata?.merchant_name || s.line_items?.[0]?.name || 'UCP Checkout',
    amount: (s.totals?.find((t: any) => t.type === 'total')?.amount ?? 0) / 100,
    currency: s.currency || 'USD',
    status: s.status,
    date: s.created_at || s.createdAt,
  }));

  const merged = [...transfers, ...acpCheckouts, ...ucpCheckouts]
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 10);

  if (isLoading) {
    return <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />;
  }

  if (merged.length === 0) {
    return <p className="text-gray-500 text-sm">No recent activity</p>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300';
      case 'confirmed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300';
      case 'pending': case 'processing': return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
      case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="max-h-[320px] overflow-y-auto overflow-x-hidden space-y-3 pr-1">
      {merged.map((tx) => {
        const href = tx.type === 'acp_checkout'
          ? `/dashboard/agentic-payments/acp/checkouts/${tx.id}`
          : tx.type === 'ucp_checkout'
            ? `/dashboard/agentic-payments/ucp/checkouts/${tx.id}`
            : `/dashboard/transfers/${tx.id}`;
        return (
          <Link key={`${tx.type}-${tx.id}`} href={href} className="block py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-md px-2 -mx-2 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {(tx.type === 'ucp_checkout' || tx.type === 'acp_checkout') && (
                  <ShoppingCart className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-sm text-gray-900 dark:text-white truncate">
                    {tx.description}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {tx.date ? format(new Date(tx.date), 'MMM d, h:mm a') : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(tx.amount, tx.currency)}
                </span>
                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${getStatusColor(tx.status)}`}>
                  {tx.status}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// Wallet Spending Policies card
function WalletSpendingPolicies({ agent }: { agent: Agent }) {
  const api = useApiClient();
  const parentAccountId = agent.parentAccount?.id || (agent as any).parent_account_id;

  // Try agent-linked wallets first, fall back to parent account wallets
  const { data: agentWalletsData, isLoading: agentLoading } = useTanstackQuery({
    queryKey: ['wallets', 'agent', agent.id],
    queryFn: async () => {
      if (!api) return [];
      const result = await api.wallets.list({ managed_by_agent_id: agent.id } as any);
      const raw = result as any;
      return Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.data?.data) ? raw.data.data : (Array.isArray(raw) ? raw : []));
    },
    enabled: !!api,
  });

  const { data: parentWalletsData, isLoading: parentLoading } = useTanstackQuery({
    queryKey: ['wallets', 'parent', parentAccountId],
    queryFn: async () => {
      if (!api || !parentAccountId) return [];
      const result = await api.wallets.list({ owner_account_id: parentAccountId, limit: 20 } as any);
      const raw = result as any;
      return Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.data?.data) ? raw.data.data : (Array.isArray(raw) ? raw : []));
    },
    enabled: !!api && !!parentAccountId && (agentWalletsData || []).length === 0 && !agentLoading,
  });

  const isLoading = agentLoading || parentLoading;
  const agentWallets = agentWalletsData || [];
  const usingParentFallback = agentWallets.length === 0;
  const wallets = agentWallets.length > 0 ? agentWallets : (parentWalletsData || []);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Wallet Spending Policies</h3>
        <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      </div>
    );
  }

  if (wallets.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Wallet Spending Policies</h3>
        {usingParentFallback && wallets.length > 0 && (
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">Showing parent account wallets</span>
        )}
      </div>
      <div className="space-y-4">
        {wallets.map((wallet: any) => {
          const policy = wallet.spending_policy || wallet.spendingPolicy;
          return (
            <div key={wallet.id} className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">{wallet.name}</span>
                  {wallet.purpose && (
                    <span className="ml-2 text-xs text-muted-foreground">{wallet.purpose}</span>
                  )}
                </div>
                <span className="text-sm font-medium">{formatCurrency(wallet.balance, wallet.currency)}</span>
              </div>
              {policy ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {policy.daily_limit && (
                    <Badge variant="outline" className="text-xs">Daily: ${policy.daily_limit.toLocaleString()}</Badge>
                  )}
                  {policy.monthly_limit && (
                    <Badge variant="outline" className="text-xs">Monthly: ${policy.monthly_limit.toLocaleString()}</Badge>
                  )}
                  {policy.per_transaction_limit && (
                    <Badge variant="outline" className="text-xs">Per-Tx: ${policy.per_transaction_limit.toLocaleString()}</Badge>
                  )}
                  {policy.requires_approval_above && (
                    <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">Approval &gt; ${policy.requires_approval_above.toLocaleString()}</Badge>
                  )}
                  {policy.per_trip_limit && (
                    <Badge variant="outline" className="text-xs">Per-Trip: ${policy.per_trip_limit.toLocaleString()}</Badge>
                  )}
                  {policy.hotel_per_night_max && (
                    <Badge variant="outline" className="text-xs">Hotel/Night: ${policy.hotel_per_night_max.toLocaleString()}</Badge>
                  )}
                  {policy.locked && (
                    <Badge variant="outline" className="text-xs bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300">Locked</Badge>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">No spending policy configured</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Permissions Tab
function PermissionsTab({ agent }: { agent: Agent }) {
  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Permission Matrix</h3>
      {agent.permissions && typeof agent.permissions === 'object' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">Permission</th>
                {Object.keys(permissionMatrix).map((cat) => (
                  <th key={cat} className="text-center py-2 px-2 text-gray-500 dark:text-gray-400 font-medium capitalize">
                    {cat}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const allPerms = new Set<string>();
                Object.values(permissionMatrix).forEach((perms) =>
                  perms.forEach((p) => allPerms.add(p))
                );
                return Array.from(allPerms).map((perm) => (
                  <tr key={perm} className="border-b border-gray-100 dark:border-gray-900">
                    <td className="py-2 pr-4 text-gray-700 dark:text-gray-300 capitalize">{perm}</td>
                    {Object.keys(permissionMatrix).map((cat) => {
                      const catPerms = (agent.permissions as any)?.[cat] as Record<string, boolean> | undefined;
                      const hasPermInCategory = permissionMatrix[cat].includes(perm);
                      const isEnabled = catPerms?.[perm] === true;
                      return (
                        <td key={cat} className="text-center py-2 px-2">
                          {hasPermInCategory ? (
                            isEnabled ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-300 dark:text-gray-700 mx-auto" />
                            )
                          ) : (
                            <span className="text-gray-200 dark:text-gray-800">--</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      ) : (
        <span className="text-gray-500">No permissions configured</span>
      )}
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

// Mandates Tab
function MandatesTab({ agentId }: { agentId: string }) {
  const api = useApiClient();
  const [mandates, setMandates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMandates() {
      if (!api) return;
      try {
        const result = await api.ap2.list({ agentId, limit: 50 });
        const raw = result as any;
        const data = raw?.data || raw;
        setMandates(Array.isArray(data) ? data : (data?.data || []));
      } catch (error) {
        console.error('Failed to fetch mandates:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchMandates();
  }, [api, agentId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
        <div className="text-gray-500">Loading mandates...</div>
      </div>
    );
  }

  if (mandates.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No mandates</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          This agent has no linked AP2 mandates.
        </p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  const getPriorityDisplay = (metadata: any) => {
    const p = metadata?.priority;
    if (p == null) return null;
    const map: Record<number, { label: string; color: string }> = {
      1: { label: 'P1 High', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' },
      2: { label: 'P2 Medium', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100' },
      3: { label: 'P3 Low', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' },
    };
    return map[p] || { label: `P${p}`, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100' };
  };

  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mandate ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Authorized</TableHead>
            <TableHead>Used</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mandates.map((m: any) => {
            const priority = getPriorityDisplay(m.metadata);
            return (
            <TableRow key={m.id}>
              <TableCell className="font-mono text-xs">
                {m.mandateId || m.mandate_id || m.id?.slice(0, 12)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {m.type || m.mandate_type || 'payment'}
                </Badge>
              </TableCell>
              <TableCell>
                {priority ? (
                  <Badge variant="outline" className={`border-transparent ${priority.color}`}>
                    {priority.label}
                  </Badge>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </TableCell>
              <TableCell>
                {formatCurrency(m.amount?.authorized ?? m.authorized_amount ?? 0, m.amount?.currency ?? m.currency ?? 'USD')}
              </TableCell>
              <TableCell>
                {formatCurrency(m.amount?.used ?? m.used_amount ?? 0, m.amount?.currency ?? m.currency ?? 'USD')}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`border-transparent ${getStatusColor(m.status)}`}>
                  {m.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {m.createdAt || m.created_at ? format(new Date(m.createdAt || m.created_at), 'MMM d, yyyy') : '—'}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/dashboard/agentic-payments/ap2/mandates/${m.id}`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View
                </Link>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// Checkouts Tab — shows both ACP and UCP checkouts
function CheckoutsTab({ agentId }: { agentId: string }) {
  const api = useApiClient();
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCheckouts() {
      if (!api) return;
      try {
        // Fetch ACP checkouts (filtered by agent)
        const acpResult = await api.acp.list({ agent_id: agentId, limit: 50 });
        const acpRaw = acpResult as any;
        const acpData = Array.isArray(acpRaw?.data) ? acpRaw.data : (Array.isArray(acpRaw?.data?.data) ? acpRaw.data.data : []);
        const acpTagged = acpData.map((c: any) => ({ ...c, _protocol: 'acp' as const }));

        // Fetch UCP checkout sessions (server-side agent_id filter)
        let ucpTagged: any[] = [];
        try {
          const ucpResult = await api.ucp.checkouts.list({ agent_id: agentId, limit: 100 });
          const ucpRaw = ucpResult as any;
          const ucpFiltered = Array.isArray(ucpRaw?.data) ? ucpRaw.data : (Array.isArray(ucpRaw?.data?.data) ? ucpRaw.data.data : []);
          ucpTagged = ucpFiltered.map((s: any) => ({
            id: s.id,
            checkout_id: s.id?.slice(0, 12),
            merchant_name: s.metadata?.merchant_name || s.line_items?.[0]?.name || s.metadata?.scenario || 'UCP Checkout',
            total_amount: (s.totals?.find((t: any) => t.type === 'total')?.amount ?? 0) / 100,
            currency: s.currency || 'USD',
            status: s.status,
            created_at: s.created_at || s.createdAt,
            _protocol: 'ucp' as const,
          }));
        } catch {
          // UCP fetch failed — show ACP only
        }

        // Merge and sort by date descending
        const merged = [...acpTagged, ...ucpTagged].sort((a, b) => {
          const da = new Date(a.created_at || 0).getTime();
          const db = new Date(b.created_at || 0).getTime();
          return db - da;
        });

        setCheckouts(merged);
      } catch (error) {
        console.error('Failed to fetch checkouts:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCheckouts();
  }, [api, agentId]);

  const handleDelete = async (checkout: any) => {
    if (!api) return;
    if (!confirm(`Delete checkout "${checkout.checkout_id || checkout.id?.slice(0, 12)}"? This cannot be undone.`)) return;

    const key = `${checkout._protocol}-${checkout.id}`;
    setDeleting(key);
    try {
      if (checkout._protocol === 'ucp') {
        await api.ucp.checkouts.delete(checkout.id);
      } else {
        await api.acp.delete(checkout.id);
      }
      setCheckouts((prev) => prev.filter((c) => `${c._protocol}-${c.id}` !== key));
    } catch (error) {
      console.error('Failed to delete checkout:', error);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
        <div className="text-gray-500">Loading checkouts...</div>
      </div>
    );
  }

  if (checkouts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
        <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No checkouts</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          This agent has no linked checkouts.
        </p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100';
      case 'pending': case 'requires_escalation': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  const getProtocolColor = (protocol: string) => {
    return protocol === 'ucp'
      ? 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
  };

  const getDetailHref = (c: any) => {
    return c._protocol === 'ucp'
      ? `/dashboard/agentic-payments/ucp/checkouts/${c.id}`
      : `/dashboard/agentic-payments/acp/checkouts/${c.id}`;
  };

  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Checkout ID</TableHead>
            <TableHead>Protocol</TableHead>
            <TableHead>Merchant</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {checkouts.map((c: any) => (
            <TableRow key={`${c._protocol}-${c.id}`}>
              <TableCell className="font-mono text-xs">
                <Link href={getDetailHref(c)} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {c.checkout_id || c.id?.slice(0, 12)}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`border-transparent text-xs uppercase ${getProtocolColor(c._protocol)}`}>
                  {c._protocol}
                </Badge>
              </TableCell>
              <TableCell>{c.merchant_name || '—'}</TableCell>
              <TableCell>
                {formatCurrency(c.total_amount ?? 0, c.currency ?? 'USD')}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`border-transparent ${getStatusColor(c.status)}`}>
                  {c.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {c.created_at ? format(new Date(c.created_at), 'MMM d, yyyy') : '—'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={getDetailHref(c)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(c)}
                    disabled={deleting === `${c._protocol}-${c.id}`}
                    className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                    title="Delete checkout"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// KYA helpers — threshold-based usage bar colors
function getUsageBarColor(used: number, limit: number): string {
  if (!limit) return 'bg-blue-500';
  const pct = (used / limit) * 100;
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-blue-500';
}

function getUsageAlert(used: number, limit: number): { text: string; className: string } | null {
  if (!limit) return null;
  const pct = (used / limit) * 100;
  if (pct >= 90) return { text: `${pct.toFixed(0)}% — Approaching limit`, className: 'text-red-600 dark:text-red-400' };
  if (pct >= 80) return { text: `${pct.toFixed(0)}% — Elevated usage`, className: 'text-amber-600 dark:text-amber-400' };
  return null;
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
            <KyaTierBadge tier={agent.kyaTier} className="text-sm" />
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
              ${limits?.effectiveLimits?.daily?.toLocaleString() || '0'}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Monthly Limit</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              ${limits?.effectiveLimits?.monthly?.toLocaleString() || '0'}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Per Transaction</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              ${limits?.effectiveLimits?.perTransaction?.toLocaleString() || '0'}
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
                ${limits?.usage?.daily?.toLocaleString() || '0'} / ${limits?.effectiveLimits?.daily?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getUsageBarColor(limits?.usage?.daily || 0, limits?.effectiveLimits?.daily || 0)}`}
                style={{
                  width: `${limits?.effectiveLimits?.daily ? (limits.usage.daily / limits.effectiveLimits.daily) * 100 : 0}%`,
                }}
              />
            </div>
            {(() => {
              const alert = getUsageAlert(limits?.usage?.daily || 0, limits?.effectiveLimits?.daily || 0);
              return alert ? (
                <div className={`flex items-center gap-1 mt-1 text-xs ${alert.className}`}>
                  <AlertTriangle className="h-3 w-3" />
                  {alert.text}
                </div>
              ) : null;
            })()}
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500 dark:text-gray-400">Monthly Usage</span>
              <span className="text-gray-900 dark:text-white">
                ${limits?.usage?.monthly?.toLocaleString() || '0'} / ${limits?.effectiveLimits?.monthly?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getUsageBarColor(limits?.usage?.monthly || 0, limits?.effectiveLimits?.monthly || 0)}`}
                style={{
                  width: `${limits?.effectiveLimits?.monthly ? (limits.usage.monthly / limits.effectiveLimits.monthly) * 100 : 0}%`,
                }}
              />
            </div>
            {(() => {
              const alert = getUsageAlert(limits?.usage?.monthly || 0, limits?.effectiveLimits?.monthly || 0);
              return alert ? (
                <div className={`flex items-center gap-1 mt-1 text-xs ${alert.className}`}>
                  <AlertTriangle className="h-3 w-3" />
                  {alert.text}
                </div>
              ) : null;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Activity Tab - Real data from transfers, checkouts, and mandate executions
function ActivityTab({ agentId }: { agentId: string }) {
  const api = useApiClient();

  // Fetch transfers initiated by this agent
  const { data: transfersData, isLoading: transfersLoading } = useTanstackQuery({
    queryKey: ['activity-transfers', agentId],
    queryFn: async () => {
      if (!api) return [];
      const result = await api.transfers.list({ initiated_by_id: agentId, limit: 50 } as any);
      const raw = result as any;
      return Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.data?.data) ? raw.data.data : []);
    },
    enabled: !!api,
  });

  // Fetch ACP checkouts
  const { data: acpData, isLoading: acpLoading } = useTanstackQuery({
    queryKey: ['activity-acp', agentId],
    queryFn: async () => {
      if (!api) return [];
      const result = await api.acp.list({ agent_id: agentId, limit: 50 });
      const raw = result as any;
      return Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.data?.data) ? raw.data.data : []);
    },
    enabled: !!api,
  });

  // Fetch UCP checkouts
  const { data: ucpData, isLoading: ucpLoading } = useTanstackQuery({
    queryKey: ['activity-ucp', agentId],
    queryFn: async () => {
      if (!api) return [];
      const result = await api.ucp.checkouts.list({ agent_id: agentId, limit: 50 });
      const raw = result as any;
      return Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.data?.data) ? raw.data.data : []);
    },
    enabled: !!api,
  });

  const isLoading = transfersLoading || acpLoading || ucpLoading;

  // Map real data to AgentAction format
  const activities: AgentAction[] = [];

  // Map transfers
  (transfersData || []).forEach((tx: any) => {
    const isMandateExec = tx.protocol_metadata?.operation === 'mandate_execution' || tx.protocolMetadata?.operation === 'mandate_execution';
    activities.push({
      id: tx.id,
      timestamp: tx.createdAt || tx.created_at,
      type: 'transfer',
      status: tx.status === 'completed' ? 'success' : tx.status === 'failed' ? 'failed' : 'pending',
      description: tx.description || `${tx.type} transfer`,
      details: {
        amount: parseFloat(tx.amount) || 0,
        currency: tx.currency || 'USDC',
        recipient: tx.to?.accountName || tx.to_account_name || undefined,
        reference: tx.id?.slice(0, 12),
      },
      reasoning: isMandateExec
        ? `Executed under mandate ${(tx.protocol_metadata?.mandate_id || tx.protocolMetadata?.mandate_id || '').slice(0, 12)}. Funds deducted from wallet.`
        : undefined,
    });
  });

  // Map ACP checkouts
  (acpData || []).forEach((c: any) => {
    activities.push({
      id: c.id,
      timestamp: c.created_at || c.createdAt,
      type: 'transfer',
      status: c.status === 'completed' ? 'success' : c.status === 'cancelled' ? 'failed' : 'pending',
      description: c.merchant_name || c.checkout_id || 'ACP Checkout',
      details: {
        amount: parseFloat(c.total_amount || c.totalAmount || 0),
        currency: c.currency || 'USD',
        reference: c.checkout_id || c.id?.slice(0, 12),
      },
    });
  });

  // Map UCP checkouts
  (ucpData || []).forEach((s: any) => {
    activities.push({
      id: s.id,
      timestamp: s.created_at || s.createdAt,
      type: 'transfer',
      status: s.status === 'completed' ? 'success' : s.status === 'canceled' ? 'failed' : 'pending',
      description: s.metadata?.merchant_name || s.line_items?.[0]?.name || 'UCP Checkout',
      details: {
        amount: (s.totals?.find((t: any) => t.type === 'total')?.amount ?? 0) / 100,
        currency: s.currency || 'USD',
        reference: s.id?.slice(0, 12),
      },
    });
  });

  // Sort by most recent
  activities.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

  return (
    <div className="space-y-6">
      {/* Activity Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-2xl p-6 border border-purple-200 dark:border-purple-900">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Agent Activity Log</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              All actions performed by this agent — transfers, checkouts, and mandate executions.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
      ) : (
        <AgentActivityFeed activities={activities} showFilters={true} />
      )}
    </div>
  );
}
