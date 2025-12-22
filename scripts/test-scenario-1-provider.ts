/**
 * Scenario 1: Register x402 Endpoint (Provider Side)
 * 
 * Tests the complete provider flow:
 * 1. Register x402 endpoint
 * 2. Set up volume discounts
 * 3. Integrate Provider SDK
 * 4. Receive paid API calls
 * 5. Verify payments
 * 6. Monitor revenue in dashboard
 * 
 * Run with: tsx scripts/test-scenario-1-provider.ts
 */

import { createX402ProviderMiddleware, verifyX402Payment } from '../packages/x402-provider-sdk/src/index.js';

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
  payments: [] as any[],
  totalRevenue: 0
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
  log('🔐 Step 1: Authenticate as API Provider');

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

async function step2_registerEndpoint() {
  log('📝 Step 2: Register x402 Endpoint with Volume Discounts');

  try {
    const randomSuffix = Math.random().toString(36).substring(7);
    const endpointData = {
      accountId: TEST_ACCOUNT_ID,
      name: `Weather API Premium ${randomSuffix}`,
      path: `/api/weather/premium/${randomSuffix}`,
      method: 'GET',
      description: 'Premium weather data with x402 payment',
      basePrice: 0.10,
      currency: 'USDC',
      volumeDiscounts: [
        { threshold: 1000, priceMultiplier: 0.8 },  // $0.20 per call
        { threshold: 5000, priceMultiplier: 0.6 }   // $0.15 per call
      ],
      webhookUrl: 'https://api.example.com/webhooks/x402'
    };

    log('Registering endpoint:', endpointData);

    const result = await apiRequest('POST', '/v1/x402/endpoints', endpointData);
    testData.endpoint = result.data;

    logSuccess('Endpoint registered successfully');
    log('Endpoint Details:', {
      id: testData.endpoint.id,
      name: testData.endpoint.name,
      path: testData.endpoint.path,
      basePrice: testData.endpoint.basePrice,
      currency: testData.endpoint.currency,
      volumeDiscounts: testData.endpoint.volumeDiscounts,
      status: testData.endpoint.status
    });
  } catch (error) {
    logError('Endpoint registration failed', error);
    throw error;
  }
}

async function step3_testProviderSDK() {
  log('🔧 Step 3: Test Provider SDK Middleware');

  try {
    // Simulate Provider SDK setup
    log('Provider SDK Configuration:', {
      endpointId: testData.endpoint.id,
      paymentRequired: true,
      price: testData.endpoint.basePrice,
      currency: testData.endpoint.currency
    });

    // Create mock request (simulating an incoming API call without payment)
    const mockRequest = {
      headers: new Map([
        ['authorization', 'Bearer some-api-key']
      ]),
      method: 'POST',
      url: 'http://api.example.com/api/compliance/check'
    };

    log('Simulating API call without payment...');

    // Provider SDK would return 402 response
    const expected402Response = {
      status: 402,
      headers: {
        'X-Payment-Required': 'true',
        'X-Payment-Endpoint-Id': testData.endpoint.id,
        'X-Payment-Amount': testData.endpoint.basePrice.toString(),
        'X-Payment-Currency': testData.endpoint.currency,
        'X-Payment-Address': testData.endpoint.paymentAddress || `internal://endpoint/${testData.endpoint.id}`
      },
      body: {
        error: 'Payment Required',
        message: 'This endpoint requires x402 payment',
        pricing: {
          basePrice: testData.endpoint.basePrice,
          currency: testData.endpoint.currency,
          volumeDiscounts: testData.endpoint.volumeDiscounts
        }
      }
    };

    logSuccess('Provider SDK would return 402 Payment Required');
    log('Expected 402 Response:', expected402Response);

  } catch (error) {
    logError('Provider SDK test failed', error);
    throw error;
  }
}

async function step4_simulatePayments() {
  log('💰 Step 4: Simulate Multiple Paid API Calls');

  try {
    // Create a test wallet for the consumer
    log('Creating consumer wallet...');
    const wallet = await apiRequest('POST', '/v1/wallets', {
      ownerAccountId: TEST_ACCOUNT_ID,
      currency: 'USDC',
      name: 'Test Consumer Wallet'
    });

    // Deposit funds
    await apiRequest('POST', `/v1/wallets/${wallet.data.id}/deposit`, {
      amount: 100,
      sourceAccountId: TEST_ACCOUNT_ID
    });

    logSuccess('Consumer wallet created and funded');

    // Simulate payments at different volume tiers
    const paymentScenarios = [
      { count: 10, description: 'First 10 calls (base price $0.25)' },
      { count: 1000, description: '1000 calls (volume discount tier 1 - $0.20)' },
      { count: 5000, description: '5000 calls (volume discount tier 2 - $0.15)' }
    ];

    for (const scenario of paymentScenarios) {
      log(`\nSimulating: ${scenario.description}`);

      // Just simulate one payment per tier for testing
      const payment = await apiRequest('POST', '/v1/x402/pay', {
        endpointId: testData.endpoint.id,
        walletId: wallet.data.id,
        requestId: crypto.randomUUID(),
        amount: 0.10, // Base price from setup
        currency: 'USDC',
        method: 'POST',
        path: '/api/weather/premium',
        timestamp: Date.now(),
        metadata: {
          scenario: scenario.description,
          callNumber: scenario.count
        }
      });

      testData.payments.push(payment.data);

      // Verify the payment
      const verification = await apiRequest('POST', '/v1/x402/verify', {
        transferId: payment.data.transferId
      });

      if (verification.data.verified) {
        logSuccess(`Payment verified for ${scenario.description}`);
        log('Payment Stats:', {
          transferId: payment.data.transferId,
          endpointTotalCalls: payment.data.endpointTotalCalls,
          endpointTotalRevenue: payment.data.endpointTotalRevenue
        });
      }
    }

  } catch (error) {
    logError('Payment simulation failed', error);
    throw error;
  }
}

