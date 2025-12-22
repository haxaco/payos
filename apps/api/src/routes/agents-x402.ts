/**
 * Agents x402 Registration & Configuration
 * 
 * Extends the base agents API with x402-specific functionality:
 * - Agent registration with wallet creation
 * - Agent configuration management
 * - Wallet management for agents
 * 
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

const agentConfigSchema = z.object({
  purpose: z.string().max(500).optional(),
  x402: z.object({
    enabled: z.boolean().default(true),
    maxDailySpend: z.number().positive().optional(),
    approvedEndpoints: z.array(z.string()).optional(),
    requiresApproval: z.boolean().default(false)
  }).optional()
});

const registerAgentSchema = z.object({
  // Account details
  accountName: z.string().min(1).max(255),
  accountEmail: z.string().email().optional(),
  
  // Agent details
  agentName: z.string().min(1).max(255),
  agentPurpose: z.string().max(500),
  agentType: z.enum(['autonomous', 'semi_autonomous', 'human_supervised']).default('autonomous'),
  
  // Wallet setup
  walletCurrency: z.enum(['USDC', 'EURC']).default('USDC'),
  initialBalance: z.number().min(0).default(0),
  spendingPolicy: spendingPolicySchema,
  
  // x402 Configuration
  agentConfig: agentConfigSchema.optional()
});

const updateAgentConfigSchema = z.object({
  purpose: z.string().max(500).optional(),
  agentConfig: agentConfigSchema.optional(),
  spendingPolicy: spendingPolicySchema
});

const fundWalletSchema = z.object({
  amount: z.number().positive(),
  sourceAccountId: z.string().uuid(),
  reference: z.string().max(500).optional()
});

// ============================================
// Helper Functions
// ============================================

function mapAgentFromDb(agent: any, account: any, wallet?: any) {
  return {
    id: agent.id,
    accountId: agent.account_id,
    name: agent.name,
    purpose: agent.purpose,
    type: agent.type,
    status: agent.status,
    account: {
      id: account.id,
      name: account.name,
      email: account.email,
      type: account.type,
      agentConfig: account.agent_config
    },
    wallet: wallet ? {
      id: wallet.id,
      balance: parseFloat(wallet.balance),
      currency: wallet.currency,
      status: wallet.status,
      spendingPolicy: wallet.spending_policy,
      paymentAddress: wallet.payment_address
    } : null,
    createdAt: agent.created_at,
    updatedAt: agent.updated_at
  };
}

// ============================================
// Routes
// ============================================

/**
 * POST /v1/agents/x402/register
 * Register a new agent with account, agent record, and wallet
 * 
 * This is a convenience endpoint for onboarding agents that will use x402.
 * It creates all necessary resources in one atomic operation.
 */
