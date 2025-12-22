/**
 * x402 Payment Flow & Protocol Handler
 * 
 * Implements the x402 protocol for HTTP 402 "Payment Required" responses.
 * Handles payment authorization, verification, and processing.
 * 
 * Spec: https://www.x402.org/x402-whitepaper.pdf
 * 
 * Flow:
 * 1. Consumer calls protected endpoint
 * 2. Endpoint returns 402 with payment details
 * 3. Consumer calls POST /x402/pay with payment authorization
 * 4. PayOS validates, deducts from wallet, credits provider
 * 5. Consumer retries original request with proof of payment
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

// x402 Payment Authorization (EIP-712-inspired structure)
const paymentAuthorizationSchema = z.object({
  // Payment Details
  endpointId: z.string().uuid(),
  requestId: z.string().uuid(), // Idempotency key
  amount: z.number().positive(),
  currency: z.enum(['USDC', 'EURC']),
  
  // Wallet
  walletId: z.string().uuid(),
  
  // Request Context
  method: z.string(),
  path: z.string(),
  timestamp: z.number().int().positive(),
  
  // Optional metadata
  metadata: z.object({
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    region: z.string().optional()
  }).optional(),
  
  // Signature (Phase 2: EIP-712, Phase 1: simplified)
  signature: z.string().optional()
});

const verifyPaymentSchema = z.object({
  requestId: z.string().uuid(),
  transferId: z.string().uuid()
});

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate final price with volume discounts
 */
function calculatePrice(
  basePrice: number,
  volumeDiscounts: any[],
  totalCalls: number
): number {
  if (!volumeDiscounts || volumeDiscounts.length === 0) {
    return basePrice;
  }
  
  // Find applicable discount tier (highest threshold not exceeding totalCalls)
  const applicableTier = volumeDiscounts
    .filter(tier => tier.threshold <= totalCalls)
    .sort((a, b) => b.threshold - a.threshold)[0];
  
  if (!applicableTier) {
    return basePrice;
  }
  
  return basePrice * applicableTier.priceMultiplier;
}

/**
 * Validate payment authorization signature (Phase 2)
 * For Phase 1, we skip signature verification
 */
function validateSignature(
  authorization: any,
  signature?: string
): boolean {
  // Phase 1: Skip signature validation (internal ledger)
  // Phase 2: Implement EIP-712 signature verification
  
  if (process.env.X402_PHASE === 'production') {
    // TODO: Implement EIP-712 signature verification
    // This would verify that the wallet owner signed this exact payment
    console.warn('⚠️  EIP-712 signature verification not implemented (Phase 2)');
  }
  
  return true; // Phase 1: Trust internal auth
}

/**
 * Check spending policy constraints
 */
async function checkSpendingPolicy(
  supabase: any,
  wallet: any,
  amount: number,
  endpointPath: string,
  endpointId?: string
): Promise<{ allowed: boolean; reason?: string }> {
  const policy = wallet.spending_policy;
  
  if (!policy) {
    return { allowed: true }; // No policy = no restrictions
  }
  
  // Check approved endpoints (x402 specific)
  if (policy.approvedEndpoints && policy.approvedEndpoints.length > 0 && endpointId) {
    const isApproved = policy.approvedEndpoints.includes(endpointId);
    
    if (!isApproved) {
      return {
        allowed: false,
        reason: `Endpoint not in approved endpoints list`
      };
    }
  }
  
  // Check requires approval threshold (both names for compatibility)
  const approvalThreshold = policy.approvalThreshold || policy.requiresApprovalAbove;
  if (approvalThreshold && amount > approvalThreshold) {
    return {
      allowed: false,
      reason: `Amount ${amount} exceeds approval threshold ${approvalThreshold}`
    };
  }
  
  // Check approved vendors
  if (policy.approvedVendors && policy.approvedVendors.length > 0) {
    const isApproved = policy.approvedVendors.some((vendor: string) =>
      endpointPath.includes(vendor)
    );
    
    if (!isApproved) {
      return {
        allowed: false,
        reason: `Endpoint not in approved vendors list`
      };
    }
  }
  
  // Check daily spend limit
  if (policy.dailySpendLimit) {
    const dailySpent = policy.dailySpent || 0;
    
    if (dailySpent + amount > policy.dailySpendLimit) {
      return {
        allowed: false,
        reason: `Would exceed daily spend limit (${dailySpent + amount} > ${policy.dailySpendLimit})`
      };
    }
  }
  
  // Check monthly spend limit
  if (policy.monthlySpendLimit) {
    const monthlySpent = policy.monthlySpent || 0;
    
    if (monthlySpent + amount > policy.monthlySpendLimit) {
      return {
        allowed: false,
        reason: `Would exceed monthly spend limit (${monthlySpent + amount} > ${policy.monthlySpendLimit})`
      };
    }
  }
  
  return { allowed: true };
}

