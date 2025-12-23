/**
 * x402 Endpoints API Routes
 * 
 * Enables API providers to register endpoints that accept x402 payments.
 * Spec: https://www.x402.org/x402-whitepaper.pdf
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono();

// Apply auth middleware to all routes
app.use('*', authMiddleware);

// ============================================
// Validation Schemas
// ============================================

const createEndpointSchema = z.object({
  name: z.string().min(1).max(255),
  path: z.string().min(1).max(500).regex(/^\//, 'Path must start with /'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY']),
  description: z.string().max(1000).optional(),
  accountId: z.string().uuid(),
  basePrice: z.number().positive().min(0.0001).max(999999),
  currency: z.enum(['USDC', 'EURC']).default('USDC'),
  volumeDiscounts: z.array(z.object({
    threshold: z.number().int().positive(),
    priceMultiplier: z.number().positive().max(1)
  })).optional(),
  webhookUrl: z.string().url().optional(),
  network: z.string().default('base-mainnet')
});

const updateEndpointSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  basePrice: z.number().positive().min(0.0001).max(999999).optional(),
  volumeDiscounts: z.array(z.object({
    threshold: z.number().int().positive(),
    priceMultiplier: z.number().positive().max(1)
  })).optional(),
  status: z.enum(['active', 'paused', 'disabled']).optional(),
  webhookUrl: z.string().url().optional()
});

// ============================================
// Helper Functions
// ============================================

function mapEndpointFromDb(row: any) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    accountId: row.account_id,
    name: row.name,
    path: row.path,
    method: row.method,
    description: row.description,
    basePrice: parseFloat(row.base_price),
    currency: row.currency,
    volumeDiscounts: row.volume_discounts || [],
    paymentAddress: row.payment_address,
    assetAddress: row.asset_address,
    network: row.network,
    totalCalls: row.total_calls,
    totalRevenue: parseFloat(row.total_revenue),
    status: row.status,
    webhookUrl: row.webhook_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ============================================
// Routes
// ============================================

/**
 * POST /v1/x402/endpoints
 * Register a new x402 endpoint
 */
