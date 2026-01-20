/**
 * UCP Identity Routes
 *
 * OAuth 2.0 endpoints for identity linking.
 *
 * Public Endpoints (no auth):
 * - GET    /v1/ucp/identity/authorize  - Start OAuth authorization
 * - POST   /v1/ucp/identity/token      - Exchange code for tokens
 * - POST   /v1/ucp/identity/revoke     - Revoke tokens
 *
 * Authenticated Endpoints:
 * - GET    /v1/ucp/identity/clients           - List OAuth clients
 * - POST   /v1/ucp/identity/clients           - Register OAuth client
 * - GET    /v1/ucp/identity/linked-accounts   - List linked accounts
 * - DELETE /v1/ucp/identity/linked-accounts/:id - Unlink account
 * - POST   /v1/ucp/identity/authorize/consent - Grant consent (internal)
 *
 * @see Phase 4: Identity Linking
 * @see https://ucp.dev/specification/identity/
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { RequestContext } from '../middleware/auth.js';
import {
  registerClient,
  getClient,
  validateRedirectUri,
  createAuthorizationCode,
  exchangeAuthorizationCode,
  refreshTokens,
  revokeToken,
  listLinkedAccountsByBuyer,
  listLinkedAccountsByPlatform,
  unlinkAccount,
  createOAuthError,
  getAllScopes,
  type UCPIdentityScope,
} from '../services/ucp/index.js';

// =============================================================================
// Validation Schemas
// =============================================================================

const AuthorizeQuerySchema = z.object({
  response_type: z.literal('code'),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: z.string().min(1),
  state: z.string().min(1),
  code_challenge: z.string().optional(),
  code_challenge_method: z.enum(['S256', 'plain']).optional(),
});

const TokenRequestSchema = z.object({
  grant_type: z.enum(['authorization_code', 'refresh_token']),
  client_id: z.string().min(1),
  client_secret: z.string().optional(),
  code: z.string().optional(),
  redirect_uri: z.string().url().optional(),
  code_verifier: z.string().optional(),
  refresh_token: z.string().optional(),
});

const RevokeRequestSchema = z.object({
  token: z.string().min(1),
  token_type_hint: z.enum(['access_token', 'refresh_token']).optional(),
  client_id: z.string().min(1),
  client_secret: z.string().optional(),
});

const RegisterClientSchema = z.object({
  name: z.string().min(1).max(100),
  redirect_uris: z.array(z.string().url()).min(1),
  allowed_scopes: z.array(z.string()).optional(),
  client_type: z.enum(['public', 'confidential']).optional(),
  logo_url: z.string().url().optional(),
});

const ConsentSchema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  scope: z.string().min(1),
  state: z.string().min(1),
  code_challenge: z.string().optional(),
  code_challenge_method: z.enum(['S256', 'plain']).optional(),
  buyer_id: z.string().min(1),
  approved: z.boolean(),
});

// =============================================================================
// Router
// =============================================================================

const router = new Hono<{ Variables: { ctx: RequestContext } }>();

// =============================================================================
// Public OAuth Endpoints (no auth required)
// =============================================================================

/**
 * GET /v1/ucp/identity/authorize
 * Start OAuth authorization flow
 *
 * In a real implementation, this would render a consent screen.
 * For the PoC, it returns the authorization parameters for the UI to render.
 */
router.get('/authorize', async (c) => {
  try {
    const query = c.req.query();
    const params = AuthorizeQuerySchema.parse(query);

    // Verify client exists
    const client = await getClient(params.client_id);
    if (!client || !client.is_active) {
      return c.json(createOAuthError('invalid_client', 'Client not found'), 400);
    }

    // Verify redirect URI
    if (!validateRedirectUri(client, params.redirect_uri)) {
      return c.json(createOAuthError('invalid_request', 'Invalid redirect URI'), 400);
    }

    // Parse and validate scopes
    const requestedScopes = params.scope.split(' ').filter(Boolean);
    const validScopes = getAllScopes();
    const invalidScopes = requestedScopes.filter(
      (s) => !validScopes.includes(s as UCPIdentityScope)
    );
    if (invalidScopes.length > 0) {
      return c.json(
        createOAuthError('invalid_scope', `Invalid scopes: ${invalidScopes.join(', ')}`),
        400
      );
    }

    // Check client is allowed these scopes
    const disallowedScopes = requestedScopes.filter(
      (s) => !client.allowed_scopes.includes(s as UCPIdentityScope)
    );
    if (disallowedScopes.length > 0) {
      return c.json(
        createOAuthError('invalid_scope', `Client not allowed scopes: ${disallowedScopes.join(', ')}`),
        400
      );
    }

    // Return authorization info for consent screen
    return c.json({
      client: {
        id: client.client_id,
        name: client.name,
        logo_url: client.logo_url,
      },
      requested_scopes: requestedScopes,
      redirect_uri: params.redirect_uri,
      state: params.state,
      code_challenge: params.code_challenge,
      code_challenge_method: params.code_challenge_method,
    });
  } catch (error: any) {
    if (error.errors) {
      return c.json(createOAuthError('invalid_request', 'Invalid parameters'), 400);
    }
    console.error('[UCP Identity] Authorize error:', error);
    return c.json(createOAuthError('server_error', 'Internal server error'), 500);
  }
});

