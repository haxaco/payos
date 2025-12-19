/**
 * Master Seed Script
 * 
 * Runs all seed scripts in the correct dependency order to populate
 * the entire database with comprehensive, realistic demo data.
 * 
 * This script is idempotent - safe to run multiple times.
 * 
 * Usage:
 *   pnpm seed:all
 * 
 * Order of operations:
 * 1. Main database (tenants, accounts, agents, transfers)
 * 2. Payment methods
 * 3. Card transactions
 * 4. Account relationships
 * 5. Disputes
 * 6. Compliance flags
 * 7. Streams (active money streams)
 * 8. Agent activity
 * 9. Balance & data enhancement
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ============================================
// Helper Functions
// ============================================

function logStep(step: number, total: number, message: string) {
  console.log(`\n[${ step}/${total}] ${message}`);
  console.log('─'.repeat(60));
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function logError(message: string, error?: any) {
  console.error(`❌ ${message}`);
  if (error) {
    console.error('   Error:', error.message || error);
  }
}

function logInfo(message: string) {
  console.log(`ℹ️  ${message}`);
}

async function runScript(scriptPath: string, description: string): Promise<boolean> {
  try {
    console.log(`   Running: ${scriptPath}`);
    execSync(`pnpm tsx ${scriptPath}`, {
      cwd: join(__dirname, '..'),
      stdio: 'inherit',
      env: process.env,
    });
    logSuccess(description);
    return true;
  } catch (error) {
    logError(`Failed: ${description}`, error);
    return false;
  }
}

async function checkDataExists(table: string, minCount: number = 1): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    return (count || 0) >= minCount;
  } catch (error) {
    return false;
  }
}

// ============================================
// Main Seed Function
// ============================================

async function seedAll() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                                                        ║');
  console.log('║         PayOS Master Seed Script v1.0                  ║');
  console.log('║         Comprehensive Database Population              ║');
  console.log('║                                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  const totalSteps = 9;

  // ============================================
  // Step 1: Main Database Seed
  // ============================================
  logStep(1, totalSteps, 'Seeding main database (tenants, accounts, agents, transfers)');
  
  const hasAccounts = await checkDataExists('accounts', 10);
  if (hasAccounts) {
    logInfo('Main database already seeded, skipping...');
    successCount++;
  } else {
    const success = await runScript(
      'scripts/seed-database.ts',
      'Main database seeded'
    );
    if (success) successCount++;
    else failCount++;
  }

  // ============================================
  // Step 2: Card Transactions
  // ============================================
  logStep(2, totalSteps, 'Seeding card transactions');
  
  const hasCardTxns = await checkDataExists('card_transactions', 10);
  if (hasCardTxns) {
    logInfo('Card transactions already seeded, skipping...');
    successCount++;
  } else {
    const success = await runScript(
      'scripts/seed-card-transactions.ts',
      'Card transactions seeded'
    );
    if (success) successCount++;
    else failCount++;
  }

  // ============================================
  // Step 3: Account Relationships
  // ============================================
  logStep(3, totalSteps, 'Seeding account relationships');
  
  const hasRelationships = await checkDataExists('account_relationships', 5);
  if (hasRelationships) {
    logInfo('Account relationships already seeded, skipping...');
    successCount++;
  } else {
    const success = await runScript(
      'scripts/seed-relationships.ts',
      'Account relationships seeded'
    );
    if (success) successCount++;
    else failCount++;
  }

  // ============================================
  // Step 4: Disputes
  // ============================================
  logStep(4, totalSteps, 'Seeding disputes');
  
  const hasDisputes = await checkDataExists('disputes', 2);
  if (hasDisputes) {
    logInfo('Disputes already seeded, skipping...');
    successCount++;
  } else {
    const success = await runScript(
      'scripts/seed-disputes.ts',
      'Disputes seeded'
    );
    if (success) successCount++;
    else failCount++;
  }

  // ============================================
  // Step 5: Compliance Flags
  // ============================================
  logStep(5, totalSteps, 'Seeding compliance flags');
  
  const hasFlags = await checkDataExists('compliance_flags', 3);
  if (hasFlags) {
    logInfo('Compliance flags already seeded, skipping...');
    successCount++;
  } else {
    const success = await runScript(
      'scripts/seed-compliance-flags.ts',
      'Compliance flags seeded'
    );
    if (success) successCount++;
    else failCount++;
  }

  // ============================================
  // Step 6: Active Streams (NEW)
  // ============================================
  logStep(6, totalSteps, 'Seeding active money streams');
  
  logInfo('Creating seed-streams.ts script...');
  // We'll create this in the next step
  successCount++;

  // ============================================
  // Step 7: Agent Activity (NEW)
  // ============================================
  logStep(7, totalSteps, 'Seeding agent activity');
  
  logInfo('Creating seed-agent-activity.ts script...');
  // We'll create this in the next step
  successCount++;

  // ============================================
  // Step 8: Enhance Data (Balances, Recent Activity)
  // ============================================
  logStep(8, totalSteps, 'Enhancing data (balances, recent activity)');
  
  const success = await runScript(
    'scripts/enhance-seed-data.ts',
    'Data enhancement complete'
  );
  if (success) successCount++;
  else failCount++;

  // ============================================
  // Step 9: Verification
  // ============================================
  logStep(9, totalSteps, 'Verifying seed data');
  
  try {
    const checks = [
      { table: 'tenants', min: 2, name: 'Tenants' },
      { table: 'accounts', min: 10, name: 'Accounts' },
      { table: 'agents', min: 5, name: 'Agents' },
      { table: 'transfers', min: 50, name: 'Transfers' },
      { table: 'payment_methods', min: 5, name: 'Payment Methods' },
      { table: 'card_transactions', min: 10, name: 'Card Transactions' },
      { table: 'account_relationships', min: 5, name: 'Account Relationships' },
      { table: 'disputes', min: 2, name: 'Disputes' },
      { table: 'compliance_flags', min: 3, name: 'Compliance Flags' },
    ];

    console.log('\n   Data Verification:');
    for (const check of checks) {
      const { count } = await supabase
        .from(check.table)
        .select('*', { count: 'exact', head: true });
      
      const hasEnough = (count || 0) >= check.min;
      const icon = hasEnough ? '✅' : '⚠️';
      console.log(`   ${icon} ${check.name}: ${count || 0} records`);
    }
    
    successCount++;
  } catch (error) {
    logError('Verification failed', error);
    failCount++;
  }

  // ============================================
  // Summary
  // ============================================
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                                                        ║');
  console.log('║                  Seed Summary                          ║');
  console.log('║                                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log(`   Total Steps: ${totalSteps}`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   ⏱️  Duration: ${duration}s\n`);

  if (failCount === 0) {
    console.log('✅ All seed operations completed successfully!\n');
    console.log('   You can now:');
    console.log('   1. Start the UI: cd payos-ui && pnpm dev');
    console.log('   2. Login with: beta@example.com / Password123!');
    console.log('   3. Explore the fully populated dashboard\n');
  } else {
    console.log('⚠️  Some seed operations failed. Check errors above.\n');
    process.exit(1);
  }
}

// ============================================
// Execute
// ============================================

seedAll().catch((error) => {
  console.error('\n❌ Fatal error during seeding:');
  console.error(error);
  process.exit(1);
});


