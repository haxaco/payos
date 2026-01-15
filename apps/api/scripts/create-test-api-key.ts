#!/usr/bin/env tsx

/**
 * Create Test API Key for Story 28.2 Testing
 * Creates the exact API key expected by integration tests
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function getKeyPrefix(key: string): string {
  return key.substring(0, 12);
}

async function main() {
  console.log('🔑 Creating test API key for Story 28.2 testing...\n');

  // The exact key expected by tests
  const testKey = 'pk_test_demo_fintech_key_12345';
  const keyPrefix = getKeyPrefix(testKey);  // 'pk_test_demo'
  const keyHash = hashApiKey(testKey);
  
  // Demo Fintech tenant ID
  const tenantId = 'aaaaaaaa-0000-0000-0000-000000000001';
  
  console.log(`   API Key: ${testKey}`);
  console.log(`   Prefix: ${keyPrefix}`);
  console.log(`   Hash: ${keyHash.substring(0, 16)}...`);
  console.log(`   Tenant: ${tenantId}\n`);
  
  // Check if key already exists
  const { data: existing } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_prefix', keyPrefix)
    .eq('tenant_id', tenantId)
    .single();
  
  if (existing) {
    console.log('   ℹ️  Key with this prefix already exists');
    console.log(`      ID: ${existing.id}`);
    console.log(`      Status: ${existing.status}`);
    
    // Update it to match our test key
    console.log('\n   Updating existing key...');
    const { error: updateError } = await supabase
      .from('api_keys')
      .update({
        key_hash: keyHash,
        name: 'Test Key (Integration Tests)',
        description: 'Fixed test key for Story 28.2 and integration tests',
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    
    if (updateError) {
      console.error('   ❌ Failed to update key:', updateError);
      process.exit(1);
    }
    
    console.log('   ✅ Updated existing key\n');
  } else {
    // Create new key
    console.log('   Creating new API key...');
    const { data: newKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        tenant_id: tenantId,
        name: 'Test Key (Integration Tests)',
        environment: 'test',
        description: 'Fixed test key for Story 28.2 and integration tests',
        key_prefix: keyPrefix,
        key_hash: keyHash,
        status: 'active',
        created_by_user_id: null, // System generated
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('   ❌ Failed to create key:', insertError);
      process.exit(1);
    }
    
    console.log(`   ✅ Created API key: ${newKey.id}\n`);
  }
  
  // Verify it works by checking the hash
  console.log('   Verifying key...');
  const { data: verification } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_prefix', keyPrefix)
    .eq('tenant_id', tenantId)
    .single();
  
  if (verification && verification.key_hash === keyHash) {
    console.log('   ✅ Key verified successfully!\n');
  } else {
    console.log('   ⚠️  Key verification failed\n');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Test API key is ready!\n');
  console.log('Usage:');
  console.log('  export API_KEY=pk_test_demo_fintech_key_12345');
  console.log('  curl -X POST http://localhost:4000/v1/simulate \\');
  console.log('    -H "Authorization: Bearer ${API_KEY}" \\');
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -d \'{"action":"transfer","payload":{...}}\'');
  console.log('');
}

main().catch(console.error);



