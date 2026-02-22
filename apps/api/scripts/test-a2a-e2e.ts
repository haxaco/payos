#!/usr/bin/env tsx
/**
 * E2E Test: Two-Agent A2A Flow
 *
 * Tests the full lifecycle:
 *   1. Agent A discovers Agent B via /.well-known/agent.json
 *   2. Agent A sends "Check my USDC balance" → real wallet data
 *   3. Agent A sends "Send 100 USDC" (under threshold) → real transfer
 *   4. Agent A sends "Send 1000 USDC" (over threshold) → input-required
 *   5. Agent A submits payment proof → task re-processed & completed
 *
 * Usage: cd apps/api && source .env && npx tsx scripts/test-a2a-e2e.ts
 */

const API = process.env.SLY_URL || 'http://localhost:4000';
const API_KEY = process.env.SLY_API_KEY || 'pk_test_demo_fintech_key_12345';

// Use Treasury Agent (Agent B — the one receiving tasks)
const AGENT_B_ID = 'de6881d4-af43-4510-b40e-841ceb9d8c0a';
// Procurement Bot as Agent A (the caller)
const AGENT_A_ID = 'c4e06008-d0f8-4704-9c8f-6c6b1ebe8e57';

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
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: `req-${Date.now()}` }),
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
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<any>;
}

async function apiPatch(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<any>;
}

// ─────────────────────────────────────────────────
// Setup: Fund Agent B's wallet so transfers work
// ─────────────────────────────────────────────────
async function fundWallet() {
  console.log('\n🏦 Setup: Funding Agent B wallet...');

  // Find Agent B's wallet
  const wallets = await apiGet('/v1/wallets');
  const agentBWallet = wallets.data?.find((w: any) => w.managedByAgentId === AGENT_B_ID);

  if (!agentBWallet) {
    console.log('  ⚠️  No wallet found for Agent B, creating one...');
    // We need to test-fund via the API
    return null;
  }

  console.log(`  Wallet: ${agentBWallet.id} (${agentBWallet.name})`);
  console.log(`  Current balance: ${agentBWallet.balance} ${agentBWallet.currency}`);

  // Fund to 5000 if low
  if (Number(agentBWallet.balance) < 2000) {
    console.log('  Funding wallet to 5000 USDC via test_fund...');
    const fundRes = await apiPost(`/v1/wallets/${agentBWallet.id}/test-fund`, {
      amount: 5000,
      currency: 'USDC',
    });
    if (fundRes.success || fundRes.data) {
      console.log(`  ✅ Funded. New balance: ${fundRes.data?.balance ?? 'unknown'}`);
    } else {
      console.log(`  ⚠️  Fund response: ${JSON.stringify(fundRes).slice(0, 200)}`);
    }
  }

  return agentBWallet.id;
}

// ─────────────────────────────────────────────────
// Step 1: Discovery
// ─────────────────────────────────────────────────
async function testDiscovery() {
  console.log('\n═══════════════════════════════════════');
  console.log('Step 1: Agent A discovers Agent B');
  console.log('═══════════════════════════════════════');

  // 1a. Platform-level discovery
  const platformRes = await fetch(`${API}/.well-known/agent.json`);
  const platformCard = await platformRes.json() as any;
  assert(platformRes.ok, 'Platform /.well-known/agent.json returns 200');
  assert(!!platformCard.name, `Platform card name: "${platformCard.name}"`);
  assert(Array.isArray(platformCard.skills), `Platform has ${platformCard.skills?.length} skills`);

  // 1b. Agent-specific discovery
  const agentCardRes = await fetch(`${API}/a2a/${AGENT_B_ID}/.well-known/agent.json`);
  const agentCard = await agentCardRes.json() as any;
  assert(agentCardRes.ok, 'Agent B /.well-known/agent.json returns 200');
  assert(!!agentCard.name, `Agent B card name: "${agentCard.name}"`);
  assert(Array.isArray(agentCard.skills), `Agent B has ${agentCard.skills?.length} skills`);
  assert(agentCard.capabilities?.multiTurn === true, 'Agent B supports multi-turn');

  // 1c. Skills include payment capabilities
  const skillIds = (agentCard.skills || []).map((s: any) => s.id);
  assert(skillIds.includes('agent_info'), 'Agent B has agent_info skill');
  console.log(`  Skills: ${skillIds.join(', ')}`);

  return agentCard;
}

