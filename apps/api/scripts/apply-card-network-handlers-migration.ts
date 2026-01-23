/**
 * Apply card network handler types migration
 * Adds visa_vic and mastercard_agent_pay to the connected_accounts handler_type check constraint
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false },
});

async function applyMigration() {
  console.log('🚀 Applying card network handler types migration...\n');

  // Use the REST API to execute SQL via the special _sql function
  // This requires the service role key
  const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

  if (!projectRef) {
    console.error('Could not extract project ref from SUPABASE_URL');
    process.exit(1);
  }

  const sql = `
    -- Drop the existing check constraint
    ALTER TABLE connected_accounts
    DROP CONSTRAINT IF EXISTS connected_accounts_handler_type_check;

    -- Add new check constraint with card network types
    ALTER TABLE connected_accounts
    ADD CONSTRAINT connected_accounts_handler_type_check
    CHECK (handler_type IN ('stripe', 'paypal', 'payos_native', 'circle', 'visa_vic', 'mastercard_agent_pay'));

    -- Update the comment to reflect new types
    COMMENT ON COLUMN connected_accounts.handler_type IS 'Type of payment handler: stripe, paypal, payos_native, circle, visa_vic, mastercard_agent_pay';
  `;

  // Execute via the Database Management API
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (response.status === 404) {
    console.log('⚠️  The exec_sql RPC function does not exist.');
    console.log('\n📋 Please run this SQL manually in your Supabase Dashboard:\n');
    console.log('   Go to: SQL Editor in your Supabase Dashboard');
    console.log('   File: apps/api/supabase/migrations/20260123_add_card_network_handlers.sql\n');
    console.log('--- SQL to execute ---\n');
    console.log(sql);
    console.log('\n--- End SQL ---\n');
    process.exit(0);
  }

  if (!response.ok) {
    const error = await response.text();
    console.error('Migration failed:', error);
    process.exit(1);
  }

  console.log('✅ Migration applied successfully!\n');
  console.log('New valid handler_type values:');
  console.log('  - stripe');
  console.log('  - paypal');
  console.log('  - payos_native');
  console.log('  - circle');
  console.log('  - visa_vic (NEW)');
  console.log('  - mastercard_agent_pay (NEW)');
}

applyMigration().catch(console.error);
