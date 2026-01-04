/**
 * Cleanup script to remove duplicate test data
 * Keeps only the first occurrence of each unique wallet/schedule/etc
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('🧹 Cleaning up duplicate test data...\n');

  const tenantId = 'dad4308f-f9b6-4529-a406-7c2bdf3c6071';

  // 1. Clean up duplicate wallets (keep first 3)
  console.log('💼 Cleaning duplicate wallets...');
  const { data: wallets } = await supabase
    .from('wallets')
    .select('id, name, owner_account_id, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at');

  if (wallets && wallets.length > 3) {
    const walletsToKeep = wallets.slice(0, 3).map(w => w.id);
    const walletsToDelete = wallets.slice(3).map(w => w.id);
    
    const { error } = await supabase
      .from('wallets')
      .delete()
      .in('id', walletsToDelete);
    
    if (error) {
      console.error('  ❌ Error deleting wallets:', error);
    } else {
      console.log(`  ✅ Deleted ${walletsToDelete.length} duplicate wallets`);
    }
  } else {
    console.log(`  ℹ️  No duplicate wallets found (${wallets?.length || 0} total)`);
  }

  // 2. Clean up duplicate transfer schedules (keep first 3)
  console.log('\n📅 Cleaning duplicate transfer schedules...');
  const { data: schedules } = await supabase
    .from('transfer_schedules')
    .select('id, description, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at');

  if (schedules && schedules.length > 3) {
    const schedulesToKeep = schedules.slice(0, 3).map(s => s.id);
    const schedulesToDelete = schedules.slice(3).map(s => s.id);
    
    const { error } = await supabase
      .from('transfer_schedules')
      .delete()
      .in('id', schedulesToDelete);
    
    if (error) {
      console.error('  ❌ Error deleting schedules:', error);
    } else {
      console.log(`  ✅ Deleted ${schedulesToDelete.length} duplicate schedules`);
    }
  } else {
    console.log(`  ℹ️  No duplicate schedules found (${schedules?.length || 0} total)`);
  }

  // 3. Clean up duplicate compliance flags (keep first 7 unique ones)
  console.log('\n🚩 Cleaning duplicate compliance flags...');
  const { data: flags } = await supabase
    .from('compliance_flags')
    .select('id, reason_code, risk_level, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at');

  if (flags && flags.length > 7) {
    // Keep first occurrence of each unique combination
    const seen = new Set<string>();
    const flagsToKeep: string[] = [];
    const flagsToDelete: string[] = [];

    for (const flag of flags) {
      const key = `${flag.reason_code}-${flag.risk_level}`;
      if (!seen.has(key) && flagsToKeep.length < 7) {
        seen.add(key);
        flagsToKeep.push(flag.id);
      } else {
        flagsToDelete.push(flag.id);
      }
    }

    if (flagsToDelete.length > 0) {
      const { error } = await supabase
        .from('compliance_flags')
        .delete()
        .in('id', flagsToDelete);
      
      if (error) {
        console.error('  ❌ Error deleting flags:', error);
      } else {
        console.log(`  ✅ Deleted ${flagsToDelete.length} duplicate flags`);
      }
    }
  } else {
    console.log(`  ℹ️  No duplicate flags found (${flags?.length || 0} total)`);
  }

  console.log('\n✨ Cleanup complete!\n');
}

main().catch(console.error);