/**
 * POST /v1/ucp/identity/token
 * Exchange authorization code for tokens OR refresh tokens
 */
router.post('/token', async (c) => {
  try {
    const body = await c.req.json();
    const params = TokenRequestSchema.parse(body);

    if (params.grant_type === 'authorization_code') {
      // Validate required params for authorization_code
      if (!params.code || !params.redirect_uri) {
        return c.json(
          createOAuthError('invalid_request', 'Missing code or redirect_uri'),
          400
        );
      }

      const tokens = await exchangeAuthorizationCode(params.code, {
        client_id: params.client_id,
        client_secret: params.client_secret,
        redirect_uri: params.redirect_uri,
        code_verifier: params.code_verifier,
      });

      return c.json(tokens);
    }

    if (params.grant_type === 'refresh_token') {
      if (!params.refresh_token) {
        return c.json(createOAuthError('invalid_request', 'Missing refresh_token'), 400);
      }

      const tokens = await refreshTokens(
        params.refresh_token,
        params.client_id,
        params.client_secret
      );

      return c.json(tokens);
    }

    return c.json(createOAuthError('unsupported_grant_type', 'Unsupported grant type'), 400);
  } catch (error: any) {
    if (error.error && error.error_description) {
      // OAuth error
      return c.json(error, 400);
    }
    if (error.errors) {
      return c.json(createOAuthError('invalid_request', 'Invalid parameters'), 400);
    }
    console.error('[UCP Identity] Token error:', error);
    return c.json(createOAuthError('server_error', 'Internal server error'), 500);
  }
});

/**
 * POST /v1/ucp/identity/revoke
 * Revoke an access or refresh token
 */
router.post('/revoke', async (c) => {
  try {
    const body = await c.req.json();
    const params = RevokeRequestSchema.parse(body);

    await revokeToken(params.token, params.token_type_hint);

    // RFC 7009: Always return 200, even if token wasn't found
    return c.json({ success: true });
  } catch (error: any) {
    if (error.errors) {
      return c.json(createOAuthError('invalid_request', 'Invalid parameters'), 400);
    }
    console.error('[UCP Identity] Revoke error:', error);
    // RFC 7009: Return 200 even on error
    return c.json({ success: true });
  }
});

// =============================================================================
// Authenticated Endpoints
// =============================================================================

/**
 * POST /v1/ucp/identity/authorize/consent
 * Grant or deny consent (called after user authenticates)
 *
 * This is an internal endpoint called by the consent UI after
 * the user has logged in and made their decision.
 */
router.post('/authorize/consent', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const params = ConsentSchema.parse(body);

    // Verify client
    const client = await getClient(params.client_id);
    if (!client || !client.is_active) {
      return c.json(createOAuthError('invalid_client', 'Client not found'), 400);
    }

    // If user denied, redirect with error
    if (!params.approved) {
      const redirectUrl = new URL(params.redirect_uri);
      redirectUrl.searchParams.set('error', 'access_denied');
      redirectUrl.searchParams.set('error_description', 'User denied the request');
      redirectUrl.searchParams.set('state', params.state);
      return c.json({ redirect_uri: redirectUrl.toString() });
    }

    // Parse scopes
    const scopes = params.scope.split(' ').filter(Boolean) as UCPIdentityScope[];

    // Create authorization code
    const authCode = await createAuthorizationCode(ctx.tenantId, {
      client_id: params.client_id,
      buyer_id: params.buyer_id,
      redirect_uri: params.redirect_uri,
      scopes,
      state: params.state,
      code_challenge: params.code_challenge,
      code_challenge_method: params.code_challenge_method,
    });

    // Build redirect URL with code
    const redirectUrl = new URL(params.redirect_uri);
    redirectUrl.searchParams.set('code', authCode.code);
    redirectUrl.searchParams.set('state', params.state);

    return c.json({ redirect_uri: redirectUrl.toString() });
  } catch (error: any) {
    if (error.errors) {
      return c.json(createOAuthError('invalid_request', 'Invalid parameters'), 400);
    }
    console.error('[UCP Identity] Consent error:', error);
    return c.json(createOAuthError('server_error', 'Internal server error'), 500);
  }
});

