/**
 * Merchant-facing tenant API.
 *
 * Merchants are accounts with `subtype='merchant'` (or legacy
 * `metadata.pos_provider` set). This router exposes:
 *
 *   GET /v1/accounts/:id/merchant-stats — per-merchant analytics
 *                                          (volume, top buyers, recent sales,
 *                                          x402 endpoints). Mounted at
 *                                          /v1/accounts prefix in app.ts.
 *
 *   GET /v1/merchants                   — alias for /v1/ucp/merchants to
 *   GET /v1/merchants/:id                 give the cleaner namespace. The
 *                                          UCP paths still work unchanged.
 *
 * Auth: tenant-key or agent-key (via authMiddleware — mounted at /v1/ prefix).
 */

import { Hono } from 'hono';
import { createClient } from '../db/client.js';
import { computeMerchantStats } from '../services/merchant-stats.js';
import type { RequestContext } from '../middleware/auth.js';

// Routes attached under /v1/accounts (for the :id/merchant-stats path).
export const merchantStatsOnAccountsRouter = new Hono<{ Variables: { ctx: RequestContext } }>();

merchantStatsOnAccountsRouter.get('/:id/merchant-stats', async (c) => {
  const ctx = c.get('ctx');
  const accountId = c.req.param('id');
  const minutes = Math.max(1, Math.min(43200, parseInt(c.req.query('minutes') || '1440', 10))); // default 24h, max 30d
  const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();

  const supabase = createClient();
  const stats = await computeMerchantStats(supabase, {
    accountId,
    cutoff,
    tenantId: ctx.tenantId, // enforce tenant isolation — caller can only read their own accounts
  });

  if (!stats.merchant) {
    return c.json({ error: 'Account not found' }, 404);
  }
  if (!stats.isMerchant) {
    // Client decides how to render — this is intentional 404 so the UI can
    // hide the merchant sections without ambiguity vs. genuine "no account".
    return c.json({ error: 'Account is not a merchant' }, 404);
  }

  return c.json({
    data: {
      ...stats,
      windowMinutes: minutes,
    },
  });
});

// Routes attached under /v1/merchants (alias for /v1/ucp/merchants).
export const merchantsAliasRouter = new Hono<{ Variables: { ctx: RequestContext } }>();

merchantsAliasRouter.get('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  const type = c.req.query('type');
  const country = c.req.query('country');
  const search = c.req.query('search');
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);
  const page = Math.max(parseInt(c.req.query('page') || '1', 10), 1);
  const offset = (page - 1) * limit;

  let query = (supabase.from('accounts') as any)
    .select('id, name, currency, subtype, metadata', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .eq('subtype', 'merchant');

  if (type) query = query.eq('metadata->>merchant_type', type);
  if (country) query = query.eq('metadata->>country', country);
  if (search) query = query.ilike('name', `%${search}%`);

  query = query.order('name').range(offset, offset + limit - 1);

  const { data: accounts, count } = await query;
  const merchants = (accounts || []).map((a: any) => {
    const rawCatalog = a.metadata?.catalog;
    const products: any[] = Array.isArray(rawCatalog)
      ? rawCatalog
      : Array.isArray(rawCatalog?.products) ? rawCatalog.products : [];
    return {
      id: a.id,
      name: a.name,
      subtype: a.subtype,
      merchant_id: a.metadata?.invu_merchant_id,
      type: a.metadata?.merchant_type,
      country: a.metadata?.country,
      city: a.metadata?.city,
      currency: a.currency,
      description: a.metadata?.description,
      pos_provider: a.metadata?.pos_provider,
      rating: typeof a.metadata?.rating === 'number' ? a.metadata.rating : undefined,
      product_count: products.length,
    };
  });

  return c.json({
    data: merchants,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
});

merchantsAliasRouter.get('/:id', async (c) => {
  const ctx = c.get('ctx');
  const accountId = c.req.param('id');
  const supabase = createClient();

  const { data: account } = await (supabase.from('accounts') as any)
    .select('id, name, currency, subtype, metadata')
    .eq('id', accountId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();

  if (!account) return c.json({ error: 'Merchant not found' }, 404);

  const rawCatalog = account.metadata?.catalog;
  const products: any[] = Array.isArray(rawCatalog)
    ? rawCatalog
    : Array.isArray(rawCatalog?.products) ? rawCatalog.products : [];

  return c.json({
    data: {
      id: account.id,
      name: account.name,
      subtype: account.subtype,
      merchant_id: account.metadata?.invu_merchant_id,
      type: account.metadata?.merchant_type,
      country: account.metadata?.country,
      city: account.metadata?.city,
      currency: account.currency,
      description: account.metadata?.description,
      pos_provider: account.metadata?.pos_provider,
      rating: typeof account.metadata?.rating === 'number' ? account.metadata.rating : undefined,
      catalog: {
        total_products: products.length,
        products,
      },
    },
  });
});
