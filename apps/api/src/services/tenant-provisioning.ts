import { SupabaseClient } from '@supabase/supabase-js';
import {
  generateApiKey,
  hashApiKey,
  getKeyPrefix,
  logSecurityEvent,
} from '../utils/auth.js';

export interface ProvisionTenantInput {
  userId: string;
  email: string;
  organizationName: string;
  userName?: string;
}

export interface ProvisionTenantResult {
  tenant: { id: string; name: string };
  user: { id: string; email: string; name: string };
  // Open beta: only a test key is issued at signup. A live key cannot exist
  // until the tenant is production-approved (see tenant-production-access).
  apiKeys: {
    test: { key: string; prefix: string };
  };
  alreadyProvisioned: boolean;
}

/**
 * Provisions a new tenant with user profile, settings, and API keys.
 * Idempotent: returns existing tenant if user already has one.
 */
export async function provisionTenant(
  supabase: SupabaseClient,
  input: ProvisionTenantInput
): Promise<ProvisionTenantResult> {
  const { userId, email, organizationName, userName } = input;
  const displayName = userName || email.split('@')[0];

  // Idempotency: check if user already has a profile with a tenant.
  // maybeSingle() — a missing row is the normal first-signup case and must
  // not surface as an error.
  const { data: existingProfile } = await (supabase
    .from('user_profiles') as any)
    .select('id, tenant_id, name, role')
    .eq('id', userId)
    .maybeSingle();

  if (existingProfile?.tenant_id) {
    const { data: existingTenant } = await (supabase
      .from('tenants') as any)
      .select('id, name')
      .eq('id', existingProfile.tenant_id)
      .single();

    if (existingTenant) {
      // Return existing tenant — no API keys (already shown once)
      return {
        tenant: { id: existingTenant.id, name: existingTenant.name },
        user: { id: userId, email, name: existingProfile.name || displayName },
        apiKeys: {
          test: { key: '', prefix: '' },
        },
        alreadyProvisioned: true,
      };
    }
  }

  // Create tenant
  // Legacy api_key fields required for backwards compatibility
  const legacyApiKey = generateApiKey('test');
  const { data: tenant, error: tenantError } = await (supabase
    .from('tenants') as any)
    .insert({
      name: organizationName,
      status: 'active',
      api_key: legacyApiKey,
      api_key_hash: hashApiKey(legacyApiKey),
      api_key_prefix: getKeyPrefix(legacyApiKey),
    })
    .select()
    .single();

  if (tenantError || !tenant) {
    throw new TenantProvisioningError('Failed to create organization', 'tenant_creation_failed', tenantError);
  }

  // Create user profile. Race-safe: the setup wizard calls /v1/auth/provision
  // on mount (and React dev double-invokes effects), so two provision calls
  // can run concurrently. Insert; on a duplicate-key (profile already exists
  // for this user, created by signup or a sibling call) DON'T error — adopt
  // the authoritative existing profile/tenant and discard the tenant this
  // call just created. This eliminates the spurious "Failed to create user
  // profile" banner while keeping exactly one tenant per user.
  const { error: profileError } = await (supabase
    .from('user_profiles') as any)
    .insert({
      id: userId,
      tenant_id: tenant.id,
      role: 'owner',
      name: displayName,
    });

  if (profileError) {
    const { data: winner } = await (supabase
      .from('user_profiles') as any)
      .select('id, tenant_id, name')
      .eq('id', userId)
      .maybeSingle();

    if (winner?.tenant_id) {
      // Another call won the race (or signup already provisioned). Drop the
      // duplicate tenant we just created and return the authoritative one.
      if (winner.tenant_id !== tenant.id) {
        await supabase.from('tenants').delete().eq('id', tenant.id);
      }
      const { data: winnerTenant } = await (supabase
        .from('tenants') as any)
        .select('id, name')
        .eq('id', winner.tenant_id)
        .maybeSingle();
      return {
        tenant: { id: winner.tenant_id, name: winnerTenant?.name || organizationName },
        user: { id: userId, email, name: winner.name || displayName },
        apiKeys: { test: { key: '', prefix: '' } },
        alreadyProvisioned: true,
      };
    }

    // No surviving profile — a genuine failure. Roll back the tenant.
    await supabase.from('tenants').delete().eq('id', tenant.id);
    throw new TenantProvisioningError('Failed to create user profile', 'profile_creation_failed', profileError);
  }

  // Create tenant settings with defaults
  await (supabase.from('tenant_settings') as any).insert({
    tenant_id: tenant.id,
  });

  // Open beta: issue ONLY a test key at signup. A live key cannot be created
  // until the tenant is production-approved (POST /v1/api-keys enforces this).
  const testKey = generateApiKey('test');

  const { error: keysError } = await (supabase.from('api_keys') as any).insert([
    {
      tenant_id: tenant.id,
      created_by_user_id: userId,
      name: 'Default Test Key',
      environment: 'test',
      key_prefix: getKeyPrefix(testKey),
      key_hash: hashApiKey(testKey),
    },
  ]);

  if (keysError) {
    // Keys are optional — log but don't fail
    console.error('Failed to create API keys:', keysError);
  }

  await logSecurityEvent('tenant_provisioned', 'info', {
    userId,
    tenantId: tenant.id,
    organizationName,
  });

  return {
    tenant: { id: tenant.id, name: tenant.name },
    user: { id: userId, email, name: displayName },
    apiKeys: {
      test: { key: testKey, prefix: getKeyPrefix(testKey) },
    },
    alreadyProvisioned: false,
  };
}

export class TenantProvisioningError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'TenantProvisioningError';
  }
}