app.post('/register', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();
    
    // Validate request
    const validated = registerAgentSchema.parse(body);
    
    const supabase = createClient();
    
    // ============================================
    // 1. CREATE ACCOUNT (type: agent)
    // ============================================
    
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .insert({
        tenant_id: ctx.tenantId,
        name: validated.accountName,
        email: validated.accountEmail,
        type: 'person', // For now, keep as 'person' type with agent_config
        agent_config: {
          purpose: validated.agentPurpose,
          x402: validated.agentConfig?.x402 || { enabled: true }
        }
      })
      .select()
      .single();
    
    if (accountError) {
      console.error('Error creating account:', accountError);
      return c.json({
        error: 'Failed to create account',
        details: accountError.message
      }, 500);
    }
    
    // ============================================
    // 2. CREATE AGENT RECORD
    // ============================================
    
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        tenant_id: ctx.tenantId,
        account_id: account.id,
        name: validated.agentName,
        purpose: validated.agentPurpose,
        type: validated.agentType,
        status: 'active'
      })
      .select()
      .single();
    
    if (agentError) {
      console.error('Error creating agent:', agentError);
      
      // Rollback: Delete account
      await supabase
        .from('accounts')
        .delete()
        .eq('id', account.id)
        .eq('tenant_id', ctx.tenantId);
      
      return c.json({
        error: 'Failed to create agent',
        details: agentError.message
      }, 500);
    }
    
    // ============================================
    // 3. CREATE WALLET (managed by agent)
    // ============================================
    
    // Generate payment address
    const paymentAddress = `internal://payos/${ctx.tenantId}/${account.id}/agent/${agent.id}`;
    
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .insert({
        tenant_id: ctx.tenantId,
        owner_account_id: account.id,
        managed_by_agent_id: agent.id,
        balance: validated.initialBalance,
        currency: validated.walletCurrency,
        spending_policy: validated.spendingPolicy || null,
        payment_address: paymentAddress,
        network: 'base-mainnet',
        status: 'active',
        name: `${validated.agentName} Wallet`,
        purpose: 'x402 autonomous payments'
      })
      .select()
      .single();
    
    if (walletError) {
      console.error('Error creating wallet:', walletError);
      
      // Rollback: Delete agent and account
      await supabase
        .from('agents')
        .delete()
        .eq('id', agent.id)
        .eq('tenant_id', ctx.tenantId);
      
      await supabase
        .from('accounts')
        .delete()
        .eq('id', account.id)
        .eq('tenant_id', ctx.tenantId);
      
      return c.json({
        error: 'Failed to create wallet',
        details: walletError.message
      }, 500);
    }
    
    // ============================================
    // 4. CREATE INITIAL DEPOSIT (if initial balance > 0)
    // ============================================
    
    if (validated.initialBalance > 0) {
      await supabase
        .from('transfers')
        .insert({
          tenant_id: ctx.tenantId,
          from_account_id: account.id,
          to_account_id: account.id,
          amount: validated.initialBalance,
          currency: validated.walletCurrency,
          type: 'internal',
          status: 'completed',
          description: 'Initial agent wallet funding',
          x402_metadata: {
            wallet_id: wallet.id,
            agent_id: agent.id,
            operation: 'initial_deposit'
          }
        });
    }
    
    // ============================================
    // 5. RETURN SUCCESS
    // ============================================
    
    return c.json({
      success: true,
      message: 'Agent registered successfully',
      data: mapAgentFromDb(agent, account, wallet)
    }, 201);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Validation failed',
        details: error.errors
      }, 400);
    }
    console.error('Error in POST /v1/agents/x402/register:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * PATCH /v1/agents/x402/:id/config
 * Update agent configuration and spending policy
 */
app.patch('/:id/config', async (c) => {
  try {
    const ctx = c.get('ctx');
    const agentId = c.req.param('id');
    const body = await c.req.json();
    
    // Validate request
    const validated = updateAgentConfigSchema.parse(body);
    
    const supabase = createClient();
    
    // ============================================
    // 1. FETCH AGENT & ACCOUNT
    // ============================================
    
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*, account:accounts(*)')
      .eq('id', agentId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (agentError || !agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    
    // ============================================
    // 2. UPDATE AGENT PURPOSE (if provided)
    // ============================================
    
    if (validated.purpose) {
      await supabase
        .from('agents')
        .update({ purpose: validated.purpose })
        .eq('id', agentId)
        .eq('tenant_id', ctx.tenantId);
    }
    
    // ============================================
    // 3. UPDATE ACCOUNT AGENT_CONFIG (if provided)
    // ============================================
    
    if (validated.agentConfig) {
      const currentConfig = agent.account?.agent_config || {};
      const updatedConfig = {
        ...currentConfig,
        ...validated.agentConfig
      };
      
      await supabase
        .from('accounts')
        .update({ agent_config: updatedConfig })
        .eq('id', agent.account_id)
        .eq('tenant_id', ctx.tenantId);
    }
    
    // ============================================
    // 4. UPDATE WALLET SPENDING POLICY (if provided)
    // ============================================
    
    if (validated.spendingPolicy !== undefined) {
      await supabase
        .from('wallets')
        .update({ spending_policy: validated.spendingPolicy })
        .eq('owner_account_id', agent.account_id)
        .eq('managed_by_agent_id', agentId)
        .eq('tenant_id', ctx.tenantId);
    }
    
    // ============================================
    // 5. FETCH UPDATED DATA
    // ============================================
    
    const { data: updatedAgent } = await supabase
      .from('agents')
      .select('*, account:accounts(*)')
      .eq('id', agentId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    const { data: updatedWallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('owner_account_id', agent.account_id)
      .eq('managed_by_agent_id', agentId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    return c.json({
      success: true,
      message: 'Agent configuration updated',
      data: mapAgentFromDb(
        updatedAgent || agent,
        updatedAgent?.account || agent.account,
        updatedWallet
      )
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Validation failed',
        details: error.errors
      }, 400);
    }
    console.error('Error in PATCH /v1/agents/x402/:id/config:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * GET /v1/agents/x402/:id/wallet
 * Get agent's wallet details with transaction history
 */
app.get('/:id/wallet', async (c) => {
  try {
    const ctx = c.get('ctx');
    const agentId = c.req.param('id');
    const supabase = createClient();
    
    // Fetch agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, account_id')
      .eq('id', agentId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (agentError || !agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    
    // Fetch wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('owner_account_id', agent.account_id)
      .eq('managed_by_agent_id', agentId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (walletError || !wallet) {
      return c.json({ error: 'Wallet not found' }, 404);
    }
    
    // Fetch recent transactions
    const { data: recentTxs } = await supabase
      .from('transfers')
      .select('id, from_account_id, to_account_id, amount, currency, status, type, description, created_at, x402_metadata')
      .eq('tenant_id', ctx.tenantId)
      .or(`from_account_id.eq.${agent.account_id},to_account_id.eq.${agent.account_id}`)
      .order('created_at', { ascending: false })
      .limit(50);
    
    // Calculate spending stats
    const { data: spendingStats } = await supabase
      .from('transfers')
      .select('amount, created_at')
      .eq('tenant_id', ctx.tenantId)
      .eq('from_account_id', agent.account_id)
      .eq('type', 'x402')
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days
    
    const totalSpent = spendingStats?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0;
    
    return c.json({
      data: {
        walletId: wallet.id,
        agentId: agent.id,
        accountId: agent.account_id,
        balance: parseFloat(wallet.balance),
        currency: wallet.currency,
        status: wallet.status,
        spendingPolicy: wallet.spending_policy,
        paymentAddress: wallet.payment_address,
        network: wallet.network,
        stats: {
          totalSpentLast30Days: totalSpent,
          transactionCount: recentTxs?.length || 0
        },
        recentTransactions: recentTxs?.map(tx => ({
          id: tx.id,
          fromAccountId: tx.from_account_id,
          toAccountId: tx.to_account_id,
          amount: parseFloat(tx.amount),
          currency: tx.currency,
          status: tx.status,
          type: tx.type,
          description: tx.description,
          endpointId: tx.x402_metadata?.endpoint_id,
          createdAt: tx.created_at
        })) || [],
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at
      }
    });
    
  } catch (error) {
    console.error('Error in GET /v1/agents/x402/:id/wallet:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /v1/agents/x402/:id/wallet/fund
 * Fund an agent's wallet (manual or auto-fund trigger)
 */
app.post('/:id/wallet/fund', async (c) => {
  try {
    const ctx = c.get('ctx');
    const agentId = c.req.param('id');
    const body = await c.req.json();
    
    // Validate request
    const validated = fundWalletSchema.parse(body);
    
    const supabase = createClient();
    
    // Fetch agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, account_id')
      .eq('id', agentId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (agentError || !agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    
    // Fetch wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('owner_account_id', agent.account_id)
      .eq('managed_by_agent_id', agentId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (walletError || !wallet) {
      return c.json({ error: 'Wallet not found' }, 404);
    }
    
    // Verify source account
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
    
    await supabase
      .from('wallets')
      .update({
        balance: newBalance,
        status: 'active', // Reactivate if depleted
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id)
      .eq('tenant_id', ctx.tenantId);
    
    // Create transfer record
    const { data: transfer, error: transferError } = await supabase
      .from('transfers')
      .insert({
        tenant_id: ctx.tenantId,
        from_account_id: validated.sourceAccountId,
        to_account_id: agent.account_id,
        amount: validated.amount,
        currency: wallet.currency,
        type: 'internal',
        status: 'completed',
        description: validated.reference || 'Agent wallet funding',
        x402_metadata: {
          wallet_id: wallet.id,
          agent_id: agent.id,
          operation: 'fund'
        }
      })
      .select()
      .single();
    
    if (transferError) {
      console.error('Error creating transfer record:', transferError);
    }
    
    return c.json({
      success: true,
      message: 'Agent wallet funded successfully',
      data: {
        walletId: wallet.id,
        agentId: agent.id,
        previousBalance: parseFloat(wallet.balance),
        fundAmount: validated.amount,
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
    console.error('Error in POST /v1/agents/x402/:id/wallet/fund:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;

