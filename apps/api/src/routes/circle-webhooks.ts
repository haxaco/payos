/**
 * Circle Webhook Handler
 * Story 40.5: Circle Webhook Handler Implementation
 * 
 * Handles incoming webhooks from Circle for:
 * - Payout status updates (Pix, SPEI)
 * - Transfer confirmations
 * - Wallet state changes
 * 
 * Docs: https://developers.circle.com/circle-mint/docs/webhooks-quickstart
 */

import { Hono } from 'hono';
import crypto from 'crypto';
import { createClient } from '../db/client.js';

const app = new Hono();

// ============================================
// Types
// ============================================

interface CircleWebhookEvent {
  subscriptionId: string;
  notificationId: string;
  notificationType: string;
  notification: {
    id?: string;
    payout?: CirclePayoutNotification;
    transfer?: CircleTransferNotification;
    wallet?: CircleWalletNotification;
  };
}

interface CirclePayoutNotification {
  id: string;
  sourceWalletId: string;
  destination: {
    type: 'pix' | 'spei' | 'wire';
    [key: string]: any;
  };
  amount: {
    amount: string;
    currency: string;
  };
  fees?: {
    amount: string;
    currency: string;
  };
  status: 'pending' | 'confirmed' | 'complete' | 'failed' | 'returned';
  trackingRef?: string;
  externalRef?: string;
  errorCode?: string;
  riskEvaluation?: {
    decision: string;
    reason?: string;
  };
  return?: {
    id: string;
    payoutId: string;
    status: string;
    reason: string;
    createDate: string;
  };
  createDate: string;
  updateDate: string;
}

interface CircleTransferNotification {
  id: string;
  source: {
    type: string;
    id?: string;
    address?: string;
  };
  destination: {
    type: string;
    id?: string;
    address?: string;
  };
  amount: {
    amount: string;
    currency: string;
  };
  status: string;
  transactionHash?: string;
  createDate: string;
  updateDate: string;
}

interface CircleWalletNotification {
  id: string;
  address: string;
  blockchain: string;
  state: 'LIVE' | 'FROZEN';
  createDate: string;
  updateDate: string;
}

// ============================================
// Signature Verification
// ============================================

/**
 * Verify Circle webhook signature
 * Docs: https://developers.circle.com/circle-mint/docs/verifying-requests
 */
function verifyCircleSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Circle uses HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[CircleWebhook] Signature verification error:', error);
    return false;
  }
}

// ============================================
// Event Handlers
// ============================================

/**
 * Handle payout status update
 */
async function handlePayoutUpdate(
  payout: CirclePayoutNotification,
  supabase: any
): Promise<void> {
  console.log(`[CircleWebhook] Payout ${payout.id} status: ${payout.status}`);
  
  // Update settlement record
  const { error } = await supabase
    .from('settlements')
    .update({
      status: payout.status,
      provider_response: payout,
      updated_at: new Date().toISOString(),
      ...(payout.status === 'complete' && { completed_at: new Date().toISOString() }),
      ...(payout.status === 'failed' && { failed_at: new Date().toISOString() }),
      ...(payout.return && { return_details: payout.return }),
    })
    .eq('external_id', payout.id);
  
  if (error) {
    console.error('[CircleWebhook] Failed to update settlement:', error);
    throw error;
  }
  
  // If linked to a transfer, update transfer status
  const { data: settlement } = await supabase
    .from('settlements')
    .select('transfer_id, tenant_id')
    .eq('external_id', payout.id)
    .single();
  
  if (settlement?.transfer_id) {
    await supabase
      .from('transfers')
      .update({
        status: mapPayoutStatusToTransferStatus(payout.status),
        updated_at: new Date().toISOString(),
      })
      .eq('id', settlement.transfer_id);
    
    // Queue internal webhook for tenant
    await queueTenantWebhook(supabase, settlement.tenant_id, {
      type: mapPayoutStatusToEventType(payout.status),
      data: {
        payoutId: payout.id,
        transferId: settlement.transfer_id,
        status: payout.status,
        amount: payout.amount,
        destination: payout.destination,
        ...(payout.return && { return: payout.return }),
        ...(payout.errorCode && { errorCode: payout.errorCode }),
      },
    });
  }
}

/**
 * Handle transfer notification
 */
