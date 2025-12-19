/**
 * Comprehensive Seed Data Enhancement Script
 * 
 * Fixes all major seed data issues:
 * 1. Creates extensive contractor relationships for all tenants
 * 2. Adds beneficial owners to business accounts
 * 3. Creates varied transaction types (not just cross-border)
 * 4. Generates 6 months of historical data with growth curves
 * 
 * This script should be run after the main seed scripts.
 * 
 * Usage: pnpm tsx scripts/seed-enhanced-comprehensive.ts
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

function randomDate(monthsAgo: number, daysVariation: number = 30): string {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(date.getDate() + randomInt(-daysVariation, daysVariation));
  return date.toISOString();
}

function getDateInPast(monthsAgo: number, daysOffset: number = 0): string {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
}

const TRANSACTION_TYPES = ['external', 'internal', 'payroll', 'vendor', 'refund', 'adjustment', 'top_up', 'withdrawal'];
const CURRENCIES = ['USD', 'MXN', 'COP', 'ARS', 'BRL'];
const PERSON_NAMES = [
  'Maria Garcia', 'Ana Silva', 'Carlos Martinez', 'Juan Perez', 'Sofia Rodriguez',
  'Diego Lopez', 'Carmen Fernandez', 'Luis Gonzalez', 'Isabella Torres', 'Miguel Santos',
  'Laura Ramirez', 'Pedro Morales', 'Valentina Cruz', 'Gabriel Reyes', 'Camila Rivera',
  'Mateo Flores', 'Lucia Moreno', 'Santiago Jimenez', 'Elena Vargas', 'Daniel Herrera'
];

// ============================================
// Main Seed Function
// ============================================

async function seedComprehensiveData() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   Comprehensive Seed Data Enhancement v1.0             ║');
  console.log('║   Fixes: Contractors, Beneficial Owners, Variety,      ║');
  console.log('║          Historical Data (6 months)                    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // ============================================
    // Step 1: Get All Tenants
    // ============================================
    console.log('📊 Step 1/5: Loading tenants and accounts...\n');
    
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('status', 'active');

    if (tenantsError || !tenants || tenants.length === 0) {
      console.error('❌ No tenants found');
      process.exit(1);
    }

    console.log(`✅ Found ${tenants.length} tenants\n`);

    let totalContractorsCreated = 0;
    let totalBeneficialOwnersAdded = 0;
    let totalHistoricalTransactions = 0;

    for (const tenant of tenants) {
      console.log(`\n🏢 Processing tenant: ${tenant.name}`);
      console.log('─'.repeat(60));

      // Get accounts for this tenant
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at');

      if (accountsError || !accounts || accounts.length === 0) {
        console.log('   ⚠️  No accounts found, skipping...');
        continue;
      }

      const businessAccounts = accounts.filter(a => a.type === 'business');
      const personAccounts = accounts.filter(a => a.type === 'person');

      console.log(`   📋 ${businessAccounts.length} businesses, ${personAccounts.length} persons`);

      // ============================================
      // Step 2: Create Extensive Contractor Relationships
      // ============================================
      console.log('\n   📝 Creating contractor relationships...');

      for (const business of businessAccounts.slice(0, 5)) { // Top 5 businesses
        const numContractors = randomInt(10, 20);
        let contractorsCreated = 0;

        // Create relationships with existing person accounts
        const availablePersons = personAccounts.filter(p => p.id !== business.id);
        const selectedContractors = availablePersons.slice(0, Math.min(numContractors, availablePersons.length));

        for (const contractor of selectedContractors) {
          // Check if relationship already exists
          const { data: existing } = await supabase
            .from('account_relationships')
            .select('id')
            .eq('tenant_id', tenant.id)
            .eq('account_id', business.id)
            .eq('related_account_id', contractor.id)
            .eq('relationship_type', 'contractor')
            .maybeSingle();

          if (existing) continue;

          // Create bidirectional relationship
          await supabase.from('account_relationships').insert([
            {
              tenant_id: tenant.id,
              account_id: business.id,
              related_account_id: contractor.id,
              relationship_type: 'contractor',
              status: 'active',
              notes: `${randomChoice(['Monthly retainer', 'Part-time', 'Full-time', 'Project-based', 'Consulting'])} - ${randomChoice(['Developer', 'Designer', 'Consultant', 'Manager', 'Specialist'])}`,
              created_at: getDateInPast(randomInt(1, 6)),
            },
            {
              tenant_id: tenant.id,
              account_id: contractor.id,
              related_account_id: business.id,
              relationship_type: 'employer',
              status: 'active',
              notes: 'Primary client',
              created_at: getDateInPast(randomInt(1, 6)),
            }
          ]);

          contractorsCreated++;
        }

        console.log(`      ✅ ${business.name}: ${contractorsCreated} contractors`);
        totalContractorsCreated += contractorsCreated * 2; // Bidirectional
      }

      // ============================================
      // Step 3: Add Beneficial Owners to Businesses
      // ============================================
      console.log('\n   👥 Adding beneficial owners...');

      for (const business of businessAccounts) {
        const numOwners = randomInt(1, 3);
        const owners = [];

        for (let i = 0; i < numOwners; i++) {
          owners.push({
            name: randomChoice(PERSON_NAMES),
            ownershipPercent: i === 0 ? randomInt(51, 100) : randomInt(10, 49),
            verified: Math.random() > 0.2, // 80% verified
            ssn_last_four: String(randomInt(1000, 9999)),
            dob: `${randomInt(1960, 1995)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
            address: `${randomInt(100, 9999)} Main St, City, State ${String(randomInt(10000, 99999))}`,
          });
        }

        // Update business account with beneficial owners
        await supabase
          .from('accounts')
          .update({
            metadata: {
              ...(business.metadata || {}),
              beneficial_owners: owners,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', business.id);

        console.log(`      ✅ ${business.name}: ${numOwners} owners`);
        totalBeneficialOwnersAdded += numOwners;
      }

      // ============================================
      // Step 4: Create Varied Transaction Types (Historical)
      // ============================================
      console.log('\n   💰 Creating historical transactions (6 months)...');

      // Skip if not enough accounts to create transactions
      if (accounts.length < 2) {
        console.log('      ⚠️  Not enough accounts to create transactions, skipping...');
      } else {
        const transactionVolumes = [60, 70, 80, 100, 120, 140]; // Growth curve by month
        
        for (let monthAgo = 5; monthAgo >= 0; monthAgo--) {
          const volumeForMonth = transactionVolumes[5 - monthAgo];

          for (let i = 0; i < volumeForMonth; i++) {
            const transactionType = randomChoice([
              'external', 'external', 'external', 'external', // 40% external
              'internal', 'internal', // 20% internal
              'payroll', 'payroll', // 15% payroll
              'vendor', // 10% vendor
              'refund', // 5% refund
              'adjustment', 'top_up', // 5% each
            ]);

            const fromAccount = randomChoice(accounts);
            const toAccount = randomChoice(accounts.filter(a => a.id !== fromAccount.id));
            
            // Safety check
            if (!toAccount) continue;

          const amount = transactionType === 'payroll' ? randomInt(1000, 5000) :
                        transactionType === 'vendor' ? randomInt(500, 10000) :
                        transactionType === 'refund' ? randomInt(50, 500) :
                        transactionType === 'internal' ? randomInt(100, 2000) :
                        randomInt(500, 15000);

          const currency = randomChoice(CURRENCIES);
          const status = Math.random() > 0.05 ? 'completed' : randomChoice(['pending', 'failed']);

          const transfer = {
            tenant_id: tenant.id,
            type: transactionType,
            direction: transactionType === 'external' ? randomChoice(['inbound', 'outbound']) : 'internal',
            from_account_id: fromAccount.id,
            to_account_id: toAccount.id,
            from_account_name: fromAccount.name,
            to_account_name: toAccount.name,
            amount,
            currency,
            status,
            method: transactionType === 'internal' ? 'internal' : randomChoice(['ach', 'wire', 'instant', 'card']),
            corridor: transactionType === 'external' ? randomChoice(['US-MEX', 'US-COL', 'US-ARG', 'US-BRL', null]) : null,
            metadata: {
              transaction_type: transactionType,
              generated_by: 'seed-enhanced-comprehensive',
              month_ago: monthAgo,
            },
            created_at: randomDate(monthAgo, 15),
            updated_at: randomDate(monthAgo, 15),
          };

          const { error: insertError } = await supabase
            .from('transfers')
            .insert(transfer);

            if (!insertError) {
              totalHistoricalTransactions++;
            }
          }

          console.log(`      ✅ Month -${monthAgo}: ${volumeForMonth} transactions`);
        }
      }

      // ============================================
      // Step 5: Update Account Balances Based on Transactions
      // ============================================
      console.log('\n   💵 Updating account balances...');

      for (const account of accounts) {
        // Calculate total inflows and outflows
        const { data: inflows } = await supabase
          .from('transfers')
          .select('amount')
          .eq('to_account_id', account.id)
          .eq('status', 'completed');

        const { data: outflows } = await supabase
          .from('transfers')
          .select('amount')
          .eq('from_account_id', account.id)
          .eq('status', 'completed');

        const totalIn = (inflows || []).reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const totalOut = (outflows || []).reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const netBalance = Math.max(0, totalIn - totalOut + randomInt(5000, 50000)); // Add some base balance

        await supabase
          .from('accounts')
          .update({
            balance_total: netBalance,
            balance_available: netBalance * 0.85, // 85% available, 15% in streams/holds
            balance_in_streams: netBalance * 0.15,
            updated_at: new Date().toISOString(),
          })
          .eq('id', account.id);
      }

      console.log(`      ✅ Updated ${accounts.length} account balances`);
    }

    // ============================================
    // Summary
    // ============================================
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              Seed Enhancement Complete!                ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('📊 Summary:');
    console.log(`   Contractor relationships created: ${totalContractorsCreated}`);
    console.log(`   Beneficial owners added: ${totalBeneficialOwnersAdded}`);
    console.log(`   Historical transactions created: ${totalHistoricalTransactions}`);
    console.log(`   Duration: ${duration}s\n`);

    console.log('✅ All enhancements complete!\n');
    console.log('   You can now:');
    console.log('   1. Restart the UI to see contractors');
    console.log('   2. View 6 months of transaction history');
    console.log('   3. See varied transaction types');
    console.log('   4. View beneficial owners for businesses\n');

  } catch (error: any) {
    console.error('\n❌ Error during seeding:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// ============================================
// Execute
// ============================================

seedComprehensiveData();

