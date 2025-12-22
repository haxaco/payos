/**
 * x402 API Integration Tests
 * 
 * Tests the complete x402 payment flow:
 * 1. Register x402 endpoint
 * 2. Create wallet
 * 3. Register agent with wallet
 * 4. Process payment
 * 5. Verify payment
 * 
 * Run with: tsx scripts/test-x402-apis.ts
 */

import { createClient } from '@supabase/supabase-js';

// ============================================
// Configuration
// ============================================

const API_URL = process.env.API_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

let AUTH_TOKEN = '';
let TENANT_ID = '';
let TEST_ACCOUNT_ID = '';

// ============================================
// Test Data Storage
// ============================================

const testData = {
  endpoint: null as any,
  wallet: null as any,
  agent: null as any,
  payment: null as any
};

// ============================================
// Utilities
// ============================================

function log(section: string, message: string, data?: any) {
  console.log(`\n[${section}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function logError(section: string, message: string, error: any) {
  console.error(`\n❌ [${section}] ${message}`);
  console.error(error);
}

function logSuccess(section: string, message: string) {
  console.log(`\n✅ [${section}] ${message}`);
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
  log('AUTH', 'Authenticating with test user...');
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Try to sign in with test user (from power user seed script)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'haxaco@gmail.com',
      password: 'Password123!'
    });
    
    if (authError) {
      throw authError;
    }
    
    AUTH_TOKEN = authData.session!.access_token;
    
    // Get tenant ID and account ID from the user's JWT
    const { data: userData } = await supabase.auth.getUser();
    
    // Get tenant from database
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)
      .single();
    
    TENANT_ID = tenants!.id;
    
    // Get a test account
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('type', 'person')
      .limit(1)
      .single();
    
    TEST_ACCOUNT_ID = accounts!.id;
    
    logSuccess('AUTH', 'Authenticated successfully');
    log('AUTH', 'Tenant ID', TENANT_ID);
    log('AUTH', 'Test Account ID', TEST_ACCOUNT_ID);
    
    return true;
  } catch (error) {
    logError('AUTH', 'Authentication failed', error);
    return false;
  }
}

async function step2_registerEndpoint() {
  log('ENDPOINT', 'Registering x402 endpoint...');
  
  try {
    const result = await apiRequest('POST', '/v1/x402/endpoints', {
      accountId: TEST_ACCOUNT_ID,
      name: 'Test Compliance API',
      path: '/api/compliance/check',
      method: 'POST',
      description: 'Test endpoint for compliance checks',
      basePrice: 0.01,
      currency: 'USDC',
      volumeDiscounts: [
        { threshold: 100, priceMultiplier: 0.9 },
        { threshold: 1000, priceMultiplier: 0.8 }
      ],
      network: 'base-mainnet'
    });
    
    testData.endpoint = result.data;
    logSuccess('ENDPOINT', 'Endpoint registered successfully');
    log('ENDPOINT', 'Endpoint details', testData.endpoint);
    
    return true;
  } catch (error) {
    logError('ENDPOINT', 'Failed to register endpoint', error);
    return false;
  }
}

async function step3_createWallet() {
  log('WALLET', 'Creating wallet for test account...');
  
  try {
    const result = await apiRequest('POST', '/v1/wallets', {
      ownerAccountId: TEST_ACCOUNT_ID,
      currency: 'USDC',
      initialBalance: 100, // Fund with 100 USDC for testing
      spendingPolicy: {
        dailySpendLimit: 50,
        monthlySpendLimit: 200,
        approvedVendors: ['/api/compliance'],
        requiresApprovalAbove: 10
      },
      network: 'base-mainnet'
    });
    
    testData.wallet = result.data;
    logSuccess('WALLET', 'Wallet created successfully');
    log('WALLET', 'Wallet details', testData.wallet);
    
    return true;
  } catch (error) {
    logError('WALLET', 'Failed to create wallet', error);
    return false;
  }
}

async function step4_registerAgent() {
  log('AGENT', 'Registering agent with wallet...');
  
  try {
    const result = await apiRequest('POST', '/v1/agents/x402/register', {
      accountName: 'Test Compliance Agent Account',
      accountEmail: 'agent-test@payos.com',
      agentName: 'Compliance Bot',
      agentPurpose: 'Automated compliance checks for test',
      agentType: 'autonomous',
      walletCurrency: 'USDC',
      initialBalance: 50,
      spendingPolicy: {
        dailySpendLimit: 10,
        monthlySpendLimit: 100,
        approvedVendors: ['/api/compliance'],
        requiresApprovalAbove: 5,
        autoFundEnabled: true,
        autoFundThreshold: 5,
        autoFundAmount: 20
      },
      agentConfig: {
        purpose: 'Test autonomous compliance agent',
        x402: {
          enabled: true,
          maxDailySpend: 10,
          approvedEndpoints: ['/api/compliance/check'],
          requiresApproval: false
        }
      }
    });
    
    testData.agent = result.data;
    logSuccess('AGENT', 'Agent registered successfully');
    log('AGENT', 'Agent details', testData.agent);
    
    return true;
  } catch (error) {
    logError('AGENT', 'Failed to register agent', error);
    return false;
  }
}

async function step5_getQuote() {
  log('QUOTE', 'Getting pricing quote for endpoint...');
  
  try {
    const result = await apiRequest('GET', `/v1/x402/quote/${testData.endpoint.id}`);
    
    logSuccess('QUOTE', 'Quote retrieved successfully');
    log('QUOTE', 'Pricing details', result.data);
    
    return true;
  } catch (error) {
    logError('QUOTE', 'Failed to get quote', error);
    return false;
  }
}

async function step6_processPayment() {
  log('PAYMENT', 'Processing x402 payment...');
  
  try {
    const requestId = `test-${Date.now()}`;
    
    const result = await apiRequest('POST', '/v1/x402/pay', {
      endpointId: testData.endpoint.id,
      requestId,
      amount: testData.endpoint.basePrice,
      currency: testData.endpoint.currency,
      walletId: testData.wallet.id,
      method: 'POST',
      path: testData.endpoint.path,
      timestamp: Date.now(),
      metadata: {
        userAgent: 'PayOS Test Script',
        testRun: true
      }
    });
    
    testData.payment = result.data;
    logSuccess('PAYMENT', 'Payment processed successfully');
    log('PAYMENT', 'Payment details', testData.payment);
    
    return true;
  } catch (error) {
    logError('PAYMENT', 'Failed to process payment', error);
    return false;
  }
}

async function step7_verifyPayment() {
  log('VERIFY', 'Verifying payment...');
  
  try {
    const result = await apiRequest('POST', '/v1/x402/verify', {
      requestId: testData.payment.requestId,
      transferId: testData.payment.transferId
    });
    
    if (result.verified) {
      logSuccess('VERIFY', 'Payment verified successfully');
      log('VERIFY', 'Verification details', result.data);
      return true;
    } else {
      logError('VERIFY', 'Payment verification failed', result);
      return false;
    }
  } catch (error) {
    logError('VERIFY', 'Failed to verify payment', error);
    return false;
  }
}

async function step8_testIdempotency() {
  log('IDEMPOTENCY', 'Testing payment idempotency (retry same requestId)...');
  
  try {
    // Try to process the same payment again
    const result = await apiRequest('POST', '/v1/x402/pay', {
      endpointId: testData.endpoint.id,
      requestId: testData.payment.requestId, // Same requestId
      amount: testData.endpoint.basePrice,
      currency: testData.endpoint.currency,
      walletId: testData.wallet.id,
      method: 'POST',
      path: testData.endpoint.path,
      timestamp: Date.now()
    });
    
    if (result.data.transferId === testData.payment.transferId) {
      logSuccess('IDEMPOTENCY', 'Idempotency working correctly - returned existing payment');
      return true;
    } else {
      logError('IDEMPOTENCY', 'Idempotency failed - created duplicate payment', result);
      return false;
    }
  } catch (error) {
    logError('IDEMPOTENCY', 'Idempotency test failed', error);
    return false;
  }
}

async function step9_checkWalletBalance() {
  log('BALANCE', 'Checking wallet balance after payment...');
  
  try {
    const result = await apiRequest('GET', `/v1/wallets/${testData.wallet.id}`);
    
    const expectedBalance = testData.wallet.balance - testData.endpoint.basePrice;
    const actualBalance = result.data.balance;
    
    if (Math.abs(actualBalance - expectedBalance) < 0.001) {
      logSuccess('BALANCE', `Wallet balance correct: ${actualBalance} USDC`);
      return true;
    } else {
      logError('BALANCE', `Wallet balance mismatch. Expected: ${expectedBalance}, Actual: ${actualBalance}`, null);
      return false;
    }
  } catch (error) {
    logError('BALANCE', 'Failed to check wallet balance', error);
    return false;
  }
}

async function step10_checkEndpointStats() {
  log('STATS', 'Checking endpoint stats after payment...');
  
  try {
    const result = await apiRequest('GET', `/v1/x402/endpoints/${testData.endpoint.id}`);
    
    const endpoint = result.data;
    
    log('STATS', 'Endpoint stats', {
      totalCalls: endpoint.totalCalls,
      totalRevenue: endpoint.totalRevenue,
      recentTransactions: endpoint.recentTransactions.length
    });
    
    if (endpoint.totalCalls > testData.endpoint.totalCalls) {
      logSuccess('STATS', 'Endpoint stats updated correctly');
      return true;
    } else {
      logError('STATS', 'Endpoint stats not updated', null);
      return false;
    }
  } catch (error) {
    logError('STATS', 'Failed to check endpoint stats', error);
    return false;
  }
}

async function step11_listEndpoints() {
  log('LIST', 'Listing all x402 endpoints...');
  
  try {
    const result = await apiRequest('GET', '/v1/x402/endpoints?page=1&limit=10');
    
    log('LIST', `Found ${result.data.length} endpoints`, {
      total: result.pagination.total,
      page: result.pagination.page,
      totalPages: result.pagination.totalPages
    });
    
    logSuccess('LIST', 'Endpoints listed successfully');
    return true;
  } catch (error) {
    logError('LIST', 'Failed to list endpoints', error);
    return false;
  }
}

async function step12_listWallets() {
  log('LIST', 'Listing all wallets...');
  
  try {
    const result = await apiRequest('GET', '/v1/wallets?page=1&limit=10');
    
    log('LIST', `Found ${result.data.length} wallets`, {
      total: result.pagination.total,
      page: result.pagination.page,
      totalPages: result.pagination.totalPages
    });
    
    logSuccess('LIST', 'Wallets listed successfully');
    return true;
  } catch (error) {
    logError('LIST', 'Failed to list wallets', error);
    return false;
  }
}

async function step13_testSpendingPolicy() {
  log('POLICY', 'Testing spending policy limits...');
  
  try {
    // Try to make a payment that exceeds the daily limit
    const largeAmount = testData.agent.wallet.spendingPolicy.dailySpendLimit + 1;
    
    // First, update the endpoint price temporarily
    await apiRequest('PATCH', `/v1/x402/endpoints/${testData.endpoint.id}`, {
      basePrice: largeAmount
    });
    
    // Try to make payment
    try {
      await apiRequest('POST', '/v1/x402/pay', {
        endpointId: testData.endpoint.id,
        requestId: `test-policy-${Date.now()}`,
        amount: largeAmount,
        currency: testData.endpoint.currency,
        walletId: testData.agent.wallet.id,
        method: 'POST',
        path: testData.endpoint.path,
        timestamp: Date.now()
      });
      
      logError('POLICY', 'Spending policy not enforced - payment should have been blocked', null);
      return false;
    } catch (error: any) {
      if (error.message.includes('POLICY_VIOLATION') || error.message.includes('policy')) {
        logSuccess('POLICY', 'Spending policy enforced correctly - payment blocked');
        return true;
      } else {
        throw error;
      }
    }
  } catch (error) {
    logError('POLICY', 'Spending policy test failed', error);
    return false;
  } finally {
    // Reset endpoint price
    await apiRequest('PATCH', `/v1/x402/endpoints/${testData.endpoint.id}`, {
      basePrice: testData.endpoint.basePrice
    });
  }
}

// ============================================
// Main Test Runner
// ============================================

async function runTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   x402 API Integration Tests          ║');
  console.log('╚════════════════════════════════════════╝');
  
  const results: { [key: string]: boolean } = {};
  
  // Run all test steps
  results['1. Authentication'] = await step1_authenticate();
  if (!results['1. Authentication']) {
    console.log('\n❌ Authentication failed. Cannot proceed with tests.');
    process.exit(1);
  }
  
  results['2. Register Endpoint'] = await step2_registerEndpoint();
  results['3. Create Wallet'] = await step3_createWallet();
  results['4. Register Agent'] = await step4_registerAgent();
  results['5. Get Quote'] = await step5_getQuote();
  results['6. Process Payment'] = await step6_processPayment();
  results['7. Verify Payment'] = await step7_verifyPayment();
  results['8. Test Idempotency'] = await step8_testIdempotency();
  results['9. Check Wallet Balance'] = await step9_checkWalletBalance();
  results['10. Check Endpoint Stats'] = await step10_checkEndpointStats();
  results['11. List Endpoints'] = await step11_listEndpoints();
  results['12. List Wallets'] = await step12_listWallets();
  results['13. Test Spending Policy'] = await step13_testSpendingPolicy();
  
  // Print summary
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Test Summary                         ║');
  console.log('╚════════════════════════════════════════╝');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([name, result]) => {
    const icon = result ? '✅' : '❌';
    console.log(`${icon} ${name}`);
  });
  
  console.log(`\n${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! x402 infrastructure is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});

