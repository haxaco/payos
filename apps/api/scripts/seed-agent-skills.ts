#!/usr/bin/env tsx

/**
 * Seed Agent Skills
 *
 * Populates the agent_skills table with diverse skills for existing demo agents.
 * Idempotent — uses upsert on (tenant_id, agent_id, skill_id).
 *
 * Usage: pnpm --filter @sly/api tsx scripts/seed-agent-skills.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const SKILL_TEMPLATES = [
  // Free skills
  { skill_id: 'agent_info', name: 'Agent Info', base_price: 0, tags: ['info'], description: 'Get this agent\'s capabilities and status.' },
  { skill_id: 'check_balance', name: 'Check Balance', base_price: 0, tags: ['wallets'], description: 'Check wallet or account balance.' },
  { skill_id: 'transaction_history', name: 'Transaction History', base_price: 0, tags: ['history'], description: 'View recent transaction history.' },
  { skill_id: 'get_quote', name: 'Get Quote', base_price: 0, tags: ['quotes', 'fx'], description: 'Get a price quote for cross-border transfers.' },
  { skill_id: 'lookup_account', name: 'Account Lookup', base_price: 0, tags: ['accounts'], description: 'Look up account details and verification status.' },

  // Paid skills
  { skill_id: 'make_payment', name: 'Make Payment', base_price: 0, tags: ['payments'], description: 'Execute a payment transfer. Cost is the transfer amount itself.' },
  { skill_id: 'create_checkout', name: 'Create Checkout', base_price: 0.50, tags: ['commerce', 'ucp'], description: 'Create a UCP checkout session with line items.' },
  { skill_id: 'access_api', name: 'Access Paid API', base_price: 0.10, tags: ['x402', 'api'], description: 'Access a paid API endpoint via x402 micropayment.' },
  { skill_id: 'create_mandate', name: 'Create Mandate', base_price: 1.00, tags: ['ap2', 'mandates'], description: 'Create an AP2 payment mandate for recurring payments.' },
  { skill_id: 'research', name: 'Research & Analysis', base_price: 2.00, tags: ['research', 'analytics'], description: 'Payment corridor research, benchmarking, and analysis.' },
];

async function main() {
  console.log('Seeding agent skills...\n');

  // Find all active agents
  const { data: agents, error: agentError } = await supabase
    .from('agents')
    .select('id, name, tenant_id, status')
    .eq('status', 'active')
    .limit(50);

  if (agentError || !agents?.length) {
    console.error('No active agents found:', agentError?.message || 'empty');
    process.exit(1);
  }

  console.log(`Found ${agents.length} active agent(s)\n`);

  let total = 0;

  for (const agent of agents) {
    console.log(`  Agent: ${agent.name} (${agent.id.slice(0, 8)}...)`);

    const rows = SKILL_TEMPLATES.map((s) => ({
      tenant_id: agent.tenant_id,
      agent_id: agent.id,
      skill_id: s.skill_id,
      name: s.name,
      description: s.description,
      base_price: s.base_price,
      currency: 'USDC',
      tags: s.tags,
      input_modes: ['text'],
      output_modes: ['text', 'data'],
      status: 'active' as const,
    }));

    const { data: upserted, error } = await supabase
      .from('agent_skills')
      .upsert(rows, { onConflict: 'tenant_id,agent_id,skill_id' })
      .select('id');

    if (error) {
      console.error(`    Error: ${error.message}`);
    } else {
      const count = upserted?.length || rows.length;
      console.log(`    Upserted ${count} skills`);
      total += count;
    }
  }

  console.log(`\nDone. ${total} skills seeded across ${agents.length} agent(s).`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
