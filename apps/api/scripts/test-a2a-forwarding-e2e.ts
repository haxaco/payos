#!/usr/bin/env tsx
/**
 * E2E Test: Agent-Driven Forwarding
 *
 * Tests the new routing model:
 *   1. Agent with endpoint + sly_native skill → "Check balance" processed locally
 *   2. Agent with endpoint + no native match → "Generate invoice" forwarded to agent
 *   3. Agent without endpoint → unmatched message → generic help text
 *   4. Explicit metadata.skillId → forwarded with skillId preserved
 *   5. Sly-native intent (payment) → forwarded if no sly_native registered
 *
 * Prerequisites:
 *   - API running on :4000
 *   - Invoice Bot (a2a-test-agent) running on :4200
 *   - Seed data loaded (pnpm --filter @sly/api seed:db)
 *
 * Usage: cd apps/api && source .env && npx tsx scripts/test-a2a-forwarding-e2e.ts
 */

import { createClient } from '@supabase/supabase-js';

const API = process.env.SLY_URL || 'http://localhost:4000';
const API_KEY = process.env.SLY_API_KEY || 'pk_test_demo_fintech_key_12345';
const INVOICE_BOT_URL = 'http://localhost:4200/a2a';

// Treasury Agent — will be configured with endpoint
const AGENT_ID = 'de6881d4-af43-4510-b40e-841ceb9d8c0a';
const TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

// Direct Supabase client for setup/teardown (bypasses API route issue)
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passCount++;
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
    failCount++;
  }
}

