/**
 * Agent Auto-Refill Worker
 *
 * Runs every 5 min (configurable). For each agent with auto-refill enabled,
 * checks the on-chain USDC balance at the agent's EVM EOA. If below the
 * configured threshold AND the tenant's Circle master wallet has funds AND
 * we're under the per-day cap, transfers the gap up to the target via
 * Circle Payouts API (tenant master → agent EOA).
 *
 * Safety rails:
 *  - Opt-in default off (policy checks `auto_refill_enabled = TRUE`).
 *  - Per-day cap, reset on UTC day boundary.
 *  - Hard upper bound per tick (HARD_TICK_CAP_USDC) regardless of config.
 *  - Minimum refill amount (MIN_REFILL_USDC) — avoid wasting Circle fees on dust.
 *  - KYA tier cap applied via the per-call limit check — the fund-eoa route
 *    itself rejects oversize asks; we also pre-check here to avoid wasting
 *    a Circle API call.
 *  - Master-balance preflight — never send a request we know will fail.
 *  - Status written to `auto_refill_last_status` so the dashboard can
 *    surface "master underfunded, skipped" vs "refilled successfully."
 */

import { createClient } from '../db/client.js';
import { logAudit } from '../utils/helpers.js';

const HARD_TICK_CAP_USDC = 10; // never refill more than $10 per tick, even if config says otherwise
const MIN_REFILL_USDC = 0.05;  // skip if the calculated gap is < 5 cents (Circle fees / dust)
const USDC_MAINNET = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

async function fetchOnchainUsdc(eoa: string, environment: 'test' | 'live'): Promise<number | null> {
  try {
    const rpc = environment === 'live' ? 'https://mainnet.base.org' : 'https://sepolia.base.org';
    const usdc = environment === 'live' ? USDC_MAINNET : USDC_SEPOLIA;
    const data = '0x70a08231' + '0'.repeat(24) + eoa.slice(2).toLowerCase();
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: usdc, data }, 'latest'] }),
    });
    const json: any = await res.json();
    if (!json.result) return null;
    return parseInt(json.result, 16) / 1e6;
  } catch {
    return null;
  }
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate();
}

/**
 * One sweep across all opted-in agents. Returns a summary.
 */
