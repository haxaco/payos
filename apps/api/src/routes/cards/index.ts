/**
 * Card Network Routes
 * Epic 53: Card Network Integration
 *
 * API endpoints for:
 * - Web Bot Auth signature verification
 * - Card network configuration
 * - Payment instructions (Visa VIC)
 * - Agent registration (Mastercard)
 * - Token management
 */

import { Hono } from 'hono';
import { createClient } from '../../db/client.js';
import { ApiError, NotFoundError, ValidationError } from '../../middleware/error.js';
import type { RequestContext } from '../../middleware/auth.js';

const cards = new Hono<{ Variables: { ctx: RequestContext } }>();

// ============================================
// Web Bot Auth Verification
// ============================================

/**
 * POST /v1/cards/verify
 * Verify a Web Bot Auth signature from an incoming agent request
 */
cards.post('/verify', async (c) => {
  const ctx = c.get('ctx');
  const body = await c.req.json();

  const { method, path, headers, signatureInput, signature, network } = body;

  if (!method || !path || !signatureInput || !signature) {
    throw new ValidationError('Missing required fields: method, path, signatureInput, signature');
  }

  // Dynamic import to avoid bundling issues
  const { verifyWebBotAuth } = await import('@payos/cards');

  const result = await verifyWebBotAuth(
    {
      method,
      path,
      headers: headers || {},
      signatureInput,
      signature,
    },
    {
      network: network || undefined,
      skipTimestampValidation: process.env.NODE_ENV === 'development',
    }
  );

  // Log the verification attempt
  const supabase = createClient();
  await supabase.from('card_agent_verifications').insert({
    tenant_id: ctx.tenantId,
    network: result.network,
    agent_key_id: result.keyId,
    verified: result.valid,
    failure_reason: result.error || null,
    agent_provider: result.agentProvider || null,
    request_path: path,
    request_method: method,
  });

  return c.json({
    valid: result.valid,
    network: result.network,
    keyId: result.keyId,
    agentProvider: result.agentProvider,
    error: result.error,
    verifiedAt: result.verifiedAt,
  });
});

// ============================================
// Network Configuration
// ============================================

/**
 * GET /v1/cards/networks
 * Get configured card networks and their status
 */
cards.get('/networks', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  // Get connected accounts for card networks
  const { data: accounts } = await supabase
    .from('connected_accounts')
    .select('id, handler_type, handler_name, status, credentials_encrypted, created_at, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .in('handler_type', ['visa_vic', 'mastercard_agent_pay']);

  const networks = {
    visa: {
      configured: false,
      status: 'not_configured' as const,
      accountId: null as string | null,
      sandbox: true,
      connectedAt: null as string | null,
    },
    mastercard: {
      configured: false,
      status: 'not_configured' as const,
      accountId: null as string | null,
      sandbox: true,
      connectedAt: null as string | null,
    },
  };

  if (accounts) {
    const { deserializeAndDecrypt } = await import('../../services/credential-vault/index.js');

    for (const account of accounts) {
      // Decrypt credentials to get sandbox mode
      let sandbox = true;
      try {
        const credentials = deserializeAndDecrypt(account.credentials_encrypted);
        sandbox = credentials.sandbox !== false;
      } catch {
        // If decryption fails, default to sandbox
      }

      if (account.handler_type === 'visa_vic') {
        networks.visa = {
          configured: true,
          status: account.status as 'active' | 'inactive' | 'not_configured',
          accountId: account.id,
          sandbox,
          connectedAt: account.created_at,
        };
      } else if (account.handler_type === 'mastercard_agent_pay') {
        networks.mastercard = {
          configured: true,
          status: account.status as 'active' | 'inactive' | 'not_configured',
          accountId: account.id,
          sandbox,
          connectedAt: account.created_at,
        };
      }
    }
  }

  return c.json({
    networks,
    capabilities: {
      webBotAuth: true,
      paymentInstructions: networks.visa.configured,
      agentRegistration: networks.mastercard.configured,
      tokenization: networks.visa.configured || networks.mastercard.configured,
    },
  });
});

