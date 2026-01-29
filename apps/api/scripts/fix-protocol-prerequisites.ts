#!/usr/bin/env tsx

/**
 * Fix Protocol Prerequisites
 *
 * Adds missing wallets and connected accounts to existing tenants
 * so that all protocols (x402, AP2, ACP, UCP) can be enabled.
 *
 * Usage: pnpm --filter @sly/api tsx scripts/fix-protocol-prerequisites.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function fixProtocolPrerequisites() {
  console.log('🔧 Fixing protocol prerequisites...\n');

  // Get all tenants
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, name');

  if (tenantsError) {
    console.error('❌ Failed to fetch tenants:', tenantsError.message);
    process.exit(1);
  }

  if (!tenants || tenants.length === 0) {
    console.log('⚠️  No tenants found. Run seed:db first.');
    process.exit(0);
  }

  console.log(`Found ${tenants.length} tenant(s)\n`);

  for (const tenant of tenants) {
    console.log(`\n📦 Processing tenant: ${tenant.name} (${tenant.id})`);

    // Get first account for this tenant (to own the wallet)
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('tenant_id', tenant.id)
      .limit(1);

    if (!accounts || accounts.length === 0) {
      console.log('   ⚠️  No accounts found, skipping...');
      continue;
    }

    const ownerAccount = accounts[0];

    // Check for existing wallets
    const { data: existingWallets } = await supabase
      .from('wallets')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
      .limit(1);

    if (!existingWallets || existingWallets.length === 0) {
      console.log('   Creating wallet for x402/AP2 protocols...');

      const { error: walletError } = await supabase
        .from('wallets')
        .insert({
          tenant_id: tenant.id,
          owner_account_id: ownerAccount.id,
          balance: 10000,
          currency: 'USDC',
          network: 'base-mainnet',
          status: 'active',
          name: 'Protocol Treasury Wallet',
          purpose: 'Main wallet for x402 and AP2 protocol operations',
        });

      if (walletError) {
        console.log(`   ❌ Failed to create wallet: ${walletError.message}`);
      } else {
        console.log('   ✅ Created wallet (10,000 USDC)');
      }
    } else {
      console.log('   ✓ Wallet already exists');
    }

    // Check for existing connected accounts
    const { data: existingHandlers } = await supabase
      .from('connected_accounts')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
      .limit(1);

    if (!existingHandlers || existingHandlers.length === 0) {
      console.log('   Creating connected account for ACP/UCP protocols...');

      const placeholderCredential = Buffer.from(JSON.stringify({
        placeholder: true,
        note: 'Demo credentials - configure in settings for production'
      })).toString('base64');

      const { error: handlerError } = await supabase
        .from('connected_accounts')
        .insert({
          tenant_id: tenant.id,
          handler_type: 'payos_native',
          handler_name: 'Sly Native Handler',
          credentials_encrypted: placeholderCredential,
          credentials_key_id: 'v1-demo',
          status: 'active',
          last_verified_at: new Date().toISOString(),
          metadata: {
            pix_enabled: true,
            spei_enabled: true,
            settlement_currency: 'USDC',
          },
        });

      if (handlerError) {
        console.log(`   ❌ Failed to create connected account: ${handlerError.message}`);
      } else {
        console.log('   ✅ Created connected account (Sly Native)');
      }
    } else {
      console.log('   ✓ Connected account already exists');
    }
  }

  console.log('\n✅ Protocol prerequisites fixed!');
  console.log('\n📋 Next steps:');
  console.log('   1. Restart the API server: pnpm --filter @sly/api dev');
  console.log('   2. Refresh the dashboard');
  console.log('   3. Protocol toggles should now be enabled');
}

fixProtocolPrerequisites().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