async function jsonRpc(agentId: string, method: string, params: Record<string, unknown>) {
  const res = await fetch(`${API}/a2a/${agentId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }),
  });
  return res.json() as Promise<any>;
}

async function apiGet(path: string) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  return res.json() as Promise<any>;
}

async function apiPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<any>;
}

async function apiPut(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<any>;
}

async function apiDelete(path: string) {
  const res = await fetch(`${API}${path}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  return res.json() as Promise<any>;
}

/** Send a task and trigger processing, return the final task */
async function sendAndProcess(agentId: string, text: string, metadata?: Record<string, unknown>) {
  const msg: any = { role: 'user', parts: [{ text }] };
  if (metadata) msg.metadata = metadata;

  const rpc = await jsonRpc(agentId, 'message/send', { message: msg });
  if (rpc.error) return { error: rpc.error, task: null };

  const taskId = rpc.result?.id;
  if (!taskId) return { error: { message: 'No task ID' }, task: null };

  // Trigger processing
  await apiPost(`/v1/a2a/tasks/${taskId}/process`, {});

  // Small delay to let async forwarding complete
  await new Promise((r) => setTimeout(r, 1500));

  // Fetch final state
  const finalRpc = await jsonRpc(agentId, 'tasks/get', { id: taskId });
  return { error: null, task: finalRpc.result };
}

function getAgentText(task: any): string {
  const msgs = (task?.history || []).filter((m: any) => m.role === 'agent');
  return msgs.flatMap((m: any) => m.parts?.filter((p: any) => p.text).map((p: any) => p.text) || []).join(' | ');
}

function getDataParts(task: any, type?: string): any[] {
  const msgs = (task?.history || []).filter((m: any) => m.role === 'agent');
  const parts = msgs.flatMap((m: any) => m.parts?.filter((p: any) => p.data) || []);
  if (type) return parts.filter((p: any) => p.data?.type === type);
  return parts;
}

// ─────────────────────────────────────────────────
// Setup: Register endpoint + skills
// ─────────────────────────────────────────────────
async function setup() {
  console.log('\n🔧 Setup: Configuring agent for forwarding tests');

  // Verify Invoice Bot is reachable
  try {
    const health = await fetch('http://localhost:4200/health');
    const h = await health.json() as any;
    assert(h.status === 'healthy', `Invoice Bot running: ${h.agent}`);
  } catch {
    console.log('  ❌ Invoice Bot not running on :4200. Start it: cd apps/a2a-test-agent && npm run dev');
    process.exit(1);
  }

  // Register A2A endpoint pointing to Invoice Bot (direct DB — API route has a registration issue)
  console.log('  Registering endpoint → http://localhost:4200/a2a');
  const { data: epData, error: epError } = await supabase
    .from('agents')
    .update({ endpoint_url: INVOICE_BOT_URL, endpoint_type: 'a2a', endpoint_enabled: true })
    .eq('id', AGENT_ID)
    .select('id, endpoint_url, endpoint_type, endpoint_enabled')
    .single();
  assert(epData?.endpoint_enabled === true, `Endpoint registered: ${epData?.endpoint_type}`, epError?.message);

  // Register check_balance as sly_native (so balance checks stay local)
  console.log('  Registering check_balance as sly_native...');
  const { error: balErr } = await supabase
    .from('agent_skills')
    .upsert({
      agent_id: AGENT_ID,
      tenant_id: TENANT_ID,
      skill_id: 'check_balance',
      name: 'Check Balance',
      description: 'Check wallet balance (Sly-native)',
      handler_type: 'sly_native',
      tags: ['wallets', 'balance'],
      base_price: 0,
      currency: 'USDC',
      status: 'active',
    }, { onConflict: 'tenant_id,agent_id,skill_id' });
  if (!balErr) {
    console.log('  ✅ check_balance skill ready');
  } else {
    console.log(`  ⚠️  Skill error: ${balErr.message}`);
  }

  // Register agent_info as sly_native too
  const { error: infoErr } = await supabase.from('agent_skills').upsert({
    agent_id: AGENT_ID, tenant_id: TENANT_ID,
    skill_id: 'agent_info', name: 'Agent Info', description: 'Get agent capabilities (Sly-native)',
    handler_type: 'sly_native', tags: ['info'], base_price: 0, currency: 'USDC', status: 'active',
  }, { onConflict: 'tenant_id,agent_id,skill_id' });
  if (infoErr) console.log(`  ⚠️  agent_info error: ${infoErr.message}`);

  console.log('');
}

// ─────────────────────────────────────────────────
// Test 1: Sly-native skill → processed locally
// ─────────────────────────────────────────────────
async function test1_slyNativeLocal() {
  console.log('═══════════════════════════════════════');
  console.log('Test 1: Sly-native skill → processed locally');
  console.log('  "Check my balance" → check_balance registered as sly_native');
  console.log('═══════════════════════════════════════');

  const { task, error } = await sendAndProcess(AGENT_ID, 'Check my USDC balance');
  assert(!error, 'No error', error?.message);
  assert(task?.status?.state === 'completed', `State: ${task?.status?.state}`);

  // Should have balance_check data (processed locally by Sly)
  const balData = getDataParts(task, 'balance_check');
  assert(balData.length > 0, 'Has balance_check data part (locally processed)');

  const text = getAgentText(task);
  assert(text.includes('balance') || text.includes('Balance') || text.includes('wallet'), `Response: "${text.slice(0, 80)}..."`);

  // Verify Invoice Bot did NOT receive this task
  const botTasks = await fetch('http://localhost:4200/test/tasks').then(r => r.json()) as any;
  const botTaskCount = botTasks.tasks?.length || 0;
  console.log(`  Invoice Bot tasks: ${botTaskCount} (should be 0 at this point)`);
}

// ─────────────────────────────────────────────────
// Test 2: Unmatched message → forwarded to agent
// ─────────────────────────────────────────────────
async function test2_forwardUnmatched() {
  console.log('\n═══════════════════════════════════════');
  console.log('Test 2: Unmatched message → forwarded to agent');
  console.log('  "Generate an invoice for 500 USDC" → no sly_native match → forward');
  console.log('═══════════════════════════════════════');

  // Record Invoice Bot task count before
  const beforeTasks = await fetch('http://localhost:4200/test/tasks').then(r => r.json()) as any;
  const beforeCount = beforeTasks.tasks?.length || 0;

  const { task, error } = await sendAndProcess(AGENT_ID, 'Generate an invoice for 500 USDC for consulting services');
  assert(!error, 'No error', error?.message);

  const state = task?.status?.state;
  assert(state === 'completed', `State: ${state}`, state !== 'completed' ? `msg: ${task?.status?.message}` : undefined);

  // The response should contain Invoice Bot's response text
  const text = getAgentText(task);
  console.log(`  Agent response: "${text.slice(0, 120)}..."`);
  assert(
    text.toLowerCase().includes('invoice') || text.toLowerCase().includes('inv-'),
    'Response mentions invoice (came from Invoice Bot)',
  );

  // Verify Invoice Bot DID receive this task
  const afterTasks = await fetch('http://localhost:4200/test/tasks').then(r => r.json()) as any;
  const afterCount = afterTasks.tasks?.length || 0;
  assert(afterCount > beforeCount, `Invoice Bot received task (${beforeCount} → ${afterCount})`);
}

// ─────────────────────────────────────────────────
// Test 3: Another unmatched message (completely custom)
// ─────────────────────────────────────────────────
async function test3_forwardCustomMessage() {
  console.log('\n═══════════════════════════════════════');
  console.log('Test 3: Custom message → forwarded to agent');
  console.log('  "What is the status of my invoices?" → no sly_native match → forward');
  console.log('═══════════════════════════════════════');

  const { task, error } = await sendAndProcess(AGENT_ID, 'What is the status of my invoices?');
  assert(!error, 'No error', error?.message);

  const state = task?.status?.state;
  assert(state === 'completed', `State: ${state}`);

  const text = getAgentText(task);
  console.log(`  Agent response: "${text.slice(0, 120)}..."`);
  // Invoice Bot responds to "status"/"check" with invoice status info
  assert(text.length > 0, 'Got a non-empty response from agent');
}

// ─────────────────────────────────────────────────
// Test 4: Explicit metadata.skillId → forwarded with skillId
// ─────────────────────────────────────────────────
async function test4_explicitSkillId() {
  console.log('\n═══════════════════════════════════════');
  console.log('Test 4: Explicit metadata.skillId → forwarded with skillId');
  console.log('  Caller sends skillId="create_invoice" in metadata');
  console.log('═══════════════════════════════════════');

  // Send with explicit skillId in metadata
  const msg: any = {
    role: 'user',
    parts: [{ text: 'Create an invoice for 2000 USDC for annual license' }],
    metadata: { skillId: 'create_invoice' },
  };
  const rpc = await jsonRpc(AGENT_ID, 'message/send', { message: msg });
  assert(!rpc.error, 'No error', rpc.error?.message);

  const taskId = rpc.result?.id;
  await apiPost(`/v1/a2a/tasks/${taskId}/process`, {});
  await new Promise((r) => setTimeout(r, 1500));

  const finalRpc = await jsonRpc(AGENT_ID, 'tasks/get', { id: taskId });
  const task = finalRpc.result;

  assert(task?.status?.state === 'completed', `State: ${task?.status?.state}`);

  const text = getAgentText(task);
  console.log(`  Agent response: "${text.slice(0, 120)}..."`);
  assert(text.toLowerCase().includes('invoice'), 'Response mentions invoice');

  // Check that the Invoice Bot received the skillId in metadata
  // (We can't directly check Invoice Bot's received metadata, but we verify the task completed
  // with Invoice Bot's response — which means forwarding worked with the metadata)
  const botTasks = await fetch('http://localhost:4200/test/tasks').then(r => r.json()) as any;
  console.log(`  Invoice Bot total tasks: ${botTasks.tasks?.length || 0}`);
}

// ─────────────────────────────────────────────────
// Test 5: Disable endpoint → unmatched falls to generic help
// ─────────────────────────────────────────────────
async function test5_noEndpointFallback() {
  console.log('\n═══════════════════════════════════════');
  console.log('Test 5: No endpoint → unmatched falls to generic help');
  console.log('  Disable endpoint, send unmatched message → handleGeneric()');
  console.log('═══════════════════════════════════════');

  // Disable endpoint (direct DB)
  const { data: delData } = await supabase
    .from('agents')
    .update({ endpoint_url: null, endpoint_type: 'none', endpoint_enabled: false, endpoint_secret: null })
    .eq('id', AGENT_ID)
    .select('endpoint_enabled')
    .single();
  assert(delData?.endpoint_enabled === false, 'Endpoint disabled');

  const { task, error } = await sendAndProcess(AGENT_ID, 'Generate an invoice for 300 USDC');
  assert(!error, 'No error', error?.message);
  assert(task?.status?.state === 'completed', `State: ${task?.status?.state}`);

  const text = getAgentText(task);
  console.log(`  Response: "${text.slice(0, 120)}..."`);
  // Should get generic help text (not Invoice Bot response)
  assert(
    text.includes('can help with') || text.includes('Payments') || text.includes('Balance'),
    'Got generic help text (not forwarded)',
  );
  assert(
    !text.toLowerCase().includes('inv-acme'),
    'Response does NOT contain Invoice Bot invoice number',
  );
}

// ─────────────────────────────────────────────────
// Test 6: Re-enable endpoint, verify sly-native intent
//         (payment) forwards when NOT registered as native
// ─────────────────────────────────────────────────
async function test6_paymentIntentForwards() {
  console.log('\n═══════════════════════════════════════');
  console.log('Test 6: Payment intent → forwards when make_payment NOT registered');
  console.log('  "Send 50 USDC" → payment intent, but no sly_native make_payment → forward');
  console.log('═══════════════════════════════════════');

  // Re-enable endpoint (direct DB)
  const { data: epRes } = await supabase
    .from('agents')
    .update({ endpoint_url: INVOICE_BOT_URL, endpoint_type: 'a2a', endpoint_enabled: true })
    .eq('id', AGENT_ID)
    .select('endpoint_enabled')
    .single();
  assert(epRes?.endpoint_enabled === true, 'Endpoint re-enabled');

  // NOTE: We have check_balance as sly_native, but NOT make_payment
  // So "Send 50 USDC" (payment intent) should forward to the agent
  const beforeTasks = await fetch('http://localhost:4200/test/tasks').then(r => r.json()) as any;
  const beforeCount = beforeTasks.tasks?.length || 0;

  const { task, error } = await sendAndProcess(AGENT_ID, 'Send 50 USDC payment for services');
  assert(!error, 'No error', error?.message);

  const state = task?.status?.state;
  assert(state === 'completed', `State: ${state}`);

  const text = getAgentText(task);
  console.log(`  Response: "${text.slice(0, 120)}..."`);

  // Invoice Bot auto-responds to "payment" keyword with invoice response
  const afterTasks = await fetch('http://localhost:4200/test/tasks').then(r => r.json()) as any;
  const afterCount = afterTasks.tasks?.length || 0;
  assert(afterCount > beforeCount, `Invoice Bot received payment task (${beforeCount} → ${afterCount})`);
}

// ─────────────────────────────────────────────────
// Test 7: Register make_payment as sly_native → payment handled locally
// ─────────────────────────────────────────────────
async function test7_nativePaymentLocal() {
  console.log('\n═══════════════════════════════════════');
  console.log('Test 7: Register make_payment as sly_native → payment handled locally');
  console.log('  "Send 25 USDC" → payment intent, make_payment IS sly_native → local');
  console.log('═══════════════════════════════════════');

  // Register make_payment as sly_native (direct DB)
  await supabase.from('agent_skills').upsert({
    agent_id: AGENT_ID, tenant_id: TENANT_ID,
    skill_id: 'make_payment', name: 'Make Payment', description: 'Process payments (Sly-native)',
    handler_type: 'sly_native', tags: ['payments'], base_price: 0, currency: 'USDC', status: 'active',
  }, { onConflict: 'tenant_id,agent_id,skill_id' });

  // Fund wallet so payment can succeed
  const wallets = await apiGet('/v1/wallets');
  const agentWallet = wallets.data?.find((w: any) => w.managedByAgentId === AGENT_ID);
  if (agentWallet && Number(agentWallet.balance) < 100) {
    await apiPost(`/v1/wallets/${agentWallet.id}/test-fund`, { amount: 1000, currency: 'USDC' });
  }

  const beforeTasks = await fetch('http://localhost:4200/test/tasks').then(r => r.json()) as any;
  const beforeCount = beforeTasks.tasks?.length || 0;

  const { task, error } = await sendAndProcess(AGENT_ID, 'Send 25 USDC');
  assert(!error, 'No error', error?.message);

  const state = task?.status?.state;
  // Could be completed (payment succeeded) or failed (insufficient funds)
  console.log(`  State: ${state}`);

  const text = getAgentText(task);
  console.log(`  Response: "${text.slice(0, 120)}..."`);

  // Key assertion: Invoice Bot should NOT have received this
  const afterTasks = await fetch('http://localhost:4200/test/tasks').then(r => r.json()) as any;
  const afterCount = afterTasks.tasks?.length || 0;
  assert(afterCount === beforeCount, `Invoice Bot NOT called (${beforeCount} → ${afterCount})`);

  // The response should be from Sly (payment-related, not invoice-related)
  assert(
    !text.toLowerCase().includes('inv-acme'),
    'Response is NOT from Invoice Bot',
  );
}

// ─────────────────────────────────────────────────
// Cleanup
// ─────────────────────────────────────────────────
async function cleanup() {
  console.log('\n🧹 Cleanup: Removing endpoint and test skills');

  // Remove endpoint (direct DB)
  await supabase
    .from('agents')
    .update({ endpoint_url: null, endpoint_type: 'none', endpoint_enabled: false, endpoint_secret: null })
    .eq('id', AGENT_ID);

  // Remove test skills
  await supabase
    .from('agent_skills')
    .delete()
    .eq('agent_id', AGENT_ID)
    .in('skill_id', ['check_balance', 'agent_info', 'make_payment']);

  console.log('  Done.');
}

// ─────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────
async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   A2A Forwarding E2E: Agent-Driven Routing Test   ║');
  console.log('╚═══════════════════════════════════════════════════╝');
  console.log(`API:          ${API}`);
  console.log(`Agent:        ${AGENT_ID.slice(0, 8)}... (Treasury Agent)`);
  console.log(`Invoice Bot:  ${INVOICE_BOT_URL}`);

  try {
    await setup();
    await test1_slyNativeLocal();
    await test2_forwardUnmatched();
    await test3_forwardCustomMessage();
    await test4_explicitSkillId();
    await test5_noEndpointFallback();
    await test6_paymentIntentForwards();
    await test7_nativePaymentLocal();
  } catch (err: any) {
    console.error(`\n💥 Unhandled error: ${err.message}`);
    console.error(err.stack);
    failCount++;
  } finally {
    await cleanup();
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log('═══════════════════════════════════════');

  process.exit(failCount > 0 ? 1 : 0);
}

main();