/**
 * POST /v1/cards/networks/:network/test
 * Test connection to a card network
 */
cards.post('/networks/:network/test', async (c) => {
  const ctx = c.get('ctx');
  const network = c.req.param('network') as 'visa' | 'mastercard';

  if (!['visa', 'mastercard'].includes(network)) {
    throw new ValidationError('Invalid network. Must be "visa" or "mastercard"');
  }

  const supabase = createClient();

  // Get credentials from connected account
  const handlerType = network === 'visa' ? 'visa_vic' : 'mastercard_agent_pay';
  const { data: account, error } = await supabase
    .from('connected_accounts')
    .select('credentials_encrypted')
    .eq('tenant_id', ctx.tenantId)
    .eq('handler_type', handlerType)
    .single();

  if (error || !account) {
    throw new NotFoundError(`${network} network not configured`);
  }

  // Decrypt and test
  const { deserializeAndDecrypt } = await import('../../services/credential-vault/index.js');
  const credentials = deserializeAndDecrypt(account.credentials_encrypted);

  let result: { success: boolean; error?: string };

  if (network === 'visa') {
    const { VisaVICClient } = await import('@payos/cards');
    const client = new VisaVICClient({
      apiKey: credentials.api_key as string,
      sharedSecret: credentials.shared_secret as string | undefined,
      sandbox: credentials.sandbox !== false,
    });
    result = await client.testConnection();
  } else {
    const { MastercardAgentPayClient } = await import('@payos/cards');
    const client = new MastercardAgentPayClient({
      consumerKey: credentials.consumer_key as string,
      privateKeyPem: credentials.private_key_pem as string | undefined,
      sandbox: credentials.sandbox !== false,
    });
    await client.initialize();
    result = await client.testConnection();
  }

  return c.json(result);
});

/**
 * POST /v1/cards/networks/:network/configure
 * Configure a card network with credentials
 */
