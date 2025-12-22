/**
 * Wallets API Routes
 * 
 * Enables any account to create and manage wallets for x402 payments.
 * Supports:
 * - Internal wallets (PayOS managed)
 * - Circle custodial wallets (Phase 2)
 * - External wallets (user brings own wallet)
 * 
 * Accounts can have MULTIPLE wallets.
 * 
 * Spec: https://www.x402.org/x402-whitepaper.pdf
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { createClient } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { getCircleService, USDC_CONTRACTS, EURC_CONTRACTS } from '../services/circle-mock.js';

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
  approvedEndpoints: z.array(z.string()).optional(),
  approvedVendors: z.array(z.string()).optional(),
  approvedCategories: z.array(z.string()).optional(),
  approvalThreshold: z.number().positive().optional(),
  requiresApprovalAbove: z.number().positive().optional(),
  autoFundEnabled: z.boolean().default(false),
  autoFundThreshold: z.number().positive().optional(),
  autoFundAmount: z.number().positive().optional(),
  autoFundSourceAccountId: z.string().uuid().optional()
}).optional();

// Schema for creating a NEW wallet (internal or Circle)
const createWalletSchema = z.object({
  ownerAccountId: z.string().uuid(),
  managedByAgentId: z.string().uuid().optional(),
  currency: z.enum(['USDC', 'EURC']).default('USDC'),
  initialBalance: z.number().min(0).default(0),
  spendingPolicy: spendingPolicySchema,
  
  // New Phase 2 fields
  walletType: z.enum(['internal', 'circle_custodial', 'circle_mpc']).default('internal'),
  blockchain: z.enum(['base', 'eth', 'polygon', 'avax', 'sol']).default('base'),
  
  // Optional metadata
  name: z.string().max(255).optional(),
  purpose: z.string().max(500).optional()
});

// Schema for ADDING an existing external wallet
const addExternalWalletSchema = z.object({
  ownerAccountId: z.string().uuid(),
  managedByAgentId: z.string().uuid().optional(),
  currency: z.enum(['USDC', 'EURC']).default('USDC'),
  spendingPolicy: spendingPolicySchema,
  
  // External wallet details
  walletAddress: z.string().min(10), // 0x... or Solana address
  blockchain: z.enum(['base', 'eth', 'polygon', 'avax', 'sol']),
  
  // Verification (signature to prove ownership)
  signature: z.string().optional(),
  signatureMessage: z.string().optional(),
  
  // Metadata
  name: z.string().max(255).optional(),
  purpose: z.string().max(500).optional()
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
    walletAddress: row.wallet_address || row.payment_address, // Support both old and new column names
    network: row.network,
    status: row.status,
    name: row.name,
    purpose: row.purpose,
    
    // New Phase 2 fields
    walletType: row.wallet_type || 'internal',
    custodyType: row.custody_type || 'custodial',
    provider: row.provider || 'payos',
    providerWalletId: row.provider_wallet_id,
    providerWalletSetId: row.provider_wallet_set_id,
    blockchain: row.blockchain || 'base',
    tokenContract: row.token_contract,
    
    // Verification
    verificationStatus: row.verification_status || 'verified',
    verificationMethod: row.verification_method,
    verifiedAt: row.verified_at,
    
    // Sync
    lastSyncedAt: row.last_synced_at,
    syncEnabled: row.sync_enabled || false,
    
    // Compliance
    kycStatus: row.kyc_status || 'not_required',
    amlCleared: row.aml_cleared !== false,
    sanctionsStatus: row.sanctions_status || 'not_screened',
    riskScore: row.risk_score,
    
    // Timestamps
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getTokenContract(currency: string, blockchain: string): string | null {
  const contracts = currency === 'USDC' ? USDC_CONTRACTS : EURC_CONTRACTS;
  return contracts[blockchain.toUpperCase()] || null;
}

// ============================================
// Routes
// ============================================

/**
 * POST /v1/wallets
 * Create a new wallet for an account
 * Supports: internal (PayOS), circle_custodial, circle_mpc
 * 
 * Note: For adding existing external wallets, use POST /v1/wallets/external
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
    
    // NOTE: Accounts can have MULTIPLE wallets
    // We no longer check for duplicates - just create a new one
    
    // Determine wallet address based on type
    let walletAddress: string;
    let providerWalletId: string | null = null;
    let providerWalletSetId: string | null = null;
    let providerEntityId: string | null = null;
    let providerMetadata: any = null;
    
    const blockchain = validated.blockchain || 'base';
    const tokenContract = getTokenContract(validated.currency, blockchain);
    
    if (validated.walletType === 'internal') {
      // Internal PayOS wallet (Phase 1)
      walletAddress = validated.managedByAgentId
        ? `internal://payos/${ctx.tenantId}/${validated.ownerAccountId}/agent/${validated.managedByAgentId}`
        : `internal://payos/${ctx.tenantId}/${validated.ownerAccountId}/${Date.now()}`;
    } else {
      // Circle wallet (mock for now, real in Phase 2)
      const circleService = getCircleService(ctx.tenantId);
      
      try {
        const circleWallet = await circleService.createWallet({
          walletSetId: circleService.getDefaultWalletSetId(),
          blockchain: blockchain.toUpperCase() as any,
          name: validated.name || `PayOS Wallet`,
          refId: validated.ownerAccountId
        });
        
        walletAddress = circleWallet.address;
        providerWalletId = circleWallet.id;
        providerWalletSetId = circleWallet.walletSetId;
        providerEntityId = circleService.getEntityId();
        providerMetadata = {
          circle_state: circleWallet.state,
          circle_account_type: circleWallet.accountType,
          circle_custody_type: circleWallet.custodyType,
          circle_create_date: circleWallet.createDate
        };
      } catch (circleError: any) {
        console.error('Error creating Circle wallet:', circleError);
        return c.json({
          error: 'Failed to create Circle wallet',
          details: circleError.message
        }, 500);
      }
    }
    
    // Create wallet record
    const { data: wallet, error: createError } = await supabase
      .from('wallets')
      .insert({
        tenant_id: ctx.tenantId,
        owner_account_id: validated.ownerAccountId,
        managed_by_agent_id: validated.managedByAgentId || null,
        balance: validated.initialBalance,
        currency: validated.currency,
        spending_policy: validated.spendingPolicy || null,
        wallet_address: walletAddress,
        network: `${blockchain}-mainnet`,
        status: 'active',
        name: validated.name,
        purpose: validated.purpose,
        
        // Phase 2 fields
        wallet_type: validated.walletType,
        custody_type: validated.walletType === 'circle_mpc' ? 'mpc' : 'custodial',
        provider: validated.walletType === 'internal' ? 'payos' : 'circle',
        provider_wallet_id: providerWalletId,
        provider_wallet_set_id: providerWalletSetId,
        provider_entity_id: providerEntityId,
        provider_metadata: providerMetadata,
        blockchain: blockchain,
        token_contract: tokenContract,
        
        // Verification (new wallets are auto-verified)
        verification_status: 'verified',
        verification_method: validated.walletType === 'internal' ? 'internal' : 'api_created',
        verified_at: new Date().toISOString(),
        
        // Compliance defaults
        kyc_status: 'not_required',
        aml_cleared: true,
        sanctions_status: 'not_screened'
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
 * POST /v1/wallets/external
 * Add an existing external wallet (user brings their own)
 * 
 * Flow:
 * 1. User provides wallet address
 * 2. User signs a message to prove ownership
 * 3. We verify signature and add wallet
 * 
 * Note: In Phase 1, we mock signature verification.
 * In Phase 2+, we use EIP-712 or equivalent for real verification.
 */
