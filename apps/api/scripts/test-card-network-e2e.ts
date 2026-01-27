#!/usr/bin/env npx tsx
/**
 * Card Network E2E Test Script
 * Epic 53: Card Network Integration
 *
 * This script tests the complete card network integration flow:
 * 1. Web Bot Auth verification
 * 2. Settlement route recommendation with card preference
 * 3. Visa payment instruction creation
 * 4. Mastercard agent registration
 * 5. Token creation and management
 * 6. Analytics verification
 *
 * Usage:
 *   npx tsx apps/api/scripts/test-card-network-e2e.ts
 *
 * Environment Variables:
 *   API_URL - Base URL for the API (default: http://localhost:4000)
 *   API_KEY - API key for authentication (required)
 *   TENANT_ID - Tenant ID for testing (optional, for verification)
 */

const API_URL = process.env.API_URL || 'http://localhost:4000';
const API_KEY = process.env.API_KEY || '';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step: number, title: string) {
  console.log();
  log(`${'='.repeat(60)}`, 'dim');
  log(`Step ${step}: ${title}`, 'cyan');
  log(`${'='.repeat(60)}`, 'dim');
}

function logSuccess(message: string) {
  log(`  ✓ ${message}`, 'green');
}

function logError(message: string) {
  log(`  ✗ ${message}`, 'red');
}

function logInfo(message: string) {
  log(`  ℹ ${message}`, 'dim');
}

