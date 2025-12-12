import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { 
  mapTransferFromDb,
  logAudit,
  isValidUUID,
  getPaginationParams,
  paginationResponse,
} from '../utils/helpers.js';
import { createBalanceService } from '../services/balances.js';
import { ValidationError, NotFoundError } from '../middleware/error.js';

const transfers = new Hono();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createTransferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.number().positive(),
  destinationCurrency: z.string().optional(),
  quoteId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
});

// ============================================
// GET /v1/transfers - List transfers
// ============================================
transfers.get('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // Parse query params
  const query = c.req.query();
  const { page, limit } = getPaginationParams(query);
  const status = query.status;
  const type = query.type;
  const fromDate = query.fromDate;
  const toDate = query.toDate;
  
  // Build query
  let dbQuery = supabase
    .from('transfers')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  
  if (status) {
    dbQuery = dbQuery.eq('status', status);
  }
  if (type) {
    dbQuery = dbQuery.eq('type', type);
  }
  if (fromDate) {
    dbQuery = dbQuery.gte('created_at', fromDate);
  }
  if (toDate) {
    dbQuery = dbQuery.lte('created_at', toDate);
  }
  
  const { data, count, error } = await dbQuery;
  
  if (error) {
    console.error('Error fetching transfers:', error);
    return c.json({ error: 'Failed to fetch transfers' }, 500);
  }
  
  const transfers = (data || []).map(row => mapTransferFromDb(row));
  
  return c.json(paginationResponse(transfers, count || 0, { page, limit }));
});

