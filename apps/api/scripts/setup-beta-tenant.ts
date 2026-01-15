#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { generateApiKey, hashApiKey, getKeyPrefix } from '../src/utils/auth.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
    console.error('❌ Missing SUPABASE_URL');
    process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function setupBetaTenant() {
    console.log('🏗️  Setting up secondary tenant "Beta LLC"...');

    // 1. Create Beta Tenant
    let tenantId: string;
    const { data: existingTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('name', 'Beta LLC')
        .single();

    if (existingTenant) {
        console.log('  ✓ Tenant "Beta LLC" already exists.');
        tenantId = existingTenant.id;
    } else {
        // Determine status (handle potential db constraint if 'status' is required)
        const status = 'active';
        const testKey = generateApiKey('test');

        // Check if we need to provide api_key fields (based on seed-database.ts)
        // Providing them to be safe, assuming legacy fields are still present
        const { data: newTenant, error: createError } = await supabase
            .from('tenants')
            .insert({
                name: 'Beta LLC',
                status: status,
                api_key: testKey,
                api_key_hash: hashApiKey(testKey),
                api_key_prefix: getKeyPrefix(testKey),
            })
            .select()
            .single();

        if (createError) {
            console.error('❌ Failed to create tenant:', createError);
            process.exit(1);
        }
        console.log('  ✓ Created tenant "Beta LLC".');
        tenantId = newTenant.id;
    }

    // 2. Create Beta User (or get existing)
    const email = 'beta@example.com';
    const password = 'Password123!';
    let userId: string;

    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
        console.log(`  ✓ User ${email} already exists.`);
        userId = existingUser.id;
    } else {
        const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name: 'Beta Admin' }
        });

        if (userError) {
            console.error('❌ Failed to create user:', userError);
            process.exit(1);
        }
        console.log(`  ✓ Created user ${email}.`);
        userId = newUser.user.id;
    }

    // 3. Link User to Beta Tenant
    const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
            id: userId,
            tenant_id: tenantId,
            role: 'owner',
            name: 'Beta Admin'
        });

    if (profileError) {
        console.error('❌ Failed to link user to tenant:', profileError);
        process.exit(1);
    }

    console.log('  ✓ Linked user to tenant.');

    // 4. Seed Data for Beta Tenant
    console.log('🌱 Seeding Beta Tenant data...');

    // Create Account 1
    const { data: acct1, error: err1 } = await supabase
        .from('accounts')
        .insert({
            tenant_id: tenantId,
            type: 'person',
            name: 'Beta User One',
            email: 'user1@beta.example.com',
            verification_status: 'verified',
            verification_tier: 1
        })
        .select()
        .single();

    if (err1) console.error('Error creating account 1:', err1);
    else console.log(`  ✓ Created account: Beta User One (${acct1.id})`);

    // Create Account 2
    const { data: acct2, error: err2 } = await supabase
        .from('accounts')
        .insert({
            tenant_id: tenantId,
            type: 'business',
            name: 'Beta Business Corp',
            email: 'biz@beta.example.com',
            verification_status: 'verified',
            verification_tier: 2
        })
        .select()
        .single();

    if (err2) console.error('Error creating account 2:', err2);
    else console.log(`  ✓ Created account: Beta Business Corp (${acct2.id})`);

    // Create Transfer
    if (acct1 && acct2) {
        const { error: txError } = await supabase
            .from('transfers')
            .insert({
                tenant_id: tenantId,
                from_account_id: acct2.id, // Business pays User
                from_account_name: 'Beta Business Corp',
                to_account_id: acct1.id,
                to_account_name: 'Beta User One',
                amount: 500.00,
                currency: 'USD',
                status: 'completed',
                type: 'internal', // Added missing required field
                initiated_by_type: 'user',
                initiated_by_id: acct2.id,
                initiated_by_name: 'Beta Business Corp'
            });

        if (txError) console.error('Error creating transfer:', txError);
        else console.log('  ✓ Created transfer: $500.00 from Biz to User');
    }

    console.log('\n✅ Setup & Seeding Complete! You can now log in to verify.');
    console.log(`   Email: ${email}`);
    console.log(`   Pass:  ${password}`);
}

setupBetaTenant();