cards.post('/networks/:network/configure', async (c) => {
  const ctx = c.get('ctx');
  const network = c.req.param('network') as 'visa' | 'mastercard';
  const body = await c.req.json();

  if (!['visa', 'mastercard'].includes(network)) {
    throw new ValidationError('Invalid network. Must be "visa" or "mastercard"');
  }

  const supabase = createClient();
  const handlerType = network === 'visa' ? 'visa_vic' : 'mastercard_agent_pay';
  const handlerName = network === 'visa' ? 'Visa Intelligent Commerce' : 'Mastercard Agent Pay';

  // Validate required credentials
  if (network === 'visa') {
    if (!body.api_key || body.api_key.length < 10) {
      throw new ValidationError('API key is required and must be at least 10 characters');
    }
  } else {
    if (!body.consumer_key || body.consumer_key.length < 10) {
      throw new ValidationError('Consumer key is required and must be at least 10 characters');
    }
  }

  // Check if already configured
  const { data: existing } = await supabase
    .from('connected_accounts')
    .select('id')
    .eq('tenant_id', ctx.tenantId)
    .eq('handler_type', handlerType)
    .single();

  // Encrypt credentials
  const { encryptAndSerialize } = await import('../../services/credential-vault/index.js');
  const encryptedCredentials = encryptAndSerialize(body);

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('connected_accounts')
      .update({
        credentials_encrypted: encryptedCredentials,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      throw new ApiError(`Failed to update ${network} configuration: ${error.message}`);
    }

    return c.json({ id: existing.id, message: `${handlerName} configuration updated` });
  } else {
    // Create new
    const { data, error } = await supabase
      .from('connected_accounts')
      .insert({
        tenant_id: ctx.tenantId,
        handler_type: handlerType,
        handler_name: handlerName,
        credentials_encrypted: encryptedCredentials,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) {
      throw new ApiError(`Failed to configure ${network}: ${error.message}`);
    }

    return c.json({ id: data.id, message: `${handlerName} configured successfully` });
  }
});

/**
 * DELETE /v1/cards/networks/:network/disconnect
 * Disconnect a card network
 */
cards.delete('/networks/:network/disconnect', async (c) => {
  const ctx = c.get('ctx');
  const network = c.req.param('network') as 'visa' | 'mastercard';

  if (!['visa', 'mastercard'].includes(network)) {
    throw new ValidationError('Invalid network. Must be "visa" or "mastercard"');
  }

  const supabase = createClient();
  const handlerType = network === 'visa' ? 'visa_vic' : 'mastercard_agent_pay';

  const { error } = await supabase
    .from('connected_accounts')
    .delete()
    .eq('tenant_id', ctx.tenantId)
    .eq('handler_type', handlerType);

  if (error) {
    throw new ApiError(`Failed to disconnect ${network}: ${error.message}`);
  }

  return c.json({ success: true, message: `${network} disconnected successfully` });
});

// ============================================
// Visa Payment Instructions
// ============================================

/**
 * POST /v1/cards/visa/instructions
 * Create a Visa VIC payment instruction
 */
cards.post('/visa/instructions', async (c) => {
  const ctx = c.get('ctx');
  const body = await c.req.json();

  const { amount, currency, merchant, restrictions, expiresInSeconds, metadata } = body;

  if (!amount || !currency || !merchant?.name || !merchant?.categoryCode) {
    throw new ValidationError('Missing required fields: amount, currency, merchant.name, merchant.categoryCode');
  }

  const supabase = createClient();

  // Get Visa credentials
  const { data: account, error } = await supabase
    .from('connected_accounts')
    .select('credentials_encrypted')
    .eq('tenant_id', ctx.tenantId)
    .eq('handler_type', 'visa_vic')
    .eq('status', 'active')
    .single();

  if (error || !account) {
    throw new ApiError('Visa VIC not configured or inactive', 400);
  }

  const { deserializeAndDecrypt } = await import('../../services/credential-vault/index.js');
  const credentials = deserializeAndDecrypt(account.credentials_encrypted);

  const { VisaVICClient } = await import('@payos/cards');
  const client = new VisaVICClient({
    apiKey: credentials.api_key as string,
    sandbox: credentials.sandbox !== false,
  });

  const instruction = await client.createPaymentInstruction({
    merchantRef: `payos_${ctx.tenantId.slice(0, 8)}_${Date.now()}`,
    amount,
    currency,
    merchant: {
      name: merchant.name,
      categoryCode: merchant.categoryCode,
      country: merchant.country || 'US',
      url: merchant.url,
    },
    restrictions,
    expiresInSeconds: expiresInSeconds || 900,
    metadata,
  });

  // Store the instruction
  await supabase.from('visa_payment_instructions').insert({
    tenant_id: ctx.tenantId,
    instruction_id: instruction.instructionId,
    merchant_ref: instruction.merchantRef,
    amount: instruction.amount,
    currency: instruction.currency,
    merchant_name: instruction.merchant.name,
    merchant_category_code: instruction.merchant.categoryCode,
    merchant_country: instruction.merchant.country,
    merchant_url: instruction.merchant.url,
    restrictions: instruction.restrictions,
    metadata: instruction.metadata,
    expires_at: instruction.expiresAt,
  });

  return c.json(instruction, 201);
});

/**
 * GET /v1/cards/visa/instructions
 * List Visa payment instructions
 */
cards.get('/visa/instructions', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  const status = c.req.query('status');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  let query = supabase
    .from('visa_payment_instructions')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query;

  if (error) {
    throw new ApiError('Failed to fetch instructions', 500);
  }

  return c.json({
    data: data || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
    },
  });
});

/**
 * GET /v1/cards/visa/instructions/:id
 * Get a specific Visa payment instruction
 */
cards.get('/visa/instructions/:id', async (c) => {
  const ctx = c.get('ctx');
  const instructionId = c.req.param('id');
  const supabase = createClient();

  const { data, error } = await supabase
    .from('visa_payment_instructions')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('instruction_id', instructionId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Payment instruction not found');
  }

  return c.json(data);
});