app.post('/external', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();
    
    // Validate request
    const validated = addExternalWalletSchema.parse(body);
    
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
    
    // Check if this wallet address is already linked to this tenant
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .eq('wallet_address', validated.walletAddress)
      .single();
    
    if (existingWallet) {
      return c.json({
        error: 'This wallet address is already linked to your account',
        walletId: existingWallet.id
      }, 409);
    }
    
    // Verify ownership (mock for now)
    let verificationStatus: 'verified' | 'pending' | 'unverified' = 'unverified';
    let verificationMethod: string | null = null;
    
    if (validated.signature && validated.signatureMessage) {
      // Mock verification - in Phase 2, use real signature verification
      const circleService = getCircleService(ctx.tenantId);
      const verifyResult = await circleService.verifyWalletOwnership(
        validated.walletAddress,
        validated.signature,
        validated.signatureMessage
      );
      
      if (verifyResult.verified) {
        verificationStatus = 'verified';
        verificationMethod = 'signature';
      } else {
        // Still allow adding but mark as unverified
        verificationStatus = 'unverified';
      }
    } else {
      // No signature provided - mark as pending verification
      verificationStatus = 'pending';
    }
    
    const blockchain = validated.blockchain || 'base';
    const tokenContract = getTokenContract(validated.currency, blockchain);
    
    // Create external wallet record
    const { data: wallet, error: createError } = await supabase
      .from('wallets')
      .insert({
        tenant_id: ctx.tenantId,
        owner_account_id: validated.ownerAccountId,
        managed_by_agent_id: validated.managedByAgentId || null,
        balance: 0, // External wallet balance must be synced
        currency: validated.currency,
        spending_policy: validated.spendingPolicy || null,
        wallet_address: validated.walletAddress,
        network: `${blockchain}-mainnet`,
        status: verificationStatus === 'verified' ? 'active' : 'frozen',
        name: validated.name,
        purpose: validated.purpose,
        
        // External wallet fields
        wallet_type: 'external',
        custody_type: 'self',
        provider: 'external',
        blockchain: blockchain,
        token_contract: tokenContract,
        
        // Verification
        verification_status: verificationStatus,
        verification_method: verificationMethod,
        verified_at: verificationStatus === 'verified' ? new Date().toISOString() : null,
        
        // Sync - enable for external wallets
        sync_enabled: true,
        last_synced_at: null, // Will be updated on first sync
        
        // Compliance - external wallets may need KYC
        kyc_status: 'pending',
        aml_cleared: false,
        sanctions_status: 'not_screened'
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error adding external wallet:', createError);
      return c.json({ 
        error: 'Failed to add external wallet',
        details: createError.message 
      }, 500);
    }
    
    return c.json({
      data: mapWalletFromDb(wallet),
      message: verificationStatus === 'verified' 
        ? 'External wallet added and verified successfully'
        : verificationStatus === 'pending'
        ? 'External wallet added. Please verify ownership to activate.'
        : 'External wallet added but verification failed. Please try again.',
      requiresVerification: verificationStatus !== 'verified'
    }, 201);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Validation failed',
        details: error.errors
      }, 400);
    }
    console.error('Error in POST /v1/wallets/external:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * POST /v1/wallets/:id/verify
 * Verify ownership of an external wallet
 */
app.post('/:id/verify', async (c) => {
  try {
    const ctx = c.get('ctx');
    const walletId = c.req.param('id');
    const body = await c.req.json();
    
    const { signature, message } = body;
    
    if (!signature || !message) {
      return c.json({ error: 'Signature and message are required' }, 400);
    }
    
    const supabase = createClient();
    
    // Fetch wallet
    const { data: wallet, error: fetchError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (fetchError || !wallet) {
      return c.json({ error: 'Wallet not found' }, 404);
    }
    
    if (wallet.wallet_type !== 'external') {
      return c.json({ error: 'Only external wallets require verification' }, 400);
    }
    
    if (wallet.verification_status === 'verified') {
      return c.json({ 
        message: 'Wallet is already verified',
        data: mapWalletFromDb(wallet)
      });
    }
    
    // Verify signature (mock for now)
    const circleService = getCircleService(ctx.tenantId);
    const verifyResult = await circleService.verifyWalletOwnership(
      wallet.wallet_address,
      signature,
      message
    );
    
    if (!verifyResult.verified) {
      return c.json({ 
        error: 'Verification failed. Signature does not match wallet address.',
        details: 'Please ensure you are signing with the correct wallet.'
      }, 400);
    }
    
    // Update wallet status
    const { data: updatedWallet, error: updateError } = await supabase
      .from('wallets')
      .update({
        verification_status: 'verified',
        verification_method: 'signature',
        verified_at: new Date().toISOString(),
        status: 'active', // Activate the wallet
        updated_at: new Date().toISOString()
      })
      .eq('id', walletId)
      .eq('tenant_id', ctx.tenantId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating wallet verification:', updateError);
      return c.json({ error: 'Failed to update wallet' }, 500);
    }
    
    return c.json({
      message: 'Wallet verified successfully',
      data: mapWalletFromDb(updatedWallet)
    });
    
  } catch (error) {
    console.error('Error in POST /v1/wallets/:id/verify:', error);
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