// ─────────────────────────────────────────────────
// Step 2: Balance Check (real data)
// ─────────────────────────────────────────────────
async function testBalanceCheck() {
  console.log('\n═══════════════════════════════════════');
  console.log('Step 2: Agent A asks Agent B for balance');
  console.log('═══════════════════════════════════════');

  // Send message
  const rpc = await jsonRpc(AGENT_B_ID, 'message/send', {
    message: {
      role: 'user',
      parts: [{ text: 'Check my USDC balance' }],
    },
  });

  assert(!rpc.error, 'message/send returns no error', rpc.error?.message);
  const task = rpc.result;
  assert(!!task?.id, `Task created: ${task?.id?.slice(0, 8)}...`);
  assert(task?.status?.state === 'submitted', `Task state: ${task?.status?.state}`);

  const taskId = task.id;

  // Trigger processing
  console.log('  Triggering processing...');
  const processRes = await apiPost(`/v1/a2a/tasks/${taskId}/process`, {});

  // Fetch final state
  const finalRpc = await jsonRpc(AGENT_B_ID, 'tasks/get', { id: taskId });
  const finalTask = finalRpc.result;
  const finalState = finalTask?.status?.state;

  assert(finalState === 'completed', `Final state: ${finalState}`, finalState !== 'completed' ? `expected completed, got ${finalState}` : undefined);

  // Check for real balance data in messages
  const agentMsgs = (finalTask?.history || []).filter((m: any) => m.role === 'agent');
  const hasDataPart = agentMsgs.some((m: any) =>
    m.parts?.some((p: any) => p.data?.type === 'balance_check')
  );
  assert(hasDataPart, 'Response contains balance_check data part');

  // Print the actual balance info
  for (const msg of agentMsgs) {
    for (const part of msg.parts || []) {
      if (part.text) console.log(`  💬 ${part.text}`);
      if (part.data?.type === 'balance_check') {
        console.log(`  📊 Balance data: ${JSON.stringify(part.data, null, 2).split('\n').join('\n     ')}`);
      }
    }
  }

  return taskId;
}

// ─────────────────────────────────────────────────
// Step 3: Small Payment (under threshold, real transfer)
// ─────────────────────────────────────────────────
async function testSmallPayment() {
  console.log('\n═══════════════════════════════════════');
  console.log('Step 3: Agent A sends 100 USDC (under $500 threshold)');
  console.log('═══════════════════════════════════════');

  const rpc = await jsonRpc(AGENT_B_ID, 'message/send', {
    message: {
      role: 'user',
      parts: [{ text: 'Send 100 USDC payment for cloud services' }],
    },
  });

  assert(!rpc.error, 'message/send returns no error', rpc.error?.message);
  const taskId = rpc.result?.id;
  console.log(`  Task: ${taskId?.slice(0, 8)}...`);

  // Process
  await apiPost(`/v1/a2a/tasks/${taskId}/process`, {});

  // Fetch result
  const finalRpc = await jsonRpc(AGENT_B_ID, 'tasks/get', { id: taskId });
  const finalTask = finalRpc.result;
  const finalState = finalTask?.status?.state;

  assert(finalState === 'completed', `Final state: ${finalState}`, finalState !== 'completed' ? `msg: ${finalTask?.status?.message}` : undefined);

  // Check for real transfer ID (not mock txn_*)
  const agentMsgs = (finalTask?.history || []).filter((m: any) => m.role === 'agent');
  let transferId: string | null = null;

  for (const msg of agentMsgs) {
    for (const part of msg.parts || []) {
      if (part.text) console.log(`  💬 ${part.text}`);
      if (part.data?.transferId) {
        transferId = part.data.transferId;
      }
    }
  }

  assert(!!transferId, `Real transfer ID: ${transferId?.slice(0, 8)}...`);
  assert(!transferId?.startsWith('txn_'), 'Transfer ID is NOT a mock txn_* ID');

  // Verify transfer exists in DB
  if (transferId) {
    const transferRes = await apiGet(`/v1/transfers/${transferId}`);
    // Response is { success, data: { data: { ... } } }
    const transfer = transferRes?.data?.data || transferRes?.data || transferRes;
    const tStatus = transfer?.status;
    const tAmount = transfer?.amount;
    const tCurrency = transfer?.currency;
    assert(tStatus === 'completed', `Transfer status in DB: ${tStatus}`);
    assert(Number(tAmount) === 100, `Transfer amount: ${tAmount}`);
    console.log(`  📄 Transfer: ${transferId} — ${tAmount} ${tCurrency} (${tStatus})`);
  }

  // Verify task has linked transfer
  const taskDetail = await apiGet(`/v1/a2a/tasks/${taskId}`);
  const linkedTransfer = taskDetail.data?.transferId || taskDetail.transferId;
  assert(!!linkedTransfer, `Task linked to transfer: ${linkedTransfer?.slice(0, 8)}...`);

  return { taskId, transferId };
}

