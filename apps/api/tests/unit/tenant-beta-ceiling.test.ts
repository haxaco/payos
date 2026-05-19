/**
 * Strict per-tenant beta spend ceiling enforcement (Open Beta Hardening — Step 4).
 *
 * These tests drive `LimitService.checkTransactionLimit` end-to-end through a
 * mocked Supabase client. The mock is configured so that `getAgent` returns a
 * healthy agent with very high per-agent / parent limits and a high KYA tier,
 * and the per-agent daily/monthly usage rows are empty — so execution always
 * REACHES the strict per-tenant beta ceiling block at the bottom of
 * `_checkTransactionLimitInner`.
 *
 * We then exercise the ceiling itself:
 *   1. live: amount > perTx default ($100)            → blocked per_tx
 *   2. live: tenant daily aggregate pushes over $500  → blocked daily
 *   3. live: tenant monthly aggregate pushes over $2k → blocked monthly
 *   4. live: small amount, low aggregates             → allowed
 *   5. live: tenant row beta_ceiling_disabled=true    → allowed (skipped)
 *   6. live: per-tenant override beta_ceiling_per_tx  → allowed (raised cap)
 *   7. test env: same as case 1 ($150)                → allowed (NOT enforced
 *      in sandbox so the marketplace simulation stays unthrottled)
 *
 * The pure `resolveBetaCeiling` helper is covered separately in
 * beta-ceilings.test.ts — this file is strictly the LimitService ENFORCEMENT
 * path.
 */
import { describe, it, expect } from 'vitest';
import { LimitService } from '../../src/services/limits.js';

// ────────────────────────────────────────────────────────────────────────────
// Configurable Supabase mock
// ────────────────────────────────────────────────────────────────────────────

type Row = Record<string, any>;

interface MockConfig {
  /** Agent row returned by getAgent (from('agents')...single()). */
  agent: Row;
  /** Rows returned for the per-agent daily aggregate (single()). null/[] = no usage. */
  agentDailyRow: Row | null;
  /** Rows returned for the per-agent monthly aggregate (thenable list). */
  agentMonthlyRows: Row[];
  /** tenants row returned by the ceiling block (single()). null = platform default. */
  tenantRow: Row | null;
  /** Rows summed for the tenant-wide daily aggregate. */
  tenantDailyRows: Row[];
  /** Rows summed for the tenant-wide monthly aggregate. */
  tenantMonthlyRows: Row[];
}

/**
 * Builds a chainable fake Supabase query builder. Each `.from(table)` returns
 * a builder that records `.eq/.gte/.in/.limit` conditions; `.single()` and the
 * thenable resolve based on table + recorded conditions.
 *
 * The two `agent_usage` shapes are disambiguated by which column was filtered:
 *   - per-agent  → `.eq('agent_id', ...)`
 *   - tenant-wide → `.eq('tenant_id', ...)`
 * and the daily vs monthly variant by `.eq('date')` vs `.gte('date')`.
 */
