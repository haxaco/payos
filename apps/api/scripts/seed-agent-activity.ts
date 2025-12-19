/**
 * Seed Agent Activity
 * 
 * Creates realistic agent activity to make agents look active and useful:
 * - Agent-initiated transfers (last 7 days)
 * - Agent-managed streams
 * - Realistic permissions configured
 * - Agent usage tracking data
 * 
 * This helps demonstrate the agent functionality in the UI.
 * 
 * Usage: pnpm seed:agents
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

async function seedAgentActivity() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║         Seeding Agent Activity                          ║');
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

    let totalTransfersCreated = 0;
    let totalAgentsUpdated = 0;

    for (const tenant of tenants) {
      console.log(`\n🏢 Processing tenant: ${tenant.name}`);
      console.log('─'.repeat(60));

      // Get agents for this tenant
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('id, name, parent_account_id, type')
        .eq('tenant_id', tenant.id)
        .eq('status', 'active');

      if (agentsError || !agents || agents.length === 0) {
        console.log(`   ⚠️  No agents found, skipping...`);
        continue;
      }

      // Get accounts for this tenant
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id, name, currency')
        .eq('tenant_id', tenant.id);

      if (accountsError || !accounts || accounts.length < 2) {
        console.log(`   ⚠️  Not enough accounts, skipping...`);
        continue;
      }

      console.log(`   Found ${agents.length} agents`);

      for (const agent of agents) {
        // Update agent permissions to be realistic
        const permissions = {
          can_initiate_transfer: randomChoice([true, false]),
          can_create_stream: randomChoice([true, false]),
          can_manage_accounts: randomChoice([true, false]),
          can_view_compliance: randomChoice([true, false]),
          requires_approval: randomChoice([true, false]),
        };

        const { error: updateError } = await supabase
          .from('agents')
          .update({
            permissions,
            total_transactions: randomInt(10, 100),
            total_volume: randomInt(10000, 500000),
            updated_at: new Date().toISOString(),
          })
          .eq('id', agent.id);

        if (!updateError) {
          totalAgentsUpdated++;
        }

        // Create agent-initiated transfers (only if agent has permission)
        if (permissions.can_initiate_transfer) {
          const transfersToCreate = randomInt(2, 5);

          for (let i = 0; i < transfersToCreate; i++) {
            const fromAccount = accounts.find(a => a.id === agent.parent_account_id) || randomChoice(accounts);
            const toAccount = randomChoice(accounts.filter(a => a.id !== fromAccount.id));

            const transfer = {
              tenant_id: tenant.id,
              type: 'external',
              direction: 'outbound',
              from_account_id: fromAccount.id,
              to_account_id: toAccount.id,
              from_account_name: fromAccount.name,
              to_account_name: toAccount.name,
              amount: randomInt(100, 5000),
              currency: fromAccount.currency,
              status: randomChoice(['completed', 'completed', 'completed', 'pending']),
              initiated_by_type: 'agent',
              initiated_by_id: agent.id,
              method: randomChoice(['ach', 'wire', 'instant']),
              corridor: null,
              metadata: {
                agent_name: agent.name,
                agent_type: agent.type,
                automation: true,
                created_by: 'seed-script',
              },
              created_at: randomDate(7), // Last 7 days
              updated_at: new Date().toISOString(),
            };

            const { error: insertError } = await supabase
              .from('transfers')
              .insert(transfer);

            if (!insertError) {
              totalTransfersCreated++;
            }
          }

          console.log(`   🤖 ${agent.name}: ${transfersToCreate} transfers created`);
        }
      }

      // Update some streams to be managed by agents
      const { data: streams, error: streamsError } = await supabase
        .from('streams')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('status', 'active')
        .limit(5);

      if (!streamsError && streams && streams.length > 0) {
        const agentsWithStreamPermission = agents.filter(a => 
          Math.random() > 0.7 // 30% of agents can manage streams
        );

        if (agentsWithStreamPermission.length > 0) {
          for (const stream of streams) {
            if (Math.random() > 0.5) { // 50% chance to assign an agent
              const agent = randomChoice(agentsWithStreamPermission);
              await supabase
                .from('streams')
                .update({
                  managed_by_type: 'agent',
                  managed_by_id: agent.id,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', stream.id);
            }
          }
          console.log(`   ⚡ Assigned agents to manage ${streams.length} streams`);
        }
      }
    }

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log(`║  ✅ Updated ${totalAgentsUpdated} agents                            ║`);
    console.log(`║  ✅ Created ${totalTransfersCreated} agent-initiated transfers        ║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

  } catch (error: any) {
    console.error('\n❌ Error seeding agent activity:', error.message);
    process.exit(1);
  }
}

// ============================================
// Execute
// ============================================

seedAgentActivity();


