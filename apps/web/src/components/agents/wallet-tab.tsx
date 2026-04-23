'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery as useTanstackQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient, useApiFetch, useApiConfig } from '@/lib/api-client';
import { usePagination } from '@/hooks/usePagination';
import { toast } from 'sonner';
import {
  Copy,
  Snowflake,
  Play,
  Pencil,
  Save,
  X,
  Plus,
  Info,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import {
  Badge,
  Button,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sly/ui';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

interface WalletTabProps {
  agentId: string;
}

// ─── Helpers ────────────────────────────────────────────

function truncateAddress(addr: string) {
  if (!addr || addr.length < 12) return addr || '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard');
}

function decisionBadge(decision: string) {
  switch (decision?.toLowerCase()) {
    case 'approve':
    case 'approved':
      return <Badge variant="success">Approve</Badge>;
    case 'escalate':
    case 'escalated':
      return <Badge variant="warning">Escalate</Badge>;
    case 'deny':
    case 'denied':
      return <Badge variant="error">Deny</Badge>;
    default:
      return <Badge variant="outline">{decision || '—'}</Badge>;
  }
}

// ─── Main Component ─────────────────────────────────────

export function WalletTab({ agentId }: WalletTabProps) {
  const api = useApiClient();

  // ── Wallet data ──
  // Fetches the full wallet envelope for this agent. We render every entry
  // in `all_wallets` uniformly so the Wallet tab looks the same across
  // agents regardless of which wallet types they have provisioned.
  const { data: walletData, isLoading: walletLoading } = useTanstackQuery({
    queryKey: ['agent-wallet', agentId],
    queryFn: async () => {
      if (!api) return null;
      const raw: any = await api.agents.getWallet(agentId);
      const unwrapped = raw?.data?.data ?? raw?.data ?? raw;
      if (!unwrapped || (typeof unwrapped === 'object' && unwrapped.data === null)) return null;
      return unwrapped;
    },
    enabled: !!api,
  });

  const allWallets: any[] = walletData?.all_wallets || (walletData?.id ? [walletData] : []);
  const primaryCustodialWallet = walletData?.id && walletData?.wallet_type !== 'agent_eoa' ? walletData : null;

  // ── Exposures data ──
  const { data: exposuresData, isLoading: exposuresLoading } = useTanstackQuery({
    queryKey: ['agent-exposures', agentId],
    queryFn: async () => {
      if (!api) return [];
      const raw = await api.agents.getExposures(agentId);
      const d = raw?.data?.data || raw?.data || raw;
      return Array.isArray(d) ? d : (d?.exposures || []);
    },
    enabled: !!api,
  });

  // ── Evaluations data ──
  const [evalPage, setEvalPage] = useState(1);
  const [decisionFilter, setDecisionFilter] = useState<string>('all');

  const { data: evaluationsRaw, isLoading: evalsLoading } = useTanstackQuery({
    queryKey: ['agent-evaluations', agentId, evalPage],
    queryFn: async () => {
      if (!api) return { data: [], total: 0 };
      const raw = await api.agents.getEvaluations(agentId, { page: evalPage, limit: 20 });
      const d = raw?.data?.data || raw?.data || raw;
      const items = Array.isArray(d) ? d : (d?.evaluations || d?.data || []);
      const total = d?.pagination?.total || d?.total || items.length;
      return { data: items, total };
    },
    enabled: !!api,
  });

  const evaluations = evaluationsRaw?.data || [];
  const evalTotal = evaluationsRaw?.total || 0;

  const pagination = usePagination({
    totalItems: evalTotal,
    initialPageSize: 20,
    initialPage: 1,
  });

  // Sync pagination page with evalPage
  const handleNextPage = () => { setEvalPage(p => p + 1); pagination.nextPage(); };
  const handlePrevPage = () => { setEvalPage(p => Math.max(1, p - 1)); pagination.prevPage(); };

  const filteredEvaluations = decisionFilter === 'all'
    ? evaluations
    : evaluations.filter((e: any) => e.decision?.toLowerCase() === decisionFilter);

  if (walletLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tenant master balance strip — preflight visibility before users
          enable auto-refill or trigger a fund-eoa call. */}
      <CircleMasterBalanceStrip />

      {/* Unified wallet list — every wallet this agent manages renders
          through the same card component, regardless of type. Cards link
          through to /dashboard/wallets/[id] (same destination as the main
          list), so Deposit/Withdraw/Freeze/Balance behave identically. */}
      <AgentWalletsGrid agentId={agentId} wallets={allWallets} />

      {/* Contract policy config — only when the agent has a custodial wallet
          that accepts on-ledger policies. EOAs govern spend via KYA limits
          and auto-refill config (shown inline on the EOA card itself), not
          via the off-chain spending_policy JSON. */}
      {primaryCustodialWallet && (
        <ContractPolicyConfig wallet={primaryCustodialWallet} agentId={agentId} />
      )}

      {/* Counterparty Exposures */}
      <ExposuresTable exposures={exposuresData || []} isLoading={exposuresLoading} />

      {/* Policy Evaluations */}
      <EvaluationsLog
        evaluations={filteredEvaluations}
        isLoading={evalsLoading}
        decisionFilter={decisionFilter}
        onFilterChange={setDecisionFilter}
        page={evalPage}
        totalPages={Math.max(1, Math.ceil(evalTotal / 20))}
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
      />
    </div>
  );
}

// ─── Unified Agent Wallets Grid ────────────────────────
// Renders every wallet an agent owns through the same card shell. Type-
// specific details (on-chain balance + auto-refill for EOAs, freeze for
// custodial, etc.) fold into the shared layout instead of branching into
// bespoke components, so the Wallet tab looks the same across agents.