// ============================================
// Mastercard Agent Registration
// ============================================

/**
 * POST /v1/cards/mastercard/agents
 * Register an agent with Mastercard Agent Pay
 */
cards.post('/mastercard/agents', async (c) => {
  const ctx = c.get('ctx');
  const body = await c.req.json();

  const { agentId, agentName, publicKey, capabilities, provider, callbackUrl } = body;

  if (!agentId || !publicKey) {
    throw new ValidationError('Missing required fields: agentId, publicKey');
  }

  const supabase = createClient();

  // Verify the agent exists and belongs to this tenant
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name')
    .eq('id', agentId)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (agentError || !agent) {
    throw new NotFoundError('Agent not found');
  }

  // Get Mastercard credentials
  const { data: account, error } = await supabase
    .from('connected_accounts')
    .select('credentials_encrypted')
    .eq('tenant_id', ctx.tenantId)
    .eq('handler_type', 'mastercard_agent_pay')
    .eq('status', 'active')
    .single();

  if (error || !account) {
    throw new ApiError('Mastercard Agent Pay not configured or inactive', 400);
  }

  const { deserializeAndDecrypt } = await import('../../services/credential-vault/index.js');
  const credentials = deserializeAndDecrypt(account.credentials_encrypted);

  const { MastercardAgentPayClient } = await import('@payos/cards');
  const client = new MastercardAgentPayClient({
    consumerKey: credentials.consumer_key as string,
    privateKeyPem: credentials.private_key_pem as string | undefined,
    sandbox: credentials.sandbox !== false,
  });

  await client.initialize();

  const registration = await client.registerAgent({
    agentId,
    agentName: agentName || agent.name,
    publicKey,
    capabilities: capabilities || ['payment', 'tokenization'],
    provider,
    callbackUrl,
  });

  // Store the registration
  await supabase.from('mastercard_agents').insert({
    tenant_id: ctx.tenantId,
    agent_id: agentId,
    mc_agent_id: registration.mcAgentId,
    agent_name: agentName || agent.name,
    public_key: publicKey,
    capabilities: registration.capabilities,
    agent_status: registration.status,
    provider,
    callback_url: callbackUrl,
    registered_at: registration.registeredAt,
  });

  return c.json(registration, 201);
});

/**
 * GET /v1/cards/mastercard/agents
 * List registered Mastercard agents
 */
cards.get('/mastercard/agents', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  const { data, error } = await supabase
    .from('mastercard_agents')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiError('Failed to fetch agents', 500);
  }

  return c.json({ data: data || [] });
});

/**
 * GET /v1/cards/mastercard/agents/:id
 * Get a specific Mastercard agent registration
 */
cards.get('/mastercard/agents/:id', async (c) => {
  const ctx = c.get('ctx');
  const agentId = c.req.param('id');
  const supabase = createClient();

  const { data, error } = await supabase
    .from('mastercard_agents')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('agent_id', agentId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Agent registration not found');
  }

  return c.json(data);
});

// ============================================
// Transactions
// ============================================

/**
 * GET /v1/cards/transactions
 * List card network transactions
 */
cards.get('/transactions', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  const network = c.req.query('network');
  const status = c.req.query('status');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  let query = supabase
    .from('card_network_transactions')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (network) {
    query = query.eq('network', network);
  }
  if (status) {
    query = query.eq('status', status);
  }

  const { data, count, error } = await query;

  if (error) {
    throw new ApiError('Failed to fetch transactions', 500);
  }

  return c.json({
    data: data || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
    },
  });
});

/**
 * GET /v1/cards/transactions/:id
 * Get a specific card network transaction
 */
cards.get('/transactions/:id', async (c) => {
  const ctx = c.get('ctx');
  const transactionId = c.req.param('id');
  const supabase = createClient();

  const { data, error } = await supabase
    .from('card_network_transactions')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', transactionId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Transaction not found');
  }

  return c.json(data);
});

