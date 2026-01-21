/**
 * UCP Identity Linking Service
 *
 * OAuth 2.0 implementation for linking AI agents/platforms to buyer accounts.
 * Enables agents to act on behalf of users for checkout and order management.
 *
 * Flow:
 * 1. Agent redirects user to /authorize with client_id and scopes
 * 2. User authenticates and grants permission
 * 3. User redirected back with authorization code
 * 4. Agent exchanges code for access/refresh tokens
 * 5. Agent uses access token to act on behalf of user
 *
 * @see Phase 4: Identity Linking
 * @see https://ucp.dev/specification/identity/
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient as getDefaultClient } from '../../db/client.js';
import type {
  UCPLinkedAccount,
  UCPAuthorizationCode,
  UCPOAuthClient,
  UCPIdentityScope,
  UCPTokenResponse,
  UCPIdentityErrorCode,
} from './types.js';

// =============================================================================
// Constants
// =============================================================================

/** Access token lifetime (1 hour) */
const ACCESS_TOKEN_LIFETIME_SECONDS = 3600;

/** Refresh token lifetime (30 days) */
const REFRESH_TOKEN_LIFETIME_SECONDS = 30 * 24 * 60 * 60;

/** Authorization code lifetime (10 minutes) */
const AUTH_CODE_LIFETIME_SECONDS = 600;

/** All available scopes */
const ALL_SCOPES: UCPIdentityScope[] = [
  'profile.read',
  'profile.write',
  'addresses.read',
  'addresses.write',
  'payment_methods.read',
  'payment_methods.write',
  'orders.read',
  'checkout.create',
  'checkout.complete',
];

// =============================================================================
// Database Helper
// =============================================================================

function getDb(supabase?: SupabaseClient): SupabaseClient {
  return supabase || getDefaultClient();
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a secure random token
 */
function generateToken(prefix: string = ''): string {
  const random = randomBytes(32).toString('base64url');
  return prefix ? `${prefix}_${random}` : random;
}

/**
 * Generate a client ID
 */
function generateClientId(): string {
  return `ucp_client_${randomBytes(16).toString('hex')}`;
}

/**
 * Generate a client secret
 */
function generateClientSecret(): string {
  return `ucp_secret_${randomBytes(32).toString('base64url')}`;
}

/**
 * Hash a token for storage
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a token against its hash
 */
function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  try {
    return timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
  } catch {
    return false;
  }
}

/**
 * Parse scopes from space-separated string
 */
function parseScopes(scopeString: string): UCPIdentityScope[] {
  const requested = scopeString.split(' ').filter(Boolean);
  return requested.filter((s): s is UCPIdentityScope =>
    ALL_SCOPES.includes(s as UCPIdentityScope)
  );
}

/**
 * Validate PKCE code challenge
 */
function validateCodeChallenge(
  verifier: string,
  challenge: string,
  method: 'S256' | 'plain' = 'S256'
): boolean {
  if (method === 'plain') {
    return verifier === challenge;
  }

  // S256: BASE64URL(SHA256(code_verifier))
  const computed = createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return computed === challenge;
}

/**
 * Create OAuth error response
 */
export function createOAuthError(
  code: UCPIdentityErrorCode,
  description: string
): { error: UCPIdentityErrorCode; error_description: string } {
  return {
    error: code,
    error_description: description,
  };
}

// =============================================================================
// Client Management
// =============================================================================

/**
 * Register an OAuth client (platform/agent)
 */
