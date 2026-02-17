import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { ValidationError } from '../middleware/error.js';

const search = new Hono();

// ============================================
// VALIDATION
// ============================================

const searchQuerySchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters'),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

/**
 * Escape special Postgres LIKE/ILIKE pattern characters
 * so user input is treated as literal text.
 */
function sanitizeLikePattern(input: string): string {
  return input.replace(/%/g, '\\%').replace(/_/g, '\\_');
}

// ============================================
// GET /v1/search - Unified search across entities
// ============================================
search.get('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  // Validate query params
  const parsed = searchQuerySchema.safeParse({
    q: c.req.query('q'),
    limit: c.req.query('limit'),
  });

  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten());
  }

  const { q, limit } = parsed.data;
  const pattern = `%${sanitizeLikePattern(q)}%`;

  // Run all four queries in parallel, each scoped to tenant
  const [accountsResult, agentsResult, transfersResult, streamsResult] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, type, email, verification_status')
      .eq('tenant_id', ctx.tenantId)
      .or(`name.ilike.${pattern},email.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(limit),

    supabase
      .from('agents')
      .select('id, name, status, description')
      .eq('tenant_id', ctx.tenantId)
      .or(`name.ilike.${pattern},description.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(limit),

    supabase
      .from('transfers')
      .select('id, description, amount, currency, status, type')
      .eq('tenant_id', ctx.tenantId)
      .ilike('description', pattern)
      .order('created_at', { ascending: false })
      .limit(limit),

    supabase
      .from('streams')
      .select('id, description, sender_account_name, receiver_account_name, flow_rate_per_month, status')
      .eq('tenant_id', ctx.tenantId)
      .or(`description.ilike.${pattern},sender_account_name.ilike.${pattern},receiver_account_name.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  return c.json({
    accounts: (accountsResult.data || []).map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      email: a.email,
      verificationStatus: a.verification_status,
    })),
    agents: (agentsResult.data || []).map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      description: a.description,
    })),
    transfers: (transfersResult.data || []).map((t) => ({
      id: t.id,
      description: t.description,
      amount: parseFloat(t.amount),
      currency: t.currency,
      status: t.status,
      type: t.type,
    })),
    streams: (streamsResult.data || []).map((s) => ({
      id: s.id,
      description: s.description,
      senderAccountName: s.sender_account_name,
      receiverAccountName: s.receiver_account_name,
      flowRate: parseFloat(s.flow_rate_per_month),
      status: s.status,
    })),
  });
});

export default search;