async function handleTransferUpdate(
  transfer: CircleTransferNotification,
  supabase: any
): Promise<void> {
  console.log(`[CircleWebhook] Transfer ${transfer.id} status: ${transfer.status}`);
  
  // Find related settlement or transfer by Circle transfer ID
  const { data: settlement } = await supabase
    .from('settlements')
    .select('transfer_id, tenant_id')
    .eq('external_id', transfer.id)
    .single();
  
  if (settlement?.transfer_id) {
    await supabase
      .from('transfers')
      .update({
        settlement_status: transfer.status,
        settlement_metadata: {
          circle_transfer_id: transfer.id,
          transaction_hash: transfer.transactionHash,
          updated_at: transfer.updateDate,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', settlement.transfer_id);
  }
}

/**
 * Handle wallet state change
 */
async function handleWalletUpdate(
  wallet: CircleWalletNotification,
  supabase: any
): Promise<void> {
  console.log(`[CircleWebhook] Wallet ${wallet.id} state: ${wallet.state}`);
  
  // Update wallet status in our system
  await supabase
    .from('wallets')
    .update({
      status: wallet.state === 'LIVE' ? 'active' : 'frozen',
      provider_metadata: {
        circle_state: wallet.state,
        last_circle_update: wallet.updateDate,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('provider_wallet_id', wallet.id);
}

// ============================================
// Helper Functions
// ============================================

function mapPayoutStatusToTransferStatus(payoutStatus: string): string {
  const statusMap: Record<string, string> = {
    pending: 'pending',
    confirmed: 'processing',
    complete: 'completed',
    failed: 'failed',
    returned: 'failed',
  };
  return statusMap[payoutStatus] || 'pending';
}

function mapPayoutStatusToEventType(payoutStatus: string): string {
  const eventMap: Record<string, string> = {
    pending: 'settlement.initiated',
    confirmed: 'settlement.processing',
    complete: 'settlement.completed',
    failed: 'settlement.failed',
    returned: 'settlement.returned',
  };
  return eventMap[payoutStatus] || 'settlement.updated';
}

async function queueTenantWebhook(
  supabase: any,
  tenantId: string,
  event: { type: string; data: any }
): Promise<void> {
  // Get tenant's webhook endpoints subscribed to settlement events
  const { data: endpoints } = await supabase
    .from('webhook_endpoints')
    .select('id, url')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .or(`events.cs.{${event.type}},events.cs.{settlement.*},events.cs.{*}`);
  
  if (!endpoints || endpoints.length === 0) {
    return;
  }
  
  // Queue webhook deliveries
  const deliveries = endpoints.map((endpoint: any) => ({
    tenant_id: tenantId,
    endpoint_id: endpoint.id,
    endpoint_url: endpoint.url,
    event_type: event.type,
    event_id: crypto.randomUUID(),
    payload: {
      type: event.type,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      data: event.data,
    },
    status: 'pending',
  }));
  
  await supabase.from('webhook_deliveries').insert(deliveries);
}

// ============================================
// Routes
// ============================================

/**
 * POST /webhooks/circle
 * Circle webhook receiver endpoint
 * 
 * This endpoint is public (no auth) but verifies Circle signatures
 */
app.post('/', async (c) => {
  try {
    // Get raw body for signature verification
    const rawBody = await c.req.text();
    
    // Get Circle signature header
    const signature = c.req.header('Circle-Signature');
    
    // Get webhook secret from environment
    const webhookSecret = process.env.CIRCLE_WEBHOOK_SECRET;
    
    // Verify signature if secret is configured
    if (webhookSecret && signature) {
      if (!verifyCircleSignature(rawBody, signature, webhookSecret)) {
        console.warn('[CircleWebhook] Invalid signature');
        return c.json({ error: 'Invalid signature' }, 401);
      }
    } else if (webhookSecret && !signature) {
      console.warn('[CircleWebhook] Missing signature header');
      return c.json({ error: 'Missing signature' }, 401);
    }
    
    // Parse event
    const event: CircleWebhookEvent = JSON.parse(rawBody);
    
    console.log(`[CircleWebhook] Received: ${event.notificationType} (${event.notificationId})`);
    
    const supabase = createClient();
    
    // Check for duplicate notification (idempotency)
    const { data: existing } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('external_id', event.notificationId)
      .eq('source', 'circle')
      .single();
    
    if (existing) {
      console.log(`[CircleWebhook] Duplicate notification: ${event.notificationId}`);
      return c.json({ received: true, duplicate: true });
    }
    
    // Record the webhook event
    await supabase.from('webhook_events').insert({
      external_id: event.notificationId,
      source: 'circle',
      event_type: event.notificationType,
      payload: event,
      status: 'processing',
    });
    
    // Handle event by type
    try {
      switch (event.notificationType) {
        case 'payouts':
          if (event.notification.payout) {
            await handlePayoutUpdate(event.notification.payout, supabase);
          }
          break;
          
        case 'transfers':
          if (event.notification.transfer) {
            await handleTransferUpdate(event.notification.transfer, supabase);
          }
          break;
          
        case 'wallets':
          if (event.notification.wallet) {
            await handleWalletUpdate(event.notification.wallet, supabase);
          }
          break;
          
        default:
          console.log(`[CircleWebhook] Unknown event type: ${event.notificationType}`);
      }
      
      // Mark event as processed
      await supabase
        .from('webhook_events')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('external_id', event.notificationId)
        .eq('source', 'circle');
        
    } catch (processingError: any) {
      console.error('[CircleWebhook] Processing error:', processingError);
      
      // Mark event as failed
      await supabase
        .from('webhook_events')
        .update({ 
          status: 'failed', 
          error: processingError.message,
          processed_at: new Date().toISOString() 
        })
        .eq('external_id', event.notificationId)
        .eq('source', 'circle');
      
      // Still return 200 to Circle (we've recorded the event)
      // We'll retry processing internally
    }
    
    return c.json({ received: true });
    
  } catch (error: any) {
    console.error('[CircleWebhook] Error:', error);
    
    // Return 200 to avoid Circle retries for parsing errors
    // The event will be in an error state for manual review
    return c.json({ 
      received: true, 
      error: 'Processing error',
      message: error.message 
    });
  }
});

/**
 * GET /webhooks/circle/health
 * Health check for Circle webhook endpoint
 */
app.get('/health', async (c) => {
  const supabase = createClient();
  
  // Get recent webhook stats
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: events, error } = await supabase
    .from('webhook_events')
    .select('status')
    .eq('source', 'circle')
    .gte('created_at', startDate);
  
  if (error) {
    return c.json({ 
      healthy: false, 
      error: 'Failed to check webhook status' 
    }, 500);
  }
  
  const total = events?.length || 0;
  const processed = events?.filter(e => e.status === 'processed').length || 0;
  const failed = events?.filter(e => e.status === 'failed').length || 0;
  
  return c.json({
    healthy: true,
    stats: {
      period: '24h',
      total,
      processed,
      failed,
      pending: total - processed - failed,
      successRate: total > 0 ? `${Math.round((processed / total) * 100)}%` : '100%',
    },
    configured: {
      webhookSecret: !!process.env.CIRCLE_WEBHOOK_SECRET,
    },
  });
});

export default app;