// ─────────────────────────────────────────────────
// Step 4: Large Payment (over threshold → payment gating)
// ─────────────────────────────────────────────────
async function testLargePayment() {
  console.log('\n═══════════════════════════════════════');
  console.log('Step 4: Agent A sends 1000 USDC (over $500 threshold)');
  console.log('═══════════════════════════════════════');

  const contextId = `e2e-session-${Date.now()}`;

  // 4a. Send the big request
  const rpc = await jsonRpc(AGENT_B_ID, 'message/send', {
    message: {
      role: 'user',
      parts: [{ text: 'Send 1000 USDC to Brazil for supplier payment' }],
    },
    contextId,
  });

  assert(!rpc.error, 'message/send returns no error', rpc.error?.message);
  const taskId = rpc.result?.id;
  console.log(`  Task: ${taskId?.slice(0, 8)}... (context: ${contextId.slice(0, 20)}...)`);

  // 4b. Process — should go to input-required
  console.log('  Processing (expecting payment gate)...');
  await apiPost(`/v1/a2a/tasks/${taskId}/process`, {});

  const midRpc = await jsonRpc(AGENT_B_ID, 'tasks/get', { id: taskId });
  const midTask = midRpc.result;
  const midState = midTask?.status?.state;

  assert(midState === 'input-required', `Mid-state: ${midState}`, midState !== 'input-required' ? `expected input-required, got ${midState}` : undefined);

  // Check metadata has payment info
  const meta = midTask?.metadata || {};
  assert(meta['x402.payment.required'] === true, 'Metadata has x402.payment.required');
  assert(meta['a2a.original_intent'] != null, `Original intent stored: "${String(meta['a2a.original_intent']).slice(0, 50)}..."`);
  assert(Number(meta['x402.payment.amount']) === 1000, `Payment amount: ${meta['x402.payment.amount']}`);

  // Check agent message has payment_required data
  const agentMsgs = (midTask?.history || []).filter((m: any) => m.role === 'agent');
  const hasPaymentRequired = agentMsgs.some((m: any) =>
    m.parts?.some((p: any) => p.data?.type === 'payment_required')
  );
  assert(hasPaymentRequired, 'Agent sent payment_required data part');

  for (const msg of agentMsgs) {
    for (const part of msg.parts || []) {
      if (part.text) console.log(`  💬 ${part.text}`);
    }
  }

  return { taskId, contextId };
}

