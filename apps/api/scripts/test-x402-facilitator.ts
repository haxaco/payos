/**
 * Test x402 Facilitator Integration
 * Story 40.8: x402.org Facilitator Integration
 * 
 * Tests the x402 facilitator integration.
 * Run with: npx tsx scripts/test-x402-facilitator.ts
 */

import 'dotenv/config';
import {
  getX402FacilitatorClient,
  createPaymentPayload,
  getCurrentNetwork,
  toUsdcUnits,
  fromUsdcUnits,
} from '../src/services/x402/index.js';
import { getChainConfig, getWalletAddress } from '../src/config/blockchain.js';

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              x402 Facilitator Integration Test                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    const client = getX402FacilitatorClient();
    const config = client.getConfig();
    
    // 1. Show configuration
    console.log('1️⃣  Facilitator Configuration:');
    console.log(`   Name: ${config.name}`);
    console.log(`   URL: ${config.url}`);
    console.log(`   Environment: ${config.environment}`);
    console.log('');

    // 2. Health check
    console.log('2️⃣  Running health check...');
    const health = await client.healthCheck();
    console.log(`   Status: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    if (health.schemes) {
      console.log('   Supported Schemes:');
      for (const scheme of health.schemes) {
        console.log(`     - ${scheme.scheme}: ${scheme.networks.join(', ')}`);
      }
    }
    if (health.error) {
      console.log(`   Error: ${health.error}`);
    }
    console.log('');

    // 3. Show current network
    console.log('3️⃣  Current Network:');
    const chainConfig = getChainConfig();
    const network = getCurrentNetwork();
    console.log(`   Network: ${network}`);
    console.log(`   Chain: ${chainConfig.chainName}`);
    console.log(`   USDC: ${chainConfig.contracts.usdc}`);
    console.log('');

    // 4. Test amount conversion
    console.log('4️⃣  Amount Conversion Test:');
    const testAmount = '10.50';
    const units = toUsdcUnits(testAmount);
    const back = fromUsdcUnits(units);
    console.log(`   $${testAmount} USDC → ${units} units → $${back} USDC`);
    console.log('');

    // 5. Try verify (mock payment)
    console.log('5️⃣  Testing Verify Endpoint...');
    try {
      const mockPayment = createPaymentPayload({
        amount: toUsdcUnits('1.00'),
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
      });
      
      console.log('   Payment Payload:');
      console.log(`     scheme: ${mockPayment.scheme}`);
      console.log(`     network: ${mockPayment.network}`);
      console.log(`     amount: ${mockPayment.amount} (${fromUsdcUnits(mockPayment.amount)} USDC)`);
      console.log(`     token: ${mockPayment.token}`);
      console.log(`     from: ${mockPayment.from.substring(0, 10)}...`);
      console.log(`     to: ${mockPayment.to.substring(0, 10)}...`);
      
      const verifyResult = await client.verify(mockPayment);
      console.log(`   ✅ Verify Result: ${verifyResult.valid ? 'Valid' : 'Invalid'}`);
      if (!verifyResult.valid && verifyResult.reason) {
        console.log(`   Reason: ${verifyResult.reason}`);
      }
    } catch (e: any) {
      console.log(`   ⚠️  Verify failed: ${e.message}`);
    }
    console.log('');

    // 6. Skip settle test (would cost gas)
    console.log('6️⃣  Settle Endpoint:');
    console.log('   ⏩ Skipped (requires signed payment and gas)');
    console.log('   To test settle, create a signed x402 payment');
    console.log('');

    // Summary
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                               ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Facilitator: ${config.name.padEnd(44)}║`);
    console.log(`║  Status: ${health.healthy ? 'Connected' : 'Disconnected'}`.padEnd(63) + '║');
    console.log(`║  Network: ${network.padEnd(49)}║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');
    
    if (health.healthy) {
      console.log('🎉 x402 Facilitator integration test PASSED!\n');
    } else {
      console.log('⚠️  x402 test completed with warnings\n');
      console.log('💡 If x402.org is unavailable, the mock facilitator is used automatically.\n');
    }

  } catch (error) {
    console.error('\n❌ Test FAILED:', error);
    process.exit(1);
  }
}

main();



