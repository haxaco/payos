/**
 * Circle Web3 Services Demo Script
 * 
 * This script demonstrates the complete Circle Web3 Services integration:
 * 1. Entity Secret management
 * 2. Wallet creation on Base Sepolia
 * 3. Faucet funding (native ETH + USDC)
 * 4. USDC transfers between wallets
 * 
 * Prerequisites:
 * - CIRCLE_CONSOLE_KEY (TEST_API_KEY:...) in .env
 * - CIRCLE_ENTITY_SECRET (if already registered)
 * 
 * Usage:
 *   cd apps/api && npx tsx scripts/demo-circle-w3s.ts
 * 
 * @see https://developers.circle.com/wallets/dev-controlled/entity-secret-management
 * @see https://developers.circle.com/w3s/developer-console-faucet
 */

import { config } from 'dotenv';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';

config({ path: '.env' });

const W3S_BASE_URL = 'https://api.circle.com/v1/w3s';
const FAUCET_URL = 'https://api.circle.com/v1/faucet/drips';

interface DemoConfig {
  apiKey: string;
  entitySecret: string;
  walletSetId?: string;
  walletId?: string;
  walletAddress?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

async function getPublicKey(apiKey: string): Promise<string> {
  const res = await fetch(`${W3S_BASE_URL}/config/entity/publicKey`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  const data = await res.json();
  return data.data?.publicKey;
}

function encryptEntitySecret(entitySecretHex: string, publicKeyPem: string): string {
  const entitySecret = Buffer.from(entitySecretHex, 'hex');
  const encryptedBuffer = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    entitySecret
  );
  return encryptedBuffer.toString('base64');
}

async function getFreshCiphertext(apiKey: string, entitySecretHex: string): Promise<string> {
  const publicKey = await getPublicKey(apiKey);
  return encryptEntitySecret(entitySecretHex, publicKey);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// Demo Steps
// =============================================================================

async function step1_RegisterEntitySecret(apiKey: string): Promise<string> {
  console.log('\n' + '='.repeat(60));
  console.log('STEP 1: Register Entity Secret');
  console.log('='.repeat(60));
  
  // Generate new 32-byte entity secret
  const entitySecret = crypto.randomBytes(32);
  const entitySecretHex = entitySecret.toString('hex');
  console.log('Generated Entity Secret (save this!):', entitySecretHex.slice(0, 16) + '...');
  
  // Get Circle's public key
  const publicKey = await getPublicKey(apiKey);
  console.log('Fetched Circle public key');
  
  // Encrypt the entity secret
  const ciphertext = encryptEntitySecret(entitySecretHex, publicKey);
  console.log('Encrypted entity secret');
  
  // Register it
  const res = await fetch(`${W3S_BASE_URL}/config/entity/entitySecret`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ entitySecretCiphertext: ciphertext })
  });
  
  const data = await res.json();
  
  if (res.status === 200 || res.status === 201) {
    console.log('✅ Entity Secret registered!');
    console.log('Recovery file:', data.data?.recoveryFile?.slice(0, 50) + '...');
    console.log('\n⚠️  SAVE THIS TO .env:');
    console.log(`CIRCLE_ENTITY_SECRET=${entitySecretHex}`);
    return entitySecretHex;
  } else if (data.code === 156015) {
    // Entity secret already set - this is fine if we have it in env
    console.log('⚠️  Entity secret already registered');
    const existingSecret = process.env.CIRCLE_ENTITY_SECRET;
    if (existingSecret) {
      console.log('✅ Using existing CIRCLE_ENTITY_SECRET from .env');
      return existingSecret;
    } else {
      console.log('❌ CIRCLE_ENTITY_SECRET not in .env - cannot proceed');
      console.log('   You need to set CIRCLE_ENTITY_SECRET in .env with the original secret');
      throw new Error('Entity secret already registered but not in environment');
    }
  } else {
    console.log('❌ Failed:', JSON.stringify(data, null, 2));
    throw new Error('Entity secret registration failed');
  }
}

