/**
 * Funding API Routes
 * Epic 41, Story 41.3: Funding API Endpoints
 *
 * REST API for managing funding sources and transactions.
 * Supports multiple providers: Stripe, Plaid, Belvo, MoonPay, Transak, Circle.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import {
  createFundingOrchestrator,
  createConversionService,
  createFundingFeeService,
} from '../services/funding/index.js';
import type {
  FundingSourceType,
  FundingProvider,
  FundingSourceStatus,
  FundingTransactionStatus,
} from '../services/funding/types.js';

const app = new Hono();

// ============================================
// Validation Schemas
// ============================================

const createSourceSchema = z.object({
  account_id: z.string().uuid(),
  type: z.enum(['card', 'bank_account_us', 'bank_account_eu', 'bank_account_latam', 'crypto_wallet']),
  provider: z.enum(['stripe', 'plaid', 'belvo', 'moonpay', 'transak', 'circle']),
  setup_token: z.string().optional(),
  public_token: z.string().optional(),
  link_id: z.string().optional(),
  wallet_address: z.string().optional(),
  network: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const verifySourceSchema = z.object({
  amounts: z.array(z.number()).optional(),
  public_token: z.string().optional(),
});

const initiateFundingSchema = z.object({
  source_id: z.string().uuid(),
  amount_cents: z.number().int().positive().max(100_000_000), // Max $1M
  currency: z.string().min(3).max(4),
  idempotency_key: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const estimateFeesSchema = z.object({
  source_id: z.string().uuid(),
  amount_cents: z.number().int().positive(),
  currency: z.string().min(3).max(4),
});

const widgetSessionSchema = z.object({
  provider: z.enum(['plaid', 'belvo', 'moonpay', 'transak']),
  source_type: z.enum(['card', 'bank_account_us', 'bank_account_eu', 'bank_account_latam', 'crypto_wallet']),
  account_id: z.string().uuid(),
  amount_cents: z.number().int().positive().optional(),
  currency: z.string().optional(),
  redirect_url: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const conversionQuoteSchema = z.object({
  from_currency: z.string().min(3).max(4),
  to_currency: z.string().min(3).max(4).default('USDC'),
  amount_cents: z.number().int().positive(),
});

// ============================================
// Funding Sources
// ============================================

/**
 * POST /v1/funding/sources - Add funding source
 */
app.post('/sources', async (c) => {
  const ctx = c.get('ctx') as any;
  const body = await c.req.json();
  const parsed = createSourceSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  try {
    const supabase = createClient();
    const orchestrator = createFundingOrchestrator(supabase);
    const source = await orchestrator.createSource(ctx.tenantId, parsed.data);

    return c.json(mapSourceResponse(source), 201);
  } catch (error: any) {
    return c.json({ error: error.message }, error.message.includes('not found') ? 404 : 400);
  }
});

/**
 * GET /v1/funding/sources - List funding sources
 */
