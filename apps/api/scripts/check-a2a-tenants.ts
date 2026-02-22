import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

async function main() {
  // Check user_profiles with all columns
  const { data: profiles, error } = await sb.from('user_profiles').select('*');
  console.log('user_profiles count:', (profiles || []).length, error ? `(error: ${error.message})` : '');
  for (const p of (profiles || []).slice(0, 10)) {
    console.log(' ', JSON.stringify(p));
  }

  // Check Supabase Auth users
  const { data: authUsers } = await sb.auth.admin.listUsers({ perPage: 10 });
  console.log('\nAuth users:');
  for (const u of (authUsers?.users || [])) {
    console.log(' ', u.id, '|', u.email, '| metadata:', JSON.stringify(u.user_metadata));
  }

  // Check which tenant the "Haxaco Development" or user's tenant is
  const { data: haxTenant } = await sb.from('tenants').select('id, name').ilike('name', '%haxaco%');
  console.log('\nHaxaco tenant:', haxTenant);

  // Check agents under haxaco tenant
  if (haxTenant && haxTenant.length > 0) {
    const tid = haxTenant[0].id;
    const { data: agents } = await sb.from('agents').select('id, name').eq('tenant_id', tid);
    console.log('\nAgents under Haxaco tenant:', agents);
  }
}

main().catch(console.error);
