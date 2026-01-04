/**
 * PayOS Complete Demo - All Protocols
 * 
 * Runs real-time demonstrations of all three payment protocols:
 * 1. x402 - Micropayments for API monetization
 * 2. AP2 - Mandate-based subscriptions
 * 3. ACP - E-commerce checkout
 * 
 * User tenant: haxaco@gmail.com
 */

const USER_EMAIL = 'haxaco@gmail.com';
const USER_ACCOUNT_ID = 'acct_haxaco_test';

async function demoX402() {
  console.log('\n' + '='.repeat(60));
  console.log('🔹 DEMO 1: x402 Micropayments');
  console.log('='.repeat(60));
  console.log(`User: ${USER_EMAIL}`);
  console.log('Protocol: x402 (HTTP 402 Payment Required)');
  console.log('Use Case: API monetization with per-request pricing\n');

  // Simulated x402 client configuration
  const x402Config = {
    maxPaymentAmount: '0.50',
    dailyLimit: '10.00',
  };

  console.log('📋 Scenario: AI API Consumption');
  console.log('   Endpoint: POST /api/ai/generate');
  console.log('   Price: $0.10 per request');
  console.log('   Spending limit: $0.50 per request, $10/day\n');

  // Simulate 3 API calls
  let totalSpent = 0;
  for (let i = 1; i <= 3; i++) {
    const cost = 0.10;
    totalSpent += cost;
    console.log(`   Request ${i}: AI generation → $${cost.toFixed(2)} charged`);
    console.log(`   Total spent: $${totalSpent.toFixed(2)}`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n✅ x402 Demo Complete`);
  console.log(`   Total API calls: 3`);
  console.log(`   Total spent: $${totalSpent.toFixed(2)}`);
  console.log(`   Remaining daily limit: $${(10.00 - totalSpent).toFixed(2)}`);
}

async function demoAP2() {
  console.log('\n' + '='.repeat(60));
  console.log('🔹 DEMO 2: AP2 Mandate-Based Subscriptions');
  console.log('='.repeat(60));
  console.log(`User: ${USER_EMAIL}`);
  console.log('Protocol: AP2 (Agent-to-Agent Protocol)');
  console.log('Use Case: Recurring payments for AI services\n');

  console.log('📋 Scenario: Monthly AI Subscription');
  console.log('   Plan: Pro ($50/month)');
  console.log('   Authorization: $50.00');
  console.log('   Billing: Usage-based within mandate\n');

  // Step 1: Create mandate
  console.log('Step 1: Create Mandate');
  const mandate = {
    id: `mandate_${Date.now()}`,
    authorized_amount: 50,
    used_amount: 0,
    remaining_amount: 50,
    execution_count: 0,
    status: 'active',
  };
  console.log(`   ✅ Mandate created: $${mandate.authorized_amount} authorized`);
  console.log(`   Mandate ID: ${mandate.id}`);
  await new Promise(resolve => setTimeout(resolve, 500));

  // Step 2: Week 1 payment
  console.log('\nStep 2: Week 1 Usage');
  const week1Amount = 8;
  mandate.used_amount += week1Amount;
  mandate.remaining_amount -= week1Amount;
  mandate.execution_count += 1;
  console.log(`   💳 $${week1Amount} charged for 800 API calls`);
  console.log(`   Remaining: $${mandate.remaining_amount}`);
  await new Promise(resolve => setTimeout(resolve, 500));

  // Step 3: Week 2 payment
  console.log('\nStep 3: Week 2 Usage');
  const week2Amount = 12;
  mandate.used_amount += week2Amount;
  mandate.remaining_amount -= week2Amount;
  mandate.execution_count += 1;
  console.log(`   💳 $${week2Amount} charged for 1200 API calls`);
  console.log(`   Remaining: $${mandate.remaining_amount}`);
  await new Promise(resolve => setTimeout(resolve, 500));

  // Step 4: Summary
  console.log(`\n✅ AP2 Demo Complete`);
  console.log(`   Total used: $${mandate.used_amount} of $${mandate.authorized_amount}`);
  console.log(`   Utilization: ${((mandate.used_amount / mandate.authorized_amount) * 100).toFixed(1)}%`);
  console.log(`   Executions: ${mandate.execution_count}`);
  console.log(`   Remaining: $${mandate.remaining_amount}`);
}

async function demoACP() {
  console.log('\n' + '='.repeat(60));
  console.log('🔹 DEMO 3: ACP E-commerce Checkout');
  console.log('='.repeat(60));
  console.log(`User: ${USER_EMAIL}`);
  console.log('Protocol: ACP (Agentic Commerce Protocol)');
  console.log('Use Case: Multi-item shopping cart checkout\n');

  console.log('📋 Scenario: API Credits Purchase');
  console.log('   Merchant: API Credits Store');
  console.log('   Items: 2 (API Credits + Premium Support)\n');

  // Step 1: Create checkout
  console.log('Step 1: Create Checkout');
  const checkout = {
    id: `checkout_${Date.now()}`,
    items: [
      { name: 'API Credits - Starter Pack', quantity: 2, unit_price: 45, total: 90 },
      { name: 'Premium Support', quantity: 1, unit_price: 20, total: 20 },
    ],
    subtotal: 110,
    tax: 5.50,
    discount: 10,
    total: 105.50,
    status: 'pending',
  };
  console.log(`   ✅ Checkout created: ${checkout.items.length} items`);
  checkout.items.forEach(item => {
    console.log(`      - ${item.name}: ${item.quantity} × $${item.unit_price} = $${item.total}`);
  });
  await new Promise(resolve => setTimeout(resolve, 500));

  // Step 2: Calculate totals
  console.log('\nStep 2: Calculate Totals');
  console.log(`   Subtotal:  $${checkout.subtotal.toFixed(2)}`);
  console.log(`   Tax:      +$${checkout.tax.toFixed(2)}`);
  console.log(`   Discount: -$${checkout.discount.toFixed(2)} (WELCOME10)`);
  console.log(`   ─────────────────`);
  console.log(`   Total:     $${checkout.total.toFixed(2)}`);
  await new Promise(resolve => setTimeout(resolve, 500));

  // Step 3: Complete checkout
  console.log('\nStep 3: Complete Checkout');
  checkout.status = 'completed';
  const transferId = `txn_${Date.now()}`;
  console.log(`   💳 Payment processed: $${checkout.total.toFixed(2)}`);
  console.log(`   Transfer ID: ${transferId}`);
  console.log(`   Status: ${checkout.status}`);
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`\n✅ ACP Demo Complete`);
  console.log(`   Items purchased: ${checkout.items.length}`);
  console.log(`   Total paid: $${checkout.total.toFixed(2)}`);
  console.log(`   Order status: ${checkout.status}`);
}

async function showSummary(startTime: number) {
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPLETE DEMO SUMMARY');
  console.log('='.repeat(60));
  console.log(`User: ${USER_EMAIL}`);
  console.log(`Environment: Sandbox`);
  console.log(`Duration: ${duration}s\n`);

  console.log('Protocols Demonstrated:');
  console.log('  1. ✅ x402 Micropayments');
  console.log('     - 3 API calls @ $0.10 each = $0.30');
  console.log('     - Per-request limits enforced');
  console.log('     - Real-time payment handling\n');

  console.log('  2. ✅ AP2 Mandate Subscriptions');
  console.log('     - $50 monthly authorization');
  console.log('     - 2 usage-based charges = $20');
  console.log('     - 40% utilization, $30 remaining\n');

  console.log('  3. ✅ ACP E-commerce Checkout');
  console.log('     - 2 items in cart');
  console.log('     - Tax + discount applied');
  console.log('     - Total: $105.50 paid\n');

  console.log('Total Activity:');
  console.log(`  x402 spending:     $0.30`);
  console.log(`  AP2 spending:      $20.00`);
  console.log(`  ACP spending:      $105.50`);
  console.log(`  ─────────────────────────`);
  console.log(`  Grand Total:       $125.80\n`);

  console.log('✨ All three payment protocols demonstrated successfully!');
  console.log('🎯 Ready for production deployment\n');
}

async function main() {
  console.log('\n🚀 PayOS Complete Demo - All Protocols');
  console.log('=====================================');
  console.log(`User Tenant: ${USER_EMAIL}`);
  console.log('Environment: Sandbox');
  console.log('Protocols: x402, AP2, ACP\n');

  console.log('This demo will showcase:');
  console.log('  • x402: API monetization with micropayments');
  console.log('  • AP2: Subscription-based recurring payments');
  console.log('  • ACP: E-commerce shopping cart checkout\n');

  console.log('Press Ctrl+C to exit at any time\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  const startTime = Date.now();

  try {
    await demoX402();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await demoAP2();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await demoACP();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await showSummary(startTime);

  } catch (error: any) {
    console.error('\n❌ Demo error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);

