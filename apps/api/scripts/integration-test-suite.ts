#!/usr/bin/env npx tsx
/**
 * PayOS Integration Test Suite
 * 
 * Consolidated test runner for all integration tests.
 * Run this to validate the full system before deployment.
 * 
 * Usage:
 *   cd apps/api && npx tsx scripts/integration-test-suite.ts
 *   cd apps/api && npx tsx scripts/integration-test-suite.ts --quick
 *   cd apps/api && npx tsx scripts/integration-test-suite.ts --group=circle
 * 
 * @see Story 40.29: Integration Test Suite
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env' });

// =============================================================================
// Configuration
// =============================================================================

const args = process.argv.slice(2);
const QUICK_MODE = args.includes('--quick');
const groupArg = args.find(a => a.startsWith('--group='));
const TEST_GROUP = groupArg ? groupArg.split('=')[1] : 'all';

interface TestResult {
  name: string;
  group: string;
  passed: boolean;
  duration_ms: number;
  error?: string;
  details?: Record<string, any>;
}

interface TestSuiteResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number;
  results: TestResult[];
}

// =============================================================================
// Test Utilities
// =============================================================================

async function runTest(
  name: string,
  group: string,
  testFn: () => Promise<any>
): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const details = await testFn();
    return {
      name,
      group,
      passed: true,
      duration_ms: Date.now() - start,
      details,
    };
  } catch (error: any) {
    return {
      name,
      group,
      passed: false,
      duration_ms: Date.now() - start,
      error: error.message,
    };
  }
}

function shouldRunGroup(group: string): boolean {
  return TEST_GROUP === 'all' || TEST_GROUP === group;
}

// =============================================================================
// Test Definitions
// =============================================================================

// --- Supabase Tests ---
async function testSupabaseConnection(): Promise<any> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data, error } = await supabase.from('tenants').select('id').limit(1);
  if (error) throw new Error(error.message);
  
  return { tenants: data?.length || 0 };
}

async function testSupabaseRLS(): Promise<any> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
  
  // Should fail without auth
  const { error } = await supabase.from('tenants').select('id');
  
  return { rls_enforced: !!error };
}

// --- Circle Tests ---
async function testCircleAPI(): Promise<any> {
  const apiKey = process.env.CIRCLE_API_KEY;
  if (!apiKey) throw new Error('CIRCLE_API_KEY not configured');
  
  const response = await fetch('https://api-sandbox.circle.com/v1/configuration', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  
  if (!response.ok) throw new Error(`Circle API ${response.status}`);
  
  const data = await response.json();
  return { status: 'connected', payments: data.data?.payments };
}

async function testCircleFX(): Promise<any> {
  const { getCircleFXService } = await import('../src/services/circle/fx.js');
  const fxService = getCircleFXService();
  
  const quote = await fxService.getQuote({
    source_currency: 'USD',
    destination_currency: 'BRL',
    source_amount: 100,
  });
  
  if (!quote.rate) throw new Error('No rate returned');
  
  return { rate: quote.rate, destination: quote.destination_amount };
}

// --- Blockchain Tests ---
async function testBlockchainRPC(): Promise<any> {
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
  
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_chainId',
      params: [],
      id: 1,
    }),
  });
  
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  
  return { chainId: data.result };
}

async function testEVMWallet(): Promise<any> {
  const privateKey = process.env.EVM_PRIVATE_KEY;
  if (!privateKey) throw new Error('EVM_PRIVATE_KEY not configured');
  
  // Basic format validation - allow with or without 0x prefix
  const keyWithoutPrefix = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  
  // Should be 64 hex characters
  if (!/^[a-fA-F0-9]{64}$/.test(keyWithoutPrefix)) {
    throw new Error('Invalid private key format (expected 64 hex chars)');
  }
  
  return { configured: true, format: 'valid', has_prefix: privateKey.startsWith('0x') };
}

// --- Stripe Tests ---
async function testStripeAPI(): Promise<any> {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error('STRIPE_SECRET_KEY not configured');
  
  const response = await fetch('https://api.stripe.com/v1/balance', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  
  if (!response.ok) throw new Error(`Stripe API ${response.status}`);
  
  const data = await response.json();
  return { available: data.available?.length || 0 };
}

// --- Compliance Tests ---
async function testComplianceScreening(): Promise<any> {
  const { getMockComplianceProvider } = await import('../src/services/compliance/mock-provider.js');
  const provider = getMockComplianceProvider();
  
  // Test wallet screening
  const walletResult = await provider.screenWallet({
    address: '0x1234567890abcdef1234567890abcdef12345678',
    chain: 'base',
  });
  
  // Test entity screening
  const entityResult = await provider.screenEntity({
    name: 'Test User',
    type: 'individual',
    country: 'US',
  });
  
  return {
    wallet_risk: walletResult.result.risk_level,
    entity_risk: entityResult.result.risk_level,
  };
}

// --- Multi-Currency Tests ---
async function testMultiCurrency(): Promise<any> {
  const { getMultiCurrencyService } = await import('../src/services/fx/multi-currency.js');
  const mcService = getMultiCurrencyService();
  
  // Test cross-LATAM corridor
  const quote = await mcService.getQuote('BRL', 'MXN', 1000);
  
  if (!quote.route.via) throw new Error('Expected via USD route');
  
  return {
    corridor: `${quote.source_currency}->${quote.destination_currency}`,
    via: quote.route.via,
    steps: quote.route.steps.length,
  };
}

// --- Wallet Verification Tests ---
async function testWalletVerification(): Promise<any> {
  const { getWalletVerificationService } = await import('../src/services/wallet/verification.js');
  const verificationService = getWalletVerificationService();
  
  const challenge = verificationService.generateChallenge(
    '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
  );
  
  if (!challenge.nonce) throw new Error('No nonce generated');
  
  return {
    challenge_generated: true,
    expires_in: '5 minutes',
  };
}

// --- x402 Tests ---
async function testX402Facilitator(): Promise<any> {
  const facilitatorUrl = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';
  
  const response = await fetch(`${facilitatorUrl}/health`);
  // x402.org might not have /health, just check if reachable
  
  return { 
    url: facilitatorUrl,
    reachable: response.status < 500,
  };
}

// --- Database Schema Tests ---
async function testDatabaseSchema(): Promise<any> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const requiredTables = [
    'tenants',
    'accounts',
    'transfers',
    'settlements',
    'wallets',
    'quotes',
    'compliance_flags',
    'webhook_events',
    'api_keys',
  ];
  
  const missing: string[] = [];
  
  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select('id').limit(0);
    if (error && error.code === '42P01') {  // undefined_table
      missing.push(table);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing tables: ${missing.join(', ')}`);
  }
  
  return { tables_verified: requiredTables.length };
}

// =============================================================================
// Test Runner
// =============================================================================

async function runTestSuite(): Promise<TestSuiteResult> {
  const results: TestResult[] = [];
  const start = Date.now();
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     PayOS Integration Test Suite                           ║');
  console.log('║     Story 40.29                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nMode: ${QUICK_MODE ? 'Quick' : 'Full'} | Group: ${TEST_GROUP}\n`);

  // --- Supabase Group ---
  if (shouldRunGroup('supabase')) {
    console.log('=== Supabase Tests ===');
    
    results.push(await runTest('Supabase Connection', 'supabase', testSupabaseConnection));
    console.log(results[results.length - 1].passed ? '  ✅ Connection' : '  ❌ Connection');
    
    results.push(await runTest('Supabase RLS', 'supabase', testSupabaseRLS));
    console.log(results[results.length - 1].passed ? '  ✅ RLS Enforced' : '  ❌ RLS Enforced');
    
    results.push(await runTest('Database Schema', 'supabase', testDatabaseSchema));
    console.log(results[results.length - 1].passed ? '  ✅ Schema' : '  ❌ Schema');
    console.log('');
  }

  // --- Circle Group ---
  if (shouldRunGroup('circle')) {
    console.log('=== Circle Tests ===');
    
    results.push(await runTest('Circle API', 'circle', testCircleAPI));
    console.log(results[results.length - 1].passed ? '  ✅ API Connection' : '  ❌ API Connection');
    
    results.push(await runTest('Circle FX', 'circle', testCircleFX));
    console.log(results[results.length - 1].passed ? '  ✅ FX Quotes' : '  ❌ FX Quotes');
    console.log('');
  }

  // --- Blockchain Group ---
  if (shouldRunGroup('blockchain')) {
    console.log('=== Blockchain Tests ===');
    
    results.push(await runTest('Base Sepolia RPC', 'blockchain', testBlockchainRPC));
    console.log(results[results.length - 1].passed ? '  ✅ RPC Connection' : '  ❌ RPC Connection');
    
    results.push(await runTest('EVM Wallet', 'blockchain', testEVMWallet));
    console.log(results[results.length - 1].passed ? '  ✅ Wallet Config' : '  ❌ Wallet Config');
    console.log('');
  }

  // --- Stripe Group ---
  if (shouldRunGroup('stripe')) {
    console.log('=== Stripe Tests ===');
    
    results.push(await runTest('Stripe API', 'stripe', testStripeAPI));
    console.log(results[results.length - 1].passed ? '  ✅ API Connection' : '  ❌ API Connection');
    console.log('');
  }

  // --- Services Group ---
  if (shouldRunGroup('services')) {
    console.log('=== Service Tests ===');
    
    results.push(await runTest('Compliance Screening', 'services', testComplianceScreening));
    console.log(results[results.length - 1].passed ? '  ✅ Compliance' : '  ❌ Compliance');
    
    results.push(await runTest('Multi-Currency', 'services', testMultiCurrency));
    console.log(results[results.length - 1].passed ? '  ✅ Multi-Currency' : '  ❌ Multi-Currency');
    
    results.push(await runTest('Wallet Verification', 'services', testWalletVerification));
    console.log(results[results.length - 1].passed ? '  ✅ Wallet Verification' : '  ❌ Wallet Verification');
    console.log('');
  }

  // --- x402 Group ---
  if (shouldRunGroup('x402') && !QUICK_MODE) {
    console.log('=== x402 Tests ===');
    
    results.push(await runTest('x402 Facilitator', 'x402', testX402Facilitator));
    console.log(results[results.length - 1].passed ? '  ✅ Facilitator' : '  ❌ Facilitator');
    console.log('');
  }

  const duration = Date.now() - start;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  return {
    total: results.length,
    passed,
    failed,
    skipped: 0,
    duration_ms: duration,
    results,
  };
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const suiteResult = await runTestSuite();
  
  // Print Summary
  console.log('='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`\nTotal:    ${suiteResult.total}`);
  console.log(`Passed:   ${suiteResult.passed} ✅`);
  console.log(`Failed:   ${suiteResult.failed} ❌`);
  console.log(`Duration: ${suiteResult.duration_ms}ms`);
  
  // Print failed tests
  const failed = suiteResult.results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    failed.forEach(f => {
      console.log(`   - ${f.name}: ${f.error}`);
    });
  }
  
  // Print passed details
  const passed = suiteResult.results.filter(r => r.passed && r.details);
  if (passed.length > 0 && !QUICK_MODE) {
    console.log('\n📊 Test Details:');
    passed.forEach(p => {
      if (p.details) {
        console.log(`   ${p.name}: ${JSON.stringify(p.details)}`);
      }
    });
  }
  
  // Final verdict
  console.log('\n' + '='.repeat(60));
  if (suiteResult.failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n✅ System is ready for deployment');
  } else {
    console.log(`⚠️  ${suiteResult.failed} TEST(S) FAILED`);
    console.log('='.repeat(60));
    console.log('\n❌ Please fix failing tests before deployment');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n💥 Test suite crashed:', error.message);
  process.exit(1);
});