async function step2_CreateWalletSet(apiKey: string, entitySecretHex: string): Promise<string> {
  console.log('\n' + '='.repeat(60));
  console.log('STEP 2: Create Wallet Set');
  console.log('='.repeat(60));
  
  const ciphertext = await getFreshCiphertext(apiKey, entitySecretHex);
  
  const res = await fetch(`${W3S_BASE_URL}/developer/walletSets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      idempotencyKey: randomUUID(),
      name: `PayOS-Demo-${Date.now()}`,
      entitySecretCiphertext: ciphertext
    })
  });
  
  const data = await res.json();
  
  if (res.status === 200 || res.status === 201) {
    const walletSetId = data.data?.walletSet?.id;
    console.log('✅ Wallet Set created:', walletSetId);
    console.log('\n⚠️  SAVE THIS TO .env:');
    console.log(`CIRCLE_WALLET_SET_ID=${walletSetId}`);
    return walletSetId;
  } else {
    console.log('❌ Failed:', JSON.stringify(data, null, 2));
    throw new Error('Wallet set creation failed');
  }
}

async function step3_CreateWallet(
  apiKey: string, 
  entitySecretHex: string, 
  walletSetId: string
): Promise<{ id: string; address: string }> {
  console.log('\n' + '='.repeat(60));
  console.log('STEP 3: Create Wallet on BASE-SEPOLIA');
  console.log('='.repeat(60));
  
  const ciphertext = await getFreshCiphertext(apiKey, entitySecretHex);
  
  const res = await fetch(`${W3S_BASE_URL}/developer/wallets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      idempotencyKey: randomUUID(),
      walletSetId: walletSetId,
      blockchains: ['BASE-SEPOLIA'],
      count: 1,
      entitySecretCiphertext: ciphertext
    })
  });
  
  const data = await res.json();
  
  if (res.status === 200 || res.status === 201) {
    const wallet = data.data?.wallets?.[0];
    console.log('✅ Wallet created!');
    console.log('   Wallet ID:', wallet?.id);
    console.log('   Address:', wallet?.address);
    console.log('   Blockchain:', wallet?.blockchain);
    console.log('\n⚠️  SAVE THESE TO .env:');
    console.log(`CIRCLE_WALLET_ID=${wallet?.id}`);
    console.log(`CIRCLE_WALLET_ADDRESS=${wallet?.address}`);
    return { id: wallet?.id, address: wallet?.address };
  } else {
    console.log('❌ Failed:', JSON.stringify(data, null, 2));
    throw new Error('Wallet creation failed');
  }
}

async function step4_FundWallet(apiKey: string, walletAddress: string): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('STEP 4: Fund Wallet via Programmatic Faucet');
  console.log('='.repeat(60));
  
  console.log('Requesting native tokens (ETH)...');
  const nativeRes = await fetch(FAUCET_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      address: walletAddress,
      blockchain: 'BASE-SEPOLIA',
      native: true,
      usdc: false
    })
  });
  
  if (nativeRes.status === 204) {
    console.log('✅ Native tokens (ETH) requested');
  } else {
    const data = await nativeRes.json().catch(() => ({}));
    console.log('⚠️  Native faucet response:', nativeRes.status, JSON.stringify(data));
  }
  
  await sleep(2000);
  
  console.log('Requesting USDC...');
  const usdcRes = await fetch(FAUCET_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      address: walletAddress,
      blockchain: 'BASE-SEPOLIA',
      native: false,
      usdc: true
    })
  });
  
  if (usdcRes.status === 204) {
    console.log('✅ USDC requested');
  } else {
    const data = await usdcRes.json().catch(() => ({}));
    console.log('⚠️  USDC faucet response:', usdcRes.status, JSON.stringify(data));
  }
  
  console.log('\nWaiting 10s for tokens to arrive...');
  await sleep(10000);
}

async function step5_CheckBalance(apiKey: string, walletId: string): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('STEP 5: Check Wallet Balance');
  console.log('='.repeat(60));
  
  const res = await fetch(`${W3S_BASE_URL}/wallets/${walletId}/balances`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  
  const data = await res.json();
  
  console.log('Token Balances:');
  for (const balance of data.data?.tokenBalances || []) {
    const symbol = balance.token?.symbol || 'Unknown';
    const amount = balance.amount;
    const isNative = balance.token?.isNative ? ' (native)' : '';
    console.log(`  ${symbol}: ${amount}${isNative}`);
  }
}

