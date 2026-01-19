/**
 * UCP Webhook Routes
 *
 * Handles incoming webhooks from UCP merchants.
 *
 * @see Story 43.11: UCP Webhook Handler
 */

import { Hono } from 'hono';
import { createClient } from '../../db/client.js';
import { ValidationError, UnauthorizedError } from '../../middleware/error.js';
import {
  processWebhook,
  verifyWebhookSignature,
  listWebhooks,
  getWebhook,
} from '../../services/ucp/webhooks.js';
import type { UCPWebhookEvent } from '../../services/ucp/webhooks.js';

const router = new Hono();

/**
 * POST /v1/webhooks/ucp
 *
 * Receive UCP webhook events from merchants.
 * Events are verified using the UCP-Signature header.
 */
router.post('/', async (c) => {
  const supabase = createClient();
  const signature = c.req.header('UCP-Signature');
  const tenantId = c.req.header('X-PayOS-Tenant-ID');

  if (!tenantId) {
    throw new ValidationError('Missing X-PayOS-Tenant-ID header');
  }

  // Get raw body for signature verification
  const rawBody = await c.req.text();

  // Look up tenant's webhook signing key
  // In production, this would be stored in the database
  const signingKey = await getWebhookSigningKey(tenantId, supabase);

  if (signingKey && signature) {
    // Verify signature if signing key is configured
    const isValid = verifyWebhookSignature(rawBody, signature, signingKey);
    if (!isValid) {
      throw new UnauthorizedError('Invalid webhook signature');
    }
  }

  // Parse event
  let event: UCPWebhookEvent;
  try {
    event = JSON.parse(rawBody) as UCPWebhookEvent;
  } catch {
    throw new ValidationError('Invalid JSON payload');
  }

  // Validate event structure
  if (!event.id || !event.type || !event.data) {
    throw new ValidationError('Invalid webhook event structure');
  }

  // Process the webhook
  const result = await processWebhook(tenantId, event, supabase);

  return c.json({
    received: true,
    event_id: event.id,
    action: result.action,
  });
});

/**
 * GET /v1/webhooks/ucp
 *
 * List received webhooks (for debugging/monitoring).
 * Requires authentication.
 */
router.get('/', async (c) => {
  const ctx = c.get('ctx');

  if (!ctx?.tenantId) {
    throw new UnauthorizedError('Authentication required');
  }

  const query = c.req.query();
  const eventType = query.event_type as string | undefined;
  const settlementId = query.settlement_id as string | undefined;
  const limit = query.limit ? parseInt(query.limit) : 20;
  const offset = query.offset ? parseInt(query.offset) : 0;

  const result = listWebhooks(ctx.tenantId, {
    eventType,
    settlementId,
    limit: Math.min(limit, 100),
    offset,
  });

  return c.json({
    data: result.data.map((w) => ({
      id: w.id,
      event_id: w.eventId,
      event_type: w.eventType,
      settlement_id: w.settlementId,
      processed_at: w.processedAt.toISOString(),
      delivered: w.delivered,
      delivered_at: w.deliveredAt?.toISOString(),
      delivery_attempts: w.deliveryAttempts,
    })),
    pagination: {
      limit,
      offset,
      total: result.total,
    },
  });
});

/**
 * GET /v1/webhooks/ucp/:id
 *
 * Get a specific webhook (for debugging).
 */
router.get('/:id', async (c) => {
  const ctx = c.get('ctx');
  const webhookId = c.req.param('id');

  if (!ctx?.tenantId) {
    throw new UnauthorizedError('Authentication required');
  }

  const webhook = getWebhook(webhookId);

  if (!webhook || webhook.tenantId !== ctx.tenantId) {
    return c.json({ error: 'Webhook not found' }, 404);
  }

  return c.json({
    id: webhook.id,
    event_id: webhook.eventId,
    event_type: webhook.eventType,
    settlement_id: webhook.settlementId,
    payload: webhook.payload,
    processed_at: webhook.processedAt.toISOString(),
    delivered: webhook.delivered,
    delivered_at: webhook.deliveredAt?.toISOString(),
    delivery_attempts: webhook.deliveryAttempts,
  });
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get webhook signing key for a tenant
 * In production, this would be stored in the database
 */
async function getWebhookSigningKey(
  tenantId: string,
  supabase: any
): Promise<string | null> {
  // For PoC, return null to skip signature verification
  // In production:
  // const { data } = await supabase
  //   .from('webhook_configs')
  //   .select('signing_key')
  //   .eq('tenant_id', tenantId)
  //   .eq('provider', 'ucp')
  //   .single();
  // return data?.signing_key;
  return null;
}

export default router;