/**
 * Update spending policy counters
 */
function updateSpendingPolicyCounters(
  policy: any,
  amount: number
): any {
  if (!policy) return null;
  
  const now = new Date();
  const updated = { ...policy };
  
  // Update daily spent
  if (policy.dailySpendLimit) {
    const resetTime = policy.dailyResetAt ? new Date(policy.dailyResetAt) : null;
    
    if (!resetTime || now > resetTime) {
      // Reset daily counter
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      updated.dailySpent = amount;
      updated.dailyResetAt = tomorrow.toISOString();
    } else {
      updated.dailySpent = (policy.dailySpent || 0) + amount;
    }
  }
  
  // Update monthly spent
  if (policy.monthlySpendLimit) {
    const resetTime = policy.monthlyResetAt ? new Date(policy.monthlyResetAt) : null;
    
    if (!resetTime || now > resetTime) {
      // Reset monthly counter
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);
      
      updated.monthlySpent = amount;
      updated.monthlyResetAt = nextMonth.toISOString();
    } else {
      updated.monthlySpent = (policy.monthlySpent || 0) + amount;
    }
  }
  
  return updated;
}

// ============================================
// Routes
// ============================================

/**
 * POST /v1/x402/pay
 * Process an x402 payment
 * 
 * This is called by the consumer after receiving a 402 response from the provider.
 */