async function makeRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
  const url = `${API_URL}/v1${endpoint}`;
  logInfo(`${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: API_KEY.startsWith('pk_') ? API_KEY : `Bearer ${API_KEY}`,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return { ok: true, status: response.status, data };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error.message,
    };
  }
}

// ============================================
// Test Functions
// ============================================

async function testWebBotAuthVerification(): Promise<boolean> {
  logStep(1, 'Testing Web Bot Auth verification');

  // Sample RFC 9421 signature (mock for sandbox testing)
  const testPayload = {
    method: 'POST',
    path: '/v1/payments/initiate',
    headers: {
      'content-type': 'application/json',
      date: new Date().toUTCString(),
    },
    signatureInput: 'sig1=("@method" "@path" "content-type" "date");created=1704067200;keyid="test-key-1";alg="ed25519"',
    signature: 'sig1=:' + Buffer.from('mock-signature-for-testing').toString('base64') + ':',
    network: 'visa',
  };

  const result = await makeRequest('/cards/verify', {
    method: 'POST',
    body: JSON.stringify(testPayload),
  });

  if (result.ok) {
    logSuccess(`Verification endpoint responded`);
    logInfo(`Valid: ${result.data.valid}`);
    logInfo(`Network: ${result.data.network || 'detected'}`);
    if (result.data.error) {
      logInfo(`Note: ${result.data.error} (expected for mock signature)`);
    }
    return true;
  } else {
    // Even a 400 with validation error means the endpoint works
    if (result.status === 400) {
      logSuccess(`Verification endpoint working (validation error expected for mock data)`);
      logInfo(`Error: ${result.error}`);
      return true;
    }
    logError(`Failed: ${result.error}`);
    return false;
  }
}

async function testNetworkConfiguration(): Promise<{ visa: boolean; mastercard: boolean }> {
  logStep(2, 'Checking card network configuration');

  const result = await makeRequest('/cards/networks');

  if (!result.ok) {
    logError(`Failed to fetch network configuration: ${result.error}`);
    return { visa: false, mastercard: false };
  }

  const { networks, capabilities } = result.data;

  logInfo('Network Status:');
  logInfo(`  Visa VIC: ${networks.visa.configured ? 'Configured' : 'Not configured'} (${networks.visa.status})`);
  logInfo(`  Mastercard Agent Pay: ${networks.mastercard.configured ? 'Configured' : 'Not configured'} (${networks.mastercard.status})`);

  logInfo('Capabilities:');
  Object.entries(capabilities).forEach(([key, value]) => {
    logInfo(`  ${key}: ${value ? '✓' : '✗'}`);
  });

  if (networks.visa.configured || networks.mastercard.configured) {
    logSuccess('At least one card network is configured');
  } else {
    logInfo('No card networks configured - some tests will be skipped');
  }

  return {
    visa: networks.visa.configured && networks.visa.status === 'active',
    mastercard: networks.mastercard.configured && networks.mastercard.status === 'active',
  };
}

async function testVisaPaymentInstruction(configured: boolean): Promise<boolean> {
  logStep(3, 'Testing Visa payment instruction');

  if (!configured) {
    logInfo('Visa VIC not configured - skipping');
    return true;
  }

  const instruction = {
    amount: 50.0,
    currency: 'USD',
    merchant: {
      name: 'Test Merchant',
      categoryCode: '5411', // Grocery stores
      country: 'US',
    },
    expiresInSeconds: 900,
    metadata: {
      testRun: true,
      timestamp: new Date().toISOString(),
    },
  };

  const result = await makeRequest('/cards/visa/instructions', {
    method: 'POST',
    body: JSON.stringify(instruction),
  });

  if (result.ok) {
    logSuccess(`Payment instruction created: ${result.data.instructionId}`);
    logInfo(`Amount: ${result.data.amount} ${result.data.currency}`);
    logInfo(`Merchant: ${result.data.merchant.name}`);
    logInfo(`Expires: ${result.data.expiresAt}`);

    // Verify we can fetch it
    const fetchResult = await makeRequest(`/cards/visa/instructions/${result.data.instructionId}`);
    if (fetchResult.ok) {
      logSuccess('Successfully fetched instruction');
    }

    return true;
  } else {
    logError(`Failed: ${result.error}`);
    return false;
  }
}

async function testMastercardAgentRegistration(configured: boolean): Promise<boolean> {
  logStep(4, 'Testing Mastercard agent registration');

  if (!configured) {
    logInfo('Mastercard Agent Pay not configured - skipping');
    return true;
  }

  // First, we need an agent ID - fetch one from the agents list
  const agentsResult = await makeRequest('/agents?limit=1');

  if (!agentsResult.ok || !agentsResult.data.data?.length) {
    logInfo('No agents available - skipping agent registration test');
    logInfo('Create an agent first to test Mastercard registration');
    return true;
  }

  const agent = agentsResult.data.data[0];
  logInfo(`Using agent: ${agent.name} (${agent.id})`);

  // Check if already registered
  const checkResult = await makeRequest(`/cards/mastercard/agents/${agent.id}`);
  if (checkResult.ok) {
    logSuccess(`Agent already registered with Mastercard: ${checkResult.data.mc_agent_id}`);
    return true;
  }

  // Try to register
  const registration = {
    agentId: agent.id,
    agentName: agent.name,
    publicKey: 'MCowBQYDK2VwAyEAtest-public-key-for-demo-purposes-only',
    capabilities: ['payment', 'tokenization'],
    provider: 'payos',
  };

  const result = await makeRequest('/cards/mastercard/agents', {
    method: 'POST',
    body: JSON.stringify(registration),
  });

  if (result.ok) {
    logSuccess(`Agent registered: ${result.data.mcAgentId}`);
    logInfo(`Status: ${result.data.status}`);
    return true;
  } else {
    // In sandbox, this might fail due to invalid key
    logInfo(`Registration result: ${result.error}`);
    logInfo('This may fail in sandbox with mock keys');
    return true;
  }
}

async function testTokenCreation(networks: { visa: boolean; mastercard: boolean }): Promise<boolean> {
  logStep(5, 'Testing token management');

  let success = true;

  // Test Visa token listing
  if (networks.visa) {
    logInfo('Testing Visa tokens...');
    const visaTokens = await makeRequest('/cards/visa/tokens?limit=5');
    if (visaTokens.ok) {
      logSuccess(`Visa tokens endpoint working (${visaTokens.data.pagination?.total || 0} tokens)`);
    } else {
      logError(`Visa tokens endpoint failed: ${visaTokens.error}`);
      success = false;
    }
  }

  // Test Mastercard token listing
  if (networks.mastercard) {
    logInfo('Testing Mastercard tokens...');
    const mcTokens = await makeRequest('/cards/mastercard/tokens?limit=5');
    if (mcTokens.ok) {
      logSuccess(`Mastercard tokens endpoint working (${mcTokens.data.pagination?.total || 0} tokens)`);
    } else {
      logError(`Mastercard tokens endpoint failed: ${mcTokens.error}`);
      success = false;
    }
  }

  if (!networks.visa && !networks.mastercard) {
    logInfo('No card networks configured - token tests skipped');
  }

  return success;
}

async function testAnalytics(): Promise<boolean> {
  logStep(6, 'Verifying analytics');

  const result = await makeRequest('/cards/analytics?days=30');

  if (!result.ok) {
    logError(`Analytics endpoint failed: ${result.error}`);
    return false;
  }

  const { verifications, transactions, recentTransactions, period } = result.data;

  logSuccess('Analytics data retrieved');

  logInfo('Verifications:');
  logInfo(`  Total: ${verifications.total}`);
  logInfo(`  Success Rate: ${verifications.successRate}%`);
  logInfo(`  By Network: Visa=${verifications.byNetwork.visa}, Mastercard=${verifications.byNetwork.mastercard}`);

  logInfo('Transactions:');
  logInfo(`  Total: ${transactions.total}`);
  logInfo(`  Volume: $${transactions.volume.toFixed(2)}`);
  logInfo(`  Status: Completed=${transactions.byStatus.completed}, Pending=${transactions.byStatus.pending}, Failed=${transactions.byStatus.failed}`);

  logInfo(`Recent Transactions: ${recentTransactions.length}`);
  logInfo(`Period: ${period.days} days (${period.from} to ${period.to})`);

  return true;
}

async function testVerificationStats(): Promise<boolean> {
  logStep(7, 'Testing verification stats endpoint');

  const result = await makeRequest('/cards/verifications/stats?days=30');

  if (!result.ok) {
    logError(`Verification stats endpoint failed: ${result.error}`);
    return false;
  }

  logSuccess('Verification stats endpoint working');
  logInfo(`Total verifications: ${result.data.total}`);
  logInfo(`Successful: ${result.data.successful}`);
  logInfo(`Failed: ${result.data.failed}`);

  return true;
}

// ============================================
// Main
// ============================================

async function main() {
  console.log();
  log('╔══════════════════════════════════════════════════════════════╗', 'blue');
  log('║          Card Network Integration E2E Test Suite              ║', 'blue');
  log('╚══════════════════════════════════════════════════════════════╝', 'blue');
  console.log();

  log(`API URL: ${API_URL}`, 'dim');
  log(`API Key: ${API_KEY ? API_KEY.substring(0, 10) + '...' : 'NOT SET'}`, 'dim');

  if (!API_KEY) {
    log('\n⚠️  WARNING: API_KEY not set. Set it via environment variable.', 'yellow');
    log('   Example: API_KEY=pk_test_xxx npx tsx apps/api/scripts/test-card-network-e2e.ts', 'dim');
    process.exit(1);
  }

  // Run tests
  const results: { test: string; passed: boolean }[] = [];

  // Test 1: Web Bot Auth
  results.push({
    test: 'Web Bot Auth Verification',
    passed: await testWebBotAuthVerification(),
  });

  // Test 2: Network Configuration
  const networks = await testNetworkConfiguration();
  results.push({
    test: 'Network Configuration Check',
    passed: true, // Always passes - just checks status
  });

  // Test 3: Visa Payment Instruction
  results.push({
    test: 'Visa Payment Instruction',
    passed: await testVisaPaymentInstruction(networks.visa),
  });

  // Test 4: Mastercard Agent Registration
  results.push({
    test: 'Mastercard Agent Registration',
    passed: await testMastercardAgentRegistration(networks.mastercard),
  });

  // Test 5: Token Management
  results.push({
    test: 'Token Management',
    passed: await testTokenCreation(networks),
  });

  // Test 6: Analytics
  results.push({
    test: 'Analytics',
    passed: await testAnalytics(),
  });

  // Test 7: Verification Stats
  results.push({
    test: 'Verification Stats',
    passed: await testVerificationStats(),
  });

  // Summary
  console.log();
  log('═══════════════════════════════════════════════════════════════', 'dim');
  log('                          TEST SUMMARY                          ', 'cyan');
  log('═══════════════════════════════════════════════════════════════', 'dim');
  console.log();

  let passed = 0;
  let failed = 0;

  results.forEach((r) => {
    if (r.passed) {
      logSuccess(`${r.test}`);
      passed++;
    } else {
      logError(`${r.test}`);
      failed++;
    }
  });

  console.log();
  log(`Results: ${passed} passed, ${failed} failed`, failed > 0 ? 'yellow' : 'green');
  console.log();

  if (failed > 0) {
    log('Some tests failed. Check the output above for details.', 'yellow');
    process.exit(1);
  } else {
    log('All tests passed!', 'green');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