export async function runAutoRefillSweep(): Promise<{
  scanned: number;
  refilled: number;
  skipped: number;
  errors: number;
  detail: Array<{ agentId: string; outcome: string; amount?: number; error?: string }>;
}> {
  const summary = { scanned: 0, refilled: 0, skipped: 0, errors: 0, detail: [] as any[] };
  const supabase = createClient();

  const { data: candidates, error: fetchErr } = await (supabase.from('agents') as any)
    .select('id, tenant_id, environment, status, auto_refill_enabled, auto_refill_threshold, auto_refill_target, auto_refill_daily_cap, auto_refill_daily_spent, auto_refill_daily_reset_at, auto_refill_last_at, effective_limit_daily')
    .eq('auto_refill_enabled', true)
    .eq('status', 'active');

  if (fetchErr) {
    console.error('[auto-refill] fetch candidates failed:', fetchErr.message);
    return summary;
  }
  if (!candidates || candidates.length === 0) return summary;

  const now = new Date();

  // Lazy-imported: Circle payouts + EVM key lookup
  const { getCirclePayoutsClient } = await import('../services/circle/payouts.js');
  const { getAgentEvmKey } = await import('../services/x402/signer.js');
  let circle: any;
  let masterUsdc = 0;
  try {
    circle = getCirclePayoutsClient();
    const balances = await circle.getMasterWalletBalance();
    const usdc = balances.find((b: any) => b.currency === 'USD' || b.currency === 'USDC');
    masterUsdc = usdc ? parseFloat(usdc.amount) : 0;
  } catch (e: any) {
    // Single-tenant master is a shared resource — if we can't reach Circle,
    // the whole sweep is a no-op. Log and bail cleanly.
    console.error('[auto-refill] cannot reach Circle master:', e?.message || e);
    summary.errors = candidates.length;
    return summary;
  }

  for (const a of candidates as any[]) {
    summary.scanned++;
    const agentId = a.id;
    const env = a.environment === 'live' ? 'live' : 'test';
    const threshold = Number(a.auto_refill_threshold);
    const target = Number(a.auto_refill_target);
    const dailyCap = Number(a.auto_refill_daily_cap);
    let dailySpent = Number(a.auto_refill_daily_spent) || 0;
    const dailyKyaLimit = parseFloat(a.effective_limit_daily) || 0;

    // Validate policy shape — malformed rows skip with a clear status
    if (!Number.isFinite(threshold) || !Number.isFinite(target) || target <= threshold) {
      await markStatus(supabase, agentId, 'config_invalid', 'threshold/target not set or target <= threshold');
      summary.skipped++; summary.detail.push({ agentId, outcome: 'config_invalid' });
      continue;
    }

    // Reset daily spent on UTC day boundary
    const lastReset = a.auto_refill_daily_reset_at ? new Date(a.auto_refill_daily_reset_at) : null;
    if (!lastReset || !isSameUtcDay(lastReset, now)) {
      dailySpent = 0;
      await (supabase.from('agents') as any)
        .update({ auto_refill_daily_spent: 0, auto_refill_daily_reset_at: now.toISOString() })
        .eq('id', agentId);
    }

    // Per-day cap check
    if (Number.isFinite(dailyCap) && dailySpent >= dailyCap) {
      await markStatus(supabase, agentId, 'capped', `daily cap ${dailyCap} reached (spent ${dailySpent})`);
      summary.skipped++; summary.detail.push({ agentId, outcome: 'daily_cap_reached' });
      continue;
    }

    // Resolve EOA
    const keyRecord = await getAgentEvmKey(supabase, agentId);
    if (!keyRecord) {
      await markStatus(supabase, agentId, 'no_evm_key', 'agent has no provisioned EVM signing key');
      summary.skipped++; summary.detail.push({ agentId, outcome: 'no_evm_key' });
      continue;
    }

    // On-chain balance check
    const onchain = await fetchOnchainUsdc(keyRecord.ethereum_address, env);
    if (onchain === null) {
      await markStatus(supabase, agentId, 'rpc_error', 'could not read on-chain balance');
      summary.errors++; summary.detail.push({ agentId, outcome: 'rpc_error' });
      continue;
    }
    if (onchain >= threshold) {
      // Healthy — no action needed. Don't overwrite a successful status from earlier.
      summary.skipped++; summary.detail.push({ agentId, outcome: 'healthy', amount: onchain });
      continue;
    }

    // Compute refill amount — gap to target, bounded by remaining daily cap,
    // hard per-tick cap, and KYA daily ceiling.
    const gap = target - onchain;
    const remainingDaily = Number.isFinite(dailyCap) ? dailyCap - dailySpent : Infinity;
    const remainingKya = dailyKyaLimit > 0 ? dailyKyaLimit - (dailySpent /* approximate */) : Infinity;
    const amount = Math.min(gap, remainingDaily, remainingKya, HARD_TICK_CAP_USDC);

    if (amount < MIN_REFILL_USDC) {
      await markStatus(supabase, agentId, 'skipped_dust', `computed refill ${amount} below MIN_REFILL ${MIN_REFILL_USDC}`);
      summary.skipped++; summary.detail.push({ agentId, outcome: 'dust' });
      continue;
    }

    if (masterUsdc < amount) {
      await markStatus(supabase, agentId, 'master_underfunded', `master has ${masterUsdc} USDC, need ${amount}`);
      summary.skipped++; summary.detail.push({ agentId, outcome: 'master_underfunded', amount });
      continue;
    }

    // Execute refill via Circle Payouts
    const chain = env === 'live' ? 'BASE' : 'BASE-SEPOLIA';
    let payoutId: string | null = null;
    try {
      const payout = await circle.createUsdcTransfer({
        amount: amount.toFixed(6),
        destinationAddress: keyRecord.ethereum_address,
        chain,
        metadata: {
          tenant_id: a.tenant_id,
          agent_id: agentId,
          source: 'sly_auto_refill',
          environment: env,
        },
      });
      payoutId = payout.id;
    } catch (e: any) {
      const msg = e?.message || String(e);
      await markStatus(supabase, agentId, 'circle_error', msg.slice(0, 200));
      summary.errors++; summary.detail.push({ agentId, outcome: 'circle_error', error: msg });
      continue;
    }

    // Record the deposit in the transfers ledger
    try {
      await (supabase.from('transfers') as any).insert({
        tenant_id: a.tenant_id,
        environment: env,
        type: 'deposit',
        status: 'pending',
        from_account_id: null,
        to_account_id: null,
        initiated_by_type: 'system',
        initiated_by_id: agentId,
        initiated_by_name: 'auto-refill worker',
        amount,
        currency: 'USDC',
        description: 'Auto-refill from Circle master',
        settlement_network: chain === 'BASE' ? 'base' : 'base-sepolia',
        protocol_metadata: {
          protocol: 'circle_payouts',
          direction: 'internal_deposit',
          to_address: keyRecord.ethereum_address,
          chain,
          circle_payout_id: payoutId,
          source: 'auto_refill_worker',
          triggered_by: { onchain_before: onchain, threshold, target, daily_spent_before: dailySpent },
        },
      });
    } catch (e: any) {
      console.error(`[auto-refill] transfers insert failed for ${agentId}:`, e?.message);
      // continue — the Circle payout already fired
    }

    // Update agent state
    const nextDailySpent = dailySpent + amount;
    masterUsdc -= amount;
    await (supabase.from('agents') as any)
      .update({
        auto_refill_daily_spent: nextDailySpent,
        auto_refill_last_at: now.toISOString(),
        auto_refill_last_status: 'ok',
        auto_refill_last_error: null,
      })
      .eq('id', agentId);

    await logAudit(supabase, {
      tenantId: a.tenant_id, entityType: 'agent', entityId: agentId,
      action: 'auto_refill_executed', actorType: 'system', actorId: 'auto-refill-worker', actorName: 'auto-refill worker',
      metadata: {
        amount,
        onchain_before: onchain,
        threshold,
        target,
        circle_payout_id: payoutId,
        chain,
      },
    });

    summary.refilled++;
    summary.detail.push({ agentId, outcome: 'refilled', amount });
    console.log(`[auto-refill] ${agentId}: $${amount.toFixed(4)} -> ${keyRecord.ethereum_address} on ${chain} (balance was $${onchain.toFixed(4)}, payout=${payoutId})`);
  }

  return summary;
}

async function markStatus(supabase: any, agentId: string, status: string, error: string | null) {
  await (supabase.from('agents') as any)
    .update({ auto_refill_last_status: status, auto_refill_last_error: error })
    .eq('id', agentId)
    .then(() => {}, () => {});
}

/**
 * Start the worker on a schedule. Returns a stop function.
 */
export function startAutoRefillWorker(intervalMs: number = 5 * 60 * 1000): () => void {
  console.log(`[auto-refill] Starting with ${intervalMs / 1000}s interval`);

  // Delay first tick by 30s to avoid piling on during cold start
  const initial = setTimeout(() => {
    runAutoRefillSweep().catch((e) => console.error('[auto-refill] initial sweep error:', e));
  }, 30_000);

  const tick = setInterval(async () => {
    try {
      await runAutoRefillSweep();
    } catch (e) {
      console.error('[auto-refill] tick error:', e);
    }
  }, intervalMs);

  return () => {
    clearTimeout(initial);
    clearInterval(tick);
    console.log('[auto-refill] Stopping');
  };
}
