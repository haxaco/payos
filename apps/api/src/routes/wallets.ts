/**
 * Wallets API Routes
 * 
 * Enables any account to create and manage wallets for x402 payments.
 * Wallets can be self-managed or agent-managed with spending policies.
 * 
 * Spec: https://www.x402.org/x402-whitepaper.pdf
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db';
import { verifyAuth } from '../middleware/auth';

const app = new Hono();

// Apply auth middleware to all routes
app.use('*', verifyAuth);

// ============================================
// Validation Schemas
// ============================================

const spendingPolicySchema = z.object({
  dailySpendLimit: z.number().positive().optional(),
  dailySpent: z.number().default(0),
  dailyResetAt: z.string().datetime().optional(),
  monthlySpendLimit: z.number().positive().optional(),
  monthlySpent: z.number().default(0),
  monthlyResetAt: z.string().datetime().optional(),
  approvedVendors: z.array(z.string()).optional(),
  approvedCategories: z.array(z.string()).optional(),
  requiresApprovalAbove: z.number().positive().optional(),
  autoFundEnabled: z.boolean().default(false),
  autoFundThreshold: z.number().positive().optional(),
  autoFundAmount: z.number().positive().optional(),
  autoFundSourceAccountId: z.string().uuid().optional()
}).optional();

const createWalletSchema = z.object({
  ownerAccountId: z.string().uuid(),
  managedByAgentId: z.string().uuid().optional(),
  currency: z.enum(['USDC', 'EURC']).default('USDC'),
  initialBalance: z.number().min(0).default(0),
  spendingPolicy: spendingPolicySchema,
  network: z.string().default('base-mainnet')
});

const updateWalletSchema = z.object({
  spendingPolicy: spendingPolicySchema,
  status: z.enum(['active', 'frozen', 'depleted']).optional()
});

const depositSchema = z.object({
  amount: z.number().positive(),
  sourceAccountId: z.string().uuid(),
  reference: z.string().max(500).optional()
});

const withdrawSchema = z.object({
  amount: z.number().positive(),
  destinationAccountId: z.string().uuid(),
  reference: z.string().max(500).optional()
});

// ============================================
// Helper Functions
// ============================================

function mapWalletFromDb(row: any) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    ownerAccountId: row.owner_account_id,
    managedByAgentId: row.managed_by_agent_id,
    balance: parseFloat(row.balance),
    currency: row.currency,
    spendingPolicy: row.spending_policy,
    paymentAddress: row.payment_address,
    network: row.network,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ============================================
// Routes
// ============================================

/**
 * POST /v1/wallets
 * Create a new wallet for an account
 */
