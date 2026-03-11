/**
 * Portal Token CRUD Routes — Epic 65, Story 65.14
 *
 * Allows tenants to create/list/revoke portal tokens for
 * customer-facing usage API access.
 *
 * POST   /v1/portal-tokens       — Create portal token
 * GET    /v1/portal-tokens       — List portal tokens
 * GET    /v1/portal-tokens/:id   — Get portal token details
 * DELETE /v1/portal-tokens/:id   — Revoke portal token
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { generatePortalToken, hashApiKey, getKeyPrefix } from '../utils/crypto.js';
import { getPaginationParams, paginationResponse } from '../utils/helpers.js';

const router = new Hono();

// ============================================
// Validation Schemas
// ============================================

const createPortalTokenSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(['usage:read'])).default(['usage:read']),
  expiresInDays: z.number().int().positive().optional(),
});

// ============================================
// POST / — Create portal token
// ============================================
router.post('/', async (c) => {
  const ctx = c.get('ctx');

  // Only API key or user actors can create portal tokens
  if (ctx.actorType !== 'api_key' && ctx.actorType !== 'user') {
    return c.json({ error: 'Only API key or user auth can create portal tokens' }, 403);
  }

  const body = await c.req.json();
  const parsed = createPortalTokenSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
  }

  const { name, scopes, expiresInDays } = parsed.data;
  const token = generatePortalToken();
  const tokenPrefix = getKeyPrefix(token);
  const tokenHash = hashApiKey(token);

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const supabase = createClient();
  const { data, error } = await (supabase.from('portal_tokens') as any)
    .insert({
      tenant_id: ctx.tenantId,
      name,
      token_prefix: tokenPrefix,
      token_hash: tokenHash,
      scopes,
      expires_at: expiresAt,
      created_by: ctx.userId || ctx.apiKeyId || null,
    })
    .select('id, name, scopes, status, expires_at, created_at')
    .single();

  if (error) {
    console.error('Failed to create portal token:', error);
    return c.json({ error: 'Failed to create portal token' }, 500);
  }

  // Return the raw token only on creation — it cannot be retrieved later
  return c.json({
    data: {
      ...data,
      token, // Only shown once
    },
  }, 201);
});

// ============================================
// GET / — List portal tokens
// ============================================
router.get('/', async (c) => {
  const ctx = c.get('ctx');
  const { page, limit } = getPaginationParams(c);

  const supabase = createClient();

  const { data: tokens, error, count } = await (supabase.from('portal_tokens') as any)
    .select('id, name, token_prefix, scopes, status, expires_at, created_at, last_used_at', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    return c.json({ error: 'Failed to list portal tokens' }, 500);
  }

  return c.json({
    data: tokens || [],
    pagination: paginationResponse(page, limit, count || 0),
  });
});

// ============================================
// GET /:id — Get portal token details
// ============================================
router.get('/:id', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');

  const supabase = createClient();
  const { data: token, error } = await (supabase.from('portal_tokens') as any)
    .select('id, name, token_prefix, scopes, status, expires_at, created_at, last_used_at')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (error || !token) {
    return c.json({ error: 'Portal token not found' }, 404);
  }

  return c.json({ data: token });
});

// ============================================
// DELETE /:id — Revoke portal token
// ============================================
router.delete('/:id', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');

  const supabase = createClient();
  const { data, error } = await (supabase.from('portal_tokens') as any)
    .update({ status: 'revoked' })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .select('id, name, status')
    .single();

  if (error || !data) {
    return c.json({ error: 'Portal token not found' }, 404);
  }

  return c.json({ data, message: 'Portal token revoked' });
});

export default router;
