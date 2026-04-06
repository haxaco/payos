/**
 * Wallet Router — purpose-based wallet selection for agents.
 *
 * Each agent can have multiple wallets (smart_wallet, circle, tempo, byow).
 * Each wallet has a 'purpose' tag: 'default', 'x402', 'mpp', 'treasury', 'byow'.
 * Payment endpoints call resolveWallet() with the required purpose;
 * the router tries an exact match first, then falls back to 'default'.
 *
 * This replaces the hardcoded wallet lookups scattered across route handlers.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ResolvedWallet {
  id: string;
  walletType: string;
  walletAddress: string | null;
  network: string;
  currency: string;
  balance: number;
  purpose: string;
  status: string;
  providerMetadata: Record<string, unknown> | null;
}

/**
 * Resolve the best wallet for an agent given a required purpose.
 *
 * Resolution order:
 * 1. Exact purpose match (e.g., purpose='mpp' for MPP payments)
 * 2. Fallback to purpose='default' (the agent's primary wallet)
 * 3. Fallback to any active wallet (last resort)
 *
 * Returns null if the agent has no active wallets at all.
 */
export async function resolveWallet(
  supabase: SupabaseClient,
  agentId: string,
  requiredPurpose?: string,
): Promise<ResolvedWallet | null> {
  const baseQuery = (purpose: string) =>
    supabase
      .from('wallets')
      .select('id, wallet_type, wallet_address, network, currency, balance, purpose, status, provider_metadata')
      .eq('managed_by_agent_id', agentId)
      .eq('purpose', purpose)
      .eq('status', 'active')
      .limit(1);

  // 1. Exact purpose match
  if (requiredPurpose && requiredPurpose !== 'default') {
    const { data } = await baseQuery(requiredPurpose);
    if (data && data.length > 0) return mapWallet(data[0]);
  }

  // 2. Fallback to default
  const { data: defaultData } = await baseQuery('default');
  if (defaultData && defaultData.length > 0) return mapWallet(defaultData[0]);

  // 3. Last resort — any active wallet
  const { data: anyData } = await supabase
    .from('wallets')
    .select('id, wallet_type, wallet_address, network, currency, balance, purpose, status, provider_metadata')
    .eq('managed_by_agent_id', agentId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1);
  if (anyData && anyData.length > 0) return mapWallet(anyData[0]);

  return null;
}

/**
 * List all wallets for an agent, ordered by purpose priority.
 */
export async function listAgentWallets(
  supabase: SupabaseClient,
  agentId: string,
): Promise<ResolvedWallet[]> {
  const { data } = await supabase
    .from('wallets')
    .select('id, wallet_type, wallet_address, network, currency, balance, purpose, status, provider_metadata')
    .eq('managed_by_agent_id', agentId)
    .order('created_at', { ascending: true });

  return (data || []).map(mapWallet);
}

function mapWallet(row: any): ResolvedWallet {
  return {
    id: row.id,
    walletType: row.wallet_type,
    walletAddress: row.wallet_address,
    network: row.network,
    currency: row.currency,
    balance: parseFloat(row.balance) || 0,
    purpose: row.purpose || 'default',
    status: row.status,
    providerMetadata: row.provider_metadata,
  };
}
