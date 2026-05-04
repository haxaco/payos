import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { grant } from '../billing/ledger.js';
import {
  generateScannerKey,
  hashScannerKey,
  getScannerKeyPrefix,
} from '../utils/crypto.js';

// New tenants get this many free credits the first time they create a scanner
// key. Lets a partner self-serve sign-up → first scan with zero ops touch.
// Larger grants (5K+ for design partners) stay manual via grant-credits.ts so
// they're tied to a relationship.
const FREE_TRIAL_CREDITS = 100;

/**
 * Scanner key management from the Sly dashboard. Auth middleware populates
 * ctx with tenantId + userRole; these handlers only operate on the caller's
 * own tenant.
 *
 * Pattern lifts from scripts/issue-partner-key.ts — same DB shape, same
 * defaults, same hashing. The CLI script stays available for ops-driven
 * provisioning (e.g. seeding credits on a design-partner contract).
 */
export const keysRouter = new Hono();

const createSchema = z.object({
  name: z.string().min(1).max(100),
  environment: z.enum(['test', 'live']).default('test'),
  scopes: z
    .array(z.enum(['scan', 'batch', 'read', 'tests', 'mcp']))
    .default(['scan', 'batch', 'read', 'tests']),
  rate_limit_per_min: z.number().int().positive().max(600).default(60),
});

// POST /v1/scanner/keys — create a new scanner key for the caller's tenant.
keysRouter.post('/keys', async (c) => {
  const ctx = c.get('ctx');
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 400);
  }

  // Role gating: live keys are admin/owner only when the caller is a JWT user.
  // API-key callers (ops) can create either.
  if (
    parsed.data.environment === 'live' &&
    ctx.actorType === 'user' &&
    !['owner', 'admin'].includes(ctx.userRole ?? '')
  ) {
    return c.json(
      {
        error: 'forbidden',
        message: 'Only owner/admin roles can create live scanner keys',
      },
      403,
    );
  }

  const plaintext = generateScannerKey(parsed.data.environment);
  const supabase = createClient();
  const { data: row, error } = await (supabase.from('scanner_api_keys') as any)
    .insert({
      tenant_id: ctx.tenantId,
      name: parsed.data.name,
      key_prefix: getScannerKeyPrefix(plaintext),
      key_hash: hashScannerKey(plaintext),
      environment: parsed.data.environment,
      scopes: parsed.data.scopes,
      rate_limit_per_min: parsed.data.rate_limit_per_min,
      created_by: ctx.actorType === 'user' ? ctx.userId ?? null : null,
    })
    .select('id, name, key_prefix, environment, scopes, rate_limit_per_min, created_at')
    .single();

  if (error) {
    return c.json({ error: `Failed to create key: ${error.message}` }, 500);
  }

  // Auto-grant free-trial credits if this tenant has no ledger history yet.
  // First-key creation is the right trigger: tenants that already have credits
  // (manual grant, refunded charge, anything) won't double-dip; brand-new
  // tenants self-serve from sign-up to first scan without ops involvement.
  let autoGrantedCredits = 0;
  try {
    const { count } = await (supabase.from('scanner_credit_ledger') as any)
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', ctx.tenantId);
    if (count === 0) {
      await grant(ctx.tenantId, FREE_TRIAL_CREDITS, 'free_trial:first_key', {
        key_id: row.id,
        key_name: row.name,
        triggered_by: ctx.actorType === 'user' ? ctx.userId : 'api_key',
      });
      autoGrantedCredits = FREE_TRIAL_CREDITS;
      console.log(
        `[scanner-keys] Auto-granted ${FREE_TRIAL_CREDITS} free-trial credits to new tenant ${ctx.tenantId}`,
      );
    }
  } catch (err: any) {
    // Don't fail key creation if the grant fails — surface in logs and let
    // the partner curl /credits/balance to confirm. Worst case ops grants
    // manually after the fact.
    console.error('[scanner-keys] Free-trial grant failed (key still created):', err?.message);
  }

  return c.json(
    {
      ...row,
      key: plaintext, // returned ONCE — UI must surface the "save now" banner
      auto_granted_credits: autoGrantedCredits, // 100 on first key, 0 thereafter
    },
    201,
  );
});

// GET /v1/scanner/keys — list keys for the caller's tenant.
keysRouter.get('/keys', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const { data, error } = await (supabase.from('scanner_api_keys') as any)
    .select(
      'id, name, key_prefix, environment, scopes, rate_limit_per_min, created_at, last_used_at, last_used_ip, revoked_at',
    )
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    return c.json({ error: `Failed to list keys: ${error.message}` }, 500);
  }
  return c.json({ data: data ?? [] });
});

// DELETE /v1/scanner/keys/:id — soft-revoke.
keysRouter.delete('/keys/:id', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');

  const supabase = createClient();
  // Check ownership before revoking to avoid leaking existence.
  const { data: existing } = await (supabase.from('scanner_api_keys') as any)
    .select('id, tenant_id, revoked_at')
    .eq('id', id)
    .maybeSingle();

  if (!existing || existing.tenant_id !== ctx.tenantId) {
    return c.json({ error: 'Key not found' }, 404);
  }
  if (existing.revoked_at) {
    return c.json({ error: 'Key is already revoked' }, 400);
  }

  const { error } = await (supabase.from('scanner_api_keys') as any)
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return c.json({ error: `Failed to revoke key: ${error.message}` }, 500);
  }
  return c.json({ id, revoked: true });
});