async function step6_Transfer(
  apiKey: string,
  entitySecretHex: string,
  walletId: string,
  destinationAddress: string,
  amount: string
): Promise<string | null> {
  console.log('\n' + '='.repeat(60));
  console.log('STEP 6: Transfer USDC');
  console.log('='.repeat(60));
  
  // Get USDC token ID from wallet balances
  const balRes = await fetch(`${W3S_BASE_URL}/wallets/${walletId}/balances`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  const balData = await balRes.json();
  
  const usdcBalance = balData.data?.tokenBalances?.find(
    (b: any) => b.token?.symbol === 'USDC' && !b.token?.isNative
  );
  
  if (!usdcBalance) {
    console.log('❌ No USDC balance found');
    return null;
  }
  
  const tokenId = usdcBalance.token?.id;
  console.log('USDC Token ID:', tokenId);
  console.log('Current Balance:', usdcBalance.amount, 'USDC');
  console.log('Transfer Amount:', amount, 'USDC');
  console.log('Destination:', destinationAddress);
  
  const ciphertext = await getFreshCiphertext(apiKey, entitySecretHex);
  
  const res = await fetch(`${W3S_BASE_URL}/developer/transactions/transfer`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      idempotencyKey: randomUUID(),
      entitySecretCiphertext: ciphertext,
      walletId: walletId,
      tokenId: tokenId,
      destinationAddress: destinationAddress,
      amounts: [amount],
      feeLevel: 'MEDIUM'
    })
  });
  
  const data = await res.json();
  
  if (res.status === 200 || res.status === 201) {
    const txId = data.data?.id;
    console.log('✅ Transfer initiated!');
    console.log('   Transaction ID:', txId);
    
    // Poll for confirmation
    console.log('\nWaiting for confirmation...');
    for (let i = 0; i < 20; i++) {
      await sleep(3000);
      
      const statusRes = await fetch(`${W3S_BASE_URL}/transactions/${txId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const statusData = await statusRes.json();
      const tx = statusData.data?.transaction;
      
      const status = tx?.state + (tx?.txHash ? ` (${tx.txHash.slice(0, 16)}...)` : '');
      console.log(`   [${i + 1}] ${status}`);
      
      if (tx?.state === 'CONFIRMED' || tx?.state === 'COMPLETE') {
        console.log('\n🎉 TRANSFER CONFIRMED!');
        console.log('   Tx Hash:', tx.txHash);
        console.log('   Explorer: https://sepolia.basescan.org/tx/' + tx.txHash);
        return tx.txHash;
      } else if (tx?.state === 'FAILED') {
        console.log('\n❌ Transfer failed:', tx.errorReason);
        return null;
      }
    }
  } else {
    console.log('❌ Failed:', JSON.stringify(data, null, 2));
  }
  
  return null;
}

// =============================================================================
// Main Demo
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Circle Web3 Services Demo - PayOS                  ║');
  console.log('║         Base Sepolia Testnet Integration                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const apiKey = process.env.CIRCLE_CONSOLE_KEY;
  if (!apiKey || !apiKey.startsWith('TEST_API_KEY:')) {
    console.error('\n❌ CIRCLE_CONSOLE_KEY not set or invalid');
    console.error('   Expected format: TEST_API_KEY:...');
    process.exit(1);
  }
  
  console.log('\n✅ API Key found (TEST_API_KEY)');
  
  // Check if we already have config
  let entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  let walletSetId = process.env.CIRCLE_WALLET_SET_ID;
  let walletId = process.env.CIRCLE_WALLET_ID;
  let walletAddress = process.env.CIRCLE_WALLET_ADDRESS;
  
  try {
    // Step 1: Entity Secret
    if (!entitySecret) {
      entitySecret = await step1_RegisterEntitySecret(apiKey);
    } else {
      console.log('\n✅ Using existing CIRCLE_ENTITY_SECRET');
    }
    
    // Step 2: Wallet Set
    if (!walletSetId) {
      walletSetId = await step2_CreateWalletSet(apiKey, entitySecret);
    } else {
      console.log('✅ Using existing CIRCLE_WALLET_SET_ID:', walletSetId);
    }
    
    // Step 3: Wallet
    if (!walletId || !walletAddress) {
      const wallet = await step3_CreateWallet(apiKey, entitySecret, walletSetId);
      walletId = wallet.id;
      walletAddress = wallet.address;
    } else {
      console.log('✅ Using existing wallet:', walletAddress);
    }
    
    // Step 4: Fund
    await step4_FundWallet(apiKey, walletAddress);
    
    // Step 5: Check balance
    await step5_CheckBalance(apiKey, walletId);
    
    // Step 6: Transfer (to PayOS wallet if configured)
    const payosWallet = process.env.PAYOS_WALLET_ADDRESS || '0x1dE312eea0aC526d40eFd4288C53B06e5669Df1a';
    if (walletAddress !== payosWallet) {
      await step6_Transfer(apiKey, entitySecret, walletId, payosWallet, '0.5');
      
      // Final balance check
      await step5_CheckBalance(apiKey, walletId);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('DEMO COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nEnvironment variables to save:');
    console.log(`CIRCLE_ENTITY_SECRET=${entitySecret}`);
    console.log(`CIRCLE_WALLET_SET_ID=${walletSetId}`);
    console.log(`CIRCLE_WALLET_ID=${walletId}`);
    console.log(`CIRCLE_WALLET_ADDRESS=${walletAddress}`);
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  }
}

main();