app.post('/', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();
    
    // Validate request
    const validated = createWalletSchema.parse(body);
    
    const supabase = createClient();
    
    // Verify owner account belongs to tenant
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', validated.ownerAccountId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (accountError || !account) {
      return c.json({ 
        error: 'Account not found or does not belong to your tenant' 
      }, 404);
    }
    
    // If managed by agent, verify agent exists and belongs to tenant
    if (validated.managedByAgentId) {
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('id', validated.managedByAgentId)
        .eq('tenant_id', ctx.tenantId)
        .single();
      
      if (agentError || !agent) {
        return c.json({ 
          error: 'Agent not found or does not belong to your tenant' 
        }, 404);
      }
    }
    
    // Check if wallet already exists for this account+agent combination
    let duplicateQuery = supabase
      .from('wallets')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .eq('owner_account_id', validated.ownerAccountId);
    
    if (validated.managedByAgentId) {
      duplicateQuery = duplicateQuery.eq('managed_by_agent_id', validated.managedByAgentId);
    } else {
      duplicateQuery = duplicateQuery.is('managed_by_agent_id', null);
    }
    
    const { data: existing } = await duplicateQuery.single();
    
    if (existing) {
      return c.json({
        error: 'Wallet already exists for this account and agent combination'
      }, 409);
    }
    
    // Generate internal payment address (Phase 1: internal, Phase 2: real wallet)
    const paymentAddress = validated.managedByAgentId
      ? `internal://payos/${ctx.tenantId}/${validated.ownerAccountId}/agent/${validated.managedByAgentId}`
      : `internal://payos/${ctx.tenantId}/${validated.ownerAccountId}`;
    
    // Create wallet
    const { data: wallet, error: createError } = await supabase
      .from('wallets')
      .insert({
        tenant_id: ctx.tenantId,
        owner_account_id: validated.ownerAccountId,
        managed_by_agent_id: validated.managedByAgentId || null,
        balance: validated.initialBalance,
        currency: validated.currency,
        spending_policy: validated.spendingPolicy || null,
        payment_address: paymentAddress,
        network: validated.network,
        status: 'active'
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating wallet:', createError);
      return c.json({ 
        error: 'Failed to create wallet',
        details: createError.message 
      }, 500);
    }
    
    // If initial balance > 0, create a deposit transfer
    if (validated.initialBalance > 0) {
      await supabase
        .from('transfers')
        .insert({
          tenant_id: ctx.tenantId,
          from_account_id: validated.ownerAccountId,
          to_account_id: validated.ownerAccountId,
          amount: validated.initialBalance,
          currency: validated.currency,
          type: 'internal',
          status: 'completed',
          description: 'Initial wallet funding',
          x402_metadata: {
            wallet_id: wallet.id,
            operation: 'initial_deposit'
          }
        });
    }
    
    return c.json({
      data: mapWalletFromDb(wallet)
    }, 201);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, 400);
    }
    console.error('Error in POST /v1/wallets:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /v1/wallets
 * List all wallets for the tenant
 */
app.get('/', async (c) => {
  try {
    const ctx = c.get('ctx');
    const supabase = createClient();
    
    // Parse query params
    const ownerAccountId = c.req.query('owner_account_id');
    const managedByAgentId = c.req.query('managed_by_agent_id');
    const status = c.req.query('status');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = (page - 1) * limit;
    
    // Build query
    let query = supabase
      .from('wallets')
      .select('*', { count: 'exact' })
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (ownerAccountId) {
      query = query.eq('owner_account_id', ownerAccountId);
    }
    
    if (managedByAgentId) {
      query = query.eq('managed_by_agent_id', managedByAgentId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data: wallets, error, count } = await query;
    
    if (error) {
      console.error('Error fetching wallets:', error);
      return c.json({ error: 'Failed to fetch wallets' }, 500);
    }
    
    return c.json({
      data: wallets?.map(mapWalletFromDb) || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
    
  } catch (error) {
    console.error('Error in GET /v1/wallets:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /v1/wallets/:id
 * Get a specific wallet with transaction history
 */
app.get('/:id', async (c) => {
  try {
    const ctx = c.get('ctx');
    const id = c.req.param('id');
    const supabase = createClient();
    
    // Fetch wallet
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (error || !wallet) {
      return c.json({ error: 'Wallet not found' }, 404);
    }
    
    // Fetch recent transactions involving this wallet
    const { data: recentTxs } = await supabase
      .from('transfers')
      .select('id, from_account_id, to_account_id, amount, currency, status, type, created_at, x402_metadata')
      .eq('tenant_id', ctx.tenantId)
      .or(`x402_metadata->>wallet_id.eq.${id}`)
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Format response
    const response = {
      ...mapWalletFromDb(wallet),
      recentTransactions: recentTxs?.map(tx => ({
        id: tx.id,
        fromAccountId: tx.from_account_id,
        toAccountId: tx.to_account_id,
        amount: parseFloat(tx.amount),
        currency: tx.currency,
        status: tx.status,
        type: tx.type,
        operation: tx.x402_metadata?.operation,
        createdAt: tx.created_at
      })) || []
    };
    
    return c.json({ data: response });
    
  } catch (error) {
    console.error('Error in GET /v1/wallets/:id:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * PATCH /v1/wallets/:id
 * Update a wallet's configuration
 */
app.patch('/:id', async (c) => {
  try {
    const ctx = c.get('ctx');
    const id = c.req.param('id');
    const body = await c.req.json();
    
    // Validate request
    const validated = updateWalletSchema.parse(body);
    
    const supabase = createClient();
    
    // Check wallet exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('wallets')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (fetchError || !existing) {
      return c.json({ error: 'Wallet not found' }, 404);
    }
    
    // Update wallet
    const { data: updated, error: updateError } = await supabase
      .from('wallets')
      .update({
        ...(validated.spendingPolicy !== undefined && { spending_policy: validated.spendingPolicy }),
        ...(validated.status && { status: validated.status }),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating wallet:', updateError);
      return c.json({ error: 'Failed to update wallet' }, 500);
    }
    
    return c.json({
      data: mapWalletFromDb(updated)
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, 400);
    }
    console.error('Error in PATCH /v1/wallets/:id:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /v1/wallets/:id/deposit
 * Deposit funds into a wallet
 */
app.post('/:id/deposit', async (c) => {
  try {
    const ctx = c.get('ctx');
    const id = c.req.param('id');
    const body = await c.req.json();
    
    // Validate request
    const validated = depositSchema.parse(body);
    
    const supabase = createClient();
    
    // Fetch wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (walletError || !wallet) {
      return c.json({ error: 'Wallet not found' }, 404);
    }
    
    // Check wallet is active
    if (wallet.status !== 'active') {
      return c.json({ 
        error: 'Wallet is not active',
        status: wallet.status 
      }, 400);
    }
    
    // Verify source account belongs to tenant
    const { data: sourceAccount, error: sourceError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', validated.sourceAccountId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (sourceError || !sourceAccount) {
      return c.json({ 
        error: 'Source account not found or does not belong to your tenant' 
      }, 404);
    }
    
    // Update wallet balance
    const newBalance = parseFloat(wallet.balance) + validated.amount;
    
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ 
        balance: newBalance,
        status: 'active', // Reset from depleted if needed
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId);
    
    if (updateError) {
      console.error('Error updating wallet balance:', updateError);
      return c.json({ error: 'Failed to deposit funds' }, 500);
    }
    
    // Create transfer record
    const { data: transfer, error: transferError } = await supabase
      .from('transfers')
      .insert({
        tenant_id: ctx.tenantId,
        from_account_id: validated.sourceAccountId,
        to_account_id: wallet.owner_account_id,
        amount: validated.amount,
        currency: wallet.currency,
        type: 'internal',
        status: 'completed',
        description: validated.reference || 'Wallet deposit',
        x402_metadata: {
          wallet_id: wallet.id,
          operation: 'deposit'
        }
      })
      .select()
      .single();
    
    if (transferError) {
      console.error('Error creating transfer record:', transferError);
      // Note: balance already updated, but transfer record failed
      // In production, this should be a transaction
    }
    
    return c.json({
      data: {
        walletId: wallet.id,
        previousBalance: parseFloat(wallet.balance),
        depositAmount: validated.amount,
        newBalance,
        transferId: transfer?.id,
        currency: wallet.currency
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, 400);
    }
    console.error('Error in POST /v1/wallets/:id/deposit:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /v1/wallets/:id/withdraw
 * Withdraw funds from a wallet
 */
app.post('/:id/withdraw', async (c) => {
  try {
    const ctx = c.get('ctx');
    const id = c.req.param('id');
    const body = await c.req.json();
    
    // Validate request
    const validated = withdrawSchema.parse(body);
    
    const supabase = createClient();
    
    // Fetch wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (walletError || !wallet) {
      return c.json({ error: 'Wallet not found' }, 404);
    }
    
    // Check wallet is active
    if (wallet.status !== 'active') {
      return c.json({ 
        error: 'Wallet is not active',
        status: wallet.status 
      }, 400);
    }
    
    // Check sufficient balance
    const currentBalance = parseFloat(wallet.balance);
    if (currentBalance < validated.amount) {
      return c.json({ 
        error: 'Insufficient balance',
        available: currentBalance,
        requested: validated.amount
      }, 400);
    }
    
    // Verify destination account belongs to tenant
    const { data: destAccount, error: destError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', validated.destinationAccountId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (destError || !destAccount) {
      return c.json({ 
        error: 'Destination account not found or does not belong to your tenant' 
      }, 404);
    }
    
    // Update wallet balance
    const newBalance = currentBalance - validated.amount;
    const newStatus = newBalance === 0 ? 'depleted' : 'active';
    
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ 
        balance: newBalance,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId);
    
    if (updateError) {
      console.error('Error updating wallet balance:', updateError);
      return c.json({ error: 'Failed to withdraw funds' }, 500);
    }
    
    // Create transfer record
    const { data: transfer, error: transferError } = await supabase
      .from('transfers')
      .insert({
        tenant_id: ctx.tenantId,
        from_account_id: wallet.owner_account_id,
        to_account_id: validated.destinationAccountId,
        amount: validated.amount,
        currency: wallet.currency,
        type: 'internal',
        status: 'completed',
        description: validated.reference || 'Wallet withdrawal',
        x402_metadata: {
          wallet_id: wallet.id,
          operation: 'withdrawal'
        }
      })
      .select()
      .single();
    
    if (transferError) {
      console.error('Error creating transfer record:', transferError);
      // Note: balance already updated, but transfer record failed
      // In production, this should be a transaction
    }
    
    return c.json({
      data: {
        walletId: wallet.id,
        previousBalance: currentBalance,
        withdrawalAmount: validated.amount,
        newBalance,
        transferId: transfer?.id,
        currency: wallet.currency,
        status: newStatus
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, 400);
    }
    console.error('Error in POST /v1/wallets/:id/withdraw:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * DELETE /v1/wallets/:id
 * Delete a wallet (only if balance is 0)
 */
app.delete('/:id', async (c) => {
  try {
    const ctx = c.get('ctx');
    const id = c.req.param('id');
    const supabase = createClient();
    
    // Fetch wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (walletError || !wallet) {
      return c.json({ error: 'Wallet not found' }, 404);
    }
    
    // Check balance is 0
    if (parseFloat(wallet.balance) > 0) {
      const force = c.req.query('force') === 'true';
      
      if (!force) {
        return c.json({
          error: 'Wallet has non-zero balance',
          message: 'Withdraw all funds before deleting. Add ?force=true to delete anyway.',
          balance: parseFloat(wallet.balance)
        }, 409);
      }
    }
    
    // Delete wallet
    const { error: deleteError } = await supabase
      .from('wallets')
      .delete()
      .eq('id', id)
      .eq('tenant_id', ctx.tenantId);
    
    if (deleteError) {
      console.error('Error deleting wallet:', deleteError);
      return c.json({ error: 'Failed to delete wallet' }, 500);
    }
    
    return c.json({ 
      message: 'Wallet deleted successfully' 
    }, 200);
    
  } catch (error) {
    console.error('Error in DELETE /v1/wallets/:id:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;

