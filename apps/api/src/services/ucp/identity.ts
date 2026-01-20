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
// In-Memory Stores (for PoC - replace with Supabase in production)
// =============================================================================

const clientStore = new Map<string, UCPOAuthClient>();
const authCodeStore = new Map<string, UCPAuthorizationCode>();
const linkedAccountStore = new Map<string, UCPLinkedAccount>();

// Token to linked account mapping (for validation)
const accessTokenIndex = new Map<string, string>(); // token_hash -> linked_account_id
const refreshTokenIndex = new Map<string, string>(); // token_hash -> linked_account_id

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
  _supabase?: SupabaseClient
): Promise<{ client: UCPOAuthClient; client_secret?: string }> {
  const clientId = generateClientId();
  const now = new Date().toISOString();

  let clientSecretHash: string | undefined;
  let clientSecret: string | undefined;

  if (config.client_type === 'confidential') {
    clientSecret = generateClientSecret();
    clientSecretHash = hashToken(clientSecret);
  }

  const client: UCPOAuthClient = {
    id: `oauth_${randomBytes(12).toString('hex')}`,
    tenant_id: tenantId,
    client_id: clientId,
    client_secret_hash: clientSecretHash,
    name: config.name,
    logo_url: config.logo_url,
    redirect_uris: config.redirect_uris,
    allowed_scopes: config.allowed_scopes || ALL_SCOPES,
    client_type: config.client_type || 'public',
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  clientStore.set(clientId, client);

  console.log(`[UCP Identity] Registered client ${clientId} (${config.name})`);

  return { client, client_secret: clientSecret };
}

/**
 * Get OAuth client by client_id
 */
export async function getClient(
  clientId: string,
  _supabase?: SupabaseClient
): Promise<UCPOAuthClient | null> {
  return clientStore.get(clientId) || null;
}

/**
 * Verify client credentials
 */
export async function verifyClientCredentials(
  clientId: string,
  clientSecret?: string,
  _supabase?: SupabaseClient
): Promise<UCPOAuthClient | null> {
  const client = await getClient(clientId);
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
  _supabase?: SupabaseClient
): Promise<UCPAuthorizationCode> {
  const code = generateToken('authz');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AUTH_CODE_LIFETIME_SECONDS * 1000);

  const authCode: UCPAuthorizationCode = {
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
    created_at: now.toISOString(),
    used: false,
  };

  authCodeStore.set(code, authCode);

  console.log(`[UCP Identity] Created authorization code for buyer ${params.buyer_id}`);

  return authCode;
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
  _supabase?: SupabaseClient
): Promise<UCPTokenResponse> {
  const authCode = authCodeStore.get(code);

  if (!authCode) {
    throw createOAuthError('invalid_grant', 'Authorization code not found');
  }

  if (authCode.used) {
    throw createOAuthError('invalid_grant', 'Authorization code has already been used');
  }

  if (new Date(authCode.expires_at) < new Date()) {
    authCodeStore.delete(code);
    throw createOAuthError('invalid_grant', 'Authorization code has expired');
  }

  if (authCode.client_id !== params.client_id) {
    throw createOAuthError('invalid_grant', 'Client ID mismatch');
  }

  if (authCode.redirect_uri !== params.redirect_uri) {
    throw createOAuthError('invalid_grant', 'Redirect URI mismatch');
  }

  // Verify client
  const client = await verifyClientCredentials(params.client_id, params.client_secret);
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
  authCode.used = true;
  authCodeStore.set(code, authCode);

  // Create linked account and tokens
  const linkedAccount = await createLinkedAccount(
    authCode.tenant_id,
    {
      platform_id: client.client_id,
      platform_name: client.name,
      buyer_id: authCode.buyer_id,
      scopes: authCode.scopes,
    }
  );

  console.log(`[UCP Identity] Exchanged code for tokens, linked account ${linkedAccount.id}`);

  return {
    access_token: linkedAccount.access_token_hash, // In real impl, return actual token
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_LIFETIME_SECONDS,
    refresh_token: linkedAccount.refresh_token_hash, // In real impl, return actual token
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
  _supabase?: SupabaseClient
): Promise<UCPLinkedAccount & { _access_token: string; _refresh_token: string }> {
  const id = `link_${randomBytes(16).toString('hex')}`;
  const now = new Date();

  // Generate tokens
  const accessToken = generateToken('ucp_at');
  const refreshToken = generateToken('ucp_rt');

  const accessTokenHash = hashToken(accessToken);
  const refreshTokenHash = hashToken(refreshToken);

  const accessExpires = new Date(now.getTime() + ACCESS_TOKEN_LIFETIME_SECONDS * 1000);
  const refreshExpires = new Date(now.getTime() + REFRESH_TOKEN_LIFETIME_SECONDS * 1000);

  const linkedAccount: UCPLinkedAccount = {
    id,
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
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  linkedAccountStore.set(id, linkedAccount);

  // Index tokens for lookup
  accessTokenIndex.set(accessTokenHash, id);
  refreshTokenIndex.set(refreshTokenHash, id);

  console.log(`[UCP Identity] Created linked account ${id} for buyer ${params.buyer_id}`);

  return {
    ...linkedAccount,
    _access_token: accessToken,
    _refresh_token: refreshToken,
  };
}

/**
 * Validate access token and return linked account
 */
export async function validateAccessToken(
  accessToken: string,
  _supabase?: SupabaseClient
): Promise<UCPLinkedAccount | null> {
  const tokenHash = hashToken(accessToken);
  const accountId = accessTokenIndex.get(tokenHash);

  if (!accountId) {
    return null;
  }

  const account = linkedAccountStore.get(accountId);
  if (!account || !account.is_active) {
    return null;
  }

  // Check expiration
  if (new Date(account.access_token_expires_at) < new Date()) {
    return null;
  }

  // Update last used
  account.last_used_at = new Date().toISOString();
  linkedAccountStore.set(accountId, account);

  return account;
}

/**
 * Refresh tokens using refresh token
 */
export async function refreshTokens(
  refreshToken: string,
  clientId: string,
  clientSecret?: string,
  _supabase?: SupabaseClient
): Promise<UCPTokenResponse> {
  // Verify client
  const client = await verifyClientCredentials(clientId, clientSecret);
  if (!client) {
    throw createOAuthError('invalid_client', 'Invalid client credentials');
  }

  const tokenHash = hashToken(refreshToken);
  const accountId = refreshTokenIndex.get(tokenHash);

  if (!accountId) {
    throw createOAuthError('invalid_grant', 'Invalid refresh token');
  }

  const account = linkedAccountStore.get(accountId);
  if (!account || !account.is_active) {
    throw createOAuthError('invalid_grant', 'Linked account not found or inactive');
  }

  // Verify refresh token matches
  if (!verifyToken(refreshToken, account.refresh_token_hash)) {
    throw createOAuthError('invalid_grant', 'Invalid refresh token');
  }

  // Check refresh token expiration
  if (new Date(account.refresh_token_expires_at) < new Date()) {
    throw createOAuthError('invalid_grant', 'Refresh token has expired');
  }

  // Verify client owns this linked account
  if (account.platform_id !== clientId) {
    throw createOAuthError('invalid_grant', 'Token does not belong to this client');
  }

  // Generate new tokens
  const now = new Date();
  const newAccessToken = generateToken('ucp_at');
  const newRefreshToken = generateToken('ucp_rt');

  const newAccessTokenHash = hashToken(newAccessToken);
  const newRefreshTokenHash = hashToken(newRefreshToken);

  // Remove old token indexes
  accessTokenIndex.delete(account.access_token_hash);
  refreshTokenIndex.delete(account.refresh_token_hash);

  // Update account with new tokens
  account.access_token_hash = newAccessTokenHash;
  account.refresh_token_hash = newRefreshTokenHash;
  account.access_token_expires_at = new Date(
    now.getTime() + ACCESS_TOKEN_LIFETIME_SECONDS * 1000
  ).toISOString();
  account.refresh_token_expires_at = new Date(
    now.getTime() + REFRESH_TOKEN_LIFETIME_SECONDS * 1000
  ).toISOString();
  account.updated_at = now.toISOString();

  linkedAccountStore.set(accountId, account);

  // Index new tokens
  accessTokenIndex.set(newAccessTokenHash, accountId);
  refreshTokenIndex.set(newRefreshTokenHash, accountId);

  console.log(`[UCP Identity] Refreshed tokens for linked account ${accountId}`);

  return {
    access_token: newAccessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_LIFETIME_SECONDS,
    refresh_token: newRefreshToken,
    scope: account.scopes.join(' '),
  };
}

/**
 * Revoke a token (access or refresh)
 */
export async function revokeToken(
  token: string,
  tokenTypeHint?: 'access_token' | 'refresh_token',
  _supabase?: SupabaseClient
): Promise<void> {
  const tokenHash = hashToken(token);

  // Try to find by access token first (or if hinted)
  if (tokenTypeHint !== 'refresh_token') {
    const accountIdByAccess = accessTokenIndex.get(tokenHash);
    if (accountIdByAccess) {
      const account = linkedAccountStore.get(accountIdByAccess);
      if (account) {
        // Revoke entire linked account
        account.is_active = false;
        account.updated_at = new Date().toISOString();
        linkedAccountStore.set(accountIdByAccess, account);
        accessTokenIndex.delete(account.access_token_hash);
        refreshTokenIndex.delete(account.refresh_token_hash);
        console.log(`[UCP Identity] Revoked linked account ${accountIdByAccess}`);
      }
      return;
    }
  }

  // Try refresh token
  if (tokenTypeHint !== 'access_token') {
    const accountIdByRefresh = refreshTokenIndex.get(tokenHash);
    if (accountIdByRefresh) {
      const account = linkedAccountStore.get(accountIdByRefresh);
      if (account) {
        account.is_active = false;
        account.updated_at = new Date().toISOString();
        linkedAccountStore.set(accountIdByRefresh, account);
        accessTokenIndex.delete(account.access_token_hash);
        refreshTokenIndex.delete(account.refresh_token_hash);
        console.log(`[UCP Identity] Revoked linked account ${accountIdByRefresh}`);
      }
    }
  }
}

/**
 * Get linked account by ID
 */
export async function getLinkedAccount(
  accountId: string,
  tenantId: string,
  _supabase?: SupabaseClient
): Promise<UCPLinkedAccount | null> {
  const account = linkedAccountStore.get(accountId);
  if (!account || account.tenant_id !== tenantId) {
    return null;
  }
  return account;
}

/**
 * List linked accounts for a buyer
 */
export async function listLinkedAccountsByBuyer(
  tenantId: string,
  buyerId: string,
  _supabase?: SupabaseClient
): Promise<UCPLinkedAccount[]> {
  return Array.from(linkedAccountStore.values()).filter(
    (a) => a.tenant_id === tenantId && a.buyer_id === buyerId && a.is_active
  );
}

/**
 * List linked accounts for a platform
 */
export async function listLinkedAccountsByPlatform(
  tenantId: string,
  platformId: string,
  options: { limit?: number; offset?: number } = {},
  _supabase?: SupabaseClient
): Promise<{ data: UCPLinkedAccount[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  const accounts = Array.from(linkedAccountStore.values())
    .filter((a) => a.tenant_id === tenantId && a.platform_id === platformId && a.is_active)
    .sort((a, b) => new Date(b.linked_at).getTime() - new Date(a.linked_at).getTime());

  return {
    data: accounts.slice(offset, offset + limit),
    total: accounts.length,
  };
}

/**
 * Unlink an account (buyer-initiated)
 */
export async function unlinkAccount(
  accountId: string,
  tenantId: string,
  buyerId: string,
  _supabase?: SupabaseClient
): Promise<void> {
  const account = linkedAccountStore.get(accountId);

  if (!account || account.tenant_id !== tenantId || account.buyer_id !== buyerId) {
    throw new Error('Linked account not found');
  }

  account.is_active = false;
  account.updated_at = new Date().toISOString();
  linkedAccountStore.set(accountId, account);

  // Remove token indexes
  accessTokenIndex.delete(account.access_token_hash);
  refreshTokenIndex.delete(account.refresh_token_hash);

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
 * Clear all stores (for testing)
 */
export function clearIdentityStores(): void {
  clientStore.clear();
  authCodeStore.clear();
  linkedAccountStore.clear();
  accessTokenIndex.clear();
  refreshTokenIndex.clear();
}

/**
 * Get all scopes
 */
export function getAllScopes(): UCPIdentityScope[] {
  return [...ALL_SCOPES];
}
