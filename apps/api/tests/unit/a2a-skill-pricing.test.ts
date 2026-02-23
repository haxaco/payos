/**
 * A2A Skill Pricing Tests (OpenClaw Bug Fix)
 *
 * Validates two fixes:
 * 1. Agent card exposes `base_price` and `currency` as discrete fields on skills
 * 2. Task processor looks up real skill pricing before forwarding (not hardcoded 0)
 *
 * @see https://github.com/openclaw/bug-reports — paid marketplace skill pricing
 */

import { describe, it, expect, vi } from 'vitest';
import { generateAgentCard } from '../../src/services/a2a/agent-card.js';
import type { DbSkill } from '../../src/services/a2a/agent-card.js';
import { A2ATaskProcessor } from '../../src/services/a2a/task-processor.js';

// ---------------------------------------------------------------------------
// 1. Agent Card — skill pricing fields
// ---------------------------------------------------------------------------

describe('Agent Card — skill pricing fields', () => {
  const agent = {
    id: 'aaaaaaaa-1111-1111-1111-111111111111',
    name: 'CompanyIntelBot',
    description: 'Delivers company intelligence briefs',
    status: 'active',
    kya_tier: 2,
    permissions: {},
  };

  const account = { id: 'bbbbbbbb-1111-1111-1111-111111111111', name: 'OpenClaw' };

  it('exposes base_price and currency on each skill', () => {
    const dbSkills: DbSkill[] = [
      {
        skill_id: 'company_brief',
        name: 'Company Brief',
        description: 'Get a structured company intelligence brief',
        base_price: 0.35,
        currency: 'USDC',
        tags: ['intelligence', 'research'],
      },
      {
        skill_id: 'sector_scan',
        name: 'Sector Scan',
        description: 'Scan an entire sector for trends',
        base_price: 1.5,
        currency: 'USDC',
        tags: ['intelligence', 'sectors'],
      },
    ];

    const card = generateAgentCard(agent, account, null, 'https://api.sly.dev', dbSkills);

    expect(card.skills).toHaveLength(2);

    const brief = card.skills.find((s) => s.id === 'company_brief')!;
    expect(brief).toBeDefined();
    expect(brief.base_price).toBe(0.35);
    expect(brief.currency).toBe('USDC');

    const scan = card.skills.find((s) => s.id === 'sector_scan')!;
    expect(scan).toBeDefined();
    expect(scan.base_price).toBe(1.5);
    expect(scan.currency).toBe('USDC');
  });

  it('sets base_price to 0 for free skills', () => {
    const dbSkills: DbSkill[] = [
      {
        skill_id: 'ping',
        name: 'Ping',
        description: 'Health check',
        base_price: 0,
        currency: 'USDC',
      },
    ];

    const card = generateAgentCard(agent, account, null, 'https://api.sly.dev', dbSkills);

    expect(card.skills[0].base_price).toBe(0);
    expect(card.skills[0].currency).toBe('USDC');
  });

  it('defaults currency to USDC when DB value is empty', () => {
    const dbSkills: DbSkill[] = [
      {
        skill_id: 'test',
        name: 'Test',
        base_price: 0.1,
        currency: '',
      },
    ];

    const card = generateAgentCard(agent, account, null, 'https://api.sly.dev', dbSkills);

    expect(card.skills[0].currency).toBe('USDC');
  });

  it('returns empty skills when agent has none registered', () => {
    const card = generateAgentCard(agent, account, null, 'https://api.sly.dev', []);
    expect(card.skills).toEqual([]);
  });

  it('includes fee in description AND discrete fields', () => {
    const dbSkills: DbSkill[] = [
      {
        skill_id: 'company_brief',
        name: 'Company Brief',
        description: 'Get a brief',
        base_price: 0.35,
        currency: 'USDC',
      },
    ];

    const card = generateAgentCard(agent, account, null, 'https://api.sly.dev', dbSkills);
    const skill = card.skills[0];

    // Description still has the human-readable fee string
    expect(skill.description).toContain('Fee: 0.35 USDC');
    // And the discrete fields are also present
    expect(skill.base_price).toBe(0.35);
    expect(skill.currency).toBe('USDC');
  });

  it('omits fee text from description for free skills', () => {
    const dbSkills: DbSkill[] = [
      {
        skill_id: 'ping',
        name: 'Ping',
        description: 'Health check',
        base_price: 0,
        currency: 'USDC',
      },
    ];

    const card = generateAgentCard(agent, account, null, 'https://api.sly.dev', dbSkills);
    expect(card.skills[0].description).toBe('Health check');
    expect(card.skills[0].description).not.toContain('Fee:');
  });
});

