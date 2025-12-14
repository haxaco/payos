import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { 
  logAudit,
  isValidUUID,
  getPaginationParams,
  paginationResponse,
} from '../utils/helpers.js';
import { ValidationError, NotFoundError } from '../middleware/error.js';

const paymentMethods = new Hono();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createPaymentMethodSchema = z.object({
  type: z.enum(['bank_account', 'wallet', 'card']),
  label: z.string().max(100).optional(),
  isDefault: z.boolean().optional().default(false),
  // Bank account fields
  bankCountry: z.string().optional(),
  bankCurrency: z.string().optional(),
  bankAccountLastFour: z.string().length(4).optional(),
  bankRoutingLastFour: z.string().length(4).optional(),
  bankName: z.string().optional(),
  bankAccountHolder: z.string().optional(),
  // Wallet fields
  walletNetwork: z.enum(['base', 'polygon', 'ethereum']).optional(),
  walletAddress: z.string().optional(),
  // Card fields
  cardId: z.string().optional(),
  cardLastFour: z.string().length(4).optional(),
  metadata: z.record(z.any()).optional(),
});

const updatePaymentMethodSchema = z.object({
  label: z.string().max(100).optional(),
  isDefault: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

// ============================================
// GET /v1/accounts/:accountId/payment-methods - List payment methods
// ============================================
paymentMethods.get('/accounts/:accountId/payment-methods', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const accountId = c.req.param('accountId');
  
  if (!isValidUUID(accountId)) {
    throw new ValidationError('Invalid account ID format');
  }
  
  // Verify account belongs to tenant
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (accountError || !account) {
    throw new NotFoundError('Account', accountId);
  }
  
  const { data: methods, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('account_id', accountId)
    .eq('tenant_id', ctx.tenantId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching payment methods:', error);
    return c.json({ error: 'Failed to fetch payment methods' }, 500);
  }
  
  return c.json({ data: methods || [] });
});

// ============================================
// POST /v1/accounts/:accountId/payment-methods - Create payment method
// ============================================
paymentMethods.post('/accounts/:accountId/payment-methods', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const accountId = c.req.param('accountId');
  
  if (!isValidUUID(accountId)) {
    throw new ValidationError('Invalid account ID format');
  }
  
  // Verify account belongs to tenant
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('id', accountId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (accountError || !account) {
    throw new NotFoundError('Account', accountId);
  }
  
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
  
  const parsed = createPaymentMethodSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten());
  }
  
  const {
    type,
    label,
    isDefault,
    bankCountry,
    bankCurrency,
    bankAccountLastFour,
    bankRoutingLastFour,
    bankName,
    bankAccountHolder,
    walletNetwork,
    walletAddress,
    cardId,
    cardLastFour,
    metadata,
  } = parsed.data;
  
  // Validate type-specific fields
  if (type === 'bank_account') {
    if (!bankAccountLastFour || !bankName) {
      throw new ValidationError('Bank account requires bankAccountLastFour and bankName');
    }
  } else if (type === 'wallet') {
    if (!walletNetwork || !walletAddress) {
      throw new ValidationError('Wallet requires walletNetwork and walletAddress');
    }
  } else if (type === 'card') {
    if (!cardLastFour) {
      throw new ValidationError('Card requires cardLastFour');
    }
  }
  
  // If setting as default, unset other defaults
  if (isDefault) {
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('account_id', accountId)
      .eq('tenant_id', ctx.tenantId);
  }
  
  // Create payment method (STUB: no real verification)
  const { data: method, error: createError } = await supabase
    .from('payment_methods')
    .insert({
      tenant_id: ctx.tenantId,
      account_id: accountId,
      type,
      label: label || `${type} payment method`,
      is_default: isDefault || false,
      is_verified: false, // STUB: Would require real verification
      bank_country: bankCountry || null,
      bank_currency: bankCurrency || null,
      bank_account_last_four: bankAccountLastFour || null,
      bank_routing_last_four: bankRoutingLastFour || null,
      bank_name: bankName || null,
      bank_account_holder: bankAccountHolder || null,
      wallet_network: walletNetwork || null,
      wallet_address: walletAddress || null,
      card_id: cardId || null,
      card_last_four: cardLastFour || null,
      metadata: metadata || {},
    })
    .select()
    .single();
  
  if (createError) {
    console.error('Error creating payment method:', createError);
    return c.json({ error: 'Failed to create payment method' }, 500);
  }
  
  // STUB: In production, trigger verification process here
  // For now, we'll mark it as verified after a delay (mock)
  setTimeout(async () => {
    await supabase
      .from('payment_methods')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', method.id);
  }, 2000); // Mock 2-second verification delay
  
  // Audit log
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    entityType: 'payment_method',
    entityId: method.id,
    action: 'created',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
    metadata: {
      type,
      accountId,
    },
  });
  
  return c.json({ data: method }, 201);
});

