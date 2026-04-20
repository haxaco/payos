/**
 * Merchant analytics aggregation — single source of truth for per-merchant
 * sales / volume / endpoint numbers. Used by both the tenant-facing
 * `GET /v1/accounts/:id/merchant-stats` route and the end-of-round report
 * in `round-viewer.ts`.
 *
 * Input: a merchant account UUID + a cutoff ISO timestamp (inclusive).
 * Output: the shape consumed by the merchant detail page and the LLM
 * analyzer, with ACP / UCP / x402 volumes broken out plus top buyers and
 * recent sales.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface MerchantStatsInput {
  accountId: string;
  cutoff: string;           // ISO string; fetch rows with created_at >= cutoff
  tenantId?: string;        // optional guard; when provided we enforce cross-tenant isolation
}

export interface MerchantStatsResult {
  merchant: {
    id: string;
    name: string;
    type: string | null;
    subtype: string | null;
    rating: number | null;
    pos_provider: string | null;
    merchant_type: string | null;
    description: string | null;
    country: string | null;
    city: string | null;
    catalog: { products: any[] };
  } | null;
  isMerchant: boolean;
  volume: { total: number; acp: number; ucp: number; x402: number };
  counts: { total: number; acp: number; ucp: number; x402: number };
  topBuyers: Array<{ agentId: string; name: string; sales: number; spend: number }>;
  recentSales: Array<{ protocol: 'acp' | 'ucp' | 'x402'; amount: number; buyerName: string | null; at: string; item: string }>;
  endpoints: Array<{ id: string; name: string; path: string; method: string; base_price: number; total_calls: number; total_revenue: number; status: string }>;
}

/**
 * Compute merchant stats. Returns a result with `isMerchant: false` when
 * the account exists but isn't a merchant (subtype !== 'merchant' AND no
 * pos_provider metadata) — caller decides how to surface that (404 on the
 * public API, 'N/A' in the report).
 */