/**
 * GET /v1/ucp/identity/clients
 * List OAuth clients for the tenant
 */
router.get('/clients', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  // TODO: Implement client listing by tenant
  return c.json({ data: [], message: 'Client listing not yet implemented' });
});

/**
 * POST /v1/ucp/identity/clients
 * Register a new OAuth client
 */
router.post('/clients', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  try {
    const body = await c.req.json();
    const params = RegisterClientSchema.parse(body);

    const { client, client_secret } = await registerClient(ctx.tenantId, {
      name: params.name,
      redirect_uris: params.redirect_uris,
      allowed_scopes: params.allowed_scopes as UCPIdentityScope[],
      client_type: params.client_type,
      logo_url: params.logo_url,
    });

    return c.json({
      client: {
        id: client.id,
        client_id: client.client_id,
        name: client.name,
        redirect_uris: client.redirect_uris,
        allowed_scopes: client.allowed_scopes,
        client_type: client.client_type,
        created_at: client.created_at,
      },
      // Only returned once at registration
      client_secret,
    }, 201);
  } catch (error: any) {
    if (error.errors) {
      return c.json({ error: 'Invalid request body', details: error.errors }, 400);
    }
    console.error('[UCP Identity] Register client error:', error);
    return c.json({ error: 'Failed to register client' }, 500);
  }
});

/**
 * GET /v1/ucp/identity/linked-accounts
 * List linked accounts
 *
 * Query params:
 * - buyer_id: Filter by buyer (for buyer's account management)
 * - platform_id: Filter by platform (for platform's user management)
 */
router.get('/linked-accounts', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const buyerId = c.req.query('buyer_id');
  const platformId = c.req.query('platform_id');
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  try {
    if (buyerId) {
      const accounts = await listLinkedAccountsByBuyer(ctx.tenantId, buyerId);
      return c.json({
        data: accounts.map((a) => ({
          id: a.id,
          platform_id: a.platform_id,
          platform_name: a.platform_name,
          scopes: a.scopes,
          linked_at: a.linked_at,
          last_used_at: a.last_used_at,
        })),
      });
    }

    if (platformId) {
      const { data, total } = await listLinkedAccountsByPlatform(
        ctx.tenantId,
        platformId,
        { limit, offset }
      );
      return c.json({
        data: data.map((a) => ({
          id: a.id,
          buyer_id: a.buyer_id,
          buyer_email: a.buyer_email,
          scopes: a.scopes,
          linked_at: a.linked_at,
          last_used_at: a.last_used_at,
        })),
        pagination: { limit, offset, total },
      });
    }

    return c.json({ error: 'Must specify buyer_id or platform_id' }, 400);
  } catch (error: any) {
    console.error('[UCP Identity] List linked accounts error:', error);
    return c.json({ error: 'Failed to list linked accounts' }, 500);
  }
});

/**
 * DELETE /v1/ucp/identity/linked-accounts/:id
 * Unlink an account
 */
router.delete('/linked-accounts/:id', async (c) => {
  const ctx = c.get('ctx');
  if (!ctx) {
    return c.json({ error: 'Authentication required' }, 401);
  }

  const accountId = c.req.param('id');
  const buyerId = c.req.query('buyer_id');

  if (!buyerId) {
    return c.json({ error: 'buyer_id query parameter required' }, 400);
  }

  try {
    await unlinkAccount(accountId, ctx.tenantId, buyerId);
    return c.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Linked account not found') {
      return c.json({ error: 'Linked account not found' }, 404);
    }
    console.error('[UCP Identity] Unlink account error:', error);
    return c.json({ error: 'Failed to unlink account' }, 500);
  }
});

/**
 * GET /v1/ucp/identity/scopes
 * Get list of available scopes
 */
router.get('/scopes', async (c) => {
  const scopes = getAllScopes();
  return c.json({
    data: scopes.map((scope) => ({
      name: scope,
      description: getScopeDescription(scope),
    })),
  });
});

// =============================================================================
// Helpers
// =============================================================================

function getScopeDescription(scope: UCPIdentityScope): string {
  const descriptions: Record<UCPIdentityScope, string> = {
    'profile.read': 'Read your profile information',
    'profile.write': 'Update your profile information',
    'addresses.read': 'Read your saved addresses',
    'addresses.write': 'Add and update your addresses',
    'payment_methods.read': 'Read your saved payment methods',
    'payment_methods.write': 'Add and update your payment methods',
    'orders.read': 'Read your order history',
    'checkout.create': 'Create checkouts on your behalf',
    'checkout.complete': 'Complete purchases on your behalf',
  };
  return descriptions[scope] || scope;
}

export default router;
