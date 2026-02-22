#!/usr/bin/env tsx

/**
 * Create a dashboard login for the Demo Fintech tenant.
 *
 * Creates a Supabase Auth user and links it to the existing
 * Demo Fintech tenant (aaaaaaaa-0000-0000-0000-000000000001)
 * so you can log in to the dashboard and observe activity.
 *
 * Usage: pnpm --filter @sly/api tsx scripts/setup-demo-fintech-login.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const EMAIL = 'demo@getsly.ai';
const PASSWORD = 'DemoFintech2026!';

async function main() {
  console.log('Setting up dashboard login for Demo Fintech tenant...\n');

  // 1. Verify tenant exists
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('id', TENANT_ID)
    .single();

  if (tenantError || !tenant) {
    console.error('Demo Fintech tenant not found. Run seed:db first.');
    process.exit(1);
  }

  console.log(`  Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Create or find user
  let userId: string;

  const { data: { users } } = await supabase.auth.admin.listUsers();
  const existing = users.find((u) => u.email === EMAIL);

  if (existing) {
    console.log(`  User ${EMAIL} already exists.`);
    userId = existing.id;

    // Update password in case it changed
    await supabase.auth.admin.updateUserById(userId, { password: PASSWORD });
    console.log('  Password updated.');
  } else {
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: 'Demo Admin' },
    });

    if (userError || !newUser.user) {
      console.error('Failed to create user:', userError);
      process.exit(1);
    }

    console.log(`  Created user ${EMAIL}.`);
    userId = newUser.user.id;
  }

  // 3. Link user to Demo Fintech tenant
  const { error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      tenant_id: TENANT_ID,
      role: 'owner',
      name: 'Demo Admin',
    });

  if (profileError) {
    console.error('Failed to link user to tenant:', profileError);
    process.exit(1);
  }

  console.log('  Linked user to Demo Fintech tenant.\n');

  console.log('Done. Dashboard login:\n');
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  Tenant:   ${tenant.name}`);
  console.log(`  API Key:  pk_test_demo_fintech_key_12345\n`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
