/**
 * Test Real Circle API Calls
 * 
 * This script demonstrates REAL Circle sandbox API calls.
 * Shows what works now vs what requires funding.
 */

import { config } from 'dotenv';
import { randomUUID } from 'crypto';
config({ path: '.env' });

const CIRCLE_SANDBOX_URL = 'https://api-sandbox.circle.com';
const apiKey = process.env.CIRCLE_API_KEY!;

async function circleRequest(method: string, path: string, body?: any) {
  const res = await fetch(CIRCLE_SANDBOX_URL + path, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         CIRCLE SANDBOX REAL API TEST                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  // 1. Check Configuration
  console.log('1️⃣  CONFIGURATION (REAL API)');
  console.log('─'.repeat(60));
  const configRes = await circleRequest('GET', '/v1/configuration');
  console.log('   Status:', configRes.status === 200 ? '✅ Connected' : '❌ Failed');
  console.log('   Master Wallet ID:', configRes.data?.data?.payments?.masterWalletId);
  console.log('');

  // 2. Check Wallet Balance
  console.log('2️⃣  WALLET BALANCE (REAL API)');
  console.log('─'.repeat(60));
  const walletRes = await circleRequest('GET', '/v1/wallets');
  const wallet = walletRes.data?.data?.[0];
  console.log('   Wallet ID:', wallet?.walletId);
  console.log('   Type:', wallet?.type);
  console.log('   Balances:', wallet?.balances?.length > 0 ? wallet.balances : '⚠️  EMPTY (needs funding)');
  console.log('');

  // 3. Check Business Account Balance
  console.log('3️⃣  BUSINESS ACCOUNT BALANCE (REAL API)');
  console.log('─'.repeat(60));
  const bizRes = await circleRequest('GET', '/v1/businessAccount/balances');
  const available = bizRes.data?.data?.available || [];
  const unsettled = bizRes.data?.data?.unsettled || [];
  console.log('   Available:', available.length > 0 ? available : '⚠️  EMPTY (needs funding)');
  console.log('   Unsettled:', unsettled.length > 0 ? unsettled : '(none)');
  console.log('');

  // 4. List Bank Destinations (REAL API)
  console.log('4️⃣  BANK DESTINATIONS (REAL API)');
  console.log('─'.repeat(60));
  const banksRes = await circleRequest('GET', '/v1/businessAccount/banks/wires');
  const banks = banksRes.data?.data || [];
  if (banks.length > 0) {
    for (const bank of banks) {
      console.log(`   ✅ ${bank.id}`);
      console.log(`      Status: ${bank.status}`);
      console.log(`      Desc: ${bank.description}`);
    }
  } else {
    console.log('   (No bank destinations registered)');
  }
  console.log('');

  // 5. List Recent Transfers (REAL API)
  console.log('5️⃣  RECENT TRANSFERS (REAL API)');
  console.log('─'.repeat(60));
  const transfersRes = await circleRequest('GET', '/v1/transfers?pageSize=5');
  const transfers = transfersRes.data?.data || [];
  if (transfers.length > 0) {
    for (const t of transfers) {
      const icon = t.status === 'complete' ? '✅' : t.status === 'failed' ? '❌' : '⏳';
      console.log(`   ${icon} ${t.id}`);
      console.log(`      Status: ${t.status}${t.errorCode ? ` (${t.errorCode})` : ''}`);
      console.log(`      Amount: ${t.amount?.amount} ${t.amount?.currency}`);
      console.log(`      To: ${t.destination?.address?.slice(0, 10)}... (${t.destination?.chain})`);
    }
  } else {
    console.log('   (No transfers yet)');
  }
  console.log('');

  // 6. Attempt a REAL Transfer (will fail if no funds)
  console.log('6️⃣  ATTEMPTING REAL USDC TRANSFER');
  console.log('─'.repeat(60));
  
  const transferPayload = {
    idempotencyKey: randomUUID(),
    source: { type: 'wallet', id: wallet?.walletId || 'master' },
    destination: {
      type: 'blockchain',
      address: '0x1dE312eea0aC526d40eFd4288C53B06e5669Df1a', // PayOS wallet
      chain: 'BASE',
    },
    amount: { amount: '0.50', currency: 'USD' },
  };

  console.log('   Request:', JSON.stringify(transferPayload, null, 2).split('\n').map(l => '   ' + l).join('\n'));
  
  const newTransfer = await circleRequest('POST', '/v1/transfers', transferPayload);
  
  if (newTransfer.status === 201) {
    const t = newTransfer.data.data;
    console.log('');
    console.log('   ✅ Transfer Created!');
    console.log('   Transfer ID:', t.id);
    console.log('   Status:', t.status);
    if (t.errorCode) {
      console.log('   ⚠️  Error:', t.errorCode);
      console.log('');
      console.log('   👉 To complete this transfer, fund your Circle sandbox');
    }
  } else {
    console.log('');
    console.log('   ❌ Transfer Failed:', newTransfer.status);
    console.log('   ', newTransfer.data.message || JSON.stringify(newTransfer.data));
  }

  console.log('');
  console.log('═'.repeat(60));
  console.log('');
  console.log('SUMMARY:');
  console.log('─'.repeat(60));
  
  const hasFunds = available.length > 0 || (wallet?.balances?.length > 0);
  
  if (hasFunds) {
    console.log('✅ Your Circle sandbox is FUNDED');
    console.log('✅ Real transfers will complete successfully');
  } else {
    console.log('⚠️  Your Circle sandbox needs FUNDING');
    console.log('');
    console.log('To fund your sandbox:');
    console.log('1. Go to https://console.circle.com');
    console.log('2. Switch to SANDBOX (top-right toggle)');
    console.log('3. Go to "Accounts" or "Wallets"');
    console.log('4. Look for "Add Test Funds" or "Deposit"');
    console.log('5. Add USDC to your sandbox wallet');
    console.log('');
    console.log('After funding, transfers will complete ✅');
  }
  
  console.log('');
}

main().catch(console.error);