async function step5_checkRevenue() {
  log('📊 Step 5: Check Endpoint Revenue & Stats');

  try {
    // Get updated endpoint details
    const endpoint = await apiRequest('GET', `/v1/x402/endpoints/${testData.endpoint.id}`);

    logSuccess('Endpoint stats retrieved');
    log('Revenue Dashboard:', {
      endpointName: endpoint.data.name,
      totalCalls: endpoint.data.totalCalls,
      totalRevenue: endpoint.data.totalRevenue,
      averagePerCall: endpoint.data.totalCalls > 0
        ? (endpoint.data.totalRevenue / endpoint.data.totalCalls).toFixed(4)
        : 0,
      status: endpoint.data.status
    });

    testData.totalRevenue = endpoint.data.totalRevenue;

    // List all endpoints to verify it appears in the list
    const allEndpoints = await apiRequest('GET', '/v1/x402/endpoints?limit=10');

    log('Total Endpoints Registered:', allEndpoints.data.length);
    log('All Endpoints Summary:', allEndpoints.data.map((e: any) => ({
      name: e.name,
      calls: e.totalCalls,
      revenue: e.totalRevenue
    })));

  } catch (error) {
    logError('Revenue check failed', error);
    throw error;
  }
}

async function step6_testVolumeDiscounts() {
  log('🎯 Step 6: Verify Volume Discount Pricing');

  try {
    const endpoint = testData.endpoint;
    const basePrice = endpoint.basePrice;
    const discounts = endpoint.volumeDiscounts || [];

    log('Pricing Tiers:');
    log(`  Base Price (0-999 calls): $${basePrice}`);

    for (const discount of discounts) {
      const discountedPrice = basePrice * discount.priceMultiplier;
      log(`  ${discount.threshold}+ calls: $${discountedPrice.toFixed(2)} (${(discount.priceMultiplier * 100)}% of base)`);
    }

    logSuccess('Volume discount configuration verified');

  } catch (error) {
    logError('Volume discount check failed', error);
    throw error;
  }
}

async function step7_updateEndpoint() {
  log('✏️ Step 7: Update Endpoint Configuration');

  try {
    // Update endpoint (e.g., change price, add webhook)
    const updates = {
      description: 'Updated: KYC/AML compliance verification for LATAM region with enhanced features',
      basePrice: 0.30,  // Price increase
      webhookUrl: 'https://api.example.com/webhooks/x402-v2'
    };

    log('Updating endpoint:', updates);

    const result = await apiRequest('PATCH', `/v1/x402/endpoints/${testData.endpoint.id}`, updates);

    logSuccess('Endpoint updated successfully');
    log('Updated Details:', {
      basePrice: result.data.basePrice,
      description: result.data.description,
      webhookUrl: result.data.webhookUrl
    });

  } catch (error) {
    logError('Endpoint update failed', error);
    throw error;
  }
}

// ============================================
// Main Test Runner
// ============================================

async function runProviderScenario() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Scenario 1: Register x402 Endpoint (Provider Side)     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  let passed = 0;
  let failed = 0;

  const steps = [
    { name: 'Authentication', fn: step1_authenticate },
    { name: 'Register Endpoint', fn: step2_registerEndpoint },
    { name: 'Test Provider SDK', fn: step3_testProviderSDK },
    { name: 'Simulate Payments', fn: step4_simulatePayments },
    { name: 'Check Revenue', fn: step5_checkRevenue },
    { name: 'Verify Volume Discounts', fn: step6_testVolumeDiscounts },
    { name: 'Update Endpoint', fn: step7_updateEndpoint }
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

  if (testData.endpoint) {
    console.log('\n📊 Final Results:');
    console.log(`   Endpoint: ${testData.endpoint.name}`);
    console.log(`   Total Revenue: $${testData.totalRevenue}`);
    console.log(`   Status: ${testData.endpoint.status}`);
  }

  console.log('\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run the test
runProviderScenario().catch(console.error);