// ============================================
// Verification Stats
// ============================================

/**
 * GET /v1/cards/verifications/stats
 * Get verification statistics
 */
cards.get('/verifications/stats', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  const days = parseInt(c.req.query('days') || '30');

  const { data, error } = await supabase
    .from('card_agent_verifications')
    .select('network, verified, agent_provider, created_at')
    .eq('tenant_id', ctx.tenantId)
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    throw new ApiError('Failed to fetch verification stats', 500);
  }

  const stats = {
    total: data?.length || 0,
    successful: data?.filter((v) => v.verified).length || 0,
    failed: data?.filter((v) => !v.verified).length || 0,
    byNetwork: {
      visa: data?.filter((v) => v.network === 'visa').length || 0,
      mastercard: data?.filter((v) => v.network === 'mastercard').length || 0,
    },
    byProvider: {} as Record<string, number>,
  };

  // Count by provider
  for (const verification of data || []) {
    if (verification.agent_provider) {
      stats.byProvider[verification.agent_provider] = (stats.byProvider[verification.agent_provider] || 0) + 1;
    }
  }

  return c.json(stats);
});

// ============================================
// Analytics
// ============================================

/**
 * GET /v1/cards/analytics
 * Get comprehensive card network analytics
 */
cards.get('/analytics', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  const days = parseInt(c.req.query('days') || '30');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all data in parallel
  const [verificationsResult, transactionsResult, recentTxResult] = await Promise.all([
    // Verifications
    supabase
      .from('card_agent_verifications')
      .select('network, verified, agent_provider, created_at')
      .eq('tenant_id', ctx.tenantId)
      .gte('created_at', since),

    // Transactions - try card_network_transactions first, fall back to vaulted_card_transactions
    supabase
      .from('card_network_transactions')
      .select('id, network, status, amount, currency, created_at')
      .eq('tenant_id', ctx.tenantId)
      .gte('created_at', since),

    // Recent transactions for the table (last 10)
    supabase
      .from('card_network_transactions')
      .select('id, network, status, amount, currency, merchant_name, created_at')
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  // Process verifications
  const verifications = verificationsResult.data || [];
  const verificationStats = {
    total: verifications.length,
    successful: verifications.filter((v) => v.verified).length,
    successRate: verifications.length > 0
      ? Math.round((verifications.filter((v) => v.verified).length / verifications.length) * 100)
      : 0,
    byNetwork: {
      visa: verifications.filter((v) => v.network === 'visa').length,
      mastercard: verifications.filter((v) => v.network === 'mastercard').length,
    },
    byProvider: {} as Record<string, number>,
  };

  // Count by provider
  for (const verification of verifications) {
    if (verification.agent_provider) {
      verificationStats.byProvider[verification.agent_provider] =
        (verificationStats.byProvider[verification.agent_provider] || 0) + 1;
    }
  }

  // Process transactions
  const transactions = transactionsResult.data || [];
  const totalVolume = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const transactionStats = {
    total: transactions.length,
    volume: totalVolume,
    byStatus: {
      completed: transactions.filter((t) => t.status === 'completed').length,
      pending: transactions.filter((t) => t.status === 'pending').length,
      failed: transactions.filter((t) => t.status === 'failed' || t.status === 'declined').length,
    },
    byNetwork: {
      visa: transactions.filter((t) => t.network === 'visa').length,
      mastercard: transactions.filter((t) => t.network === 'mastercard').length,
    },
  };

  // Process recent transactions
  const recentTransactions = (recentTxResult.data || []).map((tx) => ({
    id: tx.id,
    network: tx.network,
    amount: tx.amount,
    currency: tx.currency,
    merchantName: tx.merchant_name || 'Unknown',
    status: tx.status,
    createdAt: tx.created_at,
  }));

  return c.json({
    verifications: verificationStats,
    transactions: transactionStats,
    recentTransactions,
    period: {
      days,
      from: since,
      to: new Date().toISOString(),
    },
  });
});

// ============================================
// Visa Token Management
// ============================================

/**
 * POST /v1/cards/visa/tokens
 * Provision a VTS token for an instruction
 */
cards.post('/visa/tokens', async (c) => {
  const ctx = c.get('ctx');
  const body = await c.req.json();
  const supabase = createClient();

  const { instructionId, cardToken, metadata } = body;

  if (!instructionId || !cardToken) {
    throw new ValidationError('Missing required fields: instructionId, cardToken');
  }

  // Verify the instruction exists and belongs to this tenant
  const { data: instruction, error: instructionError } = await supabase
    .from('visa_payment_instructions')
    .select('id, tenant_id, status')
    .eq('instruction_id', instructionId)
    .eq('tenant_id', ctx.tenantId)
    .single();

  if (instructionError || !instruction) {
    throw new NotFoundError('Payment instruction not found');
  }

  // Get Visa credentials
  const { data: account, error: accountError } = await supabase
    .from('connected_accounts')
    .select('credentials_encrypted')
    .eq('tenant_id', ctx.tenantId)
    .eq('handler_type', 'visa_vic')
    .eq('status', 'active')
    .single();

  if (accountError || !account) {
    throw new ApiError('Visa VIC not configured or inactive', 400);
  }

  const { deserializeAndDecrypt } = await import('../../services/credential-vault/index.js');
  const credentials = deserializeAndDecrypt(account.credentials_encrypted);

  const { VisaVICClient } = await import('@payos/cards');
  const client = new VisaVICClient({
    apiKey: credentials.api_key as string,
    sandbox: credentials.sandbox !== false,
  });

  // Provision the token
  const token = await client.provisionToken({
    instructionId,
    cardToken,
    metadata,
  });

  // Store the token
  await supabase.from('visa_agent_tokens').insert({
    tenant_id: ctx.tenantId,
    instruction_id: instructionId,
    vic_token_id: token.tokenId,
    card_last_four: token.cardLastFour || cardToken.slice(-4),
    token_status: 'active',
    metadata,
    provisioned_at: new Date().toISOString(),
    expires_at: token.expiresAt,
  });

  return c.json(token, 201);
});

/**
 * GET /v1/cards/visa/tokens
 * List Visa VTS tokens
 */
cards.get('/visa/tokens', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  const status = c.req.query('status');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  let query = supabase
    .from('visa_agent_tokens')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('provisioned_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('token_status', status);
  }

  const { data, count, error } = await query;

  if (error) {
    throw new ApiError('Failed to fetch tokens', 500);
  }

  return c.json({
    data: data || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
    },
  });
});