app.post('/', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();
    
    // Validate request
    const validated = createEndpointSchema.parse(body);
    
    const supabase = createClient();
    
    // Verify account belongs to tenant
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', validated.accountId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (accountError || !account) {
      return c.json({ 
        error: 'Account not found or does not belong to your tenant' 
      }, 404);
    }
    
    // Check for duplicate path+method combination
    const { data: existing } = await supabase
      .from('x402_endpoints')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .eq('path', validated.path)
      .eq('method', validated.method)
      .single();
    
    if (existing) {
      return c.json({
        error: 'Endpoint with this path and method already exists',
        details: {
          path: validated.path,
          method: validated.method
        }
      }, 409);
    }
    
    // Generate internal payment address (Phase 1: internal, Phase 2: real wallet)
    const paymentAddress = `internal://payos/${ctx.tenantId}/${account.id}`;
    
    // Create endpoint
    const { data: endpoint, error: createError } = await supabase
      .from('x402_endpoints')
      .insert({
        tenant_id: ctx.tenantId,
        account_id: validated.accountId,
        name: validated.name,
        path: validated.path,
        method: validated.method,
        description: validated.description,
        base_price: validated.basePrice,
        currency: validated.currency,
        volume_discounts: validated.volumeDiscounts || null,
        payment_address: paymentAddress,
        network: validated.network,
        webhook_url: validated.webhookUrl,
        status: 'active'
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating x402 endpoint:', createError);
      return c.json({ 
        error: 'Failed to create endpoint',
        details: createError.message 
      }, 500);
    }
    
    return c.json({
      data: mapEndpointFromDb(endpoint)
    }, 201);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, 400);
    }
    console.error('Error in POST /v1/x402/endpoints:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /v1/x402/endpoints
 * List all x402 endpoints for the tenant
 */
app.get('/', async (c) => {
  try {
    const ctx = c.get('ctx');
    const supabase = createClient();
    
    // Parse query params
    const status = c.req.query('status');
    const accountId = c.req.query('account_id');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = (page - 1) * limit;
    
    // Build query
    let query = supabase
      .from('x402_endpoints')
      .select('*', { count: 'exact' })
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (accountId) {
      query = query.eq('account_id', accountId);
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data: endpoints, error, count } = await query;
    
    if (error) {
      console.error('Error fetching x402 endpoints:', error);
      return c.json({ error: 'Failed to fetch endpoints' }, 500);
    }
    
    return c.json({
      data: endpoints?.map(mapEndpointFromDb) || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error) {
    console.error('Error in GET /v1/x402/endpoints:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /v1/x402/endpoints/:id
 * Get a specific x402 endpoint with stats
 */
app.get('/:id', async (c) => {
  try {
    const ctx = c.get('ctx');
    const id = c.req.param('id');
    const supabase = createClient();
    
    console.log('DEBUG: Fetching endpoint', { endpointId: id, tenantId: ctx.tenantId });
    
    // Fetch endpoint
    const { data: endpoint, error } = await supabase
      .from('x402_endpoints')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (error) {
      console.error('DEBUG: Error fetching endpoint:', error);
      return c.json({ error: 'Endpoint not found', details: error.message }, 404);
    }
    
    if (!endpoint) {
      console.log('DEBUG: Endpoint not found for tenant', { endpointId: id, tenantId: ctx.tenantId });
      
      // Check if endpoint exists with different tenant (for debugging)
      const { data: anyEndpoint } = await supabase
        .from('x402_endpoints')
        .select('id, tenant_id')
        .eq('id', id)
        .single();
      
      if (anyEndpoint) {
        console.log('DEBUG: Endpoint exists but belongs to different tenant', { 
          endpointId: id, 
          expectedTenantId: ctx.tenantId,
          actualTenantId: anyEndpoint.tenant_id 
        });
      }
      
      return c.json({ error: 'Endpoint not found' }, 404);
    }
    
    // Fetch recent transactions (from transfers table where type='x402')
    const { data: recentTxs } = await supabase
      .from('transfers')
      .select('id, from_account_id, amount, currency, status, created_at, x402_metadata')
      .eq('tenant_id', ctx.tenantId)
      .eq('type', 'x402')
      .contains('x402_metadata', { endpoint_id: id })
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Format response
    const response = {
      ...mapEndpointFromDb(endpoint),
      recentTransactions: recentTxs?.map(tx => ({
        id: tx.id,
        fromAccountId: tx.from_account_id,
        amount: parseFloat(tx.amount),
        currency: tx.currency,
        status: tx.status,
        requestId: tx.x402_metadata?.request_id,
        createdAt: tx.created_at
      })) || []
    };
    
    return c.json({ data: response });
    
  } catch (error) {
    console.error('Error in GET /v1/x402/endpoints/:id:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * PATCH /v1/x402/endpoints/:id
 * Update an x402 endpoint
 */
app.patch('/:id', async (c) => {
  try {
    const ctx = c.get('ctx');
    const id = c.req.param('id');
    const body = await c.req.json();
    
    // Validate request
    const validated = updateEndpointSchema.parse(body);
    
    const supabase = createClient();
    
    // Check endpoint exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('x402_endpoints')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (fetchError || !existing) {
      return c.json({ error: 'Endpoint not found' }, 404);
    }
    
    // Update endpoint
    const { data: updated, error: updateError } = await supabase
      .from('x402_endpoints')
      .update({
        ...(validated.name && { name: validated.name }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.basePrice && { base_price: validated.basePrice }),
        ...(validated.volumeDiscounts !== undefined && { volume_discounts: validated.volumeDiscounts }),
        ...(validated.status && { status: validated.status }),
        ...(validated.webhookUrl !== undefined && { webhook_url: validated.webhookUrl }),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating x402 endpoint:', updateError);
      return c.json({ error: 'Failed to update endpoint' }, 500);
    }
    
    return c.json({
      data: mapEndpointFromDb(updated)
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, 400);
    }
    console.error('Error in PATCH /v1/x402/endpoints/:id:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * DELETE /v1/x402/endpoints/:id
 * Delete an x402 endpoint
 */
app.delete('/:id', async (c) => {
  try {
    const ctx = c.get('ctx');
    const id = c.req.param('id');
    const supabase = createClient();
    
    // Check endpoint exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('x402_endpoints')
      .select('id, total_calls')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (fetchError || !existing) {
      return c.json({ error: 'Endpoint not found' }, 404);
    }
    
    // Warn if endpoint has transactions
    if (existing.total_calls > 0) {
      // Check if force delete is requested
      const force = c.req.query('force') === 'true';
      
      if (!force) {
        return c.json({
          error: 'Endpoint has transaction history',
          message: 'This endpoint has received payments. Add ?force=true to delete anyway.',
          totalCalls: existing.total_calls
        }, 409);
      }
    }
    
    // Delete endpoint
    const { error: deleteError } = await supabase
      .from('x402_endpoints')
      .delete()
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId);
    
    if (deleteError) {
      console.error('Error deleting x402 endpoint:', deleteError);
      return c.json({ error: 'Failed to delete endpoint' }, 500);
    }
    
    return c.json({ 
      message: 'Endpoint deleted successfully' 
    }, 200);
    
  } catch (error) {
    console.error('Error in DELETE /v1/x402/endpoints/:id:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;