// ─────────────────────────────────────────────────
// Step 5: Submit Payment Proof → Resume & Complete
// ─────────────────────────────────────────────────
async function testPaymentProof(taskId: string, contextId: string) {
  console.log('\n═══════════════════════════════════════');
  console.log('Step 5: Agent A submits payment proof');
  console.log('═══════════════════════════════════════');

  // First, create a real transfer to use as proof
  console.log('  Creating a transfer to use as payment proof...');

  // Get accounts for from/to fields
  const accountsRes = await apiGet('/v1/accounts');
  const firstAccount = accountsRes.data?.[0];
  if (!firstAccount) {
    console.log('  ❌ Cannot find any account for transfer creation');
    failCount++;
    return;
  }

  // Create an internal transfer between the same account (simplest valid transfer)
  const proofTransferRes = await apiPost('/v1/transfers', {
    type: 'internal',
    amount: 1000,
    currency: 'USDC',
    description: 'Payment proof for A2A task',
    fromAccountId: firstAccount.id,
    toAccountId: firstAccount.id,
  });

  let proofTransferId: string | null = null;

  if (proofTransferRes.data?.id || proofTransferRes.id) {
    proofTransferId = proofTransferRes.data?.id || proofTransferRes.id;
    console.log(`  Transfer created: ${proofTransferId?.slice(0, 8)}...`);
  } else {
    console.log(`  ⚠️  Transfer creation response: ${JSON.stringify(proofTransferRes).slice(0, 300)}`);
    console.log('  Attempting alternative: find an existing completed transfer...');

    // Fallback: look for any existing completed transfer
    const transfersRes = await apiGet('/v1/transfers?status=completed&limit=1');
    const existingTransfer = transfersRes.data?.[0];
    if (existingTransfer) {
      proofTransferId = existingTransfer.id;
      console.log(`  Using existing transfer: ${proofTransferId?.slice(0, 8)}...`);
    }
  }

  if (!proofTransferId) {
    console.log('  ❌ Cannot create or find a transfer for payment proof');
    failCount++;
    return;
  }

  // 5a. Send follow-up with payment proof data part
  console.log('  Sending payment proof via message/send...');
  const rpc = await jsonRpc(AGENT_B_ID, 'message/send', {
    id: taskId,
    message: {
      role: 'user',
      parts: [
        { text: 'Payment completed' },
        {
          data: {
            type: 'payment_proof',
            paymentType: 'wallet',
            transferId: proofTransferId || taskId, // use taskId as fallback
          },
          metadata: { mimeType: 'application/json' },
        },
      ],
    },
  });

  assert(!rpc.error, 'Payment proof message accepted', rpc.error?.message);
  const afterProofTask = rpc.result;
  const afterProofState = afterProofTask?.status?.state;
  console.log(`  State after proof: ${afterProofState}`);

  // If payment was verified, task should be 'submitted' (ready for re-processing)
  if (afterProofState === 'submitted') {
    assert(true, 'Task transitioned to submitted (ready for re-processing)');

    // 5b. Process again — should complete via handlePaymentResumption
    console.log('  Re-processing task after payment...');
    await apiPost(`/v1/a2a/tasks/${taskId}/process`, {});

    const finalRpc = await jsonRpc(AGENT_B_ID, 'tasks/get', { id: taskId });
    const finalTask = finalRpc.result;
    const finalState = finalTask?.status?.state;

    assert(finalState === 'completed', `Final state: ${finalState}`, finalState !== 'completed' ? `msg: ${finalTask?.status?.message}` : undefined);

    // Check completion message has real data
    const agentMsgs = (finalTask?.history || []).filter((m: any) => m.role === 'agent');
    const hasCompletion = agentMsgs.some((m: any) =>
      m.parts?.some((p: any) => p.data?.type === 'payment_completed' || p.data?.type === 'payment_verified')
    );
    assert(hasCompletion, 'Completion message has payment data');

    for (const msg of agentMsgs.slice(-2)) {
      for (const part of msg.parts || []) {
        if (part.text) console.log(`  💬 ${part.text}`);
      }
    }

    // Check artifacts
    const artifacts = finalTask?.artifacts || [];
    assert(artifacts.length > 0, `Task has ${artifacts.length} artifact(s)`);
  } else if (afterProofState === 'input-required') {
    // Payment verification might have failed (e.g., transfer not found/completed)
    console.log('  ⚠️  Payment verification likely failed (transfer not in completed state)');
    const agentMsgs = (afterProofTask?.history || []).filter((m: any) => m.role === 'agent');
    for (const msg of agentMsgs.slice(-1)) {
      for (const part of msg.parts || []) {
        if (part.text) console.log(`  💬 ${part.text}`);
      }
    }
    assert(false, 'Payment proof should have been verified');
  } else {
    assert(false, `Unexpected state after proof: ${afterProofState}`);
  }
}

// ─────────────────────────────────────────────────
// Step 6: Agent Info (real data)
// ─────────────────────────────────────────────────
async function testAgentInfo() {
  console.log('\n═══════════════════════════════════════');
  console.log('Step 6: Agent A asks "Who are you?"');
  console.log('═══════════════════════════════════════');

  const rpc = await jsonRpc(AGENT_B_ID, 'message/send', {
    message: {
      role: 'user',
      parts: [{ text: 'What are your capabilities? Who are you?' }],
    },
  });

  const taskId = rpc.result?.id;
  await apiPost(`/v1/a2a/tasks/${taskId}/process`, {});

  const finalRpc = await jsonRpc(AGENT_B_ID, 'tasks/get', { id: taskId });
  const finalTask = finalRpc.result;

  assert(finalTask?.status?.state === 'completed', `State: ${finalTask?.status?.state}`);

  const agentMsgs = (finalTask?.history || []).filter((m: any) => m.role === 'agent');
  const hasAgentInfo = agentMsgs.some((m: any) =>
    m.parts?.some((p: any) => p.data?.type === 'agent_info')
  );
  assert(hasAgentInfo, 'Response contains agent_info data part');

  for (const msg of agentMsgs) {
    for (const part of msg.parts || []) {
      if (part.text) console.log(`  💬 ${part.text}`);
      if (part.data?.type === 'agent_info') {
        const d = part.data;
        console.log(`  📊 Agent: ${d.name} | KYA Tier: ${d.kyaTier} | Wallet: ${d.walletBalance ?? 'none'} ${d.walletCurrency ?? ''}`);
      }
    }
  }
}

// ─────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────
async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   A2A E2E Test: Two-Agent Payment Flow    ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log(`API: ${API}`);
  console.log(`Agent A (caller): ${AGENT_A_ID.slice(0, 8)}... (Procurement Bot)`);
  console.log(`Agent B (server): ${AGENT_B_ID.slice(0, 8)}... (Treasury Agent)`);

  try {
    await fundWallet();
    await testDiscovery();
    await testBalanceCheck();
    await testSmallPayment();
    const { taskId, contextId } = await testLargePayment();
    await testPaymentProof(taskId, contextId);
    await testAgentInfo();
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
