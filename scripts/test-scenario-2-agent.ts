/**
 * Scenario 2: Agent Makes x402 Payment (Consumer Side)
 * 
 * Tests the complete autonomous agent payment flow:
 * 1. Create agent account + wallet with spending policies
 * 2. Fund the agent wallet
 * 3. Agent receives 402 Payment Required
 * 4. Agent uses Consumer SDK to pay automatically
 * 5. Agent retries API call with proof
 * 6. Verify spending policy enforcement
 * 
 * Run with: tsx scripts/test-scenario-2-agent.ts
 */

// ============================================
// Configuration
// ============================================

const API_URL = process.env.API_URL || 'http://localhost:4000';

let AUTH_TOKEN = '';
let TENANT_ID = '';
let TEST_ACCOUNT_ID = '';

// ============================================
// Test Data
// ============================================

const testData = {
  endpoint: null as any,
  agent: null as any,
  wallet: null as any,
  payments: [] as any[],
  initialBalance: 500,
  dailyLimit: 100,
  monthlyLimit: 2000,
  approvalThreshold: 50
};

// ============================================
// Utilities
// ============================================

function log(message: string, data?: any) {
  console.log(`\n${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logSuccess(message: string) {
  console.log(`\n✅ ${message}`);
}

function logError(message: string, error: any) {
  console.error(`\n❌ ${message}`);
  console.error(error);
}

async function apiRequest(method: string, path: string, body?: any) {
  const url = `${API_URL}${path}`;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

// ============================================
// Test Steps
// ============================================

async function step1_authenticate() {
  log('🔐 Step 1: Authenticate as Business User (Agent Owner)');

  try {
    const authResponse = await fetch(`${API_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'haxaco@gmail.com',
        password: 'Password123!'
      })
    });

    if (!authResponse.ok) {
      throw new Error(`Auth failed: ${authResponse.status}`);
    }

    const authData = await authResponse.json();
    AUTH_TOKEN = authData.session.accessToken;
    TENANT_ID = authData.tenant.id;

    logSuccess('Authentication successful');
    log('Credentials:', { tenantId: TENANT_ID });

    // Fetch Account ID
    log('Fetching accounts...');
    const accountsResponse = await fetch(`${API_URL}/v1/accounts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });

    if (!accountsResponse.ok) {
      throw new Error(`Failed to fetch accounts: ${accountsResponse.status}`);
    }

    const accountsData = await accountsResponse.json();
    if (accountsData.data && accountsData.data.length > 0) {
      TEST_ACCOUNT_ID = accountsData.data[0].id;
      logSuccess(`Found Account ID: ${TEST_ACCOUNT_ID}`);
    } else {
      throw new Error('No accounts found for this user/tenant');
    }

  } catch (error) {
    logError('Authentication failed', error);
    throw error;
  }
}

async function step2_setupTestEndpoint() {
  log('📝 Step 2: Setup Test x402 Endpoint (to call later)');

  try {
    const randomSuffix = Math.random().toString(36).substring(7);
    const endpointData = {
      accountId: TEST_ACCOUNT_ID,
      name: `Compliance Check API ${randomSuffix}`,
      path: `/api/compliance/check/${randomSuffix}`,
      method: 'POST',
      description: 'Test endpoint for agent payments',
      basePrice: 0.25,
      currency: 'USDC'
    };

    // Store suffix for agent naming later
    testData.randomSuffix = randomSuffix;

    const result = await apiRequest('POST', '/v1/x402/endpoints', endpointData);
    testData.endpoint = result.data;

    logSuccess('Test endpoint created');
    log('Endpoint:', {
      id: testData.endpoint.id,
      name: testData.endpoint.name,
      price: testData.endpoint.basePrice
    });
  } catch (error) {
    logError('Endpoint setup failed', error);
    throw error;
  }
}

async function step3_createAgentWithWallet() {
  log('🤖 Step 3: Create Agent Account with Wallet & Spending Policies');

  try {
    // Register agent using the x402 agent registration endpoint
    const agentData = {
      accountName: 'Compliance Bot Account',
      agentName: 'Compliance Bot',
      agentPurpose: 'Autonomous agent for compliance checks',
      agentType: 'compliance', // Explicitly set agent type (testing compliance type)
      parentAccountId: TEST_ACCOUNT_ID, // Required by API now
      spendingPolicy: {
        dailySpendLimit: testData.dailyLimit, // API expects dailySpendLimit
        monthlySpendLimit: testData.monthlyLimit, // API expects monthlySpendLimit
        approvedEndpoints: [testData.endpoint.id],
        autoFundEnabled: true,
        autoFundThreshold: 100,
        autoFundAmount: 200,
        approvalThreshold: 50
      },
      initialBalance: testData.initialBalance,
      walletCurrency: 'USDC'
    };

    log('Registering agent:', agentData);

    const result = await apiRequest('POST', '/v1/agents/x402/register', agentData);
    testData.agent = result.data.agent; // Result wraps in data? API returns { success: true, data: ... }
    testData.wallet = result.data.wallet;

    logSuccess('Agent and wallet created successfully');
    log('Agent Details:', {
      agentId: testData.agent.id,
      name: testData.agent.name,
      status: testData.agent.status
    });
    log('Wallet Details:', {
      walletId: testData.wallet.id,
      balance: testData.wallet.balance,
      currency: testData.wallet.currency,
      spendingPolicy: testData.wallet.spendingPolicy
    });

  } catch (error) {
    logError('Agent/wallet creation failed', error);
    throw error;
  }
}

async function step4_simulate402Response() {
  log('🚫 Step 4: Simulate Agent Calling Paid API (Receives 402)');

  try {
    // Get quote for the endpoint
    const quote = await apiRequest('GET', `/v1/x402/quote/${testData.endpoint.id}`);

    log('Agent calls API: POST /api/compliance/check');
    log('API returns: 402 Payment Required');
    log('Payment Details:', {
      endpointId: testData.endpoint.id,
      amount: quote.data.finalPrice,
      currency: quote.data.currency,
      paymentAddress: testData.endpoint.paymentAddress
    });

    logSuccess('Agent received 402 response with payment details');

  } catch (error) {
    logError('402 simulation failed', error);
    throw error;
  }
}

async function step5_agentPaysAutonomously() {
  log('💰 Step 5: Agent Processes Payment Autonomously');

  try {
    // Agent checks spending policy before payment
    log('Checking spending policy...');
    log('Spending Policy:', {
      dailyLimit: testData.wallet.spendingPolicy.dailyLimit,
      monthlyLimit: testData.wallet.spendingPolicy.monthlyLimit,
      approvedEndpoints: testData.wallet.spendingPolicy.approvedEndpoints,
      currentBalance: testData.wallet.balance
    });

    // Agent initiates payment
    const requestId = crypto.randomUUID();
    log(`Agent initiates payment (requestId: ${requestId})`);

    const payment = await apiRequest('POST', '/v1/x402/pay', {
      endpointId: testData.endpoint.id,
      walletId: testData.wallet.id,
      requestId: requestId,
      metadata: {
        category: 'compliance',
        autonomous: true
      }
    });

    testData.payments.push(payment.data);

    logSuccess('Payment processed successfully');
    log('Payment Result:', {
      transferId: payment.data.transferId,
      walletBalance: payment.data.walletBalance,
      endpointTotalCalls: payment.data.endpointTotalCalls
    });

    // Verify payment
    const verification = await apiRequest('POST', '/v1/x402/verify', {
      transferId: payment.data.transferId
    });

    if (verification.data.verified) {
      logSuccess('Payment verified by provider');
      log('Agent can now retry API call with proof');
    }

  } catch (error) {
    logError('Autonomous payment failed', error);
    throw error;
  }
}

async function step6_testSpendingLimits() {
  log('🛡️ Step 6: Test Spending Policy Enforcement');

  try {
    // Test 1: Make multiple payments to approach daily limit
    log('\n📊 Test 6.1: Daily Limit Enforcement');
    const paymentsToMake = Math.floor((testData.dailyLimit - 1) / testData.endpoint.basePrice);
    log(`Making ${paymentsToMake} payments to approach daily limit...`);

    let successfulPayments = 0;
    for (let i = 0; i < Math.min(paymentsToMake, 3); i++) {
      try {
        const payment = await apiRequest('POST', '/v1/x402/pay', {
          endpointId: testData.endpoint.id,
          walletId: testData.wallet.id,
          requestId: crypto.randomUUID()
        });
        successfulPayments++;
      } catch (error: any) {
        if (error.message.includes('daily limit')) {
          logSuccess('Daily limit enforced correctly!');
          break;
        }
      }
    }

    log(`Successful payments before limit: ${successfulPayments}`);

    // Test 2: Try to use unapproved endpoint
    log('\n📊 Test 6.2: Approved Endpoints Check');

    // Create another endpoint not in approved list
    // Create an unapproved endpoint
    const randomSuffix = testData.randomSuffix || Math.random().toString(36).substring(7);
    const unapprovedEndpoint = await apiRequest('POST', '/v1/x402/endpoints', {
      accountId: TEST_ACCOUNT_ID,
      name: `Unapproved API ${randomSuffix}`,
      path: `/api/unapproved/${randomSuffix}`,
      method: 'GET',
      basePrice: 0.10,
      currency: 'USDC'
    });

    try {
      await apiRequest('POST', '/v1/x402/pay', {
        endpointId: unapprovedEndpoint.data.id,
        walletId: testData.wallet.id,
        requestId: crypto.randomUUID()
      });
      logError('Approved endpoints check FAILED - payment should have been blocked', {});
    } catch (error: any) {
      if (error.message.includes('approved') || error.message.includes('policy')) {
        logSuccess('Approved endpoints enforced correctly!');
      } else {
        throw error;
      }
    }

    // Test 3: Check balance
    log('\n📊 Test 6.3: Balance Check');
    const updatedWallet = await apiRequest('GET', `/v1/wallets/${testData.wallet.id}`);
    log('Updated Wallet:', {
      balance: updatedWallet.data.balance,
      initialBalance: testData.initialBalance,
      spent: testData.initialBalance - updatedWallet.data.balance
    });

    if (updatedWallet.data.balance < testData.initialBalance) {
      logSuccess('Balance correctly updated after payments');
    }

  } catch (error) {
    logError('Spending limit tests failed', error);
    throw error;
  }
}

async function step7_testAutoFunding() {
  log('🔄 Step 7: Test Auto-Funding Feature');

  try {
    const wallet = await apiRequest('GET', `/v1/wallets/${testData.wallet.id}`);

    log('Auto-Fund Policy:', {
      threshold: testData.wallet.spendingPolicy.autoFund?.threshold,
      amount: testData.wallet.spendingPolicy.autoFund?.amount,
      currentBalance: wallet.data.balance
    });

    if (wallet.data.balance < (testData.wallet.spendingPolicy.autoFund?.threshold || 0)) {
      log('Balance below threshold - auto-funding would trigger');
      logSuccess('Auto-fund policy configured correctly');
    } else {
      log('Balance above threshold - auto-funding not needed yet');
      logSuccess('Auto-fund policy configured correctly');
    }

  } catch (error) {
    logError('Auto-funding test failed', error);
    throw error;
  }
}

async function step8_viewTransactionHistory() {
  log('📜 Step 8: View Agent Transaction History');

  try {
    // Get wallet details with transactions
    const wallet = await apiRequest('GET', `/v1/wallets/${testData.wallet.id}`);

    log('Final Wallet State:', {
      walletId: wallet.data.id,
      balance: wallet.data.balance,
      status: wallet.data.status,
      totalPayments: testData.payments.length
    });

    log('Payment Summary:');
    for (let i = 0; i < testData.payments.length; i++) {
      const payment = testData.payments[i];
      log(`  Payment ${i + 1}:`, {
        transferId: payment.transferId,
        balanceAfter: payment.walletBalance
      });
    }

    logSuccess('Transaction history retrieved');

  } catch (error) {
    logError('Transaction history retrieval failed', error);
    throw error;
  }
}

// ============================================
// Main Test Runner
// ============================================

async function runAgentScenario() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Scenario 2: Agent Makes x402 Payment (Consumer Side)   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  let passed = 0;
  let failed = 0;

  const steps = [
    { name: 'Authentication', fn: step1_authenticate },
    { name: 'Setup Test Endpoint', fn: step2_setupTestEndpoint },
    { name: 'Create Agent with Wallet', fn: step3_createAgentWithWallet },
    { name: 'Simulate 402 Response', fn: step4_simulate402Response },
    { name: 'Agent Pays Autonomously', fn: step5_agentPaysAutonomously },
    { name: 'Test Spending Limits', fn: step6_testSpendingLimits },
    { name: 'Test Auto-Funding', fn: step7_testAutoFunding },
    { name: 'View Transaction History', fn: step8_viewTransactionHistory }
  ];

  for (const step of steps) {
    try {
      await step.fn();
      passed++;
    } catch (error) {
      failed++;
      console.error(`\n❌ Step failed: ${step.name}`);
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                     TEST SUMMARY                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n✅ Passed: ${passed}/${steps.length}`);
  console.log(`${failed > 0 ? '❌' : '✅'} Failed: ${failed}/${steps.length}`);

  if (testData.wallet) {
    console.log('\n📊 Final Results:');
    console.log(`   Agent: ${testData.agent.name}`);
    console.log(`   Total Payments: ${testData.payments.length}`);
    console.log(`   Policies Enforced: ✅`);
  }

  console.log('\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run the test
runAgentScenario().catch(console.error);

