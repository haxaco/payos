/**
 * E2E test for Epic 63 — External Reputation Bridge
 *
 * Seeds a2a_task_feedback rows for real agents, then hits the
 * reputation endpoints to verify the full pipeline works.
 *
 * Usage:
 *   cd apps/api && source .env && npx tsx scripts/test-reputation-e2e.ts
 *
 * Prerequisites:
 * - API server running on localhost:4000
 * - Supabase connected (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 * - Seed data present (agents exist)
 * - Migration 20260317_reputation_bridge.sql applied
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const API_URL = process.env.API_URL || 'http://localhost:4000';

// Haxaco Development tenant
const TENANT_ID = 'dad4308f-f9b6-4529-a406-7c2bdf3c6071';

// Agents from seed-a2a-dashboard.ts
const AGENTS = {
  shopping:    '15eec2cd-8e75-4e95-abb5-73df9c7bfcd6',
  payout:      'e00258e2-1a5e-4a33-8da2-53df488c9cfe',
  procurement: '466e58f0-2801-424c-93cd-5af1cc5c09e7',
  travel:      '4cd237b7-b314-4a38-9964-bd91bf3134bb',
};

async function getApiKey(): Promise<string> {
  // Find an API key for this tenant
  const { data } = await supabase
    .from('api_keys')
    .select('key_prefix')
    .eq('tenant_id', TENANT_ID)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (!data) {
    // Fall back to tenant's legacy api_key_hash
    const { data: tenant } = await supabase
      .from('tenants')
      .select('api_key')
      .eq('id', TENANT_ID)
      .single();
    if (tenant?.api_key) return tenant.api_key;
    throw new Error('No API key found for tenant. Run seed:db first.');
  }
  // We can't recover the full key from prefix+hash, so check if we stored it
  throw new Error(`Found key prefix ${data.key_prefix}... but need the full key. Use your dashboard API key.`);
}

async function seedFeedback() {
  console.log('\n--- Seeding a2a_task_feedback ---\n');

  // Clean previous test feedback
  await supabase
    .from('a2a_task_feedback')
    .delete()
    .eq('tenant_id', TENANT_ID)
    .in('provider_agent_id', Object.values(AGENTS));

  const feedback = [
    // Shopping agent: excellent performer
    ...Array.from({ length: 8 }, () => ({
      id: randomUUID(),
      tenant_id: TENANT_ID,
      task_id: randomUUID(),
      provider_agent_id: AGENTS.shopping,
      action: 'accept',
      satisfaction: 'excellent',
      score: 85 + Math.floor(Math.random() * 15), // 85-99
      comment: 'Fast and accurate product search',
    })),
    // Payout agent: good with some issues
    ...Array.from({ length: 5 }, () => ({
      id: randomUUID(),
      tenant_id: TENANT_ID,
      task_id: randomUUID(),
      provider_agent_id: AGENTS.payout,
      action: 'accept',
      satisfaction: 'acceptable',
      score: 60 + Math.floor(Math.random() * 20), // 60-79
    })),
    {
      id: randomUUID(),
      tenant_id: TENANT_ID,
      task_id: randomUUID(),
      provider_agent_id: AGENTS.payout,
      action: 'reject',
      satisfaction: 'unacceptable',
      score: 20,
      comment: 'Incorrect FX rate used',
    },
    // Procurement agent: mixed reviews
    ...Array.from({ length: 3 }, () => ({
      id: randomUUID(),
      tenant_id: TENANT_ID,
      task_id: randomUUID(),
      provider_agent_id: AGENTS.procurement,
      action: 'accept',
      satisfaction: 'acceptable',
      score: 70 + Math.floor(Math.random() * 10),
    })),
    {
      id: randomUUID(),
      tenant_id: TENANT_ID,
      task_id: randomUUID(),
      provider_agent_id: AGENTS.procurement,
      action: 'reject',
      satisfaction: 'partial',
      score: 40,
    },
    // Travel agent: no feedback yet (should get F / none)
  ];

  const { error } = await supabase.from('a2a_task_feedback').insert(feedback);
  if (error) {
    console.error('Failed to seed feedback:', error.message);
    process.exit(1);
  }
  console.log(`  Seeded ${feedback.length} feedback rows`);
  console.log(`  - Shopping agent:    8 accept (85-99 scores)`);
  console.log(`  - Payout agent:      5 accept + 1 reject`);
  console.log(`  - Procurement agent: 3 accept + 1 reject`);
  console.log(`  - Travel agent:      0 (no data)\n`);
}

async function testReputationEndpoints(apiKey: string) {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  console.log('--- Testing GET /v1/reputation/:id ---\n');

  for (const [name, id] of Object.entries(AGENTS)) {
    try {
      const res = await fetch(`${API_URL}/v1/reputation/${id}`, { headers });
      const json = await res.json();
      const data = json.data || json;

      const tier = data.tier || 'ERR';
      const score = data.score ?? '?';
      const confidence = data.confidence || '?';
      const dims = (data.dimensions || []).length;

      console.log(
        `  ${name.padEnd(14)} → score=${String(score).padStart(4)}, ` +
        `tier=${tier}, confidence=${confidence.padEnd(6)}, dims=${dims}`
      );

      if (name === 'travel') {
        // Should have no data
        if (confidence === 'none' || score === 0) {
          console.log(`    ✓ Correctly returned no reputation for agent with 0 feedback`);
        } else {
          console.log(`    ✗ Expected no data for travel agent`);
        }
      }
    } catch (err: any) {
      console.error(`  ${name.padEnd(14)} → ERROR: ${err.message}`);
    }
  }

  console.log('\n--- Testing GET /v1/reputation/:id/sources ---\n');

  const res = await fetch(`${API_URL}/v1/reputation/${AGENTS.shopping}/sources`, { headers });
  const json = await res.json();
  const data = json.data || json;
  const sources = data.sources || [];

  console.log(`  Shopping agent sources (${sources.length}):`);
  for (const s of sources) {
    const status = s.available ? `score=${s.score}` : 'unavailable';
    console.log(`    ${s.source.padEnd(16)} ${status.padEnd(20)} (${s.latencyMs}ms)`);
  }
}

async function main() {
  console.log('=== Epic 63: External Reputation Bridge — E2E Test ===');

  // Step 1: Seed feedback
  await seedFeedback();

  // Step 2: Get API key
  let apiKey: string;
  if (process.env.API_KEY) {
    apiKey = process.env.API_KEY;
    console.log('Using API_KEY from environment\n');
  } else {
    // Try to find one in the database
    const { data: tenant } = await supabase
      .from('tenants')
      .select('api_key')
      .eq('id', TENANT_ID)
      .single();
    if (tenant?.api_key) {
      apiKey = tenant.api_key;
      console.log('Using tenant legacy api_key\n');
    } else {
      console.log('');
      console.log('No API key found automatically.');
      console.log('Re-run with: API_KEY=pk_test_xxx npx tsx scripts/test-reputation-e2e.ts');
      console.log('');
      console.log('Skipping API tests, but feedback was seeded successfully.');
      console.log('You can test manually:');
      console.log(`  curl -H "Authorization: Bearer YOUR_KEY" ${API_URL}/v1/reputation/${AGENTS.shopping}`);
      return;
    }
  }

  // Step 3: Hit the endpoints
  await testReputationEndpoints(apiKey);

  console.log('\n=== Done ===\n');
}

main().catch(console.error);
