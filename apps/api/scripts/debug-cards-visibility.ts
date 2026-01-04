
import dotenv from 'dotenv';
import path from 'path';

// Load env from apps/api/.env
dotenv.config({ path: path.join(process.cwd(), 'apps/api/.env') });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCards() {
    console.log('🔍 Debugging Cards Visibility...\n');

    // 1. Get User
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === 'haxaco@gmail.com');

    if (!user) {
        console.error('❌ User haxaco@gmail.com not found');
        return;
    }
    console.log(`✅ User: ${user.email} (${user.id})`);

    // 2. Get Profile & Tenant
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('tenant_id, role, tenants(name)')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        console.error('❌ Profile not found:', profileError);
        return;
    }
    console.log(`✅ Tenant: ${profile.tenants?.name} (${profile.tenant_id})`);
    console.log(`✅ Role: ${profile.role}`);

    // 3. Count Payment Methods for this Tenant
    const { count, error: countError } = await supabase
        .from('payment_methods')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)
        .eq('type', 'card');

    console.log(`\n📊 Payment Methods (type='card') count: ${count}`);

    if (countError) {
        console.error('Error counting:', countError);
    }

    // 4. List First 5 Cards
    const { data: cards, error: cardsError } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('type', 'card')
        .limit(5);

    if (cards && cards.length > 0) {
        console.log('\n🃏 Sample Cards:');
        cards.forEach(c => {
            console.log(`- ID: ${c.id}`);
            console.log(`  Keys: ${Object.keys(c).join(', ')}`);
            console.log(`  Metadata:`, JSON.stringify(c.metadata));
        });
    } else {
        console.log('\n❌ No cards found for this tenant.');

        // Check if cards exist for ANY tenant
        const { count: totalCards } = await supabase
            .from('payment_methods')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'card');
        console.log(`Total cards in system (any tenant): ${totalCards}`);
    }

}

debugCards().catch(console.error);
