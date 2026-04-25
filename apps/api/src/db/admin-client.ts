import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.js';
import type { SupabaseClient } from './client.js';

let adminClient: SupabaseClient | null = null;

/**
 * Create a Supabase admin client with service role key
 * This client has elevated permissions for auth.admin operations
 */
export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for admin operations'
    );
  }

  adminClient = createSupabaseClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}