function makeSupabase(cfg: MockConfig) {
  function queryBuilder(table: string) {
    const conds: Array<{ op: 'eq' | 'gte' | 'in' | 'limit'; col?: string; val?: any }> = [];
    const has = (op: string, col?: string) =>
      conds.some((c) => c.op === op && (col === undefined || c.col === col));

    const resolveList = (): Row[] => {
      if (table === 'a2a_task_feedback') {
        // Rating-based reduction is best-effort; no ratings → no reduction.
        return [];
      }
      if (table === 'agent_usage') {
        if (has('eq', 'tenant_id')) {
          // Tenant-wide aggregate: daily uses .eq('date'), monthly uses .gte('date')
          return has('gte', 'date') ? cfg.tenantMonthlyRows : cfg.tenantDailyRows;
        }
        // Per-agent aggregate
        return has('gte', 'date') ? cfg.agentMonthlyRows : [];
      }
      return [];
    };

    const resolveSingle = (): { data: Row | null; error: any } => {
      if (table === 'agents') {
        return cfg.agent
          ? { data: cfg.agent, error: null }
          : { data: null, error: { message: 'not found' } };
      }
      if (table === 'accounts') {
        return { data: null, error: { message: 'no parent' } };
      }
      if (table === 'agent_usage') {
        // Per-agent daily usage (.single())
        return { data: cfg.agentDailyRow, error: cfg.agentDailyRow ? null : { message: 'none' } };
      }
      if (table === 'tenants') {
        return { data: cfg.tenantRow, error: null };
      }
      return { data: null, error: { message: 'unhandled single' } };
    };

    const builder: any = {
      select() {
        return builder;
      },
      eq(col: string, val: any) {
        conds.push({ op: 'eq', col, val });
        return builder;
      },
      gte(col: string, val: any) {
        conds.push({ op: 'gte', col, val });
        return builder;
      },
      in(col: string, val: any[]) {
        conds.push({ op: 'in', col, val });
        return builder;
      },
      limit(n: number) {
        conds.push({ op: 'limit', val: n });
        return builder;
      },
      order() {
        return builder;
      },
      async single() {
        return resolveSingle();
      },
      then(resolve: any) {
        resolve({ data: resolveList(), error: null });
      },
    };
    return builder;
  }

  return {
    from: (table: string) => queryBuilder(table),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-beta-1';
const AGENT_ID = 'agent-beta-1';

/**
 * A healthy agent with very high effective limits and a high KYA tier so the
 * per-agent per-tx / daily / monthly checks all pass and execution reaches the
 * strict per-tenant beta ceiling. No parent account.
 */
function healthyAgent(): Row {
  return {
    id: AGENT_ID,
    name: 'Beta Agent',
    status: 'active',
    kya_tier: 3,
    parent_account_id: null,
    tenant_id: TENANT_ID,
    limit_per_transaction: '1000000',
    limit_daily: '1000000',
    limit_monthly: '1000000',
    effective_limit_per_tx: '1000000',
    effective_limit_daily: '1000000',
    effective_limit_monthly: '1000000',
    effective_limits_capped: false,
    max_active_streams: 100,
    max_flow_rate_per_stream: '1000000',
    max_total_outflow: '1000000',
    active_streams_count: 0,
    total_stream_outflow: '0',
  };
}

function baseConfig(overrides: Partial<MockConfig> = {}): MockConfig {
  return {
    agent: healthyAgent(),
    agentDailyRow: null,
    agentMonthlyRows: [],
    tenantRow: null, // → platform default ceiling (100 / 500 / 2000)
    tenantDailyRows: [],
    tenantMonthlyRows: [],
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('LimitService — strict per-tenant beta ceiling enforcement (live)', () => {
  it('1. blocks when amount exceeds the platform per-tx ceiling ($150 > $100)', async () => {
    const supabase: any = makeSupabase(baseConfig());
    const svc = new LimitService(supabase, 'live');

    const result = await svc.checkTransactionLimit(AGENT_ID, 150);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('exceeds_tenant_beta_ceiling_per_tx');
    expect(result.limitType).toBe('tenant_ceiling_per_tx');
    expect(result.limit).toBe(100);
    expect(result.requested).toBe(150);
  });

  it('2. blocks when tenant-wide daily aggregate + amount exceeds the daily ceiling ($450 + $80 > $500)', async () => {
    const supabase: any = makeSupabase(
      baseConfig({ tenantDailyRows: [{ daily_amount: '450' }] }),
    );
    const svc = new LimitService(supabase, 'live');

    const result = await svc.checkTransactionLimit(AGENT_ID, 80);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('exceeds_tenant_beta_ceiling_daily');
    expect(result.limitType).toBe('tenant_ceiling_daily');
    expect(result.limit).toBe(500);
    expect(result.used).toBe(450);
    expect(result.requested).toBe(80);
  });

  it('3. blocks when tenant-wide monthly aggregate + amount exceeds the monthly ceiling ($1950 + $80 > $2000)', async () => {
    const supabase: any = makeSupabase(
      baseConfig({
        // Daily fine: 200 + 80 = 280 < 500
        tenantDailyRows: [{ daily_amount: '200' }],
        // Monthly over: 1950 + 80 = 2030 > 2000
        tenantMonthlyRows: [{ daily_amount: '1500' }, { daily_amount: '450' }],
      }),
    );
    const svc = new LimitService(supabase, 'live');

    const result = await svc.checkTransactionLimit(AGENT_ID, 80);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('exceeds_tenant_beta_ceiling_monthly');
    expect(result.limitType).toBe('tenant_ceiling_monthly');
    expect(result.limit).toBe(2000);
    expect(result.used).toBe(1950);
    expect(result.requested).toBe(80);
  });

  it('4. allows a small amount when all aggregates are low (ceiling not exceeded)', async () => {
    const supabase: any = makeSupabase(
      baseConfig({
        tenantDailyRows: [{ daily_amount: '100' }],
        tenantMonthlyRows: [{ daily_amount: '300' }],
      }),
    );
    const svc = new LimitService(supabase, 'live');

    const result = await svc.checkTransactionLimit(AGENT_ID, 50);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('5. allows a large amount when the tenant has beta_ceiling_disabled=true (ceiling skipped)', async () => {
    const supabase: any = makeSupabase(
      baseConfig({
        tenantRow: {
          beta_ceiling_per_tx: null,
          beta_ceiling_daily: null,
          beta_ceiling_monthly: null,
          beta_ceiling_disabled: true,
        },
      }),
    );
    const svc = new LimitService(supabase, 'live');

    const result = await svc.checkTransactionLimit(AGENT_ID, 5000);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('6. allows an amount under a raised per-tenant override (beta_ceiling_per_tx=1000, amount $500)', async () => {
    const supabase: any = makeSupabase(
      baseConfig({
        tenantRow: {
          beta_ceiling_per_tx: 1000,
          beta_ceiling_daily: null,
          beta_ceiling_monthly: null,
          beta_ceiling_disabled: false,
        },
      }),
    );
    const svc = new LimitService(supabase, 'live');

    const result = await svc.checkTransactionLimit(AGENT_ID, 500);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

describe('LimitService — strict per-tenant beta ceiling is NOT enforced in test/sandbox', () => {
  it('7. allows the SAME $150 amount that case 1 blocked, because env=test skips the ceiling entirely', async () => {
    const supabase: any = makeSupabase(baseConfig());
    // Default env is 'test'; assert explicitly that the sandbox stays unthrottled.
    const svc = new LimitService(supabase, 'test');

    const result = await svc.checkTransactionLimit(AGENT_ID, 150);

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});