app.post('/pay', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();
    
    // Validate request
    const auth = paymentAuthorizationSchema.parse(body);
    
    const supabase = createClient();
    
    // ============================================
    // 1. IDEMPOTENCY CHECK
    // ============================================
    
    // Check if this requestId was already processed
    const { data: existingTransfer } = await supabase
      .from('transfers')
      .select('id, status, amount, currency')
      .eq('request_id', auth.requestId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (existingTransfer) {
      if (existingTransfer.status === 'completed') {
        // Already processed successfully
        return c.json({
          success: true,
          message: 'Payment already processed (idempotent)',
          data: {
            requestId: auth.requestId,
            transferId: existingTransfer.id,
            amount: parseFloat(existingTransfer.amount),
            currency: existingTransfer.currency,
            status: 'completed'
          }
        }, 200);
      } else {
        // Payment failed or pending - allow retry
        console.log(`Retrying failed/pending payment: ${auth.requestId}`);
      }
    }
    
    // ============================================
    // 2. FETCH & VALIDATE ENDPOINT
    // ============================================
    
    const { data: endpoint, error: endpointError } = await supabase
      .from('x402_endpoints')
      .select('*')
      .eq('id', auth.endpointId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (endpointError || !endpoint) {
      return c.json({
        error: 'Endpoint not found',
        code: 'ENDPOINT_NOT_FOUND'
      }, 404);
    }
    
    if (endpoint.status !== 'active') {
      return c.json({
        error: 'Endpoint is not active',
        status: endpoint.status,
        code: 'ENDPOINT_INACTIVE'
      }, 400);
    }
    
    // ============================================
    // 3. CALCULATE PRICE
    // ============================================
    
    const price = calculatePrice(
      parseFloat(endpoint.base_price),
      endpoint.volume_discounts || [],
      endpoint.total_calls
    );
    
    // Validate amount matches calculated price
    if (Math.abs(auth.amount - price) > 0.0001) {
      return c.json({
        error: 'Payment amount does not match endpoint price',
        expected: price,
        provided: auth.amount,
        code: 'AMOUNT_MISMATCH'
      }, 400);
    }
    
    // Validate currency matches
    if (auth.currency !== endpoint.currency) {
      return c.json({
        error: 'Currency mismatch',
        expected: endpoint.currency,
        provided: auth.currency,
        code: 'CURRENCY_MISMATCH'
      }, 400);
    }
    
    // ============================================
    // 4. FETCH & VALIDATE WALLET
    // ============================================
    
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', auth.walletId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (walletError || !wallet) {
      return c.json({
        error: 'Wallet not found',
        code: 'WALLET_NOT_FOUND'
      }, 404);
    }
    
    if (wallet.status !== 'active') {
      return c.json({
        error: 'Wallet is not active',
        status: wallet.status,
        code: 'WALLET_INACTIVE'
      }, 400);
    }
    
    // Check sufficient balance
    const walletBalance = parseFloat(wallet.balance);
    if (walletBalance < auth.amount) {
      return c.json({
        error: 'Insufficient wallet balance',
        available: walletBalance,
        required: auth.amount,
        code: 'INSUFFICIENT_BALANCE'
      }, 400);
    }
    
    // ============================================
    // 5. VALIDATE SIGNATURE (Phase 2)
    // ============================================
    
    if (!validateSignature(auth, auth.signature)) {
      return c.json({
        error: 'Invalid payment signature',
        code: 'INVALID_SIGNATURE'
      }, 401);
    }
    
    // ============================================
    // 6. CHECK SPENDING POLICY
    // ============================================
    
    const policyCheck = await checkSpendingPolicy(
      supabase,
      wallet,
      auth.amount,
      endpoint.path,
      endpoint.id
    );
    
    if (!policyCheck.allowed) {
      return c.json({
        error: 'Payment blocked by spending policy',
        reason: policyCheck.reason,
        code: 'POLICY_VIOLATION'
      }, 403);
    }
    
    // ============================================
    // 7. PROCESS PAYMENT (Internal Transfer)
    // ============================================
    
    // Deduct from wallet
    const newWalletBalance = walletBalance - auth.amount;
    const newWalletStatus = newWalletBalance === 0 ? 'depleted' : 'active';
    
    const { error: walletUpdateError } = await supabase
      .from('wallets')
      .update({
        balance: newWalletBalance,
        status: newWalletStatus,
        spending_policy: updateSpendingPolicyCounters(wallet.spending_policy, auth.amount),
        updated_at: new Date().toISOString()
      })
      .eq('id', auth.walletId)
      .eq('tenant_id', ctx.tenantId);
    
    if (walletUpdateError) {
      console.error('Error updating wallet balance:', walletUpdateError);
      return c.json({
        error: 'Failed to process payment',
        code: 'PAYMENT_FAILED'
      }, 500);
    }
    
    // Create transfer record
    const { data: transfer, error: transferError } = await supabase
      .from('transfers')
      .insert({
        tenant_id: ctx.tenantId,
        request_id: auth.requestId,
        from_account_id: wallet.owner_account_id,
        to_account_id: endpoint.account_id,
        amount: auth.amount,
        currency: auth.currency,
        type: 'x402',
        status: 'completed',
        description: `x402 payment: ${endpoint.name}`,
        x402_metadata: {
          endpoint_id: endpoint.id,
          endpoint_path: endpoint.path,
          endpoint_method: auth.method,
          wallet_id: wallet.id,
          request_id: auth.requestId,
          timestamp: auth.timestamp,
          metadata: auth.metadata,
          price_calculated: price,
          volume_tier: endpoint.total_calls
        }
      })
      .select()
      .single();
    
    if (transferError) {
      console.error('Error creating transfer record:', transferError);
      // Note: Wallet balance already updated - this is a consistency issue
      // In production, use database transactions
      return c.json({
        error: 'Payment processed but failed to create record',
        code: 'RECORD_FAILED'
      }, 500);
    }
    
    // ============================================
    // 8. UPDATE ENDPOINT STATS
    // ============================================
    
    await supabase
      .from('x402_endpoints')
      .update({
        total_calls: endpoint.total_calls + 1,
        total_revenue: parseFloat(endpoint.total_revenue) + auth.amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', endpoint.id)
      .eq('tenant_id', ctx.tenantId);
    
    // ============================================
    // 9. TRIGGER WEBHOOK (if configured)
    // ============================================
    
    if (endpoint.webhook_url) {
      // Fire and forget webhook (don't block response)
      fetch(endpoint.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PayOS-Event': 'x402.payment.completed',
          'X-PayOS-Request-ID': auth.requestId
        },
        body: JSON.stringify({
          event: 'x402.payment.completed',
          timestamp: new Date().toISOString(),
          data: {
            transferId: transfer.id,
            requestId: auth.requestId,
            endpointId: endpoint.id,
            amount: auth.amount,
            currency: auth.currency,
            from: wallet.owner_account_id,
            to: endpoint.account_id
          }
        })
      }).catch(err => {
        console.error('Webhook delivery failed:', err);
      });
    }
    
    // ============================================
    // 10. RETURN SUCCESS
    // ============================================
    
    return c.json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        transferId: transfer.id,
        requestId: auth.requestId,
        amount: auth.amount,
        currency: auth.currency,
        endpointId: endpoint.id,
        walletId: wallet.id,
        newWalletBalance: newWalletBalance,
        timestamp: transfer.created_at,
        
        // Proof of payment (for retrying original request)
        proof: {
          paymentId: transfer.id,
          signature: `payos:${transfer.id}:${auth.requestId}` // Phase 1: simple proof
        }
      }
    }, 200);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Validation failed',
        details: error.errors,
        code: 'VALIDATION_ERROR'
      }, 400);
    }
    console.error('Error in POST /v1/x402/pay:', error);
    return c.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, 500);
  }
});