// ============================================
// PATCH /v1/payment-methods/:id - Update payment method
// ============================================
paymentMethods.patch('/payment-methods/:id', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const methodId = c.req.param('id');
  
  if (!isValidUUID(methodId)) {
    throw new ValidationError('Invalid payment method ID format');
  }
  
  // Verify payment method belongs to tenant
  const { data: method, error: fetchError } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('id', methodId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (fetchError || !method) {
    throw new NotFoundError('Payment method', methodId);
  }
  
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
  
  const parsed = updatePaymentMethodSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError('Validation failed', parsed.error.flatten());
  }
  
  const { label, isDefault, metadata } = parsed.data;
  
  // If setting as default, unset other defaults
  if (isDefault && !method.is_default) {
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('account_id', method.account_id)
      .eq('tenant_id', ctx.tenantId)
      .neq('id', methodId);
  }
  
  const updates: any = {
    updated_at: new Date().toISOString(),
  };
  
  if (label !== undefined) updates.label = label;
  if (isDefault !== undefined) updates.is_default = isDefault;
  if (metadata !== undefined) updates.metadata = metadata;
  
  const { data: updated, error: updateError } = await supabase
    .from('payment_methods')
    .update(updates)
    .eq('id', methodId)
    .select()
    .single();
  
  if (updateError) {
    console.error('Error updating payment method:', updateError);
    return c.json({ error: 'Failed to update payment method' }, 500);
  }
  
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    entityType: 'payment_method',
    entityId: methodId,
    action: 'updated',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
  });
  
  return c.json({ data: updated });
});

// ============================================
// DELETE /v1/payment-methods/:id - Delete payment method
// ============================================
paymentMethods.delete('/payment-methods/:id', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const methodId = c.req.param('id');
  
  if (!isValidUUID(methodId)) {
    throw new ValidationError('Invalid payment method ID format');
  }
  
  // Verify payment method belongs to tenant
  const { data: method, error: fetchError } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('id', methodId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (fetchError || !method) {
    throw new NotFoundError('Payment method', methodId);
  }
  
  // Check if it's being used in any active schedules
  const { data: schedules } = await supabase
    .from('transfer_schedules')
    .select('id')
    .eq('to_payment_method_id', methodId)
    .eq('status', 'active')
    .limit(1);
  
  if (schedules && schedules.length > 0) {
    throw new ValidationError('Cannot delete payment method that is used in active scheduled transfers');
  }
  
  const { error: deleteError } = await supabase
    .from('payment_methods')
    .delete()
    .eq('id', methodId)
    .eq('tenant_id', ctx.tenantId);
  
  if (deleteError) {
    console.error('Error deleting payment method:', deleteError);
    return c.json({ error: 'Failed to delete payment method' }, 500);
  }
  
  await logAudit(supabase, {
    tenantId: ctx.tenantId,
    entityType: 'payment_method',
    entityId: methodId,
    action: 'deleted',
    actorType: ctx.actorType,
    actorId: ctx.actorId,
    actorName: ctx.actorName,
  });
  
  return c.json({ data: { id: methodId, deleted: true } });
});

// ============================================
// GET /v1/payment-methods/:id - Get single payment method
// ============================================
paymentMethods.get('/payment-methods/:id', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();
  const methodId = c.req.param('id');
  
  if (!isValidUUID(methodId)) {
    throw new ValidationError('Invalid payment method ID format');
  }
  
  const { data: method, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('id', methodId)
    .eq('tenant_id', ctx.tenantId)
    .single();
  
  if (error || !method) {
    throw new NotFoundError('Payment method', methodId);
  }
  
  return c.json({ data: method });
});

export default paymentMethods;

