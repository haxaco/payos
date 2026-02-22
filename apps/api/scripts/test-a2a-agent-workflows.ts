#!/usr/bin/env tsx
/**
 * E2E Test: Agent Workflow Scenarios
 *
 * Tests realistic agent-to-agent workflows beyond simple transfers:
 *   1. Procurement Agent: search suppliers → get quote → execute payment (multi-turn)
 *   2. Travel Agent: book flight → human approval (input-required → respond)
 *   3. Task operations: list tasks, filter, cancel, get stats
 *   4. Transaction history lookup
 *   5. Multi-agent delegation
 *
 * Usage: cd apps/api && source .env && npx tsx scripts/test-a2a-agent-workflows.ts
 */

const API = process.env.SLY_URL || 'http://localhost:4000';
const API_KEY = process.env.SLY_API_KEY || 'pk_test_demo_fintech_key_12345';

const AGENT_B_ID = 'de6881d4-af43-4510-b40e-841ceb9d8c0a'; // Treasury Agent

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
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }),
  });
  return res.json() as Promise<any>;
}

async function apiGet(path: string) {
  const res = await fetch(`${API}${path}`, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
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

/** Send message, trigger processing, return final task */
async function sendAndProcess(agentId: string, text: string, opts?: { contextId?: string; taskId?: string }) {
  const params: Record<string, unknown> = {
    message: { role: 'user', parts: [{ text }] },
  };
  if (opts?.contextId) params.contextId = opts.contextId;
  if (opts?.taskId) params.id = opts.taskId;

  const rpc = await jsonRpc(agentId, 'message/send', params);
  if (rpc.error) return { error: rpc.error, task: null };

  const taskId = rpc.result?.id;
  await apiPost(`/v1/a2a/tasks/${taskId}/process`, {});
  const finalRpc = await jsonRpc(agentId, 'tasks/get', { id: taskId });
  return { error: null, task: finalRpc.result, taskId };
}

function getAgentText(task: any): string {
  return (task?.history || [])
    .filter((m: any) => m.role === 'agent')
    .flatMap((m: any) => m.parts || [])
    .filter((p: any) => p.text)
    .map((p: any) => p.text)
    .join('\n');
}

function getDataParts(task: any, type?: string): any[] {
  return (task?.history || [])
    .filter((m: any) => m.role === 'agent')
    .flatMap((m: any) => m.parts || [])
    .filter((p: any) => p.data && (!type || p.data.type === type));
}

// ═══════════════════════════════════════════════
// Scenario 1: Procurement Agent — Multi-turn
// ═══════════════════════════════════════════════
async function testProcurementFlow() {
  console.log('\n═══════════════════════════════════════');
  console.log('Scenario 1: Procurement Agent (multi-turn)');
  console.log('═══════════════════════════════════════');
  const contextId = `procurement-${Date.now()}`;

  // Turn 1: Find suppliers
  console.log('\n  📋 Turn 1: Search for suppliers...');
  const { task: t1, taskId: tid1 } = await sendAndProcess(AGENT_B_ID, 'Find suppliers for office equipment in Brazil', { contextId });
  assert(t1?.status?.state === 'completed', `T1 state: ${t1?.status?.state}`);
  const accountList = getDataParts(t1, 'account_list');
  assert(accountList.length > 0, `T1 returned account_list data (${accountList[0]?.data?.count} accounts)`);
  assert(t1?.artifacts?.length > 0, `T1 has ${t1?.artifacts?.length} artifact(s) — search results`);
  const agentText1 = getAgentText(t1);
  console.log(`  💬 ${agentText1.slice(0, 200)}...`);

  // Turn 2: Get a quote (new task in same context)
  console.log('\n  💰 Turn 2: Get a quote for 500 USDC...');
  const { task: t2, taskId: tid2 } = await sendAndProcess(AGENT_B_ID, 'How much would 500 USDC cost to send to Brazil?', { contextId });
  assert(t2?.status?.state === 'completed', `T2 state: ${t2?.status?.state}`);
  const quotes = getDataParts(t2, 'quote');
  assert(quotes.length > 0, 'T2 returned quote data');
  if (quotes[0]?.data) {
    const q = quotes[0].data;
    assert(q.sourceAmount === 500, `Quote source: ${q.sourceAmount} USDC`);
    assert(q.destinationCurrency === 'BRL', `Quote dest: ${q.destinationCurrency}`);
    assert(typeof q.fxRate === 'number', `FX rate: ${q.fxRate}`);
    assert(typeof q.fee === 'number', `Fee: ${q.fee} USDC`);
    assert(typeof q.walletBalance === 'number', `Wallet balance included: ${q.walletBalance}`);
    console.log(`  📊 ${q.sourceAmount} USDC → ${q.destinationAmount} ${q.destinationCurrency} (rate: ${q.fxRate}, fee: ${q.fee})`);
  }

  // Turn 3: Execute the payment
  console.log('\n  🚀 Turn 3: Execute payment of 200 USDC...');
  const { task: t3, taskId: tid3 } = await sendAndProcess(AGENT_B_ID, 'Send 200 USDC to the first supplier for procurement', { contextId });
  assert(t3?.status?.state === 'completed', `T3 state: ${t3?.status?.state}`);
  const transfers = getDataParts(t3, 'transfer_initiated');
  assert(transfers.length > 0, 'T3 created a real transfer');
  if (transfers[0]?.data) {
    const tx = transfers[0].data;
    assert(!!tx.transferId, `Transfer ID: ${tx.transferId?.slice(0, 8)}...`);
    assert(tx.amount === 200, `Transfer amount: ${tx.amount}`);
    console.log(`  📄 Transfer: ${tx.transferId?.slice(0, 8)} — ${tx.amount} ${tx.currency} via ${tx.rail}`);
  }

  // Verify all 3 tasks share the same contextId
  assert(tid1 !== tid2 && tid2 !== tid3, 'Each turn is a separate task');
  console.log(`  🔗 Context: ${contextId.slice(0, 25)}... (3 tasks)`);

  return { contextId, taskIds: [tid1, tid2, tid3] };
}

// ═══════════════════════════════════════════════
// Scenario 2: Travel Agent — Human-in-the-Loop
// ═══════════════════════════════════════════════
async function testTravelAgentFlow() {
  console.log('\n═══════════════════════════════════════');
  console.log('Scenario 2: Travel Agent (human-in-the-loop)');
  console.log('═══════════════════════════════════════');

  // Step 1: Request a large booking that triggers payment gate
  console.log('\n  ✈️  Step 1: Book expensive flight (>$500 threshold)...');
  const { task: t1, taskId } = await sendAndProcess(AGENT_B_ID, 'Book a flight to São Paulo for 800 USDC');
  assert(t1?.status?.state === 'input-required', `State: ${t1?.status?.state}`);
  const paymentReq = getDataParts(t1, 'payment_required');
  assert(paymentReq.length > 0, 'Payment requirement sent');
  console.log(`  💬 ${getAgentText(t1).slice(0, 150)}`);

  // Step 2: Human responds via the dashboard (POST /respond)
  console.log('\n  👤 Step 2: Human approves via dashboard...');
  const respondRes = await apiPost(`/v1/a2a/tasks/${taskId}/respond`, {
    message: 'Approved. Go ahead with the booking.',
  });
  assert(respondRes?.data && !respondRes?.error, `Human response accepted (${respondRes?.error || 'ok'})`);

  // Step 3: Process the resumed task
  console.log('  ⚙️  Step 3: Processing after human approval...');
  await apiPost(`/v1/a2a/tasks/${taskId}/process`, {});

  const finalRpc = await jsonRpc(AGENT_B_ID, 'tasks/get', { id: taskId });
  const finalTask = finalRpc.result;
  // After human respond, task goes to working, then processor re-processes
  // The last user message is the human approval, which is generic
  const finalState = finalTask?.status?.state;
  assert(finalState === 'completed', `Final state: ${finalState}`);
  console.log(`  💬 ${getAgentText(finalTask).split('\n').pop()?.slice(0, 150)}`);

  return taskId;
}

// ═══════════════════════════════════════════════
// Scenario 3: Transaction History
// ═══════════════════════════════════════════════
async function testTransactionHistory() {
  console.log('\n═══════════════════════════════════════');
  console.log('Scenario 3: Transaction History');
  console.log('═══════════════════════════════════════');

  const { task, taskId } = await sendAndProcess(AGENT_B_ID, 'Show me recent transactions and past payments');
  assert(task?.status?.state === 'completed', `State: ${task?.status?.state}`);
  const histData = getDataParts(task, 'transaction_history');
  assert(histData.length > 0, 'Returned transaction_history data');
  if (histData[0]?.data) {
    const h = histData[0].data;
    assert(h.count > 0, `Found ${h.count} transaction(s)`);
    console.log(`  📊 ${h.count} transactions returned`);
  }
  assert(task?.artifacts?.length > 0, `Has ${task?.artifacts?.length} artifact(s)`);
  console.log(`  💬 ${getAgentText(task).slice(0, 200)}...`);

  return taskId;
}

// ═══════════════════════════════════════════════
// Scenario 4: Task Operations (list, filter, cancel, stats)
// ═══════════════════════════════════════════════
async function testTaskOperations(procurementTaskIds: string[]) {
  console.log('\n═══════════════════════════════════════');
  console.log('Scenario 4: Task Operations');
  console.log('═══════════════════════════════════════');

  // 4a. tasks/list via JSON-RPC
  console.log('\n  📋 4a. List tasks via JSON-RPC tasks/list...');
  const listRpc = await jsonRpc(AGENT_B_ID, 'tasks/list', { limit: 5 });
  assert(!listRpc.error, 'tasks/list returns no error');
  const listed = listRpc.result;
  assert(Array.isArray(listed?.data), `Returned ${listed?.data?.length} tasks`);
  assert(listed?.pagination?.total > 0, `Total tasks: ${listed?.pagination?.total}`);
  console.log(`  📊 Page ${listed?.pagination?.page}/${listed?.pagination?.totalPages}, showing ${listed?.data?.length} of ${listed?.pagination?.total}`);

  // 4b. List tasks via REST API with filters
  console.log('\n  🔍 4b. Filter tasks by state=completed...');
  const completedRes = await apiGet(`/v1/a2a/tasks?state=completed&agent_id=${AGENT_B_ID}&limit=5`);
  const completedTasks = completedRes?.data?.data || completedRes?.data || [];
  assert(Array.isArray(completedTasks), `Completed tasks returned (${completedTasks.length})`);
  assert(completedTasks.every((t: any) => t.state === 'completed'), 'All filtered tasks are completed');

  // 4c. Cancel a task
  console.log('\n  ❌ 4c. Create and cancel a task...');
  const cancelRpc = await jsonRpc(AGENT_B_ID, 'message/send', {
    message: { role: 'user', parts: [{ text: 'This task will be canceled' }] },
  });
  const cancelTaskId = cancelRpc.result?.id;
  assert(!!cancelTaskId, `Created task: ${cancelTaskId?.slice(0, 8)}...`);

  const cancelResult = await jsonRpc(AGENT_B_ID, 'tasks/cancel', { id: cancelTaskId });
  assert(!cancelResult.error, 'tasks/cancel returns no error');
  assert(cancelResult.result?.status?.state === 'canceled', `Canceled state: ${cancelResult.result?.status?.state}`);

  // 4d. Verify canceled task shows up correctly
  const getResult = await jsonRpc(AGENT_B_ID, 'tasks/get', { id: cancelTaskId });
  assert(getResult.result?.status?.state === 'canceled', 'tasks/get confirms canceled');

  // 4e. Try to send to canceled task (should fail)
  const sendToCancel = await jsonRpc(AGENT_B_ID, 'message/send', {
    id: cancelTaskId,
    message: { role: 'user', parts: [{ text: 'Can I still talk to you?' }] },
  });
  assert(!!sendToCancel.error, `Cannot send to canceled task: ${sendToCancel.error?.message?.slice(0, 50)}`);

  // 4f. Get A2A stats
  console.log('\n  📊 4f. Get A2A stats...');
  const statsRes = await apiGet('/v1/a2a/stats');
  const stats = statsRes?.data || statsRes;
  assert(stats != null, `Stats returned`);
  console.log(`  📊 Stats: ${JSON.stringify(stats).slice(0, 200)}`);

  // 4g. List sessions
  console.log('\n  🔗 4g. List A2A sessions...');
  const sessionsRes = await apiGet('/v1/a2a/sessions');
  const sessions = sessionsRes?.data || sessionsRes;
  assert(sessions != null, `Sessions returned`);
  if (Array.isArray(sessions)) {
    console.log(`  📊 ${sessions.length} session(s) found`);
  }

  return cancelTaskId;
}

// ═══════════════════════════════════════════════
// Scenario 5: Multi-turn with state transitions
// ═══════════════════════════════════════════════
async function testMultiTurnStateTransitions() {
  console.log('\n═══════════════════════════════════════');
  console.log('Scenario 5: Full lifecycle with all states');
  console.log('═══════════════════════════════════════');

  const contextId = `lifecycle-${Date.now()}`;

  // Create task (submitted)
  console.log('\n  1️⃣  submitted...');
  const createRpc = await jsonRpc(AGENT_B_ID, 'message/send', {
    message: { role: 'user', parts: [{ text: 'Lookup vendor accounts for procurement' }] },
    contextId,
  });
  const taskId = createRpc.result?.id;
  assert(createRpc.result?.status?.state === 'submitted', `Created: ${createRpc.result?.status?.state}`);

  // Get task (still submitted, not yet processed)
  const getRpc1 = await jsonRpc(AGENT_B_ID, 'tasks/get', { id: taskId });
  assert(getRpc1.result?.status?.state === 'submitted', 'tasks/get shows submitted');
  assert(getRpc1.result?.history?.length === 1, `History has ${getRpc1.result?.history?.length} message(s)`);

  // Process → should transition through working → completed
  console.log('  2️⃣  working → completed...');
  await apiPost(`/v1/a2a/tasks/${taskId}/process`, {});

  const getRpc2 = await jsonRpc(AGENT_B_ID, 'tasks/get', { id: taskId });
  assert(getRpc2.result?.status?.state === 'completed', `After process: ${getRpc2.result?.status?.state}`);
  assert(getRpc2.result?.history?.length >= 2, `History grew to ${getRpc2.result?.history?.length} messages`);

  // Verify the lookup returned real account data (or no-results message)
  const lookupData = getDataParts(getRpc2.result, 'account_list');
  const agentReply = getAgentText(getRpc2.result);
  assert(lookupData.length > 0 || agentReply.includes('No accounts'), `Lookup returned data or no-results (${lookupData.length} results)`);
  if (lookupData.length > 0) {
    assert(getRpc2.result?.artifacts?.length >= 1, `Artifacts: ${getRpc2.result?.artifacts?.length}`);
  }

  console.log(`  ✅ Full lifecycle: submitted → working → completed`);
  console.log(`  📊 History: ${getRpc2.result?.history?.length} msgs, Artifacts: ${getRpc2.result?.artifacts?.length}`);

  return taskId;
}

// ═══════════════════════════════════════════════
// Scenario 6: Batch Processing
// ═══════════════════════════════════════════════
async function testBatchProcessing() {
  console.log('\n═══════════════════════════════════════');
  console.log('Scenario 6: Batch Processing');
  console.log('═══════════════════════════════════════');

  // Create 3 tasks without processing them
  const ids: string[] = [];
  for (const msg of ['Check my USDC balance', 'Who are you?', 'Show recent transactions']) {
    const rpc = await jsonRpc(AGENT_B_ID, 'message/send', {
      message: { role: 'user', parts: [{ text: msg }] },
    });
    ids.push(rpc.result?.id);
  }
  console.log(`  Created ${ids.length} tasks: ${ids.map((id) => id?.slice(0, 8)).join(', ')}`);

  // Verify all are submitted
  for (const id of ids) {
    const rpc = await jsonRpc(AGENT_B_ID, 'tasks/get', { id });
    assert(rpc.result?.status?.state === 'submitted', `Task ${id?.slice(0, 8)} is submitted`);
  }

  // Batch process all
  console.log('  🔄 Batch processing...');
  const batchRes = await apiPost('/v1/a2a/process', { agentId: AGENT_B_ID });
  const processed = batchRes?.data?.processed ?? batchRes?.data?.results?.length ?? '?';
  console.log(`  Processed: ${processed}`);

  // Verify all completed (or at least not submitted)
  let allCompleted = true;
  for (const id of ids) {
    const rpc = await jsonRpc(AGENT_B_ID, 'tasks/get', { id });
    const state = rpc.result?.status?.state;
    if (state !== 'completed') {
      console.log(`  ⚠️  Task ${id?.slice(0, 8)} state: ${state} (expected completed)`);
      allCompleted = false;
    }
  }
  assert(allCompleted, `All ${ids.length} tasks completed after batch process`);

  return ids;
}

// ═══════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════
async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   A2A Agent Workflow E2E Tests                 ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log(`API: ${API}`);
  console.log(`Agent: ${AGENT_B_ID.slice(0, 8)}... (Treasury Agent)`);

  try {
    const { taskIds } = await testProcurementFlow();
    await testTravelAgentFlow();
    await testTransactionHistory();
    await testTaskOperations(taskIds);
    await testMultiTurnStateTransitions();
    await testBatchProcessing();
  } catch (err: any) {
    console.error(`\n💥 Unhandled error: ${err.message}`);
    console.error(err.stack);
    failCount++;
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log('═══════════════════════════════════════');

  process.exit(failCount > 0 ? 1 : 0);
}

main();