/**
 * POST /v1/x402/verify
 * Verify a payment has been completed
 * 
 * This can be called by providers to verify a payment before serving content.
 */
app.post('/verify', async (c) => {
  try {
    const ctx = c.get('ctx');
    const body = await c.req.json();
    
    // Validate request
    const { requestId, transferId } = verifyPaymentSchema.parse(body);
    
    const supabase = createClient();
    
    // Fetch transfer
    const { data: transfer, error } = await supabase
      .from('transfers')
      .select('id, status, amount, currency, from_account_id, to_account_id, created_at, x402_metadata')
      .eq('id', transferId)
      .eq('request_id', requestId)
      .eq('tenant_id', ctx.tenantId)
      .eq('type', 'x402')
      .single();
    
    if (error || !transfer) {
      return c.json({
        verified: false,
        error: 'Payment not found',
        code: 'PAYMENT_NOT_FOUND'
      }, 404);
    }
    
    const verified = transfer.status === 'completed';
    
    return c.json({
      verified,
      data: verified ? {
        transferId: transfer.id,
        requestId,
        amount: parseFloat(transfer.amount),
        currency: transfer.currency,
        from: transfer.from_account_id,
        to: transfer.to_account_id,
        endpointId: transfer.x402_metadata?.endpoint_id,
        timestamp: transfer.created_at,
        status: transfer.status
      } : null
    }, verified ? 200 : 402);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({
        error: 'Validation failed',
        details: error.errors,
        code: 'VALIDATION_ERROR'
      }, 400);
    }
    console.error('Error in POST /v1/x402/verify:', error);
    return c.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, 500);
  }
});

/**
 * GET /v1/x402/quote/:endpointId
 * Get pricing quote for an endpoint (for consumers to know price before paying)
 */
app.get('/quote/:endpointId', async (c) => {
  try {
    const ctx = c.get('ctx');
    const endpointId = c.req.param('endpointId');
    const supabase = createClient();
    
    // Fetch endpoint
    const { data: endpoint, error } = await supabase
      .from('x402_endpoints')
      .select('id, name, path, method, base_price, currency, volume_discounts, status, total_calls')
      .eq('id', endpointId)
      .eq('tenant_id', ctx.tenantId)
      .single();
    
    if (error || !endpoint) {
      return c.json({
        error: 'Endpoint not found',
        code: 'ENDPOINT_NOT_FOUND'
      }, 404);
    }
    
    if (endpoint.status !== 'active') {
      return c.json({
        error: 'Endpoint is not active',
        status: endpoint.status,
        code: 'ENDPOINT_INACTIVE'
      }, 400);
    }
    
    // Calculate current price
    const price = calculatePrice(
      parseFloat(endpoint.base_price),
      endpoint.volume_discounts || [],
      endpoint.total_calls
    );
    
    return c.json({
      data: {
        endpointId: endpoint.id,
        name: endpoint.name,
        path: endpoint.path,
        method: endpoint.method,
        basePrice: parseFloat(endpoint.base_price),
        currentPrice: price,
        currency: endpoint.currency,
        volumeDiscounts: endpoint.volume_discounts || [],
        totalCalls: endpoint.total_calls
      }
    });
    
  } catch (error) {
    console.error('Error in GET /v1/x402/quote/:endpointId:', error);
    return c.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, 500);
  }
});

export default app;

