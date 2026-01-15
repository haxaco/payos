/**
 * Test Blockchain Integration
 * Story 40.7: Base Sepolia Wallet Setup & Funding
 * 
 * Tests the blockchain configuration and wallet setup.
 * Run with: npx tsx scripts/test-blockchain.ts
 */

import 'dotenv/config';
import {
  getChainConfig,
  getCurrentChain,
  getRpcUrl,
  getWalletAddress,
  getWalletInfo,
  blockchainHealthCheck,
  logBlockchainConfig,
} from '../src/config/blockchain.js';

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              Blockchain Integration Test                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Log configuration
  logBlockchainConfig();

  try {
    // 1. Get chain config
    console.log('1️⃣  Getting chain configuration...');
    const chain = getCurrentChain();
    const config = getChainConfig();
    console.log(`   Chain: ${config.chainName}`);
    console.log(`   Chain ID: ${config.chainId}`);
    console.log(`   RPC URL: ${getRpcUrl()}`);
    console.log('');

    // 2. Health check
    console.log('2️⃣  Running health check...');
    const health = await blockchainHealthCheck();
    console.log(`   Status: ${health.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    if (health.blockNumber) {
      console.log(`   Block Number: ${health.blockNumber}`);
    }
    if (health.error) {
      console.log(`   Error: ${health.error}`);
    }
    console.log('');

    // 3. Check wallet
    console.log('3️⃣  Checking wallet configuration...');
    try {
      const address = getWalletAddress();
      console.log(`   ✅ Wallet Address: ${address}`);
      console.log(`   📍 Explorer: ${config.blockExplorerUrl}/address/${address}`);
      
      // 4. Get wallet info
      console.log('');
      console.log('4️⃣  Getting wallet balances...');
      const info = await getWalletInfo();
      console.log(`   💰 ETH Balance: ${info.balanceEth} ETH`);
      console.log(`   💵 USDC Balance: ${info.balanceUsdc} USDC`);
      
      // Warn if low balances
      const ethBalance = parseFloat(info.balanceEth);
      const usdcBalance = parseFloat(info.balanceUsdc);
      
      if (ethBalance < 0.01) {
        console.log('');
        console.log('⚠️  Low ETH balance! Get test ETH from:');
        console.log(`   ${config.faucets?.eth || 'https://www.alchemy.com/faucets/base-sepolia'}`);
      }
      
      if (usdcBalance < 10) {
        console.log('');
        console.log('⚠️  Low USDC balance! Get test USDC from:');
        console.log(`   ${config.faucets?.usdc || 'https://faucet.circle.com/'}`);
      }
      
    } catch (e: any) {
      console.log(`   ⚠️  Wallet not configured: ${e.message}`);
      console.log('');
      console.log('   To configure a wallet, add to your .env:');
      console.log('   EVM_PRIVATE_KEY=your_private_key_here');
      console.log('');
      console.log('   Generate a new key with:');
      console.log('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
    console.log('');

    // 5. Show contract addresses
    console.log('5️⃣  Contract addresses:');
    console.log(`   USDC: ${config.contracts.usdc}`);
    if (config.contracts.eurc) {
      console.log(`   EURC: ${config.contracts.eurc}`);
    }
    console.log(`   Explorer: ${config.blockExplorerUrl}/address/${config.contracts.usdc}`);
    console.log('');

    // Summary
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                               ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Chain: ${config.chainName.padEnd(49)}║`);
    console.log(`║  RPC: ${health.healthy ? 'Connected' : 'Disconnected'}`.padEnd(63) + '║');
    console.log(`║  Wallet: ${health.walletAddress ? 'Configured' : 'Not configured'}`.padEnd(60) + '║');
    if (health.balances) {
      console.log(`║  ETH: ${health.balances.eth.substring(0, 10)} ETH`.padEnd(60) + '║');
      console.log(`║  USDC: ${health.balances.usdc} USDC`.padEnd(59) + '║');
    }
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');
    
    if (health.healthy) {
      console.log('🎉 Blockchain integration test PASSED!\n');
    } else {
      console.log('⚠️  Blockchain test completed with warnings\n');
    }

  } catch (error) {
    console.error('\n❌ Test FAILED:', error);
    process.exit(1);
  }
}

main();



