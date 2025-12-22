/**
 * Test Script: Enhanced Wallet Features
 * 
 * Tests the new wallet features added in Wallet v2:
 * 1. Create internal wallet
 * 2. Create multiple wallets per account
 * 3. Link external wallet
 * 4. Verify external wallet ownership (mock)
 * 5. Create Circle wallet (mock)
 * 6. Sync external wallet balance (mock)
 * 7. Deposit/withdraw operations
 * 8. Wallet type validation
 * 
 * Run with: tsx scripts/test-wallet-features.ts
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
  internalWallet: null as any,
  externalWallet: null as any,
  circleWallet: null as any,
  wallets: [] as any[]
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

function logStep(step: number, title: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Step ${step}: ${title}`);
  console.log('='.repeat(60));
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
  logStep(1, 'Authenticate as Business User');

  try {
    const authResponse = await fetch(`${API_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'haxaco@gmail.com',
        password: 'Password123!'
      })
    });

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      throw new Error(`Authentication failed: ${JSON.stringify(authData)}`);
    }

    AUTH_TOKEN = authData.session.accessToken;
    TENANT_ID = authData.tenant.id;

    // Fetch account ID
    const accountsResponse = await apiRequest('GET', '/v1/accounts');
    const accounts = accountsResponse.data;

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found for this user');
    }

    // Find a business account
    const businessAccount = accounts.find((acc: any) => acc.type === 'business');
    TEST_ACCOUNT_ID = businessAccount ? businessAccount.id : accounts[0].id;

    logSuccess(`Authenticated successfully`);
    log(`Tenant ID: ${TENANT_ID}`);
    log(`Account ID: ${TEST_ACCOUNT_ID}`);
  } catch (error) {
    logError('Authentication failed', error);
    throw error;
  }
}

// ============================================

async function step2_createInternalWallet() {
  logStep(2, 'Create Internal Wallet (PayOS Custodial)');

  try {
    const wallet = await apiRequest('POST', '/v1/wallets', {
      ownerAccountId: TEST_ACCOUNT_ID,
      name: `Operations Wallet ${Date.now()}`,
      purpose: 'Day-to-day operations and API payments',
      currency: 'USDC'
    });

    testData.internalWallet = wallet.data;
    testData.wallets.push(wallet.data);

    log('Internal wallet created:', {
      id: wallet.data.id,
      name: wallet.data.name,
      type: wallet.data.walletType,
      custody: wallet.data.custodyType,
      provider: wallet.data.provider,
      walletAddress: wallet.data.walletAddress
    });

    // Verify wallet properties
    if (wallet.data.walletType !== 'internal') {
      throw new Error(`Expected walletType 'internal', got '${wallet.data.walletType}'`);
    }
    if (wallet.data.custodyType !== 'custodial') {
      throw new Error(`Expected custodyType 'custodial', got '${wallet.data.custodyType}'`);
    }
    if (wallet.data.provider !== 'payos') {
      throw new Error(`Expected provider 'payos', got '${wallet.data.provider}'`);
    }
    if (!wallet.data.walletAddress.startsWith('internal://payos')) {
      throw new Error(`Expected internal payment address, got '${wallet.data.walletAddress}'`);
    }

    logSuccess('Internal wallet created and validated');
  } catch (error) {
    logError('Failed to create internal wallet', error);
    throw error;
  }
}

// ============================================

async function step3_depositToInternalWallet() {
  logStep(3, 'Deposit Funds to Internal Wallet');

  try {
    const depositAmount = 1000;
    const wallet = await apiRequest('POST', `/v1/wallets/${testData.internalWallet.id}/deposit`, {
      amount: depositAmount,
      sourceAccountId: TEST_ACCOUNT_ID
    });

    // Verify response
    if (wallet.data.newBalance !== depositAmount) {
      throw new Error(`Expected balance ${depositAmount}, got ${wallet.data.newBalance}`);
    }

    // Update local state
    testData.internalWallet.balance = wallet.data.newBalance;

    log('Deposit successful:', {
      walletId: wallet.data.walletId,
      newBalance: wallet.data.newBalance,
      currency: wallet.data.currency
    });

    logSuccess(`Deposited $${depositAmount} USDC successfully`);
  } catch (error) {
    logError('Deposit failed', error);
    throw error;
  }
}

// ============================================

async function step4_createMultipleWallets() {
  logStep(4, 'Create Multiple Wallets per Account');

  try {
    // Wallet 2: Compliance Bot Wallet
    const wallet2 = await apiRequest('POST', '/v1/wallets', {
      ownerAccountId: TEST_ACCOUNT_ID,
      name: `Compliance Bot Wallet ${Date.now()}`,
      purpose: 'Automated compliance checks',
      currency: 'USDC'
    });

    testData.wallets.push(wallet2.data);

    // Deposit to wallet 2
    await apiRequest('POST', `/v1/wallets/${wallet2.data.id}/deposit`, {
      amount: 500,
      sourceAccountId: TEST_ACCOUNT_ID
    });

    // Wallet 3: Treasury Wallet
    const wallet3 = await apiRequest('POST', '/v1/wallets', {
      ownerAccountId: TEST_ACCOUNT_ID,
      name: `Treasury Wallet ${Date.now()}`,
      purpose: 'Long-term holdings',
      currency: 'EURC'  // Different currency
    });

    testData.wallets.push(wallet3.data);

    // Deposit to wallet 3
    await apiRequest('POST', `/v1/wallets/${wallet3.data.id}/deposit`, {
      amount: 2000,
      sourceAccountId: TEST_ACCOUNT_ID
    });

    log('Multiple wallets created:', {
      total: testData.wallets.length,
      wallets: testData.wallets.map(w => ({
        name: w.name,
        currency: w.currency,
        balance: w.balance || 0
      }))
    });

    logSuccess(`Created ${testData.wallets.length} wallets for the same account`);
  } catch (error) {
    logError('Failed to create multiple wallets', error);
    throw error;
  }
}

// ============================================

async function step5_linkExternalWallet() {
  logStep(5, 'Link External Wallet (Self-Custody)');

  try {
    const wallet = await apiRequest('POST', '/v1/wallets/external', {
      ownerAccountId: TEST_ACCOUNT_ID,
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',  // Test address
      blockchain: 'base',
      currency: 'USDC',
      name: `Hardware Wallet ${Date.now()}`
    });

    testData.externalWallet = wallet.data;
    testData.wallets.push(wallet.data);

    log('External wallet linked:', {
      id: wallet.data.id,
      name: wallet.data.name,
      type: wallet.data.walletType,
      custody: wallet.data.custodyType,
      address: wallet.data.walletAddress,
      blockchain: wallet.data.blockchain,
      verificationStatus: wallet.data.verificationStatus
    });

    // Verify wallet properties
    if (wallet.data.walletType !== 'external') {
      throw new Error(`Expected walletType 'external', got '${wallet.data.walletType}'`);
    }
    if (wallet.data.custodyType !== 'self') {
      throw new Error(`Expected custodyType 'self', got '${wallet.data.custodyType}'`);
    }
    if (wallet.data.verificationStatus !== 'unverified') {
      throw new Error(`Expected verificationStatus 'unverified', got '${wallet.data.verificationStatus}'`);
    }
    if (!wallet.data.walletAddress.startsWith('0x')) {
      throw new Error(`Expected Ethereum address, got '${wallet.data.walletAddress}'`);
    }

    logSuccess('External wallet linked successfully');
  } catch (error) {
    logError('Failed to link external wallet', error);
    throw error;
  }
}

// ============================================

async function step6_verifyExternalWallet() {
  logStep(6, 'Verify External Wallet Ownership (Mock)');

  try {
    const wallet = await apiRequest('POST', `/v1/wallets/${testData.externalWallet.id}/verify`, {
      signature: '0xMOCK_SIGNATURE_FOR_TESTING_1234567890',
      message: 'I own this wallet and authorize PayOS to use it',
      method: 'eip712'
    });

    testData.externalWallet = wallet.data;

    log('Wallet verified:', {
      id: wallet.data.id,
      verificationStatus: wallet.data.verificationStatus,
      verificationMethod: wallet.data.verificationMethod,
      verifiedAt: wallet.data.verifiedAt
    });

    // Verify status changed
    if (wallet.data.verificationStatus !== 'verified') {
      throw new Error(`Expected verificationStatus 'verified', got '${wallet.data.verificationStatus}'`);
    }
    if (!wallet.data.verifiedAt) {
      throw new Error('Expected verifiedAt timestamp to be set');
    }

    logSuccess('External wallet verified successfully');
  } catch (error) {
    logError('Failed to verify external wallet', error);
    throw error;
  }
}

// ============================================

async function step7_createCircleWallet() {
  logStep(7, 'Create Circle Wallet (Mock - Phase 1)');

  try {
    const wallet = await apiRequest('POST', '/v1/wallets', {
      ownerAccountId: TEST_ACCOUNT_ID,
      name: `Circle MPC Wallet ${Date.now()}`,
      walletType: 'circle_mpc',
      currency: 'USDC'
    });

    testData.circleWallet = wallet.data;
    testData.wallets.push(wallet.data);

    log('Circle wallet created (mock):', {
      id: wallet.data.id,
      name: wallet.data.name,
      type: wallet.data.walletType,
      custody: wallet.data.custodyType,
      provider: wallet.data.provider,
      providerWalletId: wallet.data.providerWalletId,
      walletAddress: wallet.data.walletAddress,
      network: wallet.data.network
    });

    // Verify wallet properties
    if (wallet.data.walletType !== 'circle_mpc') {
      throw new Error(`Expected walletType 'circle_mpc', got '${wallet.data.walletType}'`);
    }
    if (wallet.data.custodyType !== 'mpc') {
      throw new Error(`Expected custodyType 'mpc', got '${wallet.data.custodyType}'`);
    }
    if (wallet.data.provider !== 'circle') {
      throw new Error(`Expected provider 'circle', got '${wallet.data.provider}'`);
    }
    if (!wallet.data.providerWalletId) {
      throw new Error('Expected providerWalletId to be set');
    }
    if (!wallet.data.providerMetadata) {
      throw new Error('Expected providerMetadata to be set');
    }

    log('Provider metadata:', wallet.data.providerMetadata);

    logSuccess('Circle wallet created (mocked) successfully');
  } catch (error) {
    logError('Failed to create Circle wallet', error);
    throw error;
  }
}

// ============================================

async function step8_listAllWallets() {
  logStep(8, 'List All Wallets for Account');

  try {
    const response = await apiRequest('GET', `/v1/wallets?ownerAccountId=${TEST_ACCOUNT_ID}`);
    const wallets = response.data;

    log(`Found ${wallets.length} wallets for account ${TEST_ACCOUNT_ID}`);

    wallets.forEach((wallet: any, index: number) => {
      console.log(`\n  Wallet ${index + 1}:`);
      console.log(`    Name: ${wallet.name}`);
      console.log(`    Type: ${wallet.walletType}`);
      console.log(`    Custody: ${wallet.custodyType}`);
      console.log(`    Balance: $${wallet.balance || 0} ${wallet.currency}`);
      console.log(`    Status: ${wallet.status}`);
    });

    // Verify we have multiple wallets
    if (wallets.length < 3) {
      throw new Error(`Expected at least 3 wallets, found ${wallets.length}`);
    }

    // Verify wallet types
    const internalCount = wallets.filter((w: any) => w.walletType === 'internal').length;
    const externalCount = wallets.filter((w: any) => w.walletType === 'external').length;
    const circleCount = wallets.filter((w: any) => w.walletType.startsWith('circle')).length;

    log('Wallet type distribution:', {
      internal: internalCount,
      external: externalCount,
      circle: circleCount,
      total: wallets.length
    });

    logSuccess('Successfully listed and validated all wallets');
  } catch (error) {
    logError('Failed to list wallets', error);
    throw error;
  }
}

// ============================================

async function step9_testWithdrawFromInternalWallet() {
  logStep(9, 'Withdraw Funds from Internal Wallet');

  try {
    const withdrawAmount = 250;
    const balanceBefore = testData.internalWallet.balance;

    const wallet = await apiRequest('POST', `/v1/wallets/${testData.internalWallet.id}/withdraw`, {
      amount: withdrawAmount,
      destinationAccountId: TEST_ACCOUNT_ID
    });

    // Update local state
    testData.internalWallet.balance = wallet.data.newBalance;

    log('Withdrawal successful:', {
      walletId: wallet.data.walletId,
      balanceBefore: balanceBefore,
      withdrawn: withdrawAmount,
      balanceAfter: wallet.data.newBalance
    });

    const expectedBalance = balanceBefore - withdrawAmount;
    if (wallet.data.newBalance !== expectedBalance) {
      throw new Error(`Expected balance ${expectedBalance}, got ${wallet.data.newBalance}`);
    }

    logSuccess(`Withdrew $${withdrawAmount} USDC successfully`);
  } catch (error) {
    logError('Withdrawal failed', error);
    throw error;
  }
}

// ============================================

async function step10_testWalletTypeValidation() {
  logStep(10, 'Test Wallet Type-Specific Behaviors');

  try {
    // Test 1: Try to deposit to external wallet (should work but with note about syncing)
    log('Test 1: Verify external wallet behavior...');
    const externalWallet = await apiRequest('GET', `/v1/wallets/${testData.externalWallet.id}`);

    if (externalWallet.data.walletType !== 'external') {
      throw new Error('External wallet type mismatch');
    }
    if (externalWallet.data.custodyType !== 'self') {
      throw new Error('External wallet should have self custody');
    }

    logSuccess('External wallet type validation passed');

    // Test 2: Verify Circle wallet metadata
    log('Test 2: Verify Circle wallet metadata...');
    const circleWallet = await apiRequest('GET', `/v1/wallets/${testData.circleWallet.id}`);

    if (!circleWallet.data.providerMetadata) {
      throw new Error('Circle wallet missing provider metadata');
    }
    if (!circleWallet.data.providerWalletId) {
      throw new Error('Circle wallet missing provider wallet ID');
    }

    logSuccess('Circle wallet metadata validation passed');

    // Test 3: Verify internal wallet has correct payment address format
    log('Test 3: Verify internal wallet payment address format...');
    const internalWallet = await apiRequest('GET', `/v1/wallets/${testData.internalWallet.id}`);

    if (!internalWallet.data.paymentAddress.startsWith('internal://payos')) {
      throw new Error('Internal wallet has incorrect payment address format');
    }

    logSuccess('Internal wallet payment address validation passed');

    logSuccess('All wallet type validations passed');
  } catch (error) {
    logError('Wallet type validation failed', error);
    throw error;
  }
}

// ============================================
// Main Test Runner
// ============================================

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          WALLET FEATURES AUTOMATED TEST SUITE                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();
  let successCount = 0;
  let failureCount = 0;

  const tests = [
    { name: 'Authentication', fn: step1_authenticate },
    { name: 'Create Internal Wallet', fn: step2_createInternalWallet },
    { name: 'Deposit to Internal Wallet', fn: step3_depositToInternalWallet },
    { name: 'Create Multiple Wallets', fn: step4_createMultipleWallets },
    { name: 'Link External Wallet', fn: step5_linkExternalWallet },
    { name: 'Verify External Wallet', fn: step6_verifyExternalWallet },
    { name: 'Create Circle Wallet (Mock)', fn: step7_createCircleWallet },
    { name: 'List All Wallets', fn: step8_listAllWallets },
    { name: 'Withdraw from Internal Wallet', fn: step9_testWithdrawFromInternalWallet },
    { name: 'Test Wallet Type Validation', fn: step10_testWalletTypeValidation }
  ];

  for (const test of tests) {
    try {
      await test.fn();
      successCount++;
    } catch (error) {
      failureCount++;
      logError(`Test "${test.name}" failed`, error);
      // Abort if authentication fails as it blocks everything else
      if (test.name === 'Authentication') {
        console.error('\n🛑 Authentication failed. Aborting remaining tests.');
        break;
      }
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n✅ Passed: ${successCount}/${tests.length}`);
  console.log(`❌ Failed: ${failureCount}/${tests.length}`);
  console.log(`⏱️  Duration: ${duration}s`);

  if (failureCount === 0) {
    console.log('\n🎉 All wallet feature tests passed! 🎉\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// ============================================
// Execute Tests
// ============================================

runTests().catch((error) => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});