/**
 * GET /v1/cards/visa/tokens/:id
 * Get a specific Visa token
 */
cards.get('/visa/tokens/:id', async (c) => {
  const ctx = c.get('ctx');
  const tokenId = c.req.param('id');
  const supabase = createClient();

  const { data, error } = await supabase
    .from('visa_agent_tokens')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('vic_token_id', tokenId)
    .single();

  if (error || !data) {
    throw new NotFoundError('Token not found');
  }

  return c.json(data);
});

/**
 * DELETE /v1/cards/visa/tokens/:id
 * Suspend a Visa token
 */
cards.delete('/visa/tokens/:id', async (c) => {
  const ctx = c.get('ctx');
  const tokenId = c.req.param('id');
  const supabase = createClient();

  // Verify the token exists
  const { data: token, error: tokenError } = await supabase
    .from('visa_agent_tokens')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('vic_token_id', tokenId)
    .single();

  if (tokenError || !token) {
    throw new NotFoundError('Token not found');
  }

  // Get Visa credentials to call suspend API
  const { data: account } = await supabase
    .from('connected_accounts')
    .select('credentials_encrypted')
    .eq('tenant_id', ctx.tenantId)
    .eq('handler_type', 'visa_vic')
    .eq('status', 'active')
    .single();

  if (account) {
    try {
      const { deserializeAndDecrypt } = await import('../../services/credential-vault/index.js');
      const credentials = deserializeAndDecrypt(account.credentials_encrypted);

      const { VisaVICClient } = await import('@payos/cards');
      const client = new VisaVICClient({
        apiKey: credentials.api_key as string,
        sandbox: credentials.sandbox !== false,
      });

      await client.suspendToken(tokenId);
    } catch (e) {
      // Log but continue - token might already be suspended
      console.error('Failed to suspend token with Visa:', e);
    }
  }

  // Update local status
  await supabase
    .from('visa_agent_tokens')
    .update({ token_status: 'suspended' })
    .eq('vic_token_id', tokenId)
    .eq('tenant_id', ctx.tenantId);

  return c.json({ success: true, message: 'Token suspended' });
});

