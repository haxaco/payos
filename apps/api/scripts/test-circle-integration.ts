/**
 * Test Circle Integration
 * Story 40.2: Circle USDC Wallet Creation & Management
 * 
 * Tests the real Circle API integration.
 * Run with: npx tsx scripts/test-circle-integration.ts
 */

import 'dotenv/config';
import { getCircleClient } from '../src/services/circle/client.js';

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              Circle Integration Test                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');

  try {
    const client = getCircleClient();
    
    // 1. Test health check
    console.log('1️⃣  Testing health check...');
    const health = await client.healthCheck();
    console.log(`   ✅ Health: ${health.healthy ? 'OK' : 'FAILED'}`);
    if (health.masterWalletId) {
      console.log(`   📍 Master Wallet ID: ${health.masterWalletId}`);
    }
    console.log('');

    // 2. List existing wallet sets
    console.log('2️⃣  Listing wallet sets...');
    const walletSets = await client.listWalletSets();
    console.log(`   📁 Found ${walletSets.length} wallet set(s)`);
    for (const ws of walletSets) {
      console.log(`      - ${ws.id}: ${ws.name || '(unnamed)'} (${ws.custodyType})`);
    }
    console.log('');

    // 3. Create or reuse a wallet set
    let walletSetId: string;
    if (walletSets.length > 0) {
      walletSetId = walletSets[0].id;
      console.log(`3️⃣  Reusing existing wallet set: ${walletSetId}`);
    } else {
      console.log('3️⃣  Creating new wallet set...');
      const newSet = await client.createWalletSet('PayOS Test Wallets');
      walletSetId = newSet.id;
      console.log(`   ✅ Created wallet set: ${walletSetId}`);
    }
    console.log('');

    // 4. List existing wallets
    console.log('4️⃣  Listing wallets in set...');
    const existingWallets = await client.listWallets({ walletSetId });
    console.log(`   💼 Found ${existingWallets.length} wallet(s)`);
    for (const w of existingWallets.slice(0, 5)) {
      console.log(`      - ${w.id}: ${w.address.substring(0, 10)}... (${w.blockchain}, ${w.state})`);
    }
    if (existingWallets.length > 5) {
      console.log(`      ... and ${existingWallets.length - 5} more`);
    }
    console.log('');

    // 5. Create a new wallet on Base Sepolia
    console.log('5️⃣  Creating new wallet on BASE-SEPOLIA...');
    const newWallet = await client.createWallet(
      walletSetId,
      'ETH-SEPOLIA', // Using ETH-SEPOLIA as BASE-SEPOLIA may not be available yet
      'PayOS Test Wallet',
      `test-${Date.now()}`
    );
    console.log(`   ✅ Created wallet: ${newWallet.id}`);
    console.log(`   📍 Address: ${newWallet.address}`);
    console.log(`   ⛓️  Blockchain: ${newWallet.blockchain}`);
    console.log(`   🔄 State: ${newWallet.state}`);
    console.log('');

    // 6. Get wallet balance
    console.log('6️⃣  Getting wallet balance...');
    const balances = await client.getWalletBalances(newWallet.id);
    console.log(`   💰 Found ${balances.length} token balance(s)`);
    for (const b of balances) {
      const formatted = parseFloat(b.amount) / Math.pow(10, b.token.decimals);
      console.log(`      - ${b.token.symbol}: ${formatted} (raw: ${b.amount})`);
    }
    if (balances.length === 0) {
      console.log(`      (Empty wallet - fund with test USDC from faucet)`);
    }
    console.log('');

    // 7. Get USDC balance specifically
    console.log('7️⃣  Getting USDC balance...');
    const usdcBalance = await client.getUsdcBalance(newWallet.id);
    console.log(`   💵 USDC Balance: ${usdcBalance.formatted} (raw: ${usdcBalance.amount})`);
    console.log('');

    // Summary
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                               ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  ✅ Circle API Connection: Working                            ║`);
    console.log(`║  ✅ Wallet Set: ${walletSetId.padEnd(43)}║`);
    console.log(`║  ✅ New Wallet: ${newWallet.id.padEnd(43)}║`);
    console.log(`║  ✅ Wallet Address: ${newWallet.address.substring(0, 38)}...  ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');
    console.log('🎉 Circle integration test PASSED!\n');

  } catch (error) {
    console.error('\n❌ Test FAILED:', error);
    process.exit(1);
  }
}

main();