// ---------------------------------------------------------------------------
// 2. Task Processor — skill pricing lookup before forwarding
// ---------------------------------------------------------------------------

describe('Task Processor — skill pricing lookup before forwarding', () => {
  const TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
  const AGENT_ID = 'dddddddd-1111-1111-1111-111111111111';
  const CALLER_AGENT_ID = 'dddddddd-2222-2222-2222-222222222222';
  const TASK_ID = 'eeeeeeee-0000-0000-0000-000000000001';
  const ACCOUNT_ID = 'bbbbbbbb-0000-0000-0000-000000000001';

  /**
   * Build a chainable, thenable mock Supabase query builder.
   * Supabase queries can be awaited directly (without .single()),
   * so the builder must implement .then() to resolve as a Promise.
   */
  function createQueryBuilder(resolvedData: any, resolvedError: any = null) {
    const result = { data: resolvedData, error: resolvedError };

    const builder: Record<string, any> = {};
    const chainMethods = [
      'select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in',
      'order', 'limit', 'update', 'insert', 'delete',
    ];
    for (const m of chainMethods) {
      builder[m] = vi.fn(() => builder);
    }
    // Terminal methods
    builder.single = vi.fn(() => Promise.resolve(result));
    builder.maybeSingle = vi.fn(() => Promise.resolve(result));
    // Make the builder itself thenable (Supabase's PostgREST builder is thenable)
    builder.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
    return builder;
  }

  /**
   * Creates a mock Supabase client with table-specific handlers.
   * `callLog` captures every `from(table)` call for assertions.
   */
  function buildMockSupabase(
    tableMap: Record<string, (callIndex: number) => ReturnType<typeof createQueryBuilder>>,
    callLog: string[],
  ) {
    const callCounts: Record<string, number> = {};
    return {
      from: vi.fn((table: string) => {
        callLog.push(table);
        callCounts[table] = (callCounts[table] || 0) + 1;
        const handler = tableMap[table];
        if (handler) return handler(callCounts[table]);
        return createQueryBuilder(null);
      }),
      rpc: vi.fn(() => Promise.resolve({ data: null, error: { message: 'function not found', code: '42883' } })),
    };
  }

  // Shared fixtures
  const taskRow = {
    id: TASK_ID,
    tenant_id: TENANT_ID,
    agent_id: AGENT_ID,
    state: 'submitted',
    direction: 'inbound',
    context_id: null,
    status_message: null,
    metadata: {},
    client_agent_id: CALLER_AGENT_ID,
    transfer_id: null,
    remote_task_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const userMessage = {
    id: 'msg-1',
    tenant_id: TENANT_ID,
    task_id: TASK_ID,
    role: 'user',
    parts: [{ text: 'Give me a company brief for Stripe' }],
    metadata: { skillId: 'company_brief' },
    created_at: new Date().toISOString(),
  };

  const agentRow = {
    id: AGENT_ID,
    parent_account_id: ACCOUNT_ID,
    permissions: { transactions: { initiate: true, view: true } },
    status: 'active',
    name: 'CompanyIntelBot',
    kya_tier: 2,
    endpoint_enabled: true,
    endpoint_url: 'https://companyintel.example.com/a2a',
    endpoint_type: 'a2a',
    endpoint_secret: null,
  };

  /**
   * The message text "Give me a company brief" parses to intent "generic"
   * (no INTENT_TO_SKILL mapping), so the Sly-native skill check is skipped.
   * The first agent_skills query is the pricing lookup itself.
   */

  it('looks up real pricing from agent_skills when skillId is in metadata', async () => {
    const callLog: string[] = [];

    const mockSupabase = buildMockSupabase({
      a2a_tasks: () => createQueryBuilder(taskRow),
      a2a_messages: () => createQueryBuilder([userMessage]),
      a2a_artifacts: () => createQueryBuilder([]),
      agents: () => createQueryBuilder(agentRow),
      wallets: () => createQueryBuilder({ id: 'wallet-1', balance: 100 }),
      ap2_mandates: (callIndex) => {
        if (callIndex === 1) return createQueryBuilder([]); // buildAgentContext: list
        return createQueryBuilder({ id: 'mandate-uuid', mandate_id: `settlement_${TASK_ID.slice(0, 8)}_123` });
      },
      // Intent "generic" → no Sly-native check, so first call IS the pricing lookup
      agent_skills: () => createQueryBuilder({
        skill_id: 'company_brief',
        handler_type: 'agent_provided',
        base_price: 0.35,
        currency: 'USDC',
      }),
    }, callLog);

    const processor = new A2ATaskProcessor(mockSupabase as any, TENANT_ID);

    try {
      await processor.processTask(TASK_ID);
    } catch {
      // Expected — A2AClient.sendMessage will fail without a real endpoint
    }

    // The fix: agent_skills must be queried for the pricing lookup
    const agentSkillsCalls = callLog.filter((t) => t === 'agent_skills');
    expect(agentSkillsCalls.length).toBeGreaterThanOrEqual(1);

    // The settlement mandate should also be created (base_price 0.35 > 0)
    // because the caller agent ID is set and the skill has a non-zero price
    const mandateCalls = callLog.filter((t) => t === 'ap2_mandates');
    expect(mandateCalls.length).toBeGreaterThanOrEqual(2); // list + insert
  });

  it('falls back to base_price 0 when no skillId in metadata', async () => {
    const messageWithoutSkillId = {
      ...userMessage,
      parts: [{ text: 'Hello there, what can you do?' }],
      metadata: {}, // No skillId!
    };

    const callLog: string[] = [];
    const mockSupabase = buildMockSupabase({
      a2a_tasks: () => createQueryBuilder({ ...taskRow, client_agent_id: CALLER_AGENT_ID }),
      a2a_messages: () => createQueryBuilder([messageWithoutSkillId]),
      a2a_artifacts: () => createQueryBuilder([]),
      agents: () => createQueryBuilder(agentRow),
      wallets: () => createQueryBuilder({ id: 'wallet-1', balance: 100 }),
      ap2_mandates: () => createQueryBuilder([]), // buildAgentContext: list
      agent_skills: () => createQueryBuilder(null), // No skill match
    }, callLog);

    const processor = new A2ATaskProcessor(mockSupabase as any, TENANT_ID);

    try {
      await processor.processTask(TASK_ID);
    } catch {
      // Expected
    }

    // Without skillId in metadata, the pricing lookup branch (if targetSkillId)
    // is NOT entered, so agent_skills is not queried for pricing.
    // It may still be queried once if the intent maps to INTENT_TO_SKILL.
    // Intent "generic" has no mapping, so agent_skills may not be queried at all.
    const agentSkillsCalls = callLog.filter((t) => t === 'agent_skills');
    expect(agentSkillsCalls.length).toBe(0);

    // With base_price 0 (default), no settlement mandate should be created.
    // ap2_mandates is only accessed once by buildAgentContext (listing active mandates).
    const mandateCalls = callLog.filter((t) => t === 'ap2_mandates');
    expect(mandateCalls.length).toBeLessThanOrEqual(1);
  });

  it('uses metadata.skill_id (snake_case) as fallback for pricing lookup', async () => {
    const messageWithSnakeCaseSkillId = {
      ...userMessage,
      parts: [{ text: 'Run a sector scan on fintech' }],
      metadata: { skill_id: 'sector_scan' }, // snake_case key (no camelCase skillId)
    };

    const callLog: string[] = [];

    const mockSupabase = buildMockSupabase({
      a2a_tasks: () => createQueryBuilder(taskRow),
      a2a_messages: () => createQueryBuilder([messageWithSnakeCaseSkillId]),
      a2a_artifacts: () => createQueryBuilder([]),
      agents: () => createQueryBuilder(agentRow),
      wallets: () => createQueryBuilder({ id: 'wallet-2', balance: 50 }),
      ap2_mandates: (callIndex) => {
        if (callIndex === 1) return createQueryBuilder([]); // buildAgentContext: list
        return createQueryBuilder({ id: 'mandate-2', mandate_id: `settlement_${TASK_ID.slice(0, 8)}_456` });
      },
      // First call is pricing lookup (no Sly-native check for generic intent)
      agent_skills: () => createQueryBuilder({
        skill_id: 'sector_scan',
        handler_type: 'agent_provided',
        base_price: 1.5,
        currency: 'USDC',
      }),
    }, callLog);

    const processor = new A2ATaskProcessor(mockSupabase as any, TENANT_ID);

    try {
      await processor.processTask(TASK_ID);
    } catch {
      // Expected
    }

    // The code reads msgMetadata.skill_id (snake_case fallback) and queries agent_skills
    const agentSkillsCalls = callLog.filter((t) => t === 'agent_skills');
    expect(agentSkillsCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('creates settlement mandate when forwarding a paid skill', async () => {
    const callLog: string[] = [];

    const mockSupabase = buildMockSupabase({
      a2a_tasks: () => createQueryBuilder({
        ...taskRow,
        client_agent_id: CALLER_AGENT_ID,
        metadata: {},
      }),
      a2a_messages: () => createQueryBuilder([userMessage]),
      a2a_artifacts: () => createQueryBuilder([]),
      agents: () => createQueryBuilder({
        ...agentRow,
        kya_tier: 2,
        parent_account_id: ACCOUNT_ID,
      }),
      wallets: () => createQueryBuilder({ id: 'wallet-caller', balance: 100, owner_account_id: ACCOUNT_ID }),
      ap2_mandates: (callIndex) => {
        if (callIndex === 1) return createQueryBuilder([]); // buildAgentContext: list
        return createQueryBuilder({ id: 'mandate-uuid', mandate_id: `settlement_${TASK_ID.slice(0, 8)}_789` });
      },
      agent_skills: () => createQueryBuilder({
        skill_id: 'company_brief',
        handler_type: 'agent_provided',
        base_price: 0.35,
        currency: 'USDC',
      }),
    }, callLog);

    const processor = new A2ATaskProcessor(mockSupabase as any, TENANT_ID);

    try {
      await processor.processTask(TASK_ID);
    } catch {
      // Expected — HTTP forwarding will fail
    }

    // ap2_mandates should be accessed at least twice:
    //   1. buildAgentContext (list active mandates)
    //   2. forwardToAgent → createSettlementMandate (insert)
    const mandateCalls = callLog.filter((t) => t === 'ap2_mandates');
    expect(mandateCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('skips settlement mandate for free skills', async () => {
    const freeSkillMessage = {
      ...userMessage,
      metadata: { skillId: 'ping' },
    };

    const callLog: string[] = [];

    const mockSupabase = buildMockSupabase({
      a2a_tasks: () => createQueryBuilder({
        ...taskRow,
        client_agent_id: CALLER_AGENT_ID,
      }),
      a2a_messages: () => createQueryBuilder([freeSkillMessage]),
      a2a_artifacts: () => createQueryBuilder([]),
      agents: () => createQueryBuilder(agentRow),
      wallets: () => createQueryBuilder({ id: 'wallet-1', balance: 100 }),
      ap2_mandates: () => createQueryBuilder([]), // buildAgentContext: list
      // Pricing lookup returns FREE skill (base_price: 0)
      agent_skills: () => createQueryBuilder({
        skill_id: 'ping',
        handler_type: 'agent_provided',
        base_price: 0,
        currency: 'USDC',
      }),
    }, callLog);

    const processor = new A2ATaskProcessor(mockSupabase as any, TENANT_ID);

    try {
      await processor.processTask(TASK_ID);
    } catch {
      // Expected
    }

    // For a free skill (base_price: 0), the settlement mandate creation
    // should be skipped — the code checks `if (callerAgentId && Number(skill.base_price) > 0)`
    // ap2_mandates is only accessed once (buildAgentContext listing active mandates).
    const mandateCalls = callLog.filter((t) => t === 'ap2_mandates');
    expect(mandateCalls.length).toBeLessThanOrEqual(1);
  });
});
