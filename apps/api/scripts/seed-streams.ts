/**
 * Seed Active Money Streams
 * 
 * Creates realistic, active money streams for all tenants with:
 * - Mix of inbound and outbound flows
 * - Realistic flow rates ($100-$5000/month)
 * - Proper account balances
 * - Recent stream events (funded, paused, resumed)
 * 
 * This helps make the Treasury page and Streams pages look alive.
 * 
 * Usage: pnpm seed:streams
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ============================================
// Helper Functions
// ============================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function randomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(1, daysAgo));
  return date.toISOString();
}

// ============================================
// Main Seed Function
// ============================================

async function seedStreams() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║         Seeding Active Money Streams                   ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Get all tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('status', 'active');

    if (tenantsError) throw tenantsError;
    if (!tenants || tenants.length === 0) {
      console.log('⚠️  No tenants found. Run seed-database.ts first.');
      return;
    }

    console.log(`📊 Found ${tenants.length} active tenants\n`);

    let totalStreamsCreated = 0;

    for (const tenant of tenants) {
      console.log(`\n🏢 Processing tenant: ${tenant.name}`);
      console.log('─'.repeat(60));

      // Get accounts for this tenant
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id, name, type, currency')
        .eq('tenant_id', tenant.id)
        .limit(20);

      if (accountsError || !accounts || accounts.length < 2) {
        console.log(`   ⚠️  Not enough accounts, skipping...`);
        continue;
      }

      // Get agents for this tenant
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('id, name')
        .eq('tenant_id', tenant.id)
        .eq('status', 'active')
        .limit(10);

      const streamsToCreate = randomInt(3, 5);
      console.log(`   Creating ${streamsToCreate} streams...`);

      for (let i = 0; i < streamsToCreate; i++) {
        // Pick random from and to accounts
        const fromAccount = randomChoice(accounts);
        const toAccount = randomChoice(accounts.filter(a => a.id !== fromAccount.id));

        // Random flow rate: $100-$5000 per month
        // Convert to per-second: monthly / (30 * 24 * 60 * 60)
        const monthlyAmount = randomInt(100, 5000);
        const flowRatePerSecond = monthlyAmount / (30 * 24 * 60 * 60);

        // Determine if it's funded (70% chance)
        const isFunded = Math.random() > 0.3;
        const fundedAmount = isFunded ? monthlyAmount * randomInt(1, 3) : 0;

        // Determine status (80% active, 15% paused, 5% completed)
        const rand = Math.random();
        let status: string;
        if (rand > 0.95) status = 'completed';
        else if (rand > 0.80) status = 'paused';
        else status = 'active';

        // Determine direction (60% outflow, 40% inflow)
        const direction = Math.random() > 0.6 ? 'outflow' : 'inflow';

        // Optionally managed by an agent (30% chance)
        const managedByAgent = agents && agents.length > 0 && Math.random() > 0.7;
        const managedBy = managedByAgent ? randomChoice(agents!) : null;

        const stream = {
          tenant_id: tenant.id,
          from_account_id: fromAccount.id,
          to_account_id: toAccount.id,
          flow_rate: flowRatePerSecond.toFixed(8),
          currency: fromAccount.currency,
          status,
          direction,
          balance: fundedAmount,
          total_streamed: status === 'completed' ? fundedAmount : randomInt(10, fundedAmount / 2),
          started_at: randomDate(30),
          funded_at: isFunded ? randomDate(30) : null,
          paused_at: status === 'paused' ? randomDate(7) : null,
          resumed_at: status === 'active' && Math.random() > 0.5 ? randomDate(5) : null,
          completed_at: status === 'completed' ? randomDate(5) : null,
          managed_by_type: managedBy ? 'agent' : null,
          managed_by_id: managedBy?.id || null,
          metadata: {
            purpose: randomChoice(['payroll', 'subscription', 'savings', 'investment', 'vendor_payment']),
            auto_refund: Math.random() > 0.8,
            created_by: 'seed-script',
          },
          created_at: randomDate(30),
          updated_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from('streams')
          .insert(stream);

        if (insertError) {
          console.error(`   ❌ Failed to create stream:`, insertError.message);
        } else {
          totalStreamsCreated++;
          const statusEmoji = status === 'active' ? '✅' : status === 'paused' ? '⏸️' : '🏁';
          const directionEmoji = direction === 'inflow' ? '⬇️' : '⬆️';
          console.log(`   ${statusEmoji} ${directionEmoji} $${monthlyAmount}/mo - ${fromAccount.name} → ${toAccount.name}`);
        }
      }
    }

    // Update account balances to reflect streams
    console.log('\n📊 Updating account balances...');
    
    const { data: activeStreams, error: streamsError } = await supabase
      .from('streams')
      .select('from_account_id, to_account_id, balance')
      .eq('status', 'active');

    if (!streamsError && activeStreams) {
      const accountStreamBalances: Record<string, number> = {};

      for (const stream of activeStreams) {
        // Outflow from source account
        accountStreamBalances[stream.from_account_id] = 
          (accountStreamBalances[stream.from_account_id] || 0) + parseFloat(stream.balance);
      }

      for (const [accountId, streamBalance] of Object.entries(accountStreamBalances)) {
        await supabase
          .from('accounts')
          .update({
            balance_in_streams: streamBalance,
            updated_at: new Date().toISOString(),
          })
          .eq('id', accountId);
      }

      console.log(`   ✅ Updated ${Object.keys(accountStreamBalances).length} accounts`);
    }

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log(`║  ✅ Created ${totalStreamsCreated} active streams                       ║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

  } catch (error: any) {
    console.error('\n❌ Error seeding streams:', error.message);
    process.exit(1);
  }
}

// ============================================
// Execute
// ============================================

seedStreams();


