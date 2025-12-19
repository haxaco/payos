#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lgsreshwntpdrthfgwos.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixUser() {
    console.log('🔧 Fixing test user profile...');

    // 1. Get Acme Tenant ID
    const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('name', 'Acme Corporation')
        .single();

    if (tenantError || !tenant) {
        console.error('❌ Could not find Acme Corporation tenant:', tenantError);
        return;
    }
    console.log(`✅ Found Acme Tenant: ${tenant.id}`);

    // 2. Get User ID for haxaco@gmail.com
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        console.error('❌ Error listing users:', userError);
        return;
    }

    const user = users.find(u => u.email === 'haxaco@gmail.com');

    let userId = user?.id;

    if (!user) {
        console.log('⚠️ User haxaco@gmail.com not found. Creating...');
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: 'haxaco@gmail.com',
            password: 'Password123!',
            email_confirm: true
        });

        if (createError) {
            console.error('❌ Failed to create user:', createError);
            return;
        }

        console.log('✅ User created successfully!');
        userId = newUser.user.id;
    } else {
        console.log(`✅ Found User: ${user.id} (${user.email})`);
        userId = user.id;
    }

    if (!userId) return;

    // 3. Upsert User Profile
    const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
            id: userId,
            tenant_id: tenant.id,
            role: 'owner',
            name: 'Test Admin'
        });

    if (profileError) {
        console.error('❌ Failed to update profile:', profileError);
    } else {
        console.log('✅ Successfully linked user to Acme Corporation!');
    }
}

fixUser();