// ============================================
// Mastercard Token Management
// ============================================

/**
 * POST /v1/cards/mastercard/tokens
 * Create a Mastercard agentic token
 */
cards.post('/mastercard/tokens', async (c) => {
  const ctx = c.get('ctx');
  const body = await c.req.json();
  const supabase = createClient();

  const { agentId, cardToken, metadata, expiresInSeconds } = body;

  if (!agentId || !cardToken) {
    throw new ValidationError('Missing required fields: agentId, cardToken');
  }

  // Verify the agent is registered with Mastercard
  const { data: mcAgent, error: mcAgentError } = await supabase
    .from('mastercard_agents')
    .select('mc_agent_id, agent_status')
    .eq('tenant_id', ctx.tenantId)
    .eq('agent_id', agentId)
    .single();

  if (mcAgentError || !mcAgent) {
    throw new NotFoundError('Agent not registered with Mastercard');
  }

  if (mcAgent.agent_status !== 'active') {
    throw new ApiError('Agent is not active with Mastercard', 400);
  }

  // Get Mastercard credentials
  const { data: account, error: accountError } = await supabase
    .from('connected_accounts')
    .select('credentials_encrypted')
    .eq('tenant_id', ctx.tenantId)
    .eq('handler_type', 'mastercard_agent_pay')
    .eq('status', 'active')
    .single();

  if (accountError || !account) {
    throw new ApiError('Mastercard Agent Pay not configured or inactive', 400);
  }

  const { deserializeAndDecrypt } = await import('../../services/credential-vault/index.js');
  const credentials = deserializeAndDecrypt(account.credentials_encrypted);

  const { MastercardAgentPayClient } = await import('@payos/cards');
  const client = new MastercardAgentPayClient({
    consumerKey: credentials.consumer_key as string,
    privateKeyPem: credentials.private_key_pem as string | undefined,
    sandbox: credentials.sandbox !== false,
  });

  await client.initialize();

  // Create the agentic token with DTVC
  const token = await client.createAgenticToken({
    mcAgentId: mcAgent.mc_agent_id,
    cardToken,
    expiresInSeconds: expiresInSeconds || 3600, // 1 hour default
    metadata,
  });

  // Store the token
  const expiresAt = new Date(Date.now() + (expiresInSeconds || 3600) * 1000).toISOString();
  await supabase.from('mastercard_agentic_tokens').insert({
    tenant_id: ctx.tenantId,
    mc_agent_id: mcAgent.mc_agent_id,
    token_reference: token.tokenReference,
    dtvc: token.dtvc,
    card_last_four: cardToken.slice(-4),
    token_status: 'active',
    metadata,
    expires_at: expiresAt,
  });

  return c.json({
    tokenReference: token.tokenReference,
    mcAgentId: mcAgent.mc_agent_id,
    dtvc: token.dtvc,
    expiresAt,
    status: 'active',
  }, 201);
});

/**
 * GET /v1/cards/mastercard/tokens
 * List Mastercard agentic tokens
 */
cards.get('/mastercard/tokens', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient();

  const status = c.req.query('status');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const offset = parseInt(c.req.query('offset') || '0');

  let query = supabase
    .from('mastercard_agentic_tokens')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('token_status', status);
  }

  const { data, count, error } = await query;

  if (error) {
    throw new ApiError('Failed to fetch tokens', 500);
  }

  return c.json({
    data: data || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
    },
  });
});

