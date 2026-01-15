/**
 * Authentication "Who Am I" Endpoint
 * 
 * Returns information about the authenticated user/agent based on their API key.
 * Used by SDKs to auto-configure accountId, walletId, etc.
 * 
 * Epic 24 Story 24.3: Authentication Endpoint for SDKs
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';

const app = new Hono();

/**
 * GET /v1/auth/me
 * Returns authenticated user/agent information
 * 
 * Response for user key (pk_):
 * {
 *   "type": "user",
 *   "userId": "user_123",
 *   "accountId": "acc_456",  // For provider SDK
 *   "organizationId": "org_789",
 *   "permissions": ["admin", "read", "write"]
 * }
 * 
 * Response for agent key (ak_):
 * {
 *   "type": "agent",
 *   "agentId": "agt_789",
 *   "accountId": "acc_456",  // Parent account
 *   "walletId": "wal_abc123",  // For consumer SDK
 *   "organizationId": "org_456",
 *   "permissions": ["x402:pay", "wallet:read"]
 * }
 */
app.get('/me', authMiddleware, async (c) => {
  const actorType = c.get('actorType');
  const actorId = c.get('actorId');
  const tenantId = c.get('tenantId');
  const supabase = c.get('supabase');
  
  if (actorType === 'user') {
    // User key - get user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('id, tenant_id, name, role, email')
      .eq('id', actorId)
      .single();
    
    if (error || !profile) {
      return c.json({ error: 'User profile not found' }, 404);
    }
    
    // Get user's primary account (for provider SDK)
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, type')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(1);
    
    const accountId = accounts?.[0]?.id;
    
    return c.json({
      data: {
        type: 'user',
        userId: profile.id,
        accountId: accountId || null,
        organizationId: profile.tenant_id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        permissions: ['admin', 'read', 'write'] // TODO: Implement granular permissions
      }
    });
  }
  
  if (actorType === 'agent') {
    // Agent key - get agent details
    const { data: agent, error } = await supabase
      .from('agents')
      .select(`
        id,
        name,
        type,
        status,
        parent_account_id,
        tenant_id,
        x402_enabled
      `)
      .eq('id', actorId)
      .single();
    
    if (error || !agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    
    // Get agent's assigned wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance, currency')
      .eq('managed_by_agent_id', actorId)
      .eq('status', 'active')
      .single();
    
    return c.json({
      data: {
        type: 'agent',
        agentId: agent.id,
        accountId: agent.parent_account_id,
        walletId: wallet?.id || null,
        walletBalance: wallet?.balance || 0,
        walletCurrency: wallet?.currency || 'USDC',
        organizationId: agent.tenant_id,
        name: agent.name,
        status: agent.status,
        x402Enabled: agent.x402_enabled,
        permissions: ['x402:pay', 'wallet:read', 'transactions:view']
      }
    });
  }
  
  // System or unknown type
  return c.json({ error: 'Unsupported authentication type' }, 400);
});

export default app;





