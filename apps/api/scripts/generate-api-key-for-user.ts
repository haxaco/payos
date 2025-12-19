#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('   Please set these in your .env file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper functions from auth.ts
function generateApiKey(environment: 'test' | 'live'): string {
  const prefix = environment === 'test' ? 'pk_test_' : 'pk_live_';
  const randomBytes = crypto.randomBytes(32).toString('base64url');
  return `${prefix}${randomBytes}`;
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function getKeyPrefix(key: string): string {
  return key.substring(0, 12);
}

async function generateApiKeyForUser(email: string) {
    console.log(`🔑 Generating API key for ${email}...\n`);

    // 1. Get user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
        console.error('❌ Error listing users:', userError);
        process.exit(1);
    }

    const user = users.find(u => u.email === email);
    if (!user) {
        console.error(`❌ User not found: ${email}`);
        console.log('\n💡 Available users:');
        users.forEach(u => console.log(`   - ${u.email}`));
        process.exit(1);
    }

    console.log(`✅ Found user: ${user.id}`);

    // 2. Get user profile and tenant
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('tenant_id, name, role')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        console.error('❌ User profile not found or not linked to tenant');
        process.exit(1);
    }

    console.log(`✅ Tenant: ${profile.tenant_id} (${profile.role})`);

    // 3. Generate test API key
    const testKey = generateApiKey('test');
    const keyPrefix = getKeyPrefix(testKey);
    const keyHash = hashApiKey(testKey);

    // 4. Insert into database
    const { data: apiKey, error: insertError } = await supabase
        .from('api_keys')
        .insert({
            tenant_id: profile.tenant_id,
            created_by_user_id: user.id,
            name: 'Dashboard Test Key',
            environment: 'test',
            description: 'Generated for web dashboard access',
            key_prefix: keyPrefix,
            key_hash: keyHash,
            status: 'active',
        })
        .select()
        .single();

    if (insertError || !apiKey) {
        console.error('❌ Failed to create API key:', insertError);
        process.exit(1);
    }

    console.log('\n✅ API Key Generated Successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑 SAVE THIS KEY - IT WILL ONLY BE SHOWN ONCE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n${testKey}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Key Details:');
    console.log(`   ID:          ${apiKey.id}`);
    console.log(`   Name:        ${apiKey.name}`);
    console.log(`   Environment: ${apiKey.environment}`);
    console.log(`   Prefix:      ${apiKey.key_prefix}`);
    console.log(`   Created:     ${new Date(apiKey.created_at).toLocaleString()}`);
    console.log('\n💡 Next Steps:');
    console.log('   1. Copy the API key above');
    console.log('   2. Go to https://payos-web.vercel.app/dashboard/api-keys');
    console.log('   3. Paste the key and click Save');
    console.log('   4. Start using the dashboard! 🚀\n');
}

// Get email from command line argument
const email = process.argv[2] || 'haxaco@gmail.com';
generateApiKeyForUser(email).catch(console.error);