/**
 * GET /v1/cards/mastercard/tokens/:id
 * Get a specific Mastercard token with fresh DTVC
 */
cards.get('/mastercard/tokens/:id', async (c) => {
  const ctx = c.get('ctx');
  const tokenRef = c.req.param('id');
  const refreshDtvc = c.req.query('refresh') === 'true';
  const supabase = createClient();

  const { data: token, error } = await supabase
    .from('mastercard_agentic_tokens')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('token_reference', tokenRef)
    .single();

  if (error || !token) {
    throw new NotFoundError('Token not found');
  }

  // If refreshing DTVC
  if (refreshDtvc && token.token_status === 'active') {
    const { data: account } = await supabase
      .from('connected_accounts')
      .select('credentials_encrypted')
      .eq('tenant_id', ctx.tenantId)
      .eq('handler_type', 'mastercard_agent_pay')
      .eq('status', 'active')
      .single();

    if (account) {
      try {
        const { deserializeAndDecrypt } = await import('../../services/credential-vault/index.js');
        const credentials = deserializeAndDecrypt(account.credentials_encrypted);

        const { MastercardAgentPayClient } = await import('@payos/cards');
        const client = new MastercardAgentPayClient({
          consumerKey: credentials.consumer_key as string,
          privateKeyPem: credentials.private_key_pem as string | undefined,
          sandbox: credentials.sandbox !== false,
        });

        await client.initialize();

        const newDtvc = await client.refreshDTVC(token.token_reference);

        // Update stored DTVC
        await supabase
          .from('mastercard_agentic_tokens')
          .update({ dtvc: newDtvc.dtvc })
          .eq('token_reference', tokenRef)
          .eq('tenant_id', ctx.tenantId);

        return c.json({ ...token, dtvc: newDtvc.dtvc });
      } catch (e) {
        console.error('Failed to refresh DTVC:', e);
        // Return existing token without refresh
      }
    }
  }

  return c.json(token);
});

/**
 * DELETE /v1/cards/mastercard/tokens/:id
 * Revoke a Mastercard token
 */
cards.delete('/mastercard/tokens/:id', async (c) => {
  const ctx = c.get('ctx');
  const tokenRef = c.req.param('id');
  const supabase = createClient();

  // Verify the token exists
  const { data: token, error: tokenError } = await supabase
    .from('mastercard_agentic_tokens')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('token_reference', tokenRef)
    .single();

  if (tokenError || !token) {
    throw new NotFoundError('Token not found');
  }

  // Get Mastercard credentials to call revoke API
  const { data: account } = await supabase
    .from('connected_accounts')
    .select('credentials_encrypted')
    .eq('tenant_id', ctx.tenantId)
    .eq('handler_type', 'mastercard_agent_pay')
    .eq('status', 'active')
    .single();

  if (account) {
    try {
      const { deserializeAndDecrypt } = await import('../../services/credential-vault/index.js');
      const credentials = deserializeAndDecrypt(account.credentials_encrypted);

      const { MastercardAgentPayClient } = await import('@payos/cards');
      const client = new MastercardAgentPayClient({
        consumerKey: credentials.consumer_key as string,
        privateKeyPem: credentials.private_key_pem as string | undefined,
        sandbox: credentials.sandbox !== false,
      });

      await client.initialize();
      await client.revokeToken(tokenRef);
    } catch (e) {
      // Log but continue - token might already be revoked
      console.error('Failed to revoke token with Mastercard:', e);
    }
  }

  // Update local status
  await supabase
    .from('mastercard_agentic_tokens')
    .update({ token_status: 'revoked' })
    .eq('token_reference', tokenRef)
    .eq('tenant_id', ctx.tenantId);

  return c.json({ success: true, message: 'Token revoked' });
});

export { cards };
export default cards;