export async function registerClient(
  tenantId: string,
  config: {
    name: string;
    redirect_uris: string[];
    allowed_scopes?: UCPIdentityScope[];
    client_type?: 'public' | 'confidential';
    logo_url?: string;
  },
  supabase?: SupabaseClient
): Promise<{ client: UCPOAuthClient; client_secret?: string }> {
  const db = getDb(supabase);
  const clientId = generateClientId();

  let clientSecretHash: string | undefined;
  let clientSecret: string | undefined;

  if (config.client_type === 'confidential') {
    clientSecret = generateClientSecret();
    clientSecretHash = hashToken(clientSecret);
  }

  const { data, error } = await db
    .from('ucp_oauth_clients')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      client_secret_hash: clientSecretHash,
      name: config.name,
      logo_url: config.logo_url,
      redirect_uris: config.redirect_uris,
      allowed_scopes: config.allowed_scopes || ALL_SCOPES,
      client_type: config.client_type || 'public',
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('[UCP Identity] Failed to register client:', error);
    throw new Error(`Failed to register OAuth client: ${error.message}`);
  }

  const client: UCPOAuthClient = {
    id: data.id,
    tenant_id: data.tenant_id,
    client_id: data.client_id,
    client_secret_hash: data.client_secret_hash,
    name: data.name,
    logo_url: data.logo_url,
    redirect_uris: data.redirect_uris,
    allowed_scopes: data.allowed_scopes,
    client_type: data.client_type,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };

  console.log(`[UCP Identity] Registered client ${clientId} (${config.name})`);

  return { client, client_secret: clientSecret };
}

/**
 * Get OAuth client by client_id
 */
