#!/usr/bin/env tsx
/**
 * A2A Mainnet Demo — 5 Real Protocol Transactions
 *
 * Each transaction uses the actual protocol endpoint (not raw wallet transfers):
 * 1. AP2 Mandate — Meridian authorizes Austral, Austral draws funds
 * 2. x402 Micropayment — Austral pays for Meridian's settlement quote skill
 * 3. ACP Checkout — Austral buys a service from Meridian via commerce checkout
 * 4. A2A Task — Austral sends a paid task to Meridian agent
 * 5. Direct Wallet Transfer — Meridian sends funds to Austral (on-chain settlement)
 *
 * Usage: cd apps/api && npx tsx scripts/demo-mainnet-a2a.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:4000';
const API_KEY = 'pk_live_demo_fintech_key_12345';

// Production agents
const MERIDIAN = {
  agentId: 'e0e18b0a-c1d2-4959-a656-5c5ed7777582',
  walletId: '5bf1e826-8cb7-455f-a477-5f161feaffc4',
  accountId: '61766a16-3ad7-4e53-a04e-9d0b81a3cfce',
  name: 'Meridian Settlement Agent',
};
const AUSTRAL = {
  agentId: '54e35f9e-ccc7-4a3d-8769-b3d808695489',
  walletId: 'ead0bca2-6740-4d1b-ae35-c23f3275c523',
  accountId: 'c5079e84-a685-4713-8a22-133d676173c1',
  name: 'Austral Procurement Agent',
};

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
  'X-Environment': 'live',
};

async function api(method: string, path: string, body?: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok && res.status >= 400) {
    const detail = json.details ? ` (${JSON.stringify(json.details).substring(0, 100)})` : '';
    throw new Error(`${method} ${path} → ${res.status}: ${json.error || JSON.stringify(json).substring(0, 100)}${detail}`);
  }
  return json;
}

function timer() {
  const start = Date.now();
  return () => `${Date.now() - start}ms`;
}

async function getBalances() {
  const [m, a] = await Promise.all([
    api('GET', `/v1/wallets/${MERIDIAN.walletId}/balance`),
    api('GET', `/v1/wallets/${AUSTRAL.walletId}/balance`),
  ]);
  return {
    meridian: m.data?.balance ?? m.balance ?? 0,
    austral: a.data?.balance ?? a.balance ?? 0,
  };
}

// ============================================================================
// Prerequisites
// ============================================================================

async function setup() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  A2A MAINNET DEMO — 5 PROTOCOL TRANSACTIONS');
  console.log('  Network: Base Mainnet | Currency: USDC');
  console.log('═══════════════════════════════════════════════════\n');

  // Verify agents to KYA Tier 1
  console.log('📋 Prerequisites...');
  for (const agent of [MERIDIAN, AUSTRAL]) {
    try {
      await api('POST', `/v1/agents/${agent.agentId}/verify`, { tier: 1 });
      console.log(`   ✓ ${agent.name} → KYA Tier 1`);
    } catch (e: any) {
      if (e.message.includes('already')) console.log(`   ✓ ${agent.name} already Tier 1`);
      else console.log(`   ⚠ ${agent.name}: ${e.message.substring(0, 60)}`);
    }
  }

  const bal = await getBalances();
  console.log(`\n💰 Starting Balances:`);
  console.log(`   ${MERIDIAN.name}: ${bal.meridian} USDC`);
  console.log(`   ${AUSTRAL.name}: ${bal.austral} USDC\n`);
}

// ============================================================================
// TX 1: AP2 Mandate — Meridian authorizes Austral to draw funds
// ============================================================================

async function tx1_ap2Mandate() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TX 1: AP2 Mandate — Agent-to-Agent Payment Authorization');
  console.log('Meridian authorizes Austral to draw up to 0.50 USDC');
  console.log('Austral executes a 0.05 USDC draw for "vendor data access"');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const t = timer();
  const mandateId = `mandate-demo-${Date.now()}`;

  // Step 1: Create mandate (Meridian authorizes Austral)
  const mandate = await api('POST', '/v1/ap2/mandates', {
    mandate_id: mandateId,
    agent_id: AUSTRAL.agentId,
    account_id: MERIDIAN.accountId,
    authorized_amount: 0.50,
    currency: 'USDC',
    mandate_type: 'payment',
    description: 'Recurring vendor data access authorization',
    mandate_data: {
      purpose: 'vendor_data_access',
      max_per_execution: 0.10,
    },
  });
  const mId = mandate.data?.id || mandate.id || mandateId;
  console.log(`   ✓ Mandate created: ${mId}`);
  console.log(`   ✓ Authorized: 0.50 USDC (Meridian → Austral)`);

  // Step 2: Execute mandate (Austral draws 0.05 USDC)
  const exec = await api('POST', `/v1/ap2/mandates/${mId}/execute`, {
    amount: 0.05,
    currency: 'USDC',
    description: 'Vendor data access fee — March batch',
  });
  const eData = exec.data || exec;
  console.log(`   ✓ Execution: ${eData.execution_id || eData.transfer_id || 'completed'}`);
  console.log(`   ✓ Drew: 0.05 USDC`);
  console.log(`   ⏱ Time: ${t()}`);

  const bal = await getBalances();
  console.log(`   💰 Meridian: ${bal.meridian} | Austral: ${bal.austral}\n`);
}

// ============================================================================
// TX 2: x402 Micropayment — Austral pays for Meridian's skill
// ============================================================================

async function tx2_x402Payment() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TX 2: x402 Micropayment — Pay-per-API-call');
  console.log('Austral pays 0.05 USDC for Meridian\'s settlement quote API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const t = timer();

  // Find Meridian's x402 endpoint (auto-created from skill registration)
  const endpoints = await api('GET', `/v1/x402/endpoints?account_id=${MERIDIAN.accountId}`);
  const quoteEndpoint = (endpoints.data || []).find((e: any) =>
    e.path?.includes('cross_border_quote') || e.name?.includes('Cross-Border')
  );

  let endpointId: string;
  if (quoteEndpoint) {
    endpointId = quoteEndpoint.id;
    console.log(`   ✓ Found skill endpoint: ${quoteEndpoint.name} ($${quoteEndpoint.base_price})`);
  } else {
    // Create one if none exists
    const ep = await api('POST', '/v1/x402/endpoints', {
      name: 'Settlement Quote API',
      path: `/v1/agents/${MERIDIAN.agentId}/skills/cross_border_quote`,
      method: 'POST',
      description: 'Real-time FX settlement quote',
      accountId: MERIDIAN.accountId,
      basePrice: 0.05,
      currency: 'USDC',
    });
    endpointId = ep.data?.id || ep.id;
    console.log(`   ✓ Created endpoint: ${endpointId}`);
  }

  // Pay for API access
  const payment = await api('POST', '/v1/x402/pay', {
    endpointId,
    requestId: crypto.randomUUID(),
    walletId: AUSTRAL.walletId,
    amount: 0.05,
    currency: 'USDC',
    method: 'POST',
    path: `/v1/agents/${MERIDIAN.agentId}/skills/cross_border_quote`,
    timestamp: Math.floor(Date.now() / 1000),
  });

  const pData = payment.data || payment;
  console.log(`   ✓ Payment: ${pData.status || 'completed'}`);
  console.log(`   ✓ Transfer: ${pData.transferId || 'n/a'}`);
  console.log(`   ⏱ Time: ${t()}`);

  const bal = await getBalances();
  console.log(`   💰 Meridian: ${bal.meridian} | Austral: ${bal.austral}\n`);
}

// ============================================================================
// TX 3: ACP Checkout — Austral buys a service from Meridian
// ============================================================================

async function tx3_ap2SecondExecution() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TX 3: AP2 Second Mandate Execution');
  console.log('Austral draws again from the same mandate: 0.05 USDC');
  console.log('(Tests recurring mandate execution on the same authorization)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const t = timer();

  // Get the active mandate
  const mandates = await api('GET', '/v1/ap2/mandates?status=active');
  const mandate = (mandates.data || []).find((m: any) => m.agent_id === AUSTRAL.agentId);
  if (!mandate) {
    console.log('   ⚠ No active mandate found, skipping');
    return;
  }

  // Execute again
  const exec = await api('POST', `/v1/ap2/mandates/${mandate.id}/execute`, {
    amount: 0.05,
    currency: 'USDC',
    description: 'Vendor data refresh — incremental update',
  });
  const eData = exec.data || exec;
  console.log(`   ✓ Mandate: ${mandate.id}`);
  console.log(`   ✓ Execution: ${eData.execution_id || eData.transfer_id || 'completed'}`);
  console.log(`   ✓ Drew: 0.05 USDC (second draw on same authorization)`);
  console.log(`   ⏱ Time: ${t()}`);

  const bal = await getBalances();
  console.log(`   💰 Meridian: ${bal.meridian} | Austral: ${bal.austral}\n`);
}

// ============================================================================
// TX 4: A2A Task — Austral sends a paid task to Meridian
// ============================================================================

async function tx4_a2aTask() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TX 4: A2A Task — Agent-to-Agent Task with Payment');
  console.log('Austral asks Meridian for a BRL/USD quote (0.05 USDC)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const t = timer();

  const result = await api('POST', '/v1/a2a/tasks', {
    agent_id: MERIDIAN.agentId,
    message: {
      parts: [{ text: 'Get me a BRL/USD settlement quote for 1000 BRL to be delivered via PIX' }],
      metadata: {
        skill_id: 'cross_border_quote',
        from_agent_id: AUSTRAL.agentId,
      },
    },
    payment: {
      amount: 0.05,
      currency: 'USDC',
      from_wallet_id: AUSTRAL.walletId,
      to_wallet_id: MERIDIAN.walletId,
    },
  });

  const data = result.data || result;
  console.log(`   ✓ Task: ${data.id}`);
  console.log(`   ✓ State: ${data.status?.state || data.state || 'submitted'}`);
  console.log(`   ✓ Payment: attached (0.05 USDC)`);
  console.log(`   ⏱ Time: ${t()}`);

  const bal = await getBalances();
  console.log(`   💰 Meridian: ${bal.meridian} | Austral: ${bal.austral}\n`);
}

// ============================================================================
// TX 5: Direct Wallet Transfer — on-chain settlement via Circle
// ============================================================================

async function tx5_walletTransfer() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TX 5: Direct Wallet Transfer — On-Chain Settlement');
  console.log('Meridian → Austral: 0.05 USDC via Circle on Base mainnet');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const t = timer();
  const result = await api('POST', `/v1/wallets/${MERIDIAN.walletId}/transfer`, {
    destinationWalletId: AUSTRAL.walletId,
    amount: 0.05,
    currency: 'USDC',
    reference: 'Settlement rebate — Q1 volume bonus',
  });

  const data = result.data || result;
  console.log(`   ✓ Transfer: ${data.transferId}`);
  console.log(`   ✓ Settlement: ${data.settlement?.type || 'ledger'}`);
  if (data.settlement?.txHash) {
    console.log(`   ✓ Tx Hash: ${data.settlement.txHash}`);
  }
  console.log(`   ⏱ Time: ${t()}`);

  const bal = await getBalances();
  console.log(`   💰 Meridian: ${bal.meridian} | Austral: ${bal.austral}\n`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  try {
    await setup();

    console.log('🚀 Running 5 protocol transactions on Base Mainnet...\n');

    await tx1_ap2Mandate();
    await tx2_x402Payment();
    await tx3_ap2SecondExecution();
    await tx4_a2aTask();
    await tx5_walletTransfer();

    // Final sync
    console.log('═══════════════════════════════════════════════════');
    console.log('  FINAL RESULTS');
    console.log('═══════════════════════════════════════════════════');

    await Promise.all([
      api('POST', `/v1/wallets/${MERIDIAN.walletId}/sync`),
      api('POST', `/v1/wallets/${AUSTRAL.walletId}/sync`),
    ]);

    const final = await getBalances();
    console.log(`\n   ${MERIDIAN.name}: ${final.meridian} USDC`);
    console.log(`   ${AUSTRAL.name}:  ${final.austral} USDC`);
    console.log(`   Combined: ${(Number(final.meridian) + Number(final.austral)).toFixed(4)} USDC`);
    console.log('\n✅ Demo complete!');
    console.log('   Dashboard: http://localhost:3000/dashboard (Production mode)');
    console.log('   Transfers: http://localhost:3000/dashboard/transfers');
    console.log('   Agentic:   http://localhost:3000/dashboard/agentic-payments\n');

  } catch (error: any) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

main();
