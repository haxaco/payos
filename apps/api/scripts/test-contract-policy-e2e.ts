/**
 * E2E Test Script: Contract Policy Engine (Epic 18)
 *
 * Tests the full flow:
 *   1. Find or create an agent with a wallet
 *   2. Set a contract policy on the wallet
 *   3. Run negotiation guardrails (dry-run evaluate)
 *   4. Verify approve / deny / escalate decisions
 *   5. Check exposure tracking
 *   6. Verify audit log
 *
 * Usage:
 *   API_KEY=pk_test_... pnpm --filter @sly/api tsx scripts/test-contract-policy-e2e.ts
 *
 * The API server must be running on localhost:4000.
 */

const API_BASE = process.env.API_URL || 'http://localhost:4000';
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error('❌ Set API_KEY=pk_test_... environment variable');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_KEY}`,
};

async function api(method: string, path: string, body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok && res.status >= 500) {
    console.error(`❌ ${method} ${path} → ${res.status}`, json);
    throw new Error(`API error: ${res.status}`);
  }
  return { status: res.status, data: json };
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✅ ${msg}`);
  }
}

async function main() {
  console.log('\n🔧 Epic 18: Contract Policy Engine — E2E Test\n');
  console.log(`API: ${API_BASE}`);
  console.log(`Key: ${API_KEY?.slice(0, 15)}...`);

  // ─── Step 1: Find an existing agent ────────────────────────────
  console.log('\n── Step 1: Find an agent ──');
  const { data: agentsResp } = await api('GET', '/v1/agents?limit=5');
  const agents = agentsResp.data || [];
  if (agents.length === 0) {
    console.error('❌ No agents found. Run seed:db first.');
    process.exit(1);
  }
  const agent = agents[0];
  console.log(`  Agent: ${agent.name} (${agent.id})`);

  // ─── Step 2: Find or create a wallet for this agent ────────────
  console.log('\n── Step 2: Find/create wallet for agent ──');
  const { data: walletsResp } = await api('GET', '/v1/wallets?limit=10');
  const allWallets = walletsResp.data || [];
  let wallet = allWallets.find((w: any) => w.managed_by_agent_id === agent.id);

  if (!wallet) {
    console.log('  No wallet assigned to agent. Assigning first available wallet...');

    // Find any wallet owned by the agent's parent account
    const parentAccountId = agent.account_id;
    let candidateWallet = allWallets.find((w: any) => w.owner_account_id === parentAccountId);

    if (!candidateWallet) {
      // Create a new wallet
      console.log('  Creating new wallet...');
      const { data: newWallet } = await api('POST', '/v1/wallets', {
        owner_account_id: parentAccountId,
        currency: 'USDC',
        name: 'Policy Test Wallet',
        purpose: 'Epic 18 E2E testing',
      });
      candidateWallet = newWallet;
    }

    // Assign wallet to agent
    const { data: updatedWallet } = await api('PATCH', `/v1/wallets/${candidateWallet.id}`, {
      managed_by_agent_id: agent.id,
    });
    wallet = updatedWallet;
  }

  console.log(`  Wallet: ${wallet.id} (balance: ${wallet.balance} ${wallet.currency})`);
  assert(wallet.status === 'active', 'Wallet is active');

  // ─── Step 3: Set contract policy on wallet ─────────────────────
  console.log('\n── Step 3: Set contract policy on wallet ──');

  const contractPolicy = {
    counterpartyBlocklist: ['blocked-agent-000'],
    minCounterpartyKyaTier: 1,
    allowedContractTypes: ['payment', 'escrow', 'subscription'],
    blockedContractTypes: ['loan'],
    maxExposure24h: 200,
    maxExposure7d: 1000,
    maxExposure30d: 5000,
    maxActiveContracts: 5,
    maxActiveEscrows: 3,
    escalateAbove: 100,
  };

  const spendingPolicy = {
    dailySpendLimit: 500,
    dailySpent: 0,
    monthlySpendLimit: 5000,
    monthlySpent: 0,
    requiresApprovalAbove: 250,
    contractPolicy,
  };

  const { data: policyUpdate, status: policyStatus } = await api('PATCH', `/v1/wallets/${wallet.id}`, {
    spending_policy: spendingPolicy,
  });
  assert(policyStatus < 400, `Contract policy set on wallet (status ${policyStatus})`);

  // ─── Step 4: Negotiation Guardrails — APPROVE ──────────────────
  console.log('\n── Step 4: Evaluate — should APPROVE (small payment, no counterparty issues) ──');

  const { data: approveResult } = await api(
    'POST',
    `/v1/agents/${agent.id}/wallet/policy/evaluate`,
    {
      amount: 10,
      currency: 'USDC',
      action_type: 'payment',
      contract_type: 'payment',
    },
  );
  console.log(`  Decision: ${approveResult.decision}`);
  assert(approveResult.decision === 'approve', 'Small payment approved');
  assert(approveResult.evaluation_ms >= 0, `Evaluated in ${approveResult.evaluation_ms}ms`);

  // ─── Step 5: Negotiation Guardrails — ESCALATE ─────────────────
  console.log('\n── Step 5: Evaluate — should ESCALATE (amount > escalateAbove) ──');

  const { data: escalateResult } = await api(
    'POST',
    `/v1/agents/${agent.id}/wallet/policy/evaluate`,
    {
      amount: 150,
      currency: 'USDC',
      action_type: 'payment',
      contract_type: 'payment',
    },
  );
  console.log(`  Decision: ${escalateResult.decision}`);
  assert(escalateResult.decision === 'escalate', 'Amount above escalateAbove escalates');

  // ─── Step 6: Negotiation Guardrails — DENY (blocked contract type) ──
  console.log('\n── Step 6: Evaluate — should DENY (blocked contract type: loan) ──');

  const { data: denyResult } = await api(
    'POST',
    `/v1/agents/${agent.id}/wallet/policy/evaluate`,
    {
      amount: 10,
      currency: 'USDC',
      action_type: 'contract_sign',
      contract_type: 'loan',
    },
  );
  console.log(`  Decision: ${denyResult.decision}`);
  assert(denyResult.decision === 'deny', 'Blocked contract type denied');
  assert(
    denyResult.checks?.some((c: any) => c.check === 'contract_type_blocked'),
    'Check identifies contract_type_blocked',
  );

  // ─── Step 7: Negotiation Guardrails — DENY (blocklisted counterparty) ──
  console.log('\n── Step 7: Evaluate — should DENY (blocklisted counterparty) ──');

  const { data: blocklistResult } = await api(
    'POST',
    `/v1/agents/${agent.id}/wallet/policy/evaluate`,
    {
      amount: 10,
      currency: 'USDC',
      action_type: 'payment',
      counterparty_agent_id: 'blocked-agent-000',
    },
  );
  console.log(`  Decision: ${blocklistResult.decision}`);
  assert(blocklistResult.decision === 'deny', 'Blocklisted counterparty denied');

  // ─── Step 8: Negotiation Guardrails — DENY (daily limit exceeded) ──
  console.log('\n── Step 8: Evaluate — should DENY (exceeds daily limit) ──');

  const { data: limitResult } = await api(
    'POST',
    `/v1/agents/${agent.id}/wallet/policy/evaluate`,
    {
      amount: 501,
      currency: 'USDC',
      action_type: 'payment',
    },
  );
  console.log(`  Decision: ${limitResult.decision}`);
  assert(limitResult.decision === 'deny', 'Over-limit payment denied');
  if (limitResult.suggested_counter_offer) {
    console.log(
      `  Counter-offer: max ${limitResult.suggested_counter_offer.max_amount} (${limitResult.suggested_counter_offer.reason})`,
    );
    assert(
      limitResult.suggested_counter_offer.max_amount <= 500,
      'Counter-offer within daily limit',
    );
  }

  // ─── Step 9: Check exposures endpoint ──────────────────────────
  console.log('\n── Step 9: Check exposures endpoint ──');

  const { data: exposuresResp, status: expStatus } = await api(
    'GET',
    `/v1/agents/${agent.id}/wallet/exposures`,
  );
  assert(expStatus < 400, `Exposures endpoint responds (status ${expStatus})`);
  console.log(`  Exposures count: ${exposuresResp.data?.length || 0}`);

  // ─── Step 10: Check audit log ──────────────────────────────────
  console.log('\n── Step 10: Check policy evaluation audit log ──');

  // Note: dry-run evaluations don't get recorded, so this may be empty
  const { data: evalResp, status: evalStatus } = await api(
    'GET',
    `/v1/agents/${agent.id}/wallet/policy/evaluations`,
  );
  assert(evalStatus < 400, `Evaluations endpoint responds (status ${evalStatus})`);
  console.log(`  Evaluation records: ${evalResp.data?.length || 0}`);
  console.log(`  (Dry-run evaluations are not persisted — expected 0 for this test)`);

  // ─── Summary ───────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  if (process.exitCode) {
    console.log('❌ Some tests failed');
  } else {
    console.log('✅ All E2E tests passed');
  }
  console.log('══════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('\n💥 Unhandled error:', err);
  process.exit(1);
});
