/**
 * UCP identity — OAuth-style identity linking for buyers.
 * Mount: /v1/ucp/identity
 *
 * COVERED (10 endpoints):
 *   GET    /authorize              authorization endpoint (OAuth 2.0)
 *   POST   /token                  exchange auth code / refresh token
 *   POST   /revoke                 revoke token
 *   POST   /authorize/consent      grant consent (user-completed step)
 *   GET    /clients                list OAuth clients
 *   POST   /clients                register OAuth client
 *   PATCH  /clients/{id}/deactivate  deactivate client
 *   GET    /linked-accounts        list accounts the caller has linked
 *   DELETE /linked-accounts/{id}   unlink an account
 *   GET    /scopes                 list available scopes
 */

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { authMiddleware } from '../../middleware/auth.js';

const app = new OpenAPIHono();
app.use('*', authMiddleware);

const OAuthClientSchema = z.object({
  client_id: z.string(),
  name: z.string(),
  redirect_uris: z.array(z.string().url()),
  scopes: z.array(z.string()),
  active: z.boolean(),
  created_at: z.string().datetime(),
}).openapi('OAuthClient');

const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number().int(),
  refresh_token: z.string().optional(),
  scope: z.string(),
}).openapi('OAuthTokenResponse');

const LinkedAccountSchema = z.object({
  id: z.string(),
  account_id: z.string().uuid(),
  client_id: z.string(),
  granted_scopes: z.array(z.string()),
  linked_at: z.string().datetime(),
}).openapi('LinkedAccount');

const ErrorSchema = z.object({
  error: z.string(), code: z.string().optional(), details: z.unknown().optional(),
}).openapi('Error');
const notMigrated = () => ({ error: 'Not yet migrated', code: 'NOT_MIGRATED' });

app.openapi(createRoute({
  method: 'get', path: '/authorize', tags: ['UCP Identity'],
  summary: 'OAuth 2.0 authorization endpoint',
  description: 'Initiates the OAuth authorization code flow. Redirects user to consent screen.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { query: z.object({
    client_id: z.string(),
    redirect_uri: z.string().url(),
    response_type: z.literal('code'),
    scope: z.string(),
    state: z.string().optional(),
  }) },
  responses: {
    302: { description: 'Redirect to consent or back to redirect_uri with code' },
    400: { description: 'Invalid client / redirect_uri / scope', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.redirect('/consent'));

app.openapi(createRoute({
  method: 'post', path: '/token', tags: ['UCP Identity'],
  summary: 'OAuth 2.0 token endpoint',
  description: 'Exchange authorization code for access token, or refresh an existing token.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.discriminatedUnion('grant_type', [
    z.object({ grant_type: z.literal('authorization_code'), code: z.string(), client_id: z.string(), client_secret: z.string(), redirect_uri: z.string().url() }),
    z.object({ grant_type: z.literal('refresh_token'), refresh_token: z.string(), client_id: z.string(), client_secret: z.string() }),
  ]) } }, required: true } },
  responses: {
    200: { description: 'Token', content: { 'application/json': { schema: TokenResponseSchema } } },
    400: { description: 'Invalid grant', content: { 'application/json': { schema: ErrorSchema } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'post', path: '/revoke', tags: ['UCP Identity'], summary: 'Revoke a token',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({
    token: z.string(),
    token_type_hint: z.enum(['access_token', 'refresh_token']).optional(),
  }) } }, required: true } },
  responses: {
    200: { description: 'Revoked', content: { 'application/json': { schema: z.object({ revoked: z.boolean() }) } } },
  },
}), async (c): Promise<any> => c.json({ revoked: true }, 200));

app.openapi(createRoute({
  method: 'post', path: '/authorize/consent', tags: ['UCP Identity'], summary: 'Grant consent',
  description: 'Called from the consent UI after the user approves the requested scopes. Returns the authorization code.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({
    authorization_request_id: z.string(),
    approved_scopes: z.array(z.string()),
    account_id: z.string().uuid(),
  }) } }, required: true } },
  responses: {
    200: { description: 'Consent granted', content: { 'application/json': { schema: z.object({
      code: z.string(), redirect_uri: z.string().url(), state: z.string().optional(),
    }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'get', path: '/clients', tags: ['UCP Identity'], summary: 'List OAuth clients',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Clients', content: { 'application/json': { schema: z.object({ data: z.array(OAuthClientSchema) }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'post', path: '/clients', tags: ['UCP Identity'], summary: 'Register an OAuth client',
  description: 'Register a merchant or third-party app that will link buyer accounts. Returns `client_secret` once.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { body: { content: { 'application/json': { schema: z.object({
    name: z.string().min(1).max(255),
    redirect_uris: z.array(z.string().url()).min(1),
    scopes: z.array(z.string()).min(1),
  }) } }, required: true } },
  responses: {
    201: { description: 'Client created', content: { 'application/json': { schema: z.object({
      data: OAuthClientSchema.extend({ client_secret: z.string().describe('Shown once') }),
    }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 400));

app.openapi(createRoute({
  method: 'patch', path: '/clients/{clientId}/deactivate', tags: ['UCP Identity'], summary: 'Deactivate an OAuth client',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ clientId: z.string() }) },
  responses: {
    200: { description: 'Deactivated', content: { 'application/json': { schema: z.object({ data: OAuthClientSchema }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'get', path: '/linked-accounts', tags: ['UCP Identity'], summary: 'List linked accounts',
  description: 'Accounts the authenticated principal has linked via OAuth. Used to enumerate buyer relationships.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Linked accounts', content: { 'application/json': { schema: z.object({ data: z.array(LinkedAccountSchema) }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

app.openapi(createRoute({
  method: 'delete', path: '/linked-accounts/{id}', tags: ['UCP Identity'], summary: 'Unlink an account',
  description: 'Revokes all tokens associated with the linkage and removes it.',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { description: 'Unlinked', content: { 'application/json': { schema: z.object({ message: z.string() }) } } },
  },
}), async (c): Promise<any> => c.json(notMigrated(), 404));

app.openapi(createRoute({
  method: 'get', path: '/scopes', tags: ['UCP Identity'], summary: 'List available scopes',
  'x-visibility': 'public', security: [{ bearerAuth: [] }],
  responses: {
    200: { description: 'Scopes', content: { 'application/json': { schema: z.object({
      data: z.array(z.object({ scope: z.string(), description: z.string() })),
    }) } } },
  },
}), async (c): Promise<any> => c.json({ data: [] }, 200));

export default app;
