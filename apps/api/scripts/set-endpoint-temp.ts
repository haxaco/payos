import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  // Set endpoint
  const { data, error } = await sb
    .from('agents')
    .update({ endpoint_url: 'http://localhost:4200/a2a', endpoint_type: 'a2a', endpoint_enabled: true })
    .eq('id', 'de6881d4-af43-4510-b40e-841ceb9d8c0a')
    .select('id, name, endpoint_url, endpoint_type, endpoint_enabled')
    .single();

  console.log('Set endpoint result:', JSON.stringify({ data, error }, null, 2));

  // Verify via read
  const { data: verify } = await sb
    .from('agents')
    .select('id, name, endpoint_url, endpoint_type, endpoint_enabled')
    .eq('id', 'de6881d4-af43-4510-b40e-841ceb9d8c0a')
    .single();

  console.log('Verify:', JSON.stringify(verify, null, 2));
}

main();
