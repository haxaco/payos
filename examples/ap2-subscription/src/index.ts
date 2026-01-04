/**
 * AP2 Subscription Example
 * 
 * Demonstrates how to use Google's Agent-to-Agent Protocol (AP2)
 * for mandate-based recurring payments and subscriptions.
 */

import { PayOS } from '@payos/sdk';

// Initialize PayOS SDK
const payos = new PayOS({
  apiKey: process.env.PAYOS_API_KEY || 'payos_sandbox_test',
  environment: (process.env.PAYOS_ENVIRONMENT as any) || 'sandbox',
});

async function main() {
  console.log('🚀 AP2 Subscription Example\n');

  // 1. Create a monthly AI service subscription mandate
  console.log('📝 Creating subscription mandate...');
  const mandate = await payos.ap2.createMandate({
    mandate_id: `subscription_ai_${Date.now()}`,
    mandate_type: 'payment',
    agent_id: 'ai_service_agent',
    agent_name: 'AI Credits Service',
    account_id: 'user_account_123',
    authorized_amount: 50,
    currency: 'USD',
    metadata: {
      subscription_plan: 'pro',
      billing_cycle: 'monthly',
      user_email: 'user@example.com',
    },
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  console.log(`✅ Mandate created: ${mandate.id}`);
  console.log(`   - Type: ${mandate.mandate_type}`);
  console.log(`   - Authorized: $${mandate.authorized_amount}`);
  console.log(`   - Remaining: $${mandate.remaining_amount}`);
  console.log(`   - Status: ${mandate.status}\n`);

  // 2. Execute first payment (Week 1)
  console.log('💳 Executing Week 1 payment...');
  const week1 = await payos.ap2.executeMandate(mandate.id, {
    amount: 8,
    currency: 'USD',
    description: 'Week 1 AI API calls - 800 requests',
    idempotency_key: `week1_${mandate.id}`,
  });

  console.log(`✅ Week 1 charged: $${week1.transfer.amount}`);
  console.log(`   - Transfer ID: ${week1.transfer_id}`);
  console.log(`   - Remaining: $${week1.mandate.remaining_amount}`);
  console.log(`   - Execution count: ${week1.mandate.execution_count}\n`);

  // 3. Execute second payment (Week 2)
  console.log('💳 Executing Week 2 payment...');
  const week2 = await payos.ap2.executeMandate(mandate.id, {
    amount: 12,
    currency: 'USD',
    description: 'Week 2 AI API calls - 1200 requests',
    idempotency_key: `week2_${mandate.id}`,
  });

  console.log(`✅ Week 2 charged: $${week2.transfer.amount}`);
  console.log(`   - Remaining: $${week2.mandate.remaining_amount}`);
  console.log(`   - Total used: $${week2.mandate.used_amount}\n`);

  // 4. Check mandate status
  console.log('📊 Checking mandate status...');
  const status = await payos.ap2.getMandate(mandate.id);

  console.log(`✅ Mandate Status:`);
  console.log(`   - Used: $${status.used_amount} of $${status.authorized_amount}`);
  console.log(`   - Remaining: $${status.remaining_amount}`);
  console.log(`   - Executions: ${status.execution_count}`);
  console.log(`   - Status: ${status.status}\n`);

  // 5. View execution history
  console.log('📜 Execution History:');
  for (const execution of status.executions) {
    console.log(`   ${execution.execution_index}. $${execution.amount} - ${execution.status}`);
    console.log(`      Transfer: ${execution.transfer_id}`);
    console.log(`      Time: ${new Date(execution.created_at).toLocaleString()}`);
  }
  console.log();

  // 6. Try to exceed limit (this should fail)
  console.log('⚠️  Attempting to exceed authorization limit...');
  try {
    await payos.ap2.executeMandate(mandate.id, {
      amount: 50, // Only $30 remaining, this will fail
      currency: 'USD',
      description: 'Large purchase attempt',
    });
    console.log('❌ This should not succeed!');
  } catch (error: any) {
    console.log(`✅ Correctly rejected: ${error.message}\n`);
  }

  // 7. Get subscription analytics
  console.log('📈 Fetching analytics...');
  const analytics = await payos.ap2.getAnalytics('30d');

  console.log(`✅ Last 30 Days Analytics:`);
  console.log(`   Revenue:`);
  console.log(`   ├─ Total: $${analytics.summary.totalRevenue}`);
  console.log(`   ├─ Fees: $${analytics.summary.totalFees}`);
  console.log(`   └─ Net: $${analytics.summary.netRevenue}`);
  console.log(`   Mandates:`);
  console.log(`   ├─ Active: ${analytics.summary.activeMandates}`);
  console.log(`   ├─ Authorized: $${analytics.summary.totalAuthorized}`);
  console.log(`   ├─ Used: $${analytics.summary.totalUsed}`);
  console.log(`   └─ Utilization: ${analytics.summary.utilizationRate}%`);
  console.log(`   Status Breakdown:`);
  console.log(`   ├─ Active: ${analytics.mandatesByStatus.active}`);
  console.log(`   ├─ Completed: ${analytics.mandatesByStatus.completed}`);
  console.log(`   ├─ Cancelled: ${analytics.mandatesByStatus.cancelled}`);
  console.log(`   └─ Expired: ${analytics.mandatesByStatus.expired}\n`);

  // 8. Cancel the mandate
  console.log('❌ Cancelling subscription...');
  const cancelled = await payos.ap2.cancelMandate(mandate.id);

  console.log(`✅ Mandate cancelled: ${cancelled.id}`);
  console.log(`   - Status: ${cancelled.status}`);
  console.log(`   - Cancelled at: ${new Date(cancelled.cancelled_at!).toLocaleString()}\n`);

  // 9. Try to execute on cancelled mandate (should fail)
  console.log('⚠️  Attempting to charge cancelled mandate...');
  try {
    await payos.ap2.executeMandate(mandate.id, {
      amount: 5,
      currency: 'USD',
    });
    console.log('❌ This should not succeed!');
  } catch (error: any) {
    console.log(`✅ Correctly rejected: ${error.message}\n`);
  }

  console.log('🎉 AP2 Subscription Example Complete!');
  console.log('\nKey Takeaways:');
  console.log('✅ Created mandate with $50 authorization');
  console.log('✅ Executed multiple payments ($8 + $12)');
  console.log('✅ Tracked cumulative usage');
  console.log('✅ Enforced authorization limits');
  console.log('✅ Retrieved analytics');
  console.log('✅ Cancelled mandate');
  console.log('✅ Prevented post-cancellation charges');
}

// Run the example
main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

