/**
 * Apply the agent_payment_approvals migration
 * 
 * Run with: npx tsx scripts/apply-approval-migration.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function applyMigration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { 
      persistSession: false,
      autoRefreshToken: false
    },
  });

  // Read the migration SQL
  const migrationPath = join(__dirname, '../supabase/migrations/20260119_agent_payment_approvals.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  console.log('📦 Applying agent_payment_approvals migration...\n');

  // Execute the migration via RPC
  // Note: Supabase doesn't allow direct SQL execution, so we'll use a workaround
  // We need to run this SQL directly in the Supabase SQL editor or via psql
  
  // First, check if table already exists
  const { data: tableExists, error: checkError } = await supabase
    .from('agent_payment_approvals')
    .select('id')
    .limit(1);

  if (checkError?.code === 'PGRST205') {
    console.log('❌ Table does not exist. Please apply the migration directly in Supabase SQL Editor:');
    console.log('   1. Go to your Supabase project dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Paste and run the contents of:');
    console.log(`      ${migrationPath}\n`);
    console.log('Migration SQL preview (first 50 lines):');
    console.log('─'.repeat(60));
    console.log(sql.split('\n').slice(0, 50).join('\n'));
    console.log('─'.repeat(60));
    process.exit(1);
  } else {
    console.log('✅ Table agent_payment_approvals already exists');
  }
}

applyMigration().catch(console.error);
