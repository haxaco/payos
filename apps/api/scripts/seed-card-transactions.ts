/**
 * Seed Card Transactions
 * Creates sample card transaction history for testing
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedCardTransactions() {
  console.log('🌱 Seeding card transactions...\n');

  // Get all payment methods of type 'card' (from any tenant)
  const { data: cards, error: cardsError } = await supabase
    .from('payment_methods')
    .select('id, account_id, tenant_id, bank_account_last_four, type')
    .eq('type', 'card')
    .limit(10);

  if (cardsError || !cards || cards.length === 0) {
    console.error('❌ Failed to find cards:', cardsError);
    return;
  }

  // Get unique tenants from cards
  const tenantIds = [...new Set(cards.map(c => c.tenant_id))];
  console.log(`✅ Found ${cards.length} cards across ${tenantIds.length} tenant(s)\n`);

  // Sample merchants
  const merchants = [
    { name: 'Amazon', category: 'Online Retail', country: 'USA' },
    { name: 'Walmart', category: 'Retail', country: 'USA' },
    { name: 'Target', category: 'Retail', country: 'USA' },
    { name: 'Starbucks', category: 'Food & Beverage', country: 'USA' },
    { name: 'Uber', category: 'Transportation', country: 'USA' },
    { name: 'Netflix', category: 'Entertainment', country: 'USA' },
    { name: 'Whole Foods', category: 'Grocery', country: 'USA' },
    { name: 'Shell Gas Station', category: 'Gas Stations', country: 'USA' },
    { name: 'McDonald\'s', category: 'Fast Food', country: 'USA' },
    { name: 'Home Depot', category: 'Home Improvement', country: 'USA' },
    { name: 'Best Buy', category: 'Electronics', country: 'USA' },
    { name: 'CVS Pharmacy', category: 'Pharmacy', country: 'USA' },
  ];

  const transactionTypes = ['purchase', 'refund', 'decline'];
  const allTransactions = [];

  // Generate transactions for each card
  for (const card of cards) {
    const numTransactions = Math.floor(Math.random() * 15) + 10; // 10-24 transactions per card
    
    console.log(`📋 Generating ${numTransactions} transactions for card ending in ${card.bank_account_last_four}...`);

    for (let i = 0; i < numTransactions; i++) {
      const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
      const merchant = merchants[Math.floor(Math.random() * merchants.length)];
      const amount = type === 'decline' ? 0 : (Math.random() * 500 + 10).toFixed(2);
      const daysAgo = Math.floor(Math.random() * 60); // Up to 60 days ago
      const transactionTime = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      const transaction = {
        tenant_id: card.tenant_id,
        payment_method_id: card.id,
        account_id: card.account_id,
        type: type,
        status: type === 'decline' ? 'failed' : 'completed',
        amount: parseFloat(amount),
        currency: 'USD',
        merchant_name: merchant.name,
        merchant_category: merchant.category,
        merchant_country: merchant.country,
        merchant_id: `MERCH_${Math.random().toString(36).substring(7).toUpperCase()}`,
        card_last_four: card.bank_account_last_four,
        authorization_code: type !== 'decline' ? `AUTH${Math.random().toString(36).substring(2, 8).toUpperCase()}` : null,
        decline_reason: type === 'decline' ? 'Insufficient funds' : null,
        decline_code: type === 'decline' ? 'NSF' : null,
        external_transaction_id: `TXN_${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
        is_disputed: Math.random() < 0.05, // 5% chance of dispute
        transaction_time: transactionTime.toISOString(),
        metadata: {
          pos_entry_mode: type === 'decline' ? 'chip' : ['chip', 'contactless', 'magnetic_stripe'][Math.floor(Math.random() * 3)],
          location: `${merchant.name} - Store #${Math.floor(Math.random() * 1000)}`,
        },
      };

      allTransactions.push(transaction);
    }
  }

  console.log(`\n💾 Inserting ${allTransactions.length} card transactions...`);

  // Insert in batches of 50
  const batchSize = 50;
  for (let i = 0; i < allTransactions.length; i += batchSize) {
    const batch = allTransactions.slice(i, i + batchSize);
    const { error: insertError } = await supabase
      .from('card_transactions')
      .insert(batch);

    if (insertError) {
      console.error(`❌ Failed to insert batch ${i / batchSize + 1}:`, insertError);
      continue;
    }

    console.log(`✅ Inserted batch ${i / batchSize + 1} (${batch.length} transactions)`);
  }

  // Update spending usage for cards based on recent transactions (last 30 days)
  console.log('\n💰 Updating card spending usage...');
  
  for (const card of cards) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Calculate daily spending (today only)
    const { data: dailyTransactions } = await supabase
      .from('card_transactions')
      .select('amount')
      .eq('payment_method_id', card.id)
      .eq('type', 'purchase')
      .eq('status', 'completed')
      .gte('transaction_time', new Date().toISOString().split('T')[0]); // Today

    const dailySpending = dailyTransactions?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;

    // Calculate monthly spending
    const { data: monthlyTransactions } = await supabase
      .from('card_transactions')
      .select('amount')
      .eq('payment_method_id', card.id)
      .eq('type', 'purchase')
      .eq('status', 'completed')
      .gte('transaction_time', oneMonthAgo.toISOString());

    const monthlySpending = monthlyTransactions?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;

    // Set some cards with spending limits for testing
    const hasLimits = Math.random() < 0.5; // 50% of cards have limits

    const updateData: any = {
      spending_used_daily: dailySpending,
      spending_used_monthly: monthlySpending,
    };

    if (hasLimits) {
      updateData.spending_limit_daily = 1000;
      updateData.spending_limit_monthly = 5000;
      updateData.spending_limit_per_transaction = 500;
    }

    const { error: updateError } = await supabase
      .from('payment_methods')
      .update(updateData)
      .eq('id', card.id);

    if (updateError) {
      console.error(`❌ Failed to update spending for card ${card.bank_account_last_four}:`, updateError);
    } else {
      console.log(`✅ Updated spending for card ending in ${card.bank_account_last_four}: Daily $${dailySpending.toFixed(2)}, Monthly $${monthlySpending.toFixed(2)}`);
    }
  }

  // Get final count
  const { count, error: countError } = await supabase
    .from('card_transactions')
    .select('id', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Failed to count card transactions:', countError);
    return;
  }

  console.log(`\n✅ Successfully seeded ${count} card transactions across all tenants`);
  console.log('💳 Card transaction history is now populated!');
}

seedCardTransactions()
  .then(() => {
    console.log('\n✅ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });

