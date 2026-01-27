/**
 * ACP E-commerce Example
 * 
 * Demonstrates how to use Stripe/OpenAI's Agentic Commerce Protocol (ACP)
 * for AI-powered shopping cart checkout and e-commerce transactions.
 */

import { PayOS } from '@sly/sdk';

// Initialize PayOS SDK
const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY || 'payos_sandbox_test',
  environment: (process.env.PAYOS_ENVIRONMENT as any) || 'sandbox',
});

async function main() {
  console.log('🛒 ACP E-commerce Example\n');

  // 1. Create a shopping cart checkout
  console.log('📝 Creating checkout with items...');
  const checkout = await payos.acp.createCheckout({
    checkout_id: `order_${Date.now()}`,
    agent_id: 'shopping_agent_xyz',
    agent_name: 'AI Shopping Assistant',
    account_id: 'buyer_account_456',
    merchant_id: 'merchant_api_store',
    merchant_name: 'API Credits Store',
    merchant_url: 'https://api-store.example.com',
    items: [
      {
        name: 'API Credits - Starter Pack',
        description: '1000 API calls for your application',
        quantity: 2,
        unit_price: 45,
        total_price: 90,
        currency: 'USD',
        metadata: { sku: 'API-1000', category: 'credits' },
      },
      {
        name: 'Premium Support',
        description: '1 month of priority customer support',
        quantity: 1,
        unit_price: 20,
        total_price: 20,
        currency: 'USD',
        metadata: { sku: 'SUPPORT-1M', category: 'support' },
      },
    ],
    tax_amount: 5.50,
    shipping_amount: 0,
    discount_amount: 10, // Promo code: WELCOME10
    currency: 'USD',
    metadata: {
      promo_code: 'WELCOME10',
      customer_tier: 'new',
      referral_source: 'google',
    },
    expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
  });

  console.log(`✅ Checkout created: ${checkout.id}`);
  console.log(`   - Checkout ID: ${checkout.checkout_id}`);
  console.log(`   - Merchant: ${checkout.merchant_name}`);
  console.log(`   - Items: ${checkout.items.length}`);
  console.log(`\n   💰 Pricing Breakdown:`);
  console.log(`   ├─ Subtotal: $${checkout.subtotal}`);
  console.log(`   ├─ Tax: $${checkout.tax_amount}`);
  console.log(`   ├─ Shipping: $${checkout.shipping_amount}`);
  console.log(`   ├─ Discount: -$${checkout.discount_amount}`);
  console.log(`   └─ Total: $${checkout.total_amount}`);
  console.log(`   - Status: ${checkout.status}`);
  console.log(`   - Expires: ${new Date(checkout.expires_at!).toLocaleString()}\n`);

  // 2. Retrieve checkout details
  console.log('📖 Retrieving checkout details...');
  const retrieved = await payos.acp.getCheckout(checkout.id);

  console.log(`✅ Checkout Details:`);
  console.log(`   Items in cart:`);
  for (const item of retrieved.items) {
    console.log(`   - ${item.name}`);
    console.log(`     Quantity: ${item.quantity} × $${item.unit_price} = $${item.total_price}`);
  }
  console.log();

  // 3. List user's pending checkouts
  console.log('📋 Listing pending checkouts...');
  const pendingCheckouts = await payos.acp.listCheckouts({
    account_id: 'buyer_account_456',
    status: 'pending',
    limit: 5,
  });

  console.log(`✅ Found ${pendingCheckouts.data.length} pending checkout(s):`);
  for (const chk of pendingCheckouts.data) {
    console.log(`   - ${chk.checkout_id}: $${chk.total_amount} (${chk.status})`);
  }
  console.log();

  // 4. Complete the checkout
  console.log('💳 Completing checkout with payment...');
  const completed = await payos.acp.completeCheckout(checkout.id, {
    shared_payment_token: 'spt_abc123xyz456',
    payment_method: 'card_visa_1234',
    idempotency_key: `complete_${checkout.id}`,
  });

  console.log(`✅ Checkout completed!`);
  console.log(`   - Checkout ID: ${completed.checkout_id}`);
  console.log(`   - Transfer ID: ${completed.transfer_id}`);
  console.log(`   - Amount: $${completed.total_amount}`);
  console.log(`   - Status: ${completed.status}`);
  console.log(`   - Completed: ${new Date(completed.completed_at).toLocaleString()}\n`);

  // 5. Create another checkout and cancel it
  console.log('📝 Creating another checkout...');
  const checkout2 = await payos.acp.createCheckout({
    checkout_id: `order_cancel_${Date.now()}`,
    agent_id: 'shopping_agent_xyz',
    account_id: 'buyer_account_456',
    merchant_id: 'merchant_api_store',
    items: [
      {
        name: 'Small Pack',
        quantity: 1,
        unit_price: 10,
        total_price: 10,
      },
    ],
    currency: 'USD',
  });

  console.log(`✅ Checkout created: ${checkout2.id}`);
  console.log(`   - Total: $${checkout2.total_amount}\n`);

  // 6. Cancel the checkout
  console.log('❌ Cancelling checkout (user abandoned cart)...');
  const cancelled = await payos.acp.cancelCheckout(checkout2.id);

  console.log(`✅ Checkout cancelled: ${cancelled.id}`);
  console.log(`   - Status: ${cancelled.status}`);
  console.log(`   - Cancelled: ${new Date(cancelled.cancelled_at!).toLocaleString()}\n`);

  // 7. Try to complete cancelled checkout (should fail)
  console.log('⚠️  Attempting to complete cancelled checkout...');
  try {
    await payos.acp.completeCheckout(checkout2.id, {
      shared_payment_token: 'spt_test',
    });
    console.log('❌ This should not succeed!');
  } catch (error: any) {
    console.log(`✅ Correctly rejected: ${error.message}\n`);
  }

  // 8. Get e-commerce analytics
  console.log('📈 Fetching analytics...');
  const analytics = await payos.acp.getAnalytics('7d');

  console.log(`✅ Last 7 Days E-commerce Analytics:`);
  console.log(`   Revenue:`);
  console.log(`   ├─ Total: $${analytics.summary.totalRevenue}`);
  console.log(`   ├─ Fees: $${analytics.summary.totalFees}`);
  console.log(`   └─ Net: $${analytics.summary.netRevenue}`);
  console.log(`   Checkouts:`);
  console.log(`   ├─ Completed: ${analytics.summary.completedCheckouts}`);
  console.log(`   ├─ Pending: ${analytics.summary.pendingCheckouts}`);
  console.log(`   └─ Avg Order Value: $${analytics.summary.averageOrderValue}`);
  console.log(`   Merchants & Agents:`);
  console.log(`   ├─ Unique Merchants: ${analytics.summary.uniqueMerchants}`);
  console.log(`   └─ Unique Agents: ${analytics.summary.uniqueAgents}`);
  console.log(`   Status Breakdown:`);
  console.log(`   ├─ Pending: ${analytics.checkoutsByStatus.pending}`);
  console.log(`   ├─ Completed: ${analytics.checkoutsByStatus.completed}`);
  console.log(`   ├─ Cancelled: ${analytics.checkoutsByStatus.cancelled}`);
  console.log(`   ├─ Expired: ${analytics.checkoutsByStatus.expired}`);
  console.log(`   └─ Failed: ${analytics.checkoutsByStatus.failed}\n`);

  console.log('🎉 ACP E-commerce Example Complete!');
  console.log('\nKey Takeaways:');
  console.log('✅ Created multi-item checkout ($110 subtotal)');
  console.log('✅ Applied tax, shipping, and discount');
  console.log('✅ Retrieved checkout details');
  console.log('✅ Completed checkout with payment token');
  console.log('✅ Cancelled abandoned cart');
  console.log('✅ Retrieved e-commerce analytics');
  console.log('✅ Average Order Value calculated');
}

// Run the example
main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

