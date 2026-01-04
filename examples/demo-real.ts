/**
 * PayOS Real Demo - Creates actual transactions in the database
 * 
 * This script makes REAL API calls to create transactions visible in the UI.
 * 
 * User tenant: haxaco@gmail.com
 * Account: acct_haxaco_test
 */

import { PayOS } from '../packages/sdk/dist/index.js';

const USER_EMAIL = 'haxaco@gmail.com';
const USER_ACCOUNT_ID = 'acct_haxaco_test';

// Initialize PayOS SDK with your API key
const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY || 'payos_sandbox_test',
  environment: 'sandbox',
});

async function createRealAP2Mandate() {
  console.log('\n' + '='.repeat(60));
  console.log('🔹 Creating REAL AP2 Mandate');
  console.log('='.repeat(60));
  console.log(`User: ${USER_EMAIL}`);
  console.log('Protocol: AP2 (Agent-to-Agent Protocol)\n');

  try {
    // 1. Create mandate
    console.log('Step 1: Creating mandate...');
    const mandate = await payos.ap2.createMandate({
      mandate_id: `ai_subscription_${Date.now()}`,
      mandate_type: 'payment',
      agent_id: 'ai_credits_agent',
      agent_name: 'AI Credits Service',
      account_id: USER_ACCOUNT_ID,
      authorized_amount: 50,
      currency: 'USD',
      metadata: {
        subscription_plan: 'pro',
        billing_cycle: 'monthly',
        user_email: USER_EMAIL,
        description: 'AI Credits Monthly Subscription',
      },
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    console.log(`✅ Mandate created: ${mandate.id}`);
    console.log(`   - Authorized: $${mandate.authorized_amount}`);
    console.log(`   - Status: ${mandate.status}\n`);

    // 2. Execute Week 1 payment
    console.log('Step 2: Executing Week 1 payment...');
    const week1 = await payos.ap2.executeMandate(mandate.id, {
      amount: 8,
      currency: 'USD',
      description: 'Week 1: 800 API calls',
      idempotency_key: `week1_${mandate.id}`,
    });

    console.log(`✅ Week 1 charged: $${week1.transfer.amount}`);
    console.log(`   - Transfer ID: ${week1.transfer_id}`);
    console.log(`   - Remaining: $${week1.mandate.remaining_amount}\n`);

    // 3. Execute Week 2 payment
    console.log('Step 3: Executing Week 2 payment...');
    const week2 = await payos.ap2.executeMandate(mandate.id, {
      amount: 12,
      currency: 'USD',
      description: 'Week 2: 1200 API calls',
      idempotency_key: `week2_${mandate.id}`,
    });

    console.log(`✅ Week 2 charged: $${week2.transfer.amount}`);
    console.log(`   - Remaining: $${week2.mandate.remaining_amount}`);
    console.log(`   - Total used: $${week2.mandate.used_amount}\n`);

    // 4. Cancel mandate
    console.log('Step 4: Cancelling mandate...');
    const cancelled = await payos.ap2.cancelMandate(mandate.id);

    console.log(`✅ Mandate cancelled: ${cancelled.id}`);
    console.log(`   - Status: ${cancelled.status}\n`);

    console.log('✅ AP2 Demo Complete: $20.00 in transactions created\n');

    return { mandate: cancelled, totalSpent: 20.00 };

  } catch (error: any) {
    console.error('❌ AP2 Error:', error.message);
    console.error('   Full error:', error);
    throw error;
  }
}

async function createRealACPCheckout() {
  console.log('\n' + '='.repeat(60));
  console.log('🔹 Creating REAL ACP Checkout');
  console.log('='.repeat(60));
  console.log(`User: ${USER_EMAIL}`);
  console.log('Protocol: ACP (Agentic Commerce Protocol)\n');

  try {
    // 1. Create checkout
    console.log('Step 1: Creating checkout...');
    const checkout = await payos.acp.createCheckout({
      checkout_id: `order_${Date.now()}`,
      customer_email: USER_EMAIL,
      customer_account_id: USER_ACCOUNT_ID,
      merchant_name: 'API Credits Store',
      merchant_id: 'merchant_api_credits',
      items: [
        {
          name: 'API Credits - Starter Pack',
          description: '10,000 API credits for AI services',
          quantity: 2,
          unit_price: 45,
          currency: 'USD',
        },
        {
          name: 'Premium Support',
          description: '24/7 priority support for 1 month',
          quantity: 1,
          unit_price: 20,
          currency: 'USD',
        },
      ],
      currency: 'USD',
      tax_amount: 5.50,
      discount_amount: 10,
      discount_code: 'WELCOME10',
      metadata: {
        order_type: 'subscription_purchase',
        user_email: USER_EMAIL,
        campaign: 'new_user',
      },
    });

    console.log(`✅ Checkout created: ${checkout.id}`);
    console.log(`   - Items: ${checkout.items.length}`);
    console.log(`   - Subtotal: $${checkout.subtotal}`);
    console.log(`   - Total: $${checkout.total}\n`);

    // 2. Complete checkout
    console.log('Step 2: Completing checkout...');
    const completed = await payos.acp.completeCheckout(checkout.id, {
      payment_method: 'card',
      transfer_account_id: USER_ACCOUNT_ID,
    });

    console.log(`✅ Checkout completed: ${completed.id}`);
    console.log(`   - Transfer ID: ${completed.transfer_id}`);
    console.log(`   - Amount: $${completed.total}`);
    console.log(`   - Status: ${completed.status}\n`);

    console.log('✅ ACP Demo Complete: $105.50 transaction created\n');

    return { checkout: completed, totalSpent: 105.50 };

  } catch (error: any) {
    console.error('❌ ACP Error:', error.message);
    console.error('   Full error:', error);
    throw error;
  }
}

async function showRealSummary(ap2Total: number, acpTotal: number, duration: number) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 REAL TRANSACTIONS SUMMARY');
  console.log('='.repeat(60));
  console.log(`User: ${USER_EMAIL}`);
  console.log(`Account: ${USER_ACCOUNT_ID}`);
  console.log(`Environment: Sandbox`);
  console.log(`Duration: ${duration.toFixed(1)}s\n`);

  console.log('✅ Transactions Created:');
  console.log(`  AP2 Mandate:`);
  console.log(`    - 1 mandate created and cancelled`);
  console.log(`    - 2 executions ($8 + $12)`);
  console.log(`    - Total: $${ap2Total.toFixed(2)}\n`);

  console.log(`  ACP Checkout:`);
  console.log(`    - 1 order completed`);
  console.log(`    - 2 items purchased`);
  console.log(`    - Total: $${acpTotal.toFixed(2)}\n`);

  const grandTotal = ap2Total + acpTotal;
  console.log(`  Grand Total: $${grandTotal.toFixed(2)}\n`);

  console.log('🎯 UI Validation:');
  console.log('  1. Open: http://localhost:3000/dashboard');
  console.log('  2. Login as: ' + USER_EMAIL);
  console.log('  3. Check pages:');
  console.log(`     • Transactions: Should show ${2 + 1} = 3 new transactions`);
  console.log(`     • AP2 Mandates: Should show 1 cancelled mandate`);
  console.log(`     • ACP Checkouts: Should show 1 completed order`);
  console.log('');
}

async function main() {
  console.log('\n🚀 PayOS Real Demo - Database Transactions');
  console.log('==========================================');
  console.log(`User: ${USER_EMAIL}`);
  console.log('Environment: Sandbox');
  console.log('API: ' + (process.env.PAYOS_API_URL || 'http://localhost:4000'));
  console.log('');
  console.log('This will create REAL transactions in the database!');
  console.log('Press Ctrl+C to cancel...\n');

  await new Promise(resolve => setTimeout(resolve, 2000));

  const startTime = Date.now();

  try {
    // Create AP2 mandate
    const ap2Result = await createRealAP2Mandate();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create ACP checkout
    const acpResult = await createRealACPCheckout();
    await new Promise(resolve => setTimeout(resolve, 1000));

    const duration = (Date.now() - startTime) / 1000;

    await showRealSummary(ap2Result.totalSpent, acpResult.totalSpent, duration);

    console.log('✨ Real transactions created successfully!');
    console.log('   Refresh your dashboard to see them.\n');

  } catch (error: any) {
    console.error('\n❌ Demo failed:', error.message);
    console.error('\nPossible issues:');
    console.error('  • API server not running (http://localhost:4000)');
    console.error('  • Invalid API key');
    console.error('  • Database connection issue');
    console.error('\nCheck API logs for more details.\n');
    process.exit(1);
  }
}

main().catch(console.error);