app.get('/sources', async (c) => {
  const ctx = c.get('ctx') as any;
  const accountId = c.req.query('account_id');
  const type = c.req.query('type') as FundingSourceType | undefined;
  const provider = c.req.query('provider') as FundingProvider | undefined;
  const status = c.req.query('status') as FundingSourceStatus | undefined;
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

  try {
    const supabase = createClient();
    const orchestrator = createFundingOrchestrator(supabase);
    const { data, total } = await orchestrator.listSources(ctx.tenantId, {
      account_id: accountId,
      type,
      provider,
      status,
      page,
      limit,
    });

    return c.json({
      data: data.map(mapSourceResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /v1/funding/sources/:id - Get funding source
 */
app.get('/sources/:id', async (c) => {
  const ctx = c.get('ctx') as any;
  const id = c.req.param('id');

  try {
    const supabase = createClient();
    const orchestrator = createFundingOrchestrator(supabase);
    const source = await orchestrator.getSource(ctx.tenantId, id);

    return c.json(mapSourceResponse(source));
  } catch (error: any) {
    return c.json({ error: error.message }, 404);
  }
});

/**
 * POST /v1/funding/sources/:id/verify - Trigger verification
 */
app.post('/sources/:id/verify', async (c) => {
  const ctx = c.get('ctx') as any;
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = verifySourceSchema.safeParse(body);

  try {
    const supabase = createClient();
    const orchestrator = createFundingOrchestrator(supabase);
    const source = await orchestrator.verifySource(ctx.tenantId, {
      source_id: id,
      ...(parsed.success ? parsed.data : {}),
    });

    return c.json(mapSourceResponse(source));
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

/**
 * DELETE /v1/funding/sources/:id - Remove funding source
 */
app.delete('/sources/:id', async (c) => {
  const ctx = c.get('ctx') as any;
  const id = c.req.param('id');

  try {
    const supabase = createClient();
    const orchestrator = createFundingOrchestrator(supabase);
    await orchestrator.removeSource(ctx.tenantId, id);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 404);
  }
});

// ============================================
// Widget Sessions
// ============================================

/**
 * POST /v1/funding/widget-sessions - Create a widget session
 */
app.post('/widget-sessions', async (c) => {
  const ctx = c.get('ctx') as any;
  const body = await c.req.json();
  const parsed = widgetSessionSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  try {
    const supabase = createClient();
    const orchestrator = createFundingOrchestrator(supabase);
    const session = await orchestrator.createWidgetSession(
      ctx.tenantId,
      parsed.data.provider as FundingProvider,
      parsed.data.source_type as FundingSourceType,
      {
        account_id: parsed.data.account_id,
        amount_cents: parsed.data.amount_cents,
        currency: parsed.data.currency,
        redirect_url: parsed.data.redirect_url,
        metadata: parsed.data.metadata,
      }
    );

    return c.json(session, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ============================================
// Funding Transactions
// ============================================

/**
 * POST /v1/funding/transactions - Initiate funding
 */
app.post('/transactions', async (c) => {
  const ctx = c.get('ctx') as any;
  const body = await c.req.json();
  const parsed = initiateFundingSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  try {
    const supabase = createClient();
    const orchestrator = createFundingOrchestrator(supabase);
    const transaction = await orchestrator.initiateFunding(ctx.tenantId, parsed.data);

    return c.json(mapTransactionResponse(transaction), 201);
  } catch (error: any) {
    if (error.message.includes('limit')) {
      return c.json({ error: error.message }, 429);
    }
    if (error.message.includes('not found') || error.message.includes('must be active')) {
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /v1/funding/transactions/:id - Get transaction status
 */
app.get('/transactions/:id', async (c) => {
  const ctx = c.get('ctx') as any;
  const id = c.req.param('id');

  try {
    const supabase = createClient();
    const orchestrator = createFundingOrchestrator(supabase);
    const transaction = await orchestrator.getTransaction(ctx.tenantId, id);

    return c.json(mapTransactionResponse(transaction));
  } catch (error: any) {
    return c.json({ error: error.message }, 404);
  }
});

/**
 * GET /v1/funding/transactions - List transaction history
 */
app.get('/transactions', async (c) => {
  const ctx = c.get('ctx') as any;
  const sourceId = c.req.query('source_id');
  const accountId = c.req.query('account_id');
  const status = c.req.query('status') as FundingTransactionStatus | undefined;
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);

  try {
    const supabase = createClient();
    const orchestrator = createFundingOrchestrator(supabase);
    const { data, total } = await orchestrator.listTransactions(ctx.tenantId, {
      source_id: sourceId,
      account_id: accountId,
      status,
      page,
      limit,
    });

    return c.json({
      data: data.map(mapTransactionResponse),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// Fee Estimation
// ============================================

/**
 * POST /v1/funding/estimate-fees - Estimate fees for a funding
 */
app.post('/estimate-fees', async (c) => {
  const ctx = c.get('ctx') as any;
  const body = await c.req.json();
  const parsed = estimateFeesSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  try {
    const supabase = createClient();
    const orchestrator = createFundingOrchestrator(supabase);
    const estimate = await orchestrator.estimateFees(
      ctx.tenantId,
      parsed.data.source_id,
      parsed.data.amount_cents,
      parsed.data.currency
    );

    return c.json(estimate);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// ============================================
// Conversion Quotes
// ============================================

/**
 * POST /v1/funding/conversion-quote - Get a conversion quote
 */
app.post('/conversion-quote', async (c) => {
  const body = await c.req.json();
  const parsed = conversionQuoteSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  try {
    const supabase = createClient();
    const conversion = createConversionService(supabase);
    const quote = await conversion.getQuote(
      parsed.data.from_currency,
      parsed.data.to_currency,
      parsed.data.amount_cents
    );

    return c.json(quote);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

/**
 * GET /v1/funding/providers - List available providers
 */
app.get('/providers', async (c) => {
  const supabase = createClient();
  const orchestrator = createFundingOrchestrator(supabase);
  return c.json({ data: orchestrator.listProviders() });
});

/**
 * GET /v1/funding/conversion-rates - List conversion rates
 */
app.get('/conversion-rates', async (c) => {
  const supabase = createClient();
  const conversion = createConversionService(supabase);
  return c.json({ data: conversion.getSupportedPairs() });
});

// ============================================
// Response Mappers
// ============================================

function mapSourceResponse(source: any) {
  const metadata = source.provider_metadata || {};
  return {
    id: source.id,
    account_id: source.account_id,
    type: source.type,
    provider: source.provider,
    status: source.status,
    display_name: source.display_name,
    last_four: source.last_four,
    brand: source.brand,
    supported_currencies: source.supported_currencies,
    limits: {
      per_transaction: source.per_transaction_limit_cents,
      daily: source.daily_limit_cents,
      monthly: source.monthly_limit_cents,
    },
    usage: {
      daily_used: source.daily_used_cents,
      monthly_used: source.monthly_used_cents,
      total_funded: source.total_funded_cents,
      funding_count: source.funding_count,
    },
    verified_at: source.verified_at,
    last_used_at: source.last_used_at,
    created_at: source.created_at,
    // Include client_secret/widget_url if present (for frontend setup)
    ...(metadata.client_secret ? { client_secret: metadata.client_secret } : {}),
    ...(metadata.widget_url ? { widget_url: metadata.widget_url } : {}),
    ...(metadata.deposit_address ? { deposit_address: metadata.deposit_address, network: metadata.network } : {}),
    ...(metadata.pix_qr_code ? { pix_qr_code: metadata.pix_qr_code, pix_copy_paste: metadata.pix_copy_paste } : {}),
    ...(metadata.clabe ? { clabe: metadata.clabe, spei_reference: metadata.reference } : {}),
  };
}

function mapTransactionResponse(tx: any) {
  const metadata = tx.provider_metadata || {};
  return {
    id: tx.id,
    source_id: tx.funding_source_id,
    account_id: tx.account_id,
    amount_cents: tx.amount_cents,
    currency: tx.currency,
    converted_amount_cents: tx.converted_amount_cents,
    exchange_rate: tx.exchange_rate,
    conversion_currency: tx.conversion_currency,
    status: tx.status,
    failure_reason: tx.failure_reason,
    provider: tx.provider,
    fees: {
      provider: tx.provider_fee_cents,
      platform: tx.platform_fee_cents,
      conversion: tx.conversion_fee_cents,
      total: tx.total_fee_cents,
    },
    initiated_at: tx.initiated_at,
    processing_at: tx.processing_at,
    completed_at: tx.completed_at,
    created_at: tx.created_at,
    // Include action-required fields if present
    ...(metadata.client_secret ? { client_secret: metadata.client_secret } : {}),
    ...(metadata.redirect_url ? { redirect_url: metadata.redirect_url } : {}),
    ...(metadata.widget_url ? { widget_url: metadata.widget_url } : {}),
    ...(metadata.deposit_address ? { deposit_address: metadata.deposit_address } : {}),
    ...(metadata.pix_qr_code ? { pix_qr_code: metadata.pix_qr_code, pix_copy_paste: metadata.pix_copy_paste } : {}),
    ...(metadata.clabe ? { clabe: metadata.clabe, spei_reference: metadata.reference } : {}),
  };
}

export default app;
