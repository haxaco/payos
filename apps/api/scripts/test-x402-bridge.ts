/**
 * x402 → Circle Bridge Test Script
 * Story 40.10: E2E Testing
 * 
 * Tests the full flow:
 * 1. Check wallet balance
 * 2. Get FX quote for USDC → BRL/MXN
 * 3. Simulate x402 settlement trigger
 * 
 * Run: npx tsx scripts/test-x402-bridge.ts
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../.env') });

import { getWalletAddress, getUsdcBalance, getChainConfig } from '../src/config/blockchain.js';
import { createX402ToCircleBridge } from '../src/services/bridge/x402-to-circle.js';
import { getX402FacilitatorClient, getCurrentNetwork } from '../src/services/x402/facilitator.js';
import { getCirclePayoutsClient } from '../src/services/circle/payouts.js';

// Test tenant ID
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║            x402 → Circle Bridge Test                         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const results: Array<{ name: string; status: '✅' | '❌' | '⚠️'; details?: string }> = [];

  // ============================================
  // 1. Blockchain Wallet Check
  // ============================================
  console.log('1️⃣  Checking blockchain wallet...');
  try {
    const walletAddress = getWalletAddress();
    const usdcBalance = await getUsdcBalance(walletAddress);
    const chainConfig = getChainConfig();

    console.log(`   Address: ${walletAddress}`);
    console.log(`   USDC Balance: ${usdcBalance}`);
    console.log(`   Chain: ${chainConfig.chainName}`);
    console.log(`   Network: ${getCurrentNetwork()}`);
    
    results.push({
      name: 'Blockchain Wallet',
      status: parseFloat(usdcBalance) > 0 ? '✅' : '⚠️',
      details: `${usdcBalance} USDC on ${chainConfig.chainName}`,
    });
  } catch (error: any) {
    console.error('   Error:', error.message);
    results.push({ name: 'Blockchain Wallet', status: '❌', details: error.message });
  }
  console.log('');

  // ============================================
  // 2. x402 Facilitator Check
  // ============================================
  console.log('2️⃣  Checking x402 facilitator...');
  try {
    const facilitator = getX402FacilitatorClient();
    const config = facilitator.getConfig();
    
    console.log(`   Facilitator: ${config.name}`);
    console.log(`   URL: ${config.url}`);
    console.log(`   Environment: ${config.environment}`);

    const health = await facilitator.healthCheck();
    console.log(`   Status: ${health.healthy ? 'Healthy' : 'Unhealthy'}`);
    
    if (health.schemes) {
      console.log(`   Supported schemes: ${health.schemes.map(s => s.scheme).join(', ')}`);
    }

    results.push({
      name: 'x402 Facilitator',
      status: health.healthy ? '✅' : '❌',
      details: `${config.name} (${config.environment})`,
    });
  } catch (error: any) {
    console.error('   Error:', error.message);
    results.push({ name: 'x402 Facilitator', status: '❌', details: error.message });
  }
  console.log('');

  // ============================================
  // 3. Circle Payouts Check
  // ============================================
  console.log('3️⃣  Checking Circle Payouts...');
  try {
    const circleClient = getCirclePayoutsClient();
    const health = await circleClient.healthCheck();
    
    console.log(`   Status: ${health.healthy ? 'Healthy' : 'Unhealthy'}`);
    console.log(`   Message: ${health.message}`);

    results.push({
      name: 'Circle Payouts',
      status: health.healthy ? '✅' : '❌',
      details: health.message,
    });
  } catch (error: any) {
    console.error('   Error:', error.message);
    results.push({ name: 'Circle Payouts', status: '❌', details: error.message });
  }
  console.log('');

  // ============================================
  // 4. Bridge Quote Test
  // ============================================
  console.log('4️⃣  Testing bridge quotes...');
  try {
    const bridge = createX402ToCircleBridge(TEST_TENANT_ID);

    // Quote for Pix (BRL)
    const pixQuote = bridge.getQuote('10.00', 'BRL');
    console.log('   Pix Quote (10 USDC → BRL):');
    console.log(`     - Input: ${pixQuote.usdcAmount} USDC`);
    console.log(`     - Output: ${pixQuote.fiatAmount} BRL`);
    console.log(`     - Rate: 1 USDC = ${pixQuote.exchangeRate} BRL`);
    console.log(`     - Bridge Fee: ${pixQuote.bridgeFee} USDC`);
    console.log(`     - Est. Delivery: ${pixQuote.estimatedDelivery}`);

    // Quote for SPEI (MXN)
    const speiQuote = bridge.getQuote('10.00', 'MXN');
    console.log('   SPEI Quote (10 USDC → MXN):');
    console.log(`     - Input: ${speiQuote.usdcAmount} USDC`);
    console.log(`     - Output: ${speiQuote.fiatAmount} MXN`);
    console.log(`     - Rate: 1 USDC = ${speiQuote.exchangeRate} MXN`);
    console.log(`     - Bridge Fee: ${speiQuote.bridgeFee} USDC`);
    console.log(`     - Est. Delivery: ${speiQuote.estimatedDelivery}`);

    results.push({
      name: 'Bridge Quotes',
      status: '✅',
      details: `10 USDC → ${pixQuote.fiatAmount} BRL / ${speiQuote.fiatAmount} MXN`,
    });
  } catch (error: any) {
    console.error('   Error:', error.message);
    results.push({ name: 'Bridge Quotes', status: '❌', details: error.message });
  }
  console.log('');

  // ============================================
  // Summary
  // ============================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  
  for (const result of results) {
    console.log(`${result.status} ${result.name}: ${result.details || ''}`);
  }

  const allPassed = results.every(r => r.status === '✅');
  const anyFailed = results.some(r => r.status === '❌');

  console.log('');
  if (allPassed) {
    console.log('✅ All systems ready for x402 → Circle bridge!');
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Start the API server: pnpm dev');
    console.log('   2. Make an x402 payment that triggers fiat settlement');
    console.log('   3. API Endpoints:');
    console.log('      GET  /v1/x402/bridge/wallet   - Get wallet address');
    console.log('      GET  /v1/x402/bridge/quote    - Get FX quote');
    console.log('      POST /v1/x402/bridge/settle/pix  - Settle to Pix');
    console.log('      POST /v1/x402/bridge/settle/spei - Settle to SPEI');
  } else if (anyFailed) {
    console.log('❌ Some systems are not configured correctly.');
    console.log('   Please check the errors above and update your .env file.');
  } else {
    console.log('⚠️  Some systems need attention but bridge is partially functional.');
  }
  console.log('');
}

main().catch(console.error);

