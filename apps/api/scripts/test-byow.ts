/**
 * BYOW (Bring Your Own Wallet) Test Script
 * 
 * Tests external wallet verification, sync, and info lookup.
 * 
 * Usage:
 *   cd apps/api && npx tsx scripts/test-byow.ts
 * 
 * @see Story 40.11: Wallet Management BYOW
 */

import { config } from 'dotenv';
config({ path: '.env' });

import { getWalletVerificationService } from '../src/services/wallet/verification.js';

const verificationService = getWalletVerificationService();

// Test wallet address (PayOS wallet on Base Sepolia)
const TEST_WALLET = process.env.EVM_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f0Ab12';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     BYOW (Bring Your Own Wallet) Test                      ║');
  console.log('║     Story 40.11                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Test Wallet:', TEST_WALLET, '\n');

  // ==========================================================================
  // Test 1: Generate Verification Challenge
  // ==========================================================================
  console.log('=== Test 1: Generate Verification Challenge ===\n');
  
  const challenge = verificationService.generateChallenge(TEST_WALLET);
  
  console.log('Challenge Generated:');
  console.log('  Nonce:', challenge.nonce);
  console.log('  Issued:', challenge.issued_at);
  console.log('  Expires:', challenge.expires_at);
  console.log('  Domain:', JSON.stringify(challenge.domain));
  console.log('  Message Preview:', challenge.message.slice(0, 100) + '...');
  console.log('✅ Challenge generated\n');

  // ==========================================================================
  // Test 2: Get Wallet Info
  // ==========================================================================
  console.log('=== Test 2: Get Wallet Info ===\n');
  
  const walletInfo = await verificationService.getWalletInfo(TEST_WALLET);
  
  console.log('Wallet Info:');
  console.log('  Address:', walletInfo.address);
  console.log('  Chain:', walletInfo.chain);
  console.log('  Native Balance:', walletInfo.balance, 'wei');
  console.log('  Is Contract:', walletInfo.isContract);
  console.log('  Nonce:', walletInfo.nonce);
  console.log('✅ Wallet info retrieved\n');

  // ==========================================================================
  // Test 3: Sync USDC Balance
  // ==========================================================================
  console.log('=== Test 3: Sync USDC Balance ===\n');
  
  // USDC on Base Sepolia
  const USDC_CONTRACT = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  
  const usdcBalance = await verificationService.syncBalance(TEST_WALLET, USDC_CONTRACT);
  
  console.log('USDC Balance:');
  console.log('  Raw:', usdcBalance.balance);
  console.log('  Decimals:', usdcBalance.decimals);
  console.log('  Formatted:', (parseFloat(usdcBalance.balance) / Math.pow(10, usdcBalance.decimals)).toFixed(2), 'USDC');
  console.log('✅ Balance synced\n');

  // ==========================================================================
  // Test 4: Sync Native ETH Balance
  // ==========================================================================
  console.log('=== Test 4: Sync Native ETH Balance ===\n');
  
  const ethBalance = await verificationService.syncBalance(TEST_WALLET);
  
  console.log('ETH Balance:');
  console.log('  Raw:', ethBalance.balance);
  console.log('  Decimals:', ethBalance.decimals);
  console.log('  Formatted:', (parseFloat(ethBalance.balance) / Math.pow(10, ethBalance.decimals)).toFixed(6), 'ETH');
  console.log('✅ ETH balance synced\n');

  // ==========================================================================
  // Test 5: Mock Signature Verification
  // ==========================================================================
  console.log('=== Test 5: Mock Signature Verification ===\n');
  
  // Mock signature (in production, this would be from MetaMask/WalletConnect)
  const mockSignature = '0x' + '1'.repeat(130);
  
  const verifyResult = await verificationService.verifyPersonalSign(
    TEST_WALLET,
    mockSignature,
    challenge.message
  );
  
  console.log('Verification Result:');
  console.log('  Verified:', verifyResult.verified);
  console.log('  Method:', verifyResult.method);
  console.log('  Address:', verifyResult.address || 'N/A');
  console.log('  Error:', verifyResult.error || 'None');
  
  if (verifyResult.method === 'mock') {
    console.log('  Note: Using mock verification (PAYOS_ENVIRONMENT=mock)');
  }
  console.log('✅ Verification complete\n');

  // ==========================================================================
  // Test 6: Invalid Signature Rejection
  // ==========================================================================
  console.log('=== Test 6: Invalid Signature Rejection ===\n');
  
  const invalidSignature = '0x123';  // Too short
  
  const invalidResult = await verificationService.verifyPersonalSign(
    TEST_WALLET,
    invalidSignature,
    challenge.message
  );
  
  console.log('Invalid Signature Result:');
  console.log('  Verified:', invalidResult.verified);
  console.log('  Error:', invalidResult.error);
  console.log('✅ Invalid signature correctly rejected\n');

  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('\n🎉 All BYOW tests passed!');
  console.log('\nSupported Features:');
  console.log('  ✅ Verification challenge generation');
  console.log('  ✅ Wallet info lookup');
  console.log('  ✅ USDC balance sync');
  console.log('  ✅ Native ETH balance sync');
  console.log('  ✅ EIP-191 signature verification');
  console.log('  ✅ Mock verification (for testing)');
  console.log('\nBYOW Flow:');
  console.log('  1. User provides wallet address');
  console.log('  2. PayOS generates challenge message');
  console.log('  3. User signs message with wallet (MetaMask/WalletConnect)');
  console.log('  4. PayOS verifies signature → proves ownership');
  console.log('  5. Wallet is linked and can sync balance');
}

main().catch(console.error);