export async function getClient(
  clientId: string,
  supabase?: SupabaseClient
): Promise<UCPOAuthClient | null> {
  const db = getDb(supabase);

  const { data, error } = await db
    .from('ucp_oauth_clients')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    client_id: data.client_id,
    client_secret_hash: data.client_secret_hash,
    name: data.name,
    logo_url: data.logo_url,
    redirect_uris: data.redirect_uris,
    allowed_scopes: data.allowed_scopes,
    client_type: data.client_type,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * List OAuth clients for a tenant
 */
export async function listClientsByTenant(
  tenantId: string,
  supabase?: SupabaseClient
): Promise<UCPOAuthClient[]> {
  const db = getDb(supabase);

  const { data, error } = await db
    .from('ucp_oauth_clients')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[UCP Identity] Failed to list clients:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    client_id: row.client_id,
    client_secret_hash: row.client_secret_hash,
    name: row.name,
    logo_url: row.logo_url,
    redirect_uris: row.redirect_uris,
    allowed_scopes: row.allowed_scopes,
    client_type: row.client_type,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * Deactivate an OAuth client
 */
export async function deactivateClient(
  clientId: string,
  tenantId: string,
  supabase?: SupabaseClient
): Promise<UCPOAuthClient | null> {
  const db = getDb(supabase);

  const { data, error } = await db
    .from('ucp_oauth_clients')
    .update({ is_active: false })
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error || !data) {
    console.error('[UCP Identity] Failed to deactivate client:', error);
    return null;
  }

  console.log(`[UCP Identity] Deactivated client ${clientId}`);

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    client_id: data.client_id,
    client_secret_hash: data.client_secret_hash,
    name: data.name,
    logo_url: data.logo_url,
    redirect_uris: data.redirect_uris,
    allowed_scopes: data.allowed_scopes,
    client_type: data.client_type,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Verify client credentials
 */
export async function verifyClientCredentials(
  clientId: string,
  clientSecret?: string,
  supabase?: SupabaseClient
): Promise<UCPOAuthClient | null> {
  const client = await getClient(clientId, supabase);
  if (!client || !client.is_active) {
    return null;
  }

  // Public clients don't require secret
  if (client.client_type === 'public') {
    return client;
  }

  // Confidential clients require secret
  if (!clientSecret || !client.client_secret_hash) {
    return null;
  }

  if (!verifyToken(clientSecret, client.client_secret_hash)) {
    return null;
  }

  return client;
}

/**
 * Validate redirect URI
 */
export function validateRedirectUri(client: UCPOAuthClient, redirectUri: string): boolean {
  return client.redirect_uris.includes(redirectUri);
}

// =============================================================================
// Authorization Code Flow
// =============================================================================

/**
 * Create authorization code
 */
export async function createAuthorizationCode(
  tenantId: string,
  params: {
    client_id: string;
    buyer_id: string;
    redirect_uri: string;
    scopes: UCPIdentityScope[];
    state: string;
    code_challenge?: string;
    code_challenge_method?: 'S256' | 'plain';
  },
  supabase?: SupabaseClient
): Promise<UCPAuthorizationCode> {
  const db = getDb(supabase);
  const code = generateToken('authz');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AUTH_CODE_LIFETIME_SECONDS * 1000);

  const { data, error } = await db
    .from('ucp_authorization_codes')
    .insert({
      code,
      tenant_id: tenantId,
      client_id: params.client_id,
      buyer_id: params.buyer_id,
      redirect_uri: params.redirect_uri,
      scopes: params.scopes,
      code_challenge: params.code_challenge,
      code_challenge_method: params.code_challenge_method,
      state: params.state,
      expires_at: expiresAt.toISOString(),
      used: false,
    })
    .select()
    .single();

  if (error) {
    console.error('[UCP Identity] Failed to create authorization code:', error);
    throw new Error(`Failed to create authorization code: ${error.message}`);
  }

  console.log(`[UCP Identity] Created authorization code for buyer ${params.buyer_id}`);

  return {
    code: data.code,
    tenant_id: data.tenant_id,
    client_id: data.client_id,
    buyer_id: data.buyer_id,
    redirect_uri: data.redirect_uri,
    scopes: data.scopes,
    code_challenge: data.code_challenge,
    code_challenge_method: data.code_challenge_method,
    state: data.state,
    expires_at: data.expires_at,
    created_at: data.created_at,
    used: data.used,
  };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeAuthorizationCode(
  code: string,
  params: {
    client_id: string;
    client_secret?: string;
    redirect_uri: string;
    code_verifier?: string;
  },
  supabase?: SupabaseClient
): Promise<UCPTokenResponse> {
  const db = getDb(supabase);

  // Get authorization code from database
  const { data: authCodeData, error: authCodeError } = await db
    .from('ucp_authorization_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (authCodeError || !authCodeData) {
    throw createOAuthError('invalid_grant', 'Authorization code not found');
  }

  const authCode: UCPAuthorizationCode = {
    code: authCodeData.code,
    tenant_id: authCodeData.tenant_id,
    client_id: authCodeData.client_id,
    buyer_id: authCodeData.buyer_id,
    redirect_uri: authCodeData.redirect_uri,
    scopes: authCodeData.scopes,
    code_challenge: authCodeData.code_challenge,
    code_challenge_method: authCodeData.code_challenge_method,
    state: authCodeData.state,
    expires_at: authCodeData.expires_at,
    created_at: authCodeData.created_at,
    used: authCodeData.used,
  };

  if (authCode.used) {
    throw createOAuthError('invalid_grant', 'Authorization code has already been used');
  }

  if (new Date(authCode.expires_at) < new Date()) {
    // Delete expired code
    await db.from('ucp_authorization_codes').delete().eq('code', code);
    throw createOAuthError('invalid_grant', 'Authorization code has expired');
  }

  if (authCode.client_id !== params.client_id) {
    throw createOAuthError('invalid_grant', 'Client ID mismatch');
  }

  if (authCode.redirect_uri !== params.redirect_uri) {
    throw createOAuthError('invalid_grant', 'Redirect URI mismatch');
  }

  // Verify client
  const client = await verifyClientCredentials(params.client_id, params.client_secret, supabase);
  if (!client) {
    throw createOAuthError('invalid_client', 'Invalid client credentials');
  }

  // Verify PKCE if code challenge was provided
  if (authCode.code_challenge) {
    if (!params.code_verifier) {
      throw createOAuthError('invalid_grant', 'Code verifier required');
    }
    if (!validateCodeChallenge(
      params.code_verifier,
      authCode.code_challenge,
      authCode.code_challenge_method
    )) {
      throw createOAuthError('invalid_grant', 'Invalid code verifier');
    }
  }

  // Mark code as used
  await db
    .from('ucp_authorization_codes')
    .update({ used: true })
    .eq('code', code);

  // Create linked account and tokens
  const linkedAccount = await createLinkedAccount(
    authCode.tenant_id,
    {
      platform_id: client.client_id,
      platform_name: client.name,
      buyer_id: authCode.buyer_id,
      scopes: authCode.scopes,
    },
    supabase
  );

  console.log(`[UCP Identity] Exchanged code for tokens, linked account ${linkedAccount.id}`);

  return {
    access_token: linkedAccount._access_token,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_LIFETIME_SECONDS,
    refresh_token: linkedAccount._refresh_token,
    scope: linkedAccount.scopes.join(' '),
  };
}

// =============================================================================
// Linked Account Management
// =============================================================================

/**
 * Create linked account with tokens
 */
export async function createLinkedAccount(
  tenantId: string,
  params: {
    platform_id: string;
    platform_name: string;
    buyer_id: string;
    buyer_email?: string;
    scopes: UCPIdentityScope[];
  },
  supabase?: SupabaseClient
): Promise<UCPLinkedAccount & { _access_token: string; _refresh_token: string }> {
  const db = getDb(supabase);
  const now = new Date();

  // Generate tokens
  const accessToken = generateToken('ucp_at');
  const refreshToken = generateToken('ucp_rt');

  const accessTokenHash = hashToken(accessToken);
  const refreshTokenHash = hashToken(refreshToken);

  const accessExpires = new Date(now.getTime() + ACCESS_TOKEN_LIFETIME_SECONDS * 1000);
  const refreshExpires = new Date(now.getTime() + REFRESH_TOKEN_LIFETIME_SECONDS * 1000);

  const { data, error } = await db
    .from('ucp_linked_accounts')
    .insert({
      tenant_id: tenantId,
      platform_id: params.platform_id,
      platform_name: params.platform_name,
      buyer_id: params.buyer_id,
      buyer_email: params.buyer_email,
      scopes: params.scopes,
      access_token_hash: accessTokenHash,
      refresh_token_hash: refreshTokenHash,
      access_token_expires_at: accessExpires.toISOString(),
      refresh_token_expires_at: refreshExpires.toISOString(),
      is_active: true,
      linked_at: now.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[UCP Identity] Failed to create linked account:', error);
    throw new Error(`Failed to create linked account: ${error.message}`);
  }

  console.log(`[UCP Identity] Created linked account ${data.id} for buyer ${params.buyer_id}`);

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    platform_id: data.platform_id,
    platform_name: data.platform_name,
    buyer_id: data.buyer_id,
    buyer_email: data.buyer_email,
    scopes: data.scopes,
    access_token_hash: data.access_token_hash,
    refresh_token_hash: data.refresh_token_hash,
    access_token_expires_at: data.access_token_expires_at,
    refresh_token_expires_at: data.refresh_token_expires_at,
    is_active: data.is_active,
    linked_at: data.linked_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
    _access_token: accessToken,
    _refresh_token: refreshToken,
  };
}

/**
 * Validate access token and return linked account
 */
export async function validateAccessToken(
  accessToken: string,
  supabase?: SupabaseClient
): Promise<UCPLinkedAccount | null> {
  const db = getDb(supabase);
  const tokenHash = hashToken(accessToken);

  // Find linked account by access token hash
  const { data, error } = await db
    .from('ucp_linked_accounts')
    .select('*')
    .eq('access_token_hash', tokenHash)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  // Check expiration
  if (new Date(data.access_token_expires_at) < new Date()) {
    return null;
  }

  // Update last used
  await db
    .from('ucp_linked_accounts')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id);

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    platform_id: data.platform_id,
    platform_name: data.platform_name,
    buyer_id: data.buyer_id,
    buyer_email: data.buyer_email,
    scopes: data.scopes,
    access_token_hash: data.access_token_hash,
    refresh_token_hash: data.refresh_token_hash,
    access_token_expires_at: data.access_token_expires_at,
    refresh_token_expires_at: data.refresh_token_expires_at,
    is_active: data.is_active,
    linked_at: data.linked_at,
    last_used_at: data.last_used_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Refresh tokens using refresh token
 */
export async function refreshTokens(
  refreshToken: string,
  clientId: string,
  clientSecret?: string,
  supabase?: SupabaseClient
): Promise<UCPTokenResponse> {
  const db = getDb(supabase);

  // Verify client
  const client = await verifyClientCredentials(clientId, clientSecret, supabase);
  if (!client) {
    throw createOAuthError('invalid_client', 'Invalid client credentials');
  }

  const tokenHash = hashToken(refreshToken);

  // Find linked account by refresh token hash
  const { data: accountData, error } = await db
    .from('ucp_linked_accounts')
    .select('*')
    .eq('refresh_token_hash', tokenHash)
    .single();

  if (error || !accountData) {
    throw createOAuthError('invalid_grant', 'Invalid refresh token');
  }

  if (!accountData.is_active) {
    throw createOAuthError('invalid_grant', 'Linked account not found or inactive');
  }

  // Check refresh token expiration
  if (new Date(accountData.refresh_token_expires_at) < new Date()) {
    throw createOAuthError('invalid_grant', 'Refresh token has expired');
  }

  // Verify client owns this linked account
  if (accountData.platform_id !== clientId) {
    throw createOAuthError('invalid_grant', 'Token does not belong to this client');
  }

  // Generate new tokens
  const now = new Date();
  const newAccessToken = generateToken('ucp_at');
  const newRefreshToken = generateToken('ucp_rt');

  const newAccessTokenHash = hashToken(newAccessToken);
  const newRefreshTokenHash = hashToken(newRefreshToken);

  // Update account with new tokens
  const { error: updateError } = await db
    .from('ucp_linked_accounts')
    .update({
      access_token_hash: newAccessTokenHash,
      refresh_token_hash: newRefreshTokenHash,
      access_token_expires_at: new Date(
        now.getTime() + ACCESS_TOKEN_LIFETIME_SECONDS * 1000
      ).toISOString(),
      refresh_token_expires_at: new Date(
        now.getTime() + REFRESH_TOKEN_LIFETIME_SECONDS * 1000
      ).toISOString(),
    })
    .eq('id', accountData.id);

  if (updateError) {
    console.error('[UCP Identity] Failed to refresh tokens:', updateError);
    throw new Error('Failed to refresh tokens');
  }

  console.log(`[UCP Identity] Refreshed tokens for linked account ${accountData.id}`);

  return {
    access_token: newAccessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_LIFETIME_SECONDS,
    refresh_token: newRefreshToken,
    scope: accountData.scopes.join(' '),
  };
}

/**
 * Revoke a token (access or refresh)
 */
export async function revokeToken(
  token: string,
  tokenTypeHint?: 'access_token' | 'refresh_token',
  supabase?: SupabaseClient
): Promise<void> {
  const db = getDb(supabase);
  const tokenHash = hashToken(token);

  // Try to find by access token first (or if hinted)
  if (tokenTypeHint !== 'refresh_token') {
    const { data: accountByAccess, error: accessError } = await db
      .from('ucp_linked_accounts')
      .select('id')
      .eq('access_token_hash', tokenHash)
      .single();

    if (!accessError && accountByAccess) {
      await db
        .from('ucp_linked_accounts')
        .update({ is_active: false })
        .eq('id', accountByAccess.id);
      console.log(`[UCP Identity] Revoked linked account ${accountByAccess.id}`);
      return;
    }
  }

  // Try refresh token
  if (tokenTypeHint !== 'access_token') {
    const { data: accountByRefresh, error: refreshError } = await db
      .from('ucp_linked_accounts')
      .select('id')
      .eq('refresh_token_hash', tokenHash)
      .single();

    if (!refreshError && accountByRefresh) {
      await db
        .from('ucp_linked_accounts')
        .update({ is_active: false })
        .eq('id', accountByRefresh.id);
      console.log(`[UCP Identity] Revoked linked account ${accountByRefresh.id}`);
    }
  }
}

/**
 * Get linked account by ID
 */
export async function getLinkedAccount(
  accountId: string,
  tenantId: string,
  supabase?: SupabaseClient
): Promise<UCPLinkedAccount | null> {
  const db = getDb(supabase);

  const { data, error } = await db
    .from('ucp_linked_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    platform_id: data.platform_id,
    platform_name: data.platform_name,
    buyer_id: data.buyer_id,
    buyer_email: data.buyer_email,
    scopes: data.scopes,
    access_token_hash: data.access_token_hash,
    refresh_token_hash: data.refresh_token_hash,
    access_token_expires_at: data.access_token_expires_at,
    refresh_token_expires_at: data.refresh_token_expires_at,
    is_active: data.is_active,
    linked_at: data.linked_at,
    last_used_at: data.last_used_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * List linked accounts for a buyer
 */
export async function listLinkedAccountsByBuyer(
  tenantId: string,
  buyerId: string,
  supabase?: SupabaseClient
): Promise<UCPLinkedAccount[]> {
  const db = getDb(supabase);

  const { data, error } = await db
    .from('ucp_linked_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('buyer_id', buyerId)
    .eq('is_active', true);

  if (error) {
    console.error('[UCP Identity] Failed to list linked accounts by buyer:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    platform_id: row.platform_id,
    platform_name: row.platform_name,
    buyer_id: row.buyer_id,
    buyer_email: row.buyer_email,
    scopes: row.scopes,
    access_token_hash: row.access_token_hash,
    refresh_token_hash: row.refresh_token_hash,
    access_token_expires_at: row.access_token_expires_at,
    refresh_token_expires_at: row.refresh_token_expires_at,
    is_active: row.is_active,
    linked_at: row.linked_at,
    last_used_at: row.last_used_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

/**
 * List linked accounts for a platform
 */
export async function listLinkedAccountsByPlatform(
  tenantId: string,
  platformId: string,
  options: { limit?: number; offset?: number } = {},
  supabase?: SupabaseClient
): Promise<{ data: UCPLinkedAccount[]; total: number }> {
  const db = getDb(supabase);
  const { limit = 20, offset = 0 } = options;

  // Get total count
  const { count, error: countError } = await db
    .from('ucp_linked_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('platform_id', platformId)
    .eq('is_active', true);

  if (countError) {
    console.error('[UCP Identity] Failed to count linked accounts:', countError);
    return { data: [], total: 0 };
  }

  // Get paginated data
  const { data, error } = await db
    .from('ucp_linked_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('platform_id', platformId)
    .eq('is_active', true)
    .order('linked_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[UCP Identity] Failed to list linked accounts by platform:', error);
    return { data: [], total: 0 };
  }

  return {
    data: (data || []).map((row) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      platform_id: row.platform_id,
      platform_name: row.platform_name,
      buyer_id: row.buyer_id,
      buyer_email: row.buyer_email,
      scopes: row.scopes,
      access_token_hash: row.access_token_hash,
      refresh_token_hash: row.refresh_token_hash,
      access_token_expires_at: row.access_token_expires_at,
      refresh_token_expires_at: row.refresh_token_expires_at,
      is_active: row.is_active,
      linked_at: row.linked_at,
      last_used_at: row.last_used_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })),
    total: count || 0,
  };
}

/**
 * Unlink an account (buyer-initiated)
 */
export async function unlinkAccount(
  accountId: string,
  tenantId: string,
  buyerId: string,
  supabase?: SupabaseClient
): Promise<void> {
  const db = getDb(supabase);

  const { data, error } = await db
    .from('ucp_linked_accounts')
    .update({ is_active: false })
    .eq('id', accountId)
    .eq('tenant_id', tenantId)
    .eq('buyer_id', buyerId)
    .select()
    .single();

  if (error || !data) {
    throw new Error('Linked account not found');
  }

  console.log(`[UCP Identity] Unlinked account ${accountId}`);
}

// =============================================================================
// Scope Validation
// =============================================================================

/**
 * Check if linked account has required scope
 */
export function hasScope(account: UCPLinkedAccount, requiredScope: UCPIdentityScope): boolean {
  return account.scopes.includes(requiredScope);
}

/**
 * Check if linked account has all required scopes
 */
export function hasAllScopes(
  account: UCPLinkedAccount,
  requiredScopes: UCPIdentityScope[]
): boolean {
  return requiredScopes.every((scope) => account.scopes.includes(scope));
}

/**
 * Check if linked account has any of the required scopes
 */
export function hasAnyScope(
  account: UCPLinkedAccount,
  requiredScopes: UCPIdentityScope[]
): boolean {
  return requiredScopes.some((scope) => account.scopes.includes(scope));
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Clear all stores (for testing) - no-op for database storage
 * Note: In production, use direct database operations for cleanup
 */
export async function clearIdentityStores(supabase?: SupabaseClient): Promise<void> {
  const db = getDb(supabase);

  // Delete in order due to foreign key constraints
  await db.from('ucp_linked_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await db.from('ucp_authorization_codes').delete().neq('code', '');
  await db.from('ucp_oauth_clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('[UCP Identity] Cleared all identity stores');
}

/**
 * Get all scopes
 */
export function getAllScopes(): UCPIdentityScope[] {
  return [...ALL_SCOPES];
}