function AgentWalletsGrid({ agentId, wallets }: { agentId: string; wallets: any[] }) {
  if (!wallets || wallets.length === 0) {
    return <AgentEmptyWalletsCta agentId={agentId} />;
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {wallets.map((w) => (
        <AgentWalletCard key={w.id} wallet={w} agentId={agentId} />
      ))}
    </div>
  );
}

function AgentEmptyWalletsCta({ agentId }: { agentId: string }) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const provisionMutation = useMutation({
    mutationFn: async () => {
      if (!api) throw new Error('API not initialized');
      return api.agents.provisionEvmKey(agentId);
    },
    onSuccess: () => {
      toast.success('EVM signing key provisioned');
      queryClient.invalidateQueries({ queryKey: ['agent-wallet', agentId] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to provision key'),
  });
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-center">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        This agent has no wallets provisioned in this environment.
      </div>
      <Button
        size="sm"
        onClick={() => provisionMutation.mutate()}
        disabled={provisionMutation.isPending}
      >
        {provisionMutation.isPending ? 'Provisioning…' : 'Provision x402 signing key'}
      </Button>
    </div>
  );
}

// Type-aware labels for card header & subtitle.
function walletTypeLabels(wallet: any): { title: string; subtitle: string } {
  const env = wallet.environment === 'live' ? 'Base mainnet' : 'Base Sepolia';
  switch (wallet.wallet_type) {
    case 'agent_eoa':
      return {
        title: wallet.name || 'x402 signing EOA',
        subtitle: `External x402 signing · ${env}`,
      };
    case 'circle_custodial':
      return {
        title: wallet.name || 'Circle Custodial Wallet',
        subtitle: 'Circle-managed off-chain balance',
      };
    case 'internal':
      return {
        title: wallet.name || 'Sly Internal Wallet',
        subtitle: 'Sly-internal ledger (no on-chain presence)',
      };
    case 'tempo':
      return {
        title: wallet.name || 'Tempo Wallet',
        subtitle: 'Tempo MPP streaming wallet',
      };
    case 'smart_wallet':
      return {
        title: wallet.name || 'Smart Wallet',
        subtitle: `Coinbase Smart Wallet (ERC-4337) · ${env}`,
      };
    default:
      return {
        title: wallet.name || 'Wallet',
        subtitle: wallet.purpose || wallet.wallet_type || '',
      };
  }
}

function AgentWalletCard({ wallet, agentId }: { wallet: any; agentId: string }) {
  const api = useApiClient();
  const apiFetch = useApiFetch();
  const { apiUrl } = useApiConfig();
  const queryClient = useQueryClient();
  const { title, subtitle } = walletTypeLabels(wallet);
  const isAgentEoa = wallet.wallet_type === 'agent_eoa';
  const isCircle = wallet.wallet_type === 'circle_custodial';
  const isFrozen = wallet.status === 'frozen';
  const address: string | null = wallet.wallet_address || wallet.address || null;
  const scanBase = wallet.environment === 'live' ? 'https://basescan.org' : 'https://sepolia.basescan.org';

  // For EOAs: poll on-chain USDC directly. For everything else: use the
  // wallets balance endpoint (which syncs from Circle / whatever upstream).
  const { data: onchainUsdc, refetch: refetchBalance, isFetching } = useTanstackQuery({
    queryKey: ['agent-wallet-balance', wallet.id, address, wallet.environment],
    queryFn: async () => {
      if (!address) return parseFloat(wallet.balance ?? 0);
      if (isAgentEoa) {
        const rpc = wallet.environment === 'live' ? 'https://mainnet.base.org' : 'https://sepolia.base.org';
        const usdc = wallet.environment === 'live'
          ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
          : '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
        const data = `0x70a08231000000000000000000000000${address.slice(2).toLowerCase()}`;
        const res = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: usdc, data }, 'latest'] }),
        });
        const json = await res.json();
        if (!json.result) return null;
        return parseInt(json.result, 16) / 1e6;
      }
      // Non-EOA: hit the wallets balance endpoint
      const res = await apiFetch(`${apiUrl}/v1/wallets/${wallet.id}/balance`);
      if (!res.ok) return parseFloat(wallet.balance ?? 0);
      const body = await res.json();
      const onChain = body?.data?.onChain?.usdc;
      return onChain != null ? parseFloat(onChain) : parseFloat(body?.data?.balance ?? 0);
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const freezeMutation = useMutation({
    mutationFn: async () => {
      if (!api) throw new Error('API not initialized');
      return isFrozen ? api.agents.unfreezeWallet(agentId) : api.agents.freezeWallet(agentId);
    },
    onSuccess: () => {
      toast.success(isFrozen ? 'Wallet unfrozen' : 'Wallet frozen');
      queryClient.invalidateQueries({ queryKey: ['agent-wallet', agentId] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update wallet status'),
  });

  const handleFreezeToggle = () => {
    const action = isFrozen ? 'unfreeze' : 'freeze';
    if (!confirm(`Are you sure you want to ${action} this wallet?`)) return;
    freezeMutation.mutate();
  };

  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
      {isFrozen && (
        <div className="mb-4 -mt-2 -mx-2 px-4 py-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Wallet is frozen — all transactions are blocked</span>
        </div>
      )}

      <div className="flex items-start justify-between mb-1">
        <div className="min-w-0">
          <Link
            href={`/dashboard/wallets/${wallet.id}`}
            className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {title}
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="outline" className="text-[10px]">{wallet.wallet_type}</Badge>
          <Badge variant={isFrozen ? 'warning' : 'success'}>{wallet.status || 'active'}</Badge>
          {(isAgentEoa || isCircle) && (
            <button
              onClick={() => refetchBalance()}
              disabled={isFetching}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              title="Refresh balance"
            >
              <RefreshCwIcon className={isFetching ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{subtitle}</p>

      {/* Balance */}
      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          {isAgentEoa ? 'On-chain USDC' : 'Balance'}
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {onchainUsdc == null
            ? '—'
            : formatCurrency(onchainUsdc, wallet.currency || 'USDC')}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {wallet.currency || 'USDC'}
          {isAgentEoa && address && ' · live from chain'}
        </div>
      </div>

      {/* Address block — for any wallet with an on-chain address */}
      {address && !address.startsWith('internal://') && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Address</div>
            <a
              href={`${scanBase}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View ↗
            </a>
          </div>
          <div className="flex items-center justify-between gap-2">
            <code className="font-mono text-xs text-gray-900 dark:text-white truncate">{truncateAddress(address)}</code>
            <button
              onClick={() => copyToClipboard(address)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex-shrink-0"
              title="Copy full address"
            >
              <Copy className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Auto-refill config lives with the EOA since that's the wallet it
          operates on. Circle custodial wallets use their own spending policy
          instead (rendered in ContractPolicyConfig below the grid). */}
      {isAgentEoa && (
        <div className="mb-4">
          <AutoRefillPanel agentId={agentId} onchainUsdc={onchainUsdc ?? null} />
        </div>
      )}

      {/* Actions */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <Link
          href={`/dashboard/wallets/${wallet.id}`}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Open detail →
        </Link>
        {isCircle && (
          <Button
            variant={isFrozen ? 'default' : 'outline'}
            size="sm"
            onClick={handleFreezeToggle}
            disabled={freezeMutation.isPending}
            className={!isFrozen ? 'text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950' : ''}
          >
            {isFrozen ? (
              <>
                <Play className="h-4 w-4 mr-1" />
                {freezeMutation.isPending ? 'Unfreezing…' : 'Unfreeze'}
              </>
            ) : (
              <>
                <Snowflake className="h-4 w-4 mr-1" />
                {freezeMutation.isPending ? 'Freezing…' : 'Freeze'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function RefreshCwIcon({ className }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 text-gray-400 ${className || ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

// ─── Section A: Wallet Overview Card (legacy, kept for reference) ─────

function WalletOverviewCard({ wallet, agentId }: { wallet: any; agentId: string }) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const isFrozen = wallet.status === 'frozen';

  const freezeMutation = useMutation({
    mutationFn: async () => {
      if (!api) throw new Error('API not initialized');
      return isFrozen
        ? api.agents.unfreezeWallet(agentId)
        : api.agents.freezeWallet(agentId);
    },
    onSuccess: () => {
      toast.success(isFrozen ? 'Wallet unfrozen' : 'Wallet frozen');
      queryClient.invalidateQueries({ queryKey: ['agent-wallet', agentId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update wallet status');
    },
  });

  const handleFreezeToggle = () => {
    const action = isFrozen ? 'unfreeze' : 'freeze';
    if (!confirm(`Are you sure you want to ${action} this wallet?`)) return;
    freezeMutation.mutate();
  };

  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
      {/* Frozen banner */}
      {isFrozen && (
        <div className="mb-4 -mt-2 -mx-2 px-4 py-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Wallet is frozen — all transactions are blocked</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Circle Custodial Wallet</h3>
        <Badge variant={isFrozen ? 'warning' : 'success'}>
          {wallet.status || 'active'}
        </Badge>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Circle-managed off-chain balance. Separate from the on-chain x402 EOA above.
      </p>

      {/* Balance */}
      <div className="mb-6">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Balance</div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          {formatCurrency(wallet.balance ?? 0, wallet.currency || 'USDC')}
        </div>
        <div className="text-sm text-gray-400 mt-0.5">
          {wallet.currency || 'USDC'} &middot; {wallet.network || 'base'}
        </div>
      </div>

      {/* Details */}
      <dl className="space-y-3 text-sm">
        {wallet.name && (
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Name</dt>
            <dd className="text-gray-900 dark:text-white font-medium">{wallet.name}</dd>
          </div>
        )}
        {wallet.purpose && (
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-gray-400">Purpose</dt>
            <dd className="text-gray-900 dark:text-white">{wallet.purpose}</dd>
          </div>
        )}
        {(wallet.address || wallet.wallet_address) && (
          <div className="flex justify-between items-center">
            <dt className="text-gray-500 dark:text-gray-400">Address</dt>
            <dd className="flex items-center gap-1.5">
              <code className="font-mono text-xs text-gray-900 dark:text-white">
                {truncateAddress(wallet.address || wallet.wallet_address)}
              </code>
              <button
                onClick={() => copyToClipboard(wallet.address || wallet.wallet_address)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <Copy className="h-3 w-3 text-gray-400" />
              </button>
            </dd>
          </div>
        )}
      </dl>

      {/* Freeze / Unfreeze */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
        <Button
          variant={isFrozen ? 'default' : 'outline'}
          size="sm"
          onClick={handleFreezeToggle}
          disabled={freezeMutation.isPending}
          className={!isFrozen ? 'text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950' : ''}
        >
          {isFrozen ? (
            <>
              <Play className="h-4 w-4 mr-1" />
              {freezeMutation.isPending ? 'Unfreezing...' : 'Unfreeze Wallet'}
            </>
          ) : (
            <>
              <Snowflake className="h-4 w-4 mr-1" />
              {freezeMutation.isPending ? 'Freezing...' : 'Freeze Wallet'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Section B: Contract Policy Config ──────────────────

interface PolicyFormData {
  counterpartyBlocklist: string[];
  counterpartyAllowlist: string[];
  minCounterpartyKyaTier: string;
  allowedContractTypes: string[];
  blockedContractTypes: string[];
  maxExposure24h: string;
  maxExposure7d: string;
  maxExposure30d: string;
  maxActiveContracts: string;
  maxActiveEscrows: string;
  escalationThreshold: string;
}

function extractPolicy(wallet: any): PolicyFormData {
  const p = wallet.contractPolicy || wallet.contract_policy || wallet.policy || {};
  return {
    counterpartyBlocklist: p.counterpartyBlocklist || p.counterparty_blocklist || [],
    counterpartyAllowlist: p.counterpartyAllowlist || p.counterparty_allowlist || [],
    minCounterpartyKyaTier: (p.minCounterpartyKyaTier ?? p.min_counterparty_kya_tier ?? '').toString(),
    allowedContractTypes: p.allowedContractTypes || p.allowed_contract_types || [],
    blockedContractTypes: p.blockedContractTypes || p.blocked_contract_types || [],
    maxExposure24h: (p.maxExposure24h ?? p.max_exposure_24h ?? '').toString(),
    maxExposure7d: (p.maxExposure7d ?? p.max_exposure_7d ?? '').toString(),
    maxExposure30d: (p.maxExposure30d ?? p.max_exposure_30d ?? '').toString(),
    maxActiveContracts: (p.maxActiveContracts ?? p.max_active_contracts ?? '').toString(),
    maxActiveEscrows: (p.maxActiveEscrows ?? p.max_active_escrows ?? '').toString(),
    escalationThreshold: (p.escalationThreshold ?? p.escalation_threshold ?? '').toString(),
  };
}

function ContractPolicyConfig({ wallet, agentId }: { wallet: any; agentId: string }) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<PolicyFormData>(() => extractPolicy(wallet));

  // Tag input state
  const [newBlocklistEntry, setNewBlocklistEntry] = useState('');
  const [newAllowlistEntry, setNewAllowlistEntry] = useState('');
  const [newAllowedType, setNewAllowedType] = useState('');
  const [newBlockedType, setNewBlockedType] = useState('');

  const resetForm = useCallback(() => {
    setFormData(extractPolicy(wallet));
  }, [wallet]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!api) throw new Error('API not initialized');
      const policy: any = {};

      if (formData.counterpartyBlocklist.length > 0) policy.counterpartyBlocklist = formData.counterpartyBlocklist;
      if (formData.counterpartyAllowlist.length > 0) policy.counterpartyAllowlist = formData.counterpartyAllowlist;
      if (formData.minCounterpartyKyaTier) policy.minCounterpartyKyaTier = parseInt(formData.minCounterpartyKyaTier);
      if (formData.allowedContractTypes.length > 0) policy.allowedContractTypes = formData.allowedContractTypes;
      if (formData.blockedContractTypes.length > 0) policy.blockedContractTypes = formData.blockedContractTypes;
      if (formData.maxExposure24h) policy.maxExposure24h = parseFloat(formData.maxExposure24h);
      if (formData.maxExposure7d) policy.maxExposure7d = parseFloat(formData.maxExposure7d);
      if (formData.maxExposure30d) policy.maxExposure30d = parseFloat(formData.maxExposure30d);
      if (formData.maxActiveContracts) policy.maxActiveContracts = parseInt(formData.maxActiveContracts);
      if (formData.maxActiveEscrows) policy.maxActiveEscrows = parseInt(formData.maxActiveEscrows);
      if (formData.escalationThreshold) policy.escalationThreshold = parseFloat(formData.escalationThreshold);

      return api.agents.setWalletPolicy(agentId, policy);
    },
    onSuccess: () => {
      toast.success('Contract policy updated');
      queryClient.invalidateQueries({ queryKey: ['agent-wallet', agentId] });
      setIsEditing(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update policy');
    },
  });

  const handleCancel = () => {
    resetForm();
    setIsEditing(false);
  };

  // Tag helpers
  const addTag = (field: keyof PolicyFormData, value: string, setter: (v: string) => void) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const current = formData[field] as string[];
    if (!current.includes(trimmed)) {
      setFormData(prev => ({ ...prev, [field]: [...(prev[field] as string[]), trimmed] }));
    }
    setter('');
  };

  const removeTag = (field: keyof PolicyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: (prev[field] as string[]).filter(v => v !== value) }));
  };

  const policy = extractPolicy(wallet);
  const hasPolicy = Object.values(policy).some(v =>
    Array.isArray(v) ? v.length > 0 : v !== '' && v !== '0'
  );

  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contract Policy</h3>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {/* Read-only summary */}
      {!isEditing && (
        <div className="space-y-3 text-sm">
          {!hasPolicy && (
            <p className="text-gray-400 dark:text-gray-500">No contract policy configured. Click Edit to set one up.</p>
          )}
          {policy.counterpartyBlocklist.length > 0 && (
            <PolicyRow label="Blocklist">
              <TagList items={policy.counterpartyBlocklist} color="red" />
            </PolicyRow>
          )}
          {policy.counterpartyAllowlist.length > 0 && (
            <PolicyRow label="Allowlist">
              <TagList items={policy.counterpartyAllowlist} color="green" />
            </PolicyRow>
          )}
          {policy.minCounterpartyKyaTier && policy.minCounterpartyKyaTier !== '0' && (
            <PolicyRow label="Min KYA Tier">
              <span className="font-medium">{policy.minCounterpartyKyaTier}</span>
            </PolicyRow>
          )}
          {policy.allowedContractTypes.length > 0 && (
            <PolicyRow label="Allowed Types">
              <TagList items={policy.allowedContractTypes} color="blue" />
            </PolicyRow>
          )}
          {policy.blockedContractTypes.length > 0 && (
            <PolicyRow label="Blocked Types">
              <TagList items={policy.blockedContractTypes} color="red" />
            </PolicyRow>
          )}
          {policy.maxExposure24h && policy.maxExposure24h !== '0' && (
            <PolicyRow label="Max 24h Exposure">
              <span className="font-medium">${parseFloat(policy.maxExposure24h).toLocaleString()}</span>
            </PolicyRow>
          )}
          {policy.maxExposure7d && policy.maxExposure7d !== '0' && (
            <PolicyRow label="Max 7d Exposure">
              <span className="font-medium">${parseFloat(policy.maxExposure7d).toLocaleString()}</span>
            </PolicyRow>
          )}
          {policy.maxExposure30d && policy.maxExposure30d !== '0' && (
            <PolicyRow label="Max 30d Exposure">
              <span className="font-medium">${parseFloat(policy.maxExposure30d).toLocaleString()}</span>
            </PolicyRow>
          )}
          {policy.maxActiveContracts && policy.maxActiveContracts !== '0' && (
            <PolicyRow label="Max Active Contracts">
              <span className="font-medium">{policy.maxActiveContracts}</span>
            </PolicyRow>
          )}
          {policy.maxActiveEscrows && policy.maxActiveEscrows !== '0' && (
            <PolicyRow label="Max Active Escrows">
              <span className="font-medium">{policy.maxActiveEscrows}</span>
            </PolicyRow>
          )}
          {policy.escalationThreshold && policy.escalationThreshold !== '0' && (
            <PolicyRow label="Escalation Threshold">
              <span className="font-medium">${parseFloat(policy.escalationThreshold).toLocaleString()}</span>
            </PolicyRow>
          )}
        </div>
      )}

      {/* Edit mode */}
      {isEditing && (
        <div className="space-y-5">
          {/* Counterparty Blocklist */}
          <TagInputField
            label="Counterparty Blocklist"
            hint="Block specific counterparties from transacting"
            items={formData.counterpartyBlocklist}
            value={newBlocklistEntry}
            onChange={setNewBlocklistEntry}
            onAdd={() => addTag('counterpartyBlocklist', newBlocklistEntry, setNewBlocklistEntry)}
            onRemove={(v) => removeTag('counterpartyBlocklist', v)}
            placeholder="Agent ID or address"
          />

          {/* Counterparty Allowlist */}
          <TagInputField
            label="Counterparty Allowlist"
            hint="Only allow these counterparties (leave empty for all)"
            items={formData.counterpartyAllowlist}
            value={newAllowlistEntry}
            onChange={setNewAllowlistEntry}
            onAdd={() => addTag('counterpartyAllowlist', newAllowlistEntry, setNewAllowlistEntry)}
            onRemove={(v) => removeTag('counterpartyAllowlist', v)}
            placeholder="Agent ID or address"
          />

          {/* Min KYA Tier */}
          <div>
            <Label className="text-sm font-medium">Min Counterparty KYA Tier</Label>
            <Input
              type="number"
              min="0"
              max="3"
              placeholder="0"
              value={formData.minCounterpartyKyaTier}
              onChange={(e) => setFormData(prev => ({ ...prev, minCounterpartyKyaTier: e.target.value }))}
              className="mt-1 max-w-[100px]"
            />
          </div>

          {/* Contract Types */}
          <TagInputField
            label="Allowed Contract Types"
            hint="Restrict to specific contract types"
            items={formData.allowedContractTypes}
            value={newAllowedType}
            onChange={setNewAllowedType}
            onAdd={() => addTag('allowedContractTypes', newAllowedType, setNewAllowedType)}
            onRemove={(v) => removeTag('allowedContractTypes', v)}
            placeholder="e.g., escrow, mandate"
          />

          <TagInputField
            label="Blocked Contract Types"
            hint="Block specific contract types"
            items={formData.blockedContractTypes}
            value={newBlockedType}
            onChange={setNewBlockedType}
            onAdd={() => addTag('blockedContractTypes', newBlockedType, setNewBlockedType)}
            onRemove={(v) => removeTag('blockedContractTypes', v)}
            placeholder="e.g., stream"
          />

          {/* Exposure Caps */}
          <div>
            <div className="text-sm font-medium mb-3">Exposure Caps</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <NumberInput
                label="Max 24h"
                value={formData.maxExposure24h}
                onChange={(v) => setFormData(prev => ({ ...prev, maxExposure24h: v }))}
                prefix="$"
              />
              <NumberInput
                label="Max 7d"
                value={formData.maxExposure7d}
                onChange={(v) => setFormData(prev => ({ ...prev, maxExposure7d: v }))}
                prefix="$"
              />
              <NumberInput
                label="Max 30d"
                value={formData.maxExposure30d}
                onChange={(v) => setFormData(prev => ({ ...prev, maxExposure30d: v }))}
                prefix="$"
              />
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <NumberInput
              label="Max Active Contracts"
              value={formData.maxActiveContracts}
              onChange={(v) => setFormData(prev => ({ ...prev, maxActiveContracts: v }))}
            />
            <NumberInput
              label="Max Active Escrows"
              value={formData.maxActiveEscrows}
              onChange={(v) => setFormData(prev => ({ ...prev, maxActiveEscrows: v }))}
            />
            <NumberInput
              label="Escalation Threshold"
              value={formData.escalationThreshold}
              onChange={(v) => setFormData(prev => ({ ...prev, escalationThreshold: v }))}
              prefix="$"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Save Policy
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section C: Counterparty Exposures Table ────────────

function ExposuresTable({ exposures, isLoading }: { exposures: any[]; isLoading: boolean }) {
  const [sortField, setSortField] = useState<string>('volume_30d');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sorted = [...exposures].sort((a, b) => {
    const av = a[sortField] ?? 0;
    const bv = b[sortField] ?? 0;
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer select-none hover:text-gray-900 dark:hover:text-white"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
        )}
      </span>
    </TableHead>
  );

  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Counterparty Exposures</h3>

      {isLoading ? (
        <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      ) : exposures.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-4">No counterparty exposure data available.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Counterparty</TableHead>
                <SortHeader field="volume_24h">24h</SortHeader>
                <SortHeader field="volume_7d">7d</SortHeader>
                <SortHeader field="volume_30d">30d</SortHeader>
                <SortHeader field="active_contracts">Contracts</SortHeader>
                <SortHeader field="active_escrows">Escrows</SortHeader>
                <SortHeader field="total_volume">Total Vol.</SortHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((exp: any, idx: number) => (
                <TableRow key={exp.counterparty_id || exp.counterpartyId || idx}>
                  <TableCell className="font-mono text-xs">
                    {truncateAddress(exp.counterparty_id || exp.counterpartyId || exp.address || '—')}
                  </TableCell>
                  <TableCell>{formatCurrency(exp.volume_24h ?? exp.exposure24h ?? 0)}</TableCell>
                  <TableCell>{formatCurrency(exp.volume_7d ?? exp.exposure7d ?? 0)}</TableCell>
                  <TableCell>{formatCurrency(exp.volume_30d ?? exp.exposure30d ?? 0)}</TableCell>
                  <TableCell>{exp.active_contracts ?? exp.activeContracts ?? 0}</TableCell>
                  <TableCell>{exp.active_escrows ?? exp.activeEscrows ?? 0}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(exp.total_volume ?? exp.totalVolume ?? 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Section D: Policy Evaluations Log ──────────────────

function EvaluationsLog({
  evaluations,
  isLoading,
  decisionFilter,
  onFilterChange,
  page,
  totalPages,
  onNextPage,
  onPrevPage,
}: {
  evaluations: any[];
  isLoading: boolean;
  decisionFilter: string;
  onFilterChange: (v: string) => void;
  page: number;
  totalPages: number;
  onNextPage: () => void;
  onPrevPage: () => void;
}) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Policy Evaluations</h3>
        <div className="flex gap-1">
          {['all', 'approve', 'escalate', 'deny'].map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                decisionFilter === f
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      ) : evaluations.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-4">No policy evaluations recorded yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Counterparty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((ev: any, idx: number) => {
                  const rowId = ev.id || `eval-${idx}`;
                  const isExpanded = expandedRow === rowId;
                  const reasons = ev.decision_reasons || ev.decisionReasons || [];
                  const checks = ev.checks_performed || ev.checksPerformed || [];
                  const hasDetails = reasons.length > 0 || checks.length > 0;

                  return (
                    <>
                      <TableRow
                        key={rowId}
                        className={hasDetails ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900' : ''}
                        onClick={() => hasDetails && setExpandedRow(isExpanded ? null : rowId)}
                      >
                        <TableCell className="w-8 pr-0">
                          {hasDetails && (
                            isExpanded
                              ? <ChevronDown className="h-4 w-4 text-gray-400" />
                              : <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                          {ev.created_at || ev.createdAt
                            ? formatRelativeTime(ev.created_at || ev.createdAt)
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {ev.action_type || ev.actionType || ev.action || '—'}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {ev.amount != null ? formatCurrency(ev.amount, ev.currency) : '—'}
                        </TableCell>
                        <TableCell>
                          {decisionBadge(ev.decision)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {truncateAddress(ev.counterparty_id || ev.counterpartyId || ev.counterparty || '')}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${rowId}-detail`}>
                          <TableCell colSpan={6} className="bg-gray-50 dark:bg-gray-900 px-6 py-3">
                            {reasons.length > 0 && (
                              <div className="mb-2">
                                <div className="text-xs font-medium text-gray-500 mb-1">Reasons</div>
                                <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-0.5">
                                  {reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
                                </ul>
                              </div>
                            )}
                            {checks.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-gray-500 mb-1">Checks Performed</div>
                                <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-0.5">
                                  {checks.map((c: string, i: number) => <li key={i}>{c}</li>)}
                                </ul>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onPrevPage} disabled={page <= 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={onNextPage} disabled={page >= totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Shared sub-components ──────────────────────────────

function PolicyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-t border-gray-100 dark:border-gray-800">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}

function TagList({ items, color }: { items: string[]; color: 'red' | 'green' | 'blue' }) {
  const colors = {
    red: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  };
  return (
    <div className="flex flex-wrap gap-1 justify-end">
      {items.map((item) => (
        <span key={item} className={`px-2 py-0.5 rounded text-xs ${colors[color]}`}>{item}</span>
      ))}
    </div>
  );
}

function TagInputField({
  label,
  hint,
  items,
  value,
  onChange,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  hint: string;
  items: string[];
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex flex-wrap gap-2 mt-2 mb-2">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
          >
            {item}
            <button type="button" onClick={() => onRemove(item)} className="hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
        />
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        {hint}
      </p>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
}) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <div className="relative mt-1">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{prefix}</span>
        )}
        <Input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={prefix ? 'pl-7' : ''}
        />
      </div>
    </div>
  );
}

// ─── External x402 EOA Card ─────────────────────────────
// Shows the agent's secp256k1 signing address used for paying external
// x402-protected services (e.g. agentic.market listings). Separate from
// the Circle custodial wallet above — these funds live on-chain and must
// be topped up by sending USDC directly to this address on Base.

const USDC_BASE_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

async function fetchOnchainUsdc(addr: string): Promise<number | null> {
  try {
    const data = `0x70a08231000000000000000000000000${addr.slice(2).toLowerCase()}`;
    const res = await fetch('https://mainnet.base.org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'eth_call',
        params: [{ to: USDC_BASE_MAINNET, data }, 'latest'],
      }),
    });
    const json = await res.json();
    if (!json.result) return null;
    return parseInt(json.result, 16) / 1e6;
  } catch {
    return null;
  }
}

function X402EoaCard({ agentId }: { agentId: string }) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  // Idempotent — returns existing key if present, creates one only on first call.
  const { data: keyData, isLoading: keyLoading } = useTanstackQuery({
    queryKey: ['agent-evm-key', agentId],
    queryFn: async () => {
      if (!api) return null;
      const raw: any = await api.agents.provisionEvmKey(agentId);
      return raw?.data || raw;
    },
    enabled: !!api,
    staleTime: 60_000,
  });

  const eoa: string | null = keyData?.ethereumAddress || null;

  const { data: onchainUsdc, isLoading: balanceLoading, refetch: refetchBalance } = useTanstackQuery({
    queryKey: ['agent-eoa-onchain-usdc', eoa],
    queryFn: () => (eoa ? fetchOnchainUsdc(eoa) : Promise.resolve(null)),
    enabled: !!eoa,
    refetchInterval: 30_000,
  });

  const provisionMutation = useMutation({
    mutationFn: async () => {
      if (!api) throw new Error('API not initialized');
      const raw: any = await api.agents.provisionEvmKey(agentId);
      return raw?.data || raw;
    },
    onSuccess: () => {
      toast.success('EVM signing key provisioned');
      queryClient.invalidateQueries({ queryKey: ['agent-evm-key', agentId] });
    },
    onError: (err: any) => toast.error(err.message || 'Failed to provision key'),
  });

  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">External x402 Signing Address</h3>
        <Badge variant="outline">EOA · Base mainnet</Badge>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        This is the on-chain address the agent uses to pay external x402 services (e.g. agentic.market).
        Separate from the Circle custodial wallet — fund it by sending USDC on the Base network.
      </p>

      {keyLoading ? (
        <div className="h-20 bg-gray-100 dark:bg-gray-900 rounded-lg animate-pulse" />
      ) : !eoa ? (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            No EVM key provisioned yet.
          </div>
          <Button
            size="sm"
            onClick={() => provisionMutation.mutate()}
            disabled={provisionMutation.isPending}
          >
            {provisionMutation.isPending ? 'Provisioning…' : 'Provision key'}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Address</div>
              <div className="flex items-center justify-between gap-2">
                <code className="font-mono text-sm text-gray-900 dark:text-white truncate">{truncateAddress(eoa)}</code>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => copyToClipboard(eoa)}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
                    title="Copy full address"
                  >
                    <Copy className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                  </button>
                  <a
                    href={`https://basescan.org/address/${eoa}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-1.5"
                  >
                    ↗
                  </a>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">On-chain USDC</div>
                <button
                  onClick={() => refetchBalance()}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  disabled={balanceLoading}
                >
                  {balanceLoading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {balanceLoading && onchainUsdc == null
                  ? '…'
                  : onchainUsdc == null
                    ? '—'
                    : formatCurrency(onchainUsdc, 'USDC')}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Live from Base mainnet RPC</div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg mb-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-200">
                <div className="font-medium mb-1">How to fund this address</div>
                <div className="text-blue-800 dark:text-blue-300">
                  Send USDC on the <strong>Base</strong> network to the address above, or
                  enable auto-refill below to top up automatically from the tenant&apos;s
                  Circle master wallet whenever the balance runs low.
                </div>
              </div>
            </div>
          </div>

          <AutoRefillPanel agentId={agentId} onchainUsdc={onchainUsdc ?? null} />
        </>
      )}
    </div>
  );
}

// ─── Auto-refill panel ─────────────────────────────────
// Configures threshold/target/daily cap and shows last run status. Refills
// flow Circle master → agent EOA and are bounded by KYA limits + a hard
// per-tick cap (see workers/agent-auto-refill.ts).

type AutoRefillPolicy = {
  enabled: boolean;
  threshold: number | null;
  target: number | null;
  dailyCap: number | null;
  dailySpent: number;
  dailyResetAt: string | null;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
};

function AutoRefillPanel({ agentId, onchainUsdc }: { agentId: string; onchainUsdc: number | null }) {
  const apiFetch = useApiFetch();
  const { apiUrl } = useApiConfig();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [threshold, setThreshold] = useState('0.20');
  const [target, setTarget] = useState('1.00');
  const [dailyCap, setDailyCap] = useState('5.00');

  const { data: policy, isLoading } = useTanstackQuery<AutoRefillPolicy | null>({
    queryKey: ['agent-auto-refill', agentId],
    queryFn: async () => {
      const res = await apiFetch(`${apiUrl}/v1/agents/${agentId}/auto-refill`);
      if (!res.ok) return null;
      const body = await res.json();
      return body.data || body;
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!policy) return;
    if (policy.threshold != null) setThreshold(String(policy.threshold));
    if (policy.target != null) setTarget(String(policy.target));
    if (policy.dailyCap != null) setDailyCap(String(policy.dailyCap));
    // Only hydrate from server once — edits stay local until saved
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy?.threshold, policy?.target, policy?.dailyCap]);

  const saveMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const body = enabled
        ? {
            enabled: true,
            threshold: parseFloat(threshold),
            target: parseFloat(target),
            dailyCap: parseFloat(dailyCap),
          }
        : { enabled: false };
      const res = await apiFetch(`${apiUrl}/v1/agents/${agentId}/auto-refill`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (_data, enabled) => {
      toast.success(enabled ? 'Auto-refill enabled' : 'Auto-refill disabled');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['agent-auto-refill', agentId] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to save policy'),
  });

  const enabled = !!policy?.enabled;
  const threshNum = parseFloat(threshold);
  const targetNum = parseFloat(target);
  const dailyCapNum = parseFloat(dailyCap);
  const valid =
    Number.isFinite(threshNum) && threshNum > 0 &&
    Number.isFinite(targetNum) && targetNum > threshNum &&
    Number.isFinite(dailyCapNum) && dailyCapNum > 0;

  const statusColor =
    policy?.lastStatus === 'ok'
      ? 'bg-green-50 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900'
      : policy?.lastStatus === 'master_underfunded' || policy?.lastStatus === 'capped'
        ? 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-900'
        : policy?.lastStatus
          ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900'
          : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800';

  const belowThreshold =
    onchainUsdc != null &&
    policy?.threshold != null &&
    onchainUsdc < policy.threshold;

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Auto-refill</h4>
            <Badge variant={enabled ? 'default' : 'outline'}>{enabled ? 'ON' : 'OFF'}</Badge>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Sly tops up this EOA from the tenant Circle master whenever USDC falls below threshold.
          </p>
        </div>
        {!editing && !isLoading && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            {enabled ? 'Edit' : 'Configure'}
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="ar-threshold" className="text-xs">Threshold (USDC)</Label>
              <Input
                id="ar-threshold"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="0.20"
              />
              <p className="text-xs text-gray-400 mt-1">Refill when below this</p>
            </div>
            <div>
              <Label htmlFor="ar-target" className="text-xs">Target (USDC)</Label>
              <Input
                id="ar-target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="1.00"
              />
              <p className="text-xs text-gray-400 mt-1">Refill up to this</p>
            </div>
            <div>
              <Label htmlFor="ar-daily-cap" className="text-xs">Daily cap (USDC)</Label>
              <Input
                id="ar-daily-cap"
                value={dailyCap}
                onChange={(e) => setDailyCap(e.target.value)}
                placeholder="5.00"
              />
              <p className="text-xs text-gray-400 mt-1">Max / UTC day</p>
            </div>
          </div>
          {!valid && (
            <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Target must be greater than threshold; all values must be positive numbers.
            </div>
          )}
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => saveMutation.mutate(false)}
              disabled={saveMutation.isPending || !enabled}
            >
              Turn off
            </Button>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => saveMutation.mutate(true)}
                disabled={!valid || saveMutation.isPending}
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                {saveMutation.isPending ? 'Saving…' : enabled ? 'Save' : 'Enable'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {enabled ? (
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Threshold</div>
                <div className="text-gray-900 dark:text-white">{formatCurrency(policy?.threshold ?? 0, 'USDC')}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Target</div>
                <div className="text-gray-900 dark:text-white">{formatCurrency(policy?.target ?? 0, 'USDC')}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Daily cap ({formatCurrency(policy?.dailySpent ?? 0, 'USDC')} used)
                </div>
                <div className="text-gray-900 dark:text-white">{formatCurrency(policy?.dailyCap ?? 0, 'USDC')}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Disabled. Enable to have Sly keep this EOA topped up automatically when it runs low.
            </div>
          )}

          {enabled && belowThreshold && (
            <div className="text-xs px-3 py-2 rounded-md bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900">
              Balance is below threshold — the next worker tick (within 5 minutes) will refill.
            </div>
          )}

          {policy?.lastStatus && (
            <div className={`text-xs px-3 py-2 rounded-md border ${statusColor}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Last run: {policy.lastStatus}</span>
                {policy.lastRunAt && <span>{formatRelativeTime(policy.lastRunAt)}</span>}
              </div>
              {policy.lastError && <div className="mt-1 text-xs opacity-80">{policy.lastError}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Circle master balance strip ───────────────────────
// Tenant-wide preflight — shows whether the Circle master wallet has enough
// USDC to service refills. If this is $0, both manual fund-eoa and
// auto-refill will be no-ops regardless of agent config.

function CircleMasterBalanceStrip() {
  const apiFetch = useApiFetch();
  const { apiUrl } = useApiConfig();

  const { data, isLoading, error } = useTanstackQuery({
    queryKey: ['circle-master-balance'],
    queryFn: async () => {
      const res = await apiFetch(`${apiUrl}/v1/agents/circle/master-balance`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ usdcAvailable: number; note?: string }>;
    },
    refetchInterval: 60_000,
    retry: 1,
  });

  const usdc = data?.usdcAvailable ?? null;
  const low = usdc != null && usdc < 5;

  return (
    <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`h-2 w-2 rounded-full ${
            error ? 'bg-red-500' : usdc == null ? 'bg-gray-300' : low ? 'bg-yellow-500' : 'bg-green-500'
          }`}
        />
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            Tenant Circle master · USDC available
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Funds all agent EOA top-ups (manual and auto-refill). Top up via Circle dashboard.
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-semibold text-gray-900 dark:text-white">
          {isLoading ? '…' : error ? '—' : usdc == null ? '—' : formatCurrency(usdc, 'USDC')}
        </div>
        {low && !error && (
          <div className="text-xs text-yellow-700 dark:text-yellow-400">Running low</div>
        )}
        {error && (
          <div className="text-xs text-red-600 dark:text-red-400">Circle unreachable</div>
        )}
      </div>
    </div>
  );
}