export async function computeMerchantStats(
  supabase: SupabaseClient,
  input: MerchantStatsInput,
): Promise<MerchantStatsResult> {
  const { accountId, cutoff, tenantId } = input;

  // ─── 1. Resolve merchant account + catalog ────────────────────────────
  let accountQuery = supabase
    .from('accounts')
    .select('id, name, type, subtype, currency, metadata')
    .eq('id', accountId) as any;
  if (tenantId) accountQuery = accountQuery.eq('tenant_id', tenantId);
  const { data: accountRow } = await accountQuery.maybeSingle();

  const empty: MerchantStatsResult = {
    merchant: null,
    isMerchant: false,
    volume: { total: 0, acp: 0, ucp: 0, x402: 0 },
    counts: { total: 0, acp: 0, ucp: 0, x402: 0 },
    topBuyers: [],
    recentSales: [],
    endpoints: [],
  };
  if (!accountRow) return empty;

  const isMerchant =
    accountRow.subtype === 'merchant' ||
    (accountRow.metadata?.pos_provider != null);

  const rawCatalog = accountRow.metadata?.catalog;
  const products: any[] = Array.isArray(rawCatalog)
    ? rawCatalog
    : Array.isArray(rawCatalog?.products)
      ? rawCatalog.products
      : [];

  const merchant = {
    id: accountRow.id,
    name: accountRow.name,
    type: accountRow.type ?? null,
    subtype: accountRow.subtype ?? null,
    rating: typeof accountRow.metadata?.rating === 'number' ? accountRow.metadata.rating : null,
    pos_provider: accountRow.metadata?.pos_provider ?? null,
    merchant_type: accountRow.metadata?.merchant_type ?? null,
    description: accountRow.metadata?.description ?? null,
    country: accountRow.metadata?.country ?? null,
    city: accountRow.metadata?.city ?? null,
    catalog: { products },
  };

  if (!isMerchant) {
    return { ...empty, merchant, isMerchant: false };
  }

  // ─── 2. Pull per-protocol rows in parallel ────────────────────────────
  // ACP: checkouts with merchant_account_id OR (pre-backfill) merchant_id TEXT
  // matching metadata.invu_merchant_id. Prefer the UUID column.
  const posTextId = accountRow.metadata?.invu_merchant_id ?? null;
  let acpQuery = supabase
    .from('acp_checkouts')
    .select('id, status, total_amount, agent_id, agent_name, merchant_id, merchant_account_id, created_at, metadata')
    .gte('created_at', cutoff)
    .in('status', ['completed', 'pending']) as any;
  if (tenantId) acpQuery = acpQuery.eq('tenant_id', tenantId);
  // Either the UUID matches OR (legacy) the TEXT matches.
  if (posTextId) {
    acpQuery = acpQuery.or(`merchant_account_id.eq.${accountId},merchant_id.eq.${posTextId}`);
  } else {
    acpQuery = acpQuery.eq('merchant_account_id', accountId);
  }
  acpQuery = acpQuery.order('created_at', { ascending: false }).limit(500);

  // UCP: filter by session metadata.merchant_id (the sim writes it there).
  // Fall back to status='completed' only — UCP sessions that didn't complete
  // aren't sales.
  let ucpQuery = supabase
    .from('ucp_checkout_sessions')
    .select('id, status, currency, totals, agent_id, metadata, created_at')
    .gte('created_at', cutoff)
    .eq('status', 'completed') as any;
  if (tenantId) ucpQuery = ucpQuery.eq('tenant_id', tenantId);
  ucpQuery = ucpQuery.order('created_at', { ascending: false }).limit(500);

  // x402: transfers with to_account_id = this merchant.
  let txQuery = supabase
    .from('transfers')
    .select('id, amount, currency, status, protocol_metadata, from_account_id, created_at')
    .gte('created_at', cutoff)
    .eq('to_account_id', accountId) as any;
  if (tenantId) txQuery = txQuery.eq('tenant_id', tenantId);
  txQuery = txQuery.order('created_at', { ascending: false }).limit(500);

  // x402 endpoints owned by this merchant account.
  let epQuery = supabase
    .from('x402_endpoints')
    .select('id, name, path, method, base_price, currency, status, total_calls, total_revenue')
    .eq('account_id', accountId) as any;
  if (tenantId) epQuery = epQuery.eq('tenant_id', tenantId);
  epQuery = epQuery.order('created_at', { ascending: true }).limit(50);

  const [acpRes, ucpRes, txRes, epRes] = await Promise.all([acpQuery, ucpQuery, txQuery, epQuery]);

  const acpRows = (acpRes.data || []) as any[];
  const ucpRows = (ucpRes.data || []) as any[];
  const txRows = (txRes.data || []) as any[];
  const epRows = (epRes.data || []) as any[];

  // Filter UCP sessions to those addressed to this merchant via metadata.
  const ucpMine = ucpRows.filter((s: any) => {
    const mname = s.metadata?.merchant_name;
    const mid = s.metadata?.merchant_id;
    return mname === accountRow.name || (posTextId && mid === posTextId) || s.metadata?.merchant_account_id === accountId;
  });

  // Partition transfers: x402 vs. non-x402 (the non-x402 are the ACP/UCP
  // settlement rows we already accounted for in the checkout tables —
  // counting them here would double-count).
  const x402Tx = txRows.filter((t: any) => {
    const proto = t.protocol_metadata?.protocol;
    const settle = t.protocol_metadata?.settlement_type;
    return proto === 'x402' || settle === 'batch_net_ledger' || settle === 'x402_authorization';
  });
  const x402Completed = x402Tx.filter((t: any) => t.status === 'completed' || t.status === 'pending');

  // ─── 3. Volumes + counts ──────────────────────────────────────────────
  const acpVolume = acpRows.reduce((s, c) => s + Number(c.total_amount || 0), 0);
  const ucpVolume = ucpMine.reduce((s, session) => {
    const totalEntry = Array.isArray(session.totals) ? session.totals.find((t: any) => t?.type === 'total') : null;
    const cents = totalEntry ? Number(totalEntry.amount || 0) : 0;
    return s + cents / 100;
  }, 0);
  const x402Volume = x402Completed.reduce((s, t: any) => s + Number(t.amount || 0), 0);

  const volume = {
    total: acpVolume + ucpVolume + x402Volume,
    acp: acpVolume,
    ucp: ucpVolume,
    x402: x402Volume,
  };
  const counts = {
    total: acpRows.length + ucpMine.length + x402Completed.length,
    acp: acpRows.length,
    ucp: ucpMine.length,
    x402: x402Completed.length,
  };

  // ─── 4. Top buyers (by spend) ──────────────────────────────────────────
  const buyerAgg: Record<string, { agentId: string; name: string; sales: number; spend: number }> = {};
  for (const c of acpRows) {
    const aid = c.agent_id;
    if (!aid) continue;
    if (!buyerAgg[aid]) buyerAgg[aid] = { agentId: aid, name: c.agent_name || aid.slice(0, 8), sales: 0, spend: 0 };
    buyerAgg[aid].sales += 1;
    buyerAgg[aid].spend += Number(c.total_amount || 0);
  }
  for (const s of ucpMine) {
    const aid = s.agent_id;
    if (!aid) continue;
    const totalEntry = Array.isArray(s.totals) ? s.totals.find((t: any) => t?.type === 'total') : null;
    const cents = totalEntry ? Number(totalEntry.amount || 0) : 0;
    if (!buyerAgg[aid]) buyerAgg[aid] = { agentId: aid, name: aid.slice(0, 8), sales: 0, spend: 0 };
    buyerAgg[aid].sales += 1;
    buyerAgg[aid].spend += cents / 100;
  }
  for (const t of x402Completed) {
    // x402 transfers don't carry agent_id directly; try protocol_metadata.
    const aid = t.protocol_metadata?.agent_id;
    if (!aid) continue;
    if (!buyerAgg[aid]) buyerAgg[aid] = { agentId: aid, name: aid.slice(0, 8), sales: 0, spend: 0 };
    buyerAgg[aid].sales += 1;
    buyerAgg[aid].spend += Number(t.amount || 0);
  }
  // Resolve agent names
  const buyerIds = Object.keys(buyerAgg);
  if (buyerIds.length > 0) {
    const { data: agents } = await supabase
      .from('agents')
      .select('id, name')
      .in('id', buyerIds);
    for (const a of (agents || []) as any[]) {
      if (buyerAgg[a.id] && a.name) buyerAgg[a.id].name = a.name;
    }
  }
  const topBuyers = Object.values(buyerAgg).sort((a, b) => b.spend - a.spend).slice(0, 10);

  // ─── 5. Recent sales feed (last 20 across protocols) ──────────────────
  const rs: MerchantStatsResult['recentSales'] = [];
  for (const c of acpRows.slice(0, 20)) {
    rs.push({
      protocol: 'acp',
      amount: Number(c.total_amount || 0),
      buyerName: buyerAgg[c.agent_id]?.name || c.agent_name || null,
      at: c.created_at,
      item: c.metadata?.summary || 'Basket',
    });
  }
  for (const s of ucpMine.slice(0, 20)) {
    const totalEntry = Array.isArray(s.totals) ? s.totals.find((t: any) => t?.type === 'total') : null;
    const cents = totalEntry ? Number(totalEntry.amount || 0) : 0;
    rs.push({
      protocol: 'ucp',
      amount: cents / 100,
      buyerName: buyerAgg[s.agent_id]?.name || null,
      at: s.created_at,
      item: s.metadata?.item_name || 'UCP order',
    });
  }
  for (const t of x402Completed.slice(0, 20)) {
    const aid = t.protocol_metadata?.agent_id;
    rs.push({
      protocol: 'x402',
      amount: Number(t.amount || 0),
      buyerName: aid ? (buyerAgg[aid]?.name || null) : null,
      at: t.created_at,
      item: t.protocol_metadata?.endpoint_name || t.protocol_metadata?.path || 'x402 call',
    });
  }
  rs.sort((a, b) => (a.at < b.at ? 1 : -1));
  const recentSales = rs.slice(0, 20);

  // ─── 6. Endpoints ─────────────────────────────────────────────────────
  const endpoints = epRows.map((e: any) => ({
    id: e.id,
    name: e.name,
    path: e.path,
    method: e.method,
    base_price: Number(e.base_price || 0),
    total_calls: Number(e.total_calls || 0),
    total_revenue: Number(e.total_revenue || 0),
    status: e.status,
  }));

  return {
    merchant,
    isMerchant: true,
    volume,
    counts,
    topBuyers,
    recentSales,
    endpoints,
  };
}