// ============================================
// POST /v1/transfers - Create transfer
// ============================================
transfers.post('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  
  // Check for idempotency key
  const idempotencyKey = c.req.header('X-Idempotency-Key');
  
  if (idempotencyKey) {
    // Check for existing transfer with this key
    const { data: existing } = await supabase
      .from('transfers')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .eq('idempotency_key', idempotencyKey)
      .single();
    
    if (existing) {
      // Return existing transfer
      return c.json({ data: mapTransferFromDb(existing) });
    }
  }
  
  // Parse and validate body
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
  
  const parsed = createTransferSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten());
  }
  
  const { fromAccountId, toAccountId, amount, destinationCurrency, quoteId, description } = parsed.data;
  
  // Validate accounts exist and belong to tenant
  const { data: fromAccount, error: fromError } = await supabase
    .from('accounts')
    .select('id, name, balance_available, verification_status')
    .eq('id', fromAccountId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (fromError || !fromAccount) {
    throw new NotFoundError('Source account', fromAccountId);
  }
  
  const { data: toAccount, error: toError } = await supabase
    .from('accounts')
    .select('id, name, verification_status')
    .eq('id', toAccountId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (toError || !toAccount) {
    throw new NotFoundError('Destination account', toAccountId);
  }
  
  // Check sender has sufficient balance
  const availableBalance = parseFloat(fromAccount.balance_available) || 0;
  if (availableBalance < amount) {
    throw new ValidationError('Insufficient balance', {
      available: availableBalance,
      required: amount,
    });
  }
  
  // Determine transfer type
  const isInternal = !destinationCurrency || destinationCurrency === 'USDC' || destinationCurrency === 'USD';
  const transferType = isInternal ? 'internal' : 'cross_border';
  
  // Get quote details if provided
  let fxRate = 1;
  let destinationAmount = amount;
  let feeAmount = 0;
  
  if (quoteId) {
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (quoteError || !quote) {
      throw new ValidationError('Invalid quote ID');
    }
    
    // Check quote is not expired
    if (new Date(quote.expires_at) < new Date()) {
      throw new ValidationError('Quote has expired');
    }
    
    // Check quote is not already used
    if (quote.used_at) {
      throw new ValidationError('Quote has already been used');
    }
    
    fxRate = parseFloat(quote.fx_rate);
    destinationAmount = parseFloat(quote.to_amount);
    feeAmount = parseFloat(quote.fee_amount);
  } else if (!isInternal) {
    // For cross-border without quote, calculate on the fly (not recommended)
    const { getExchangeRate } = await import('@payos/utils');
    fxRate = getExchangeRate('USD', destinationCurrency!);
    feeAmount = amount * 0.007; // 0.7% fee
    destinationAmount = (amount - feeAmount) * fxRate;
  }
  
  // Create transfer
  const { data: transfer, error: createError } = await supabase
    .from('transfers')
    .insert({
      tenant_id: ctx.tenantId,
      type: transferType,
      status: isInternal ? 'completed' : 'processing', // Internal transfers complete instantly
      from_account_id: fromAccountId,
      from_account_name: fromAccount.name,
      to_account_id: toAccountId,
      to_account_name: toAccount.name,
      initiated_by_type: ctx.actorType,
      initiated_by_id: ctx.actorId,
      initiated_by_name: ctx.actorName,
      amount,
      currency: 'USDC',
      destination_amount: destinationAmount,
      destination_currency: destinationCurrency || 'USDC',
      fx_rate: fxRate,
      fee_amount: feeAmount,
      description,
      idempotency_key: idempotencyKey,
      processing_at: isInternal ? null : new Date().toISOString(),
      completed_at: isInternal ? new Date().toISOString() : null,
    })
    .select()
    .single();
  
  if (createError) {
    console.error('Error creating transfer:', createError);
    return c.json({ error: 'Failed to create transfer' }, 500);
  }
  
  // For internal transfers, execute immediately
  if (isInternal) {
    const balanceService = createBalanceService(supabase);
    
    try {
      await balanceService.transfer(
        fromAccountId,
        toAccountId,
        amount,
        'transfer',
        transfer.id,
        description || 'Internal transfer'
      );
    } catch (error: any) {
      // Rollback transfer status on failure
      await supabase
        .from('transfers')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_reason: error.message,
        })
        .eq('id', transfer.id);
      
      throw error;
    }
  }
  
  // Mark quote as used
  if (quoteId) {
    await supabase
      .from('quotes')
      .update({
        used_at: new Date().toISOString(),
        transfer_id: transfer.id,
      })
      .eq('id', quoteId);
  }
  
  // Audit log
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    entityType: 'transfer',
    entityId: transfer.id,
    action: 'created',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
    metadata: {
      type: transferType,
      amount,
      from: fromAccount.name,
      to: toAccount.name,
    },
  });
  
  return c.json({ data: mapTransferFromDb(transfer) }, 201);
});

// ============================================
// GET /v1/transfers/:id - Get single transfer
// ============================================
transfers.get('/:id', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid transfer ID format');
  }
  
  const { data, error } = await supabase
    .from('transfers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (error || !data) {
    throw new NotFoundError('Transfer', id);
  }
  
  return c.json({ data: mapTransferFromDb(data) });
});

// ============================================
// POST /v1/transfers/:id/cancel - Cancel pending transfer
// ============================================
transfers.post('/:id/cancel', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient();
  
  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid transfer ID format');
  }
  
  const { data: transfer, error: fetchError } = await supabase
    .from('transfers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (fetchError || !transfer) {
    throw new NotFoundError('Transfer', id);
  }
  
  // Can only cancel pending transfers
  if (transfer.status !== 'pending') {
    throw new ValidationError(`Cannot cancel transfer with status: ${transfer.status}`);
  }
  
  // Update status
  const { data, error } = await supabase
    .from('transfers')
    .update({
      status: 'cancelled',
      failed_at: new Date().toISOString(),
      failure_reason: 'Cancelled by user',
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error cancelling transfer:', error);
    return c.json({ error: 'Failed to cancel transfer' }, 500);
  }
  
  // Audit log
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    entityType: 'transfer',
    entityId: id,
    action: 'cancelled',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
  });
  
  return c.json({ data: mapTransferFromDb(data) });
});

export default transfers;
