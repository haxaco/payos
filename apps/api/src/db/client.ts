import { createClient as createSupabaseClient, type SupabaseClient as SupabaseClientGeneric } from '@supabase/supabase-js';
import type { Database } from './database.types.js';

// Typed alias the rest of the app can import in place of the bare
// SupabaseClient export. Tables, columns, and enums are all narrowed
// to what the live Postgres schema actually has, so .from('table_name')
// returns properly-shaped rows instead of `never`.
export type SupabaseClient = SupabaseClientGeneric<Database>;

let client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  // Service role key bypasses RLS automatically.
  client = createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}

// Helper to get client (throws if not configured)
export function getClient(): SupabaseClient {
  return createClient();
}


