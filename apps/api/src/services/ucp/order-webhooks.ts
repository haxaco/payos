/**
 * UCP Order Webhooks Service
 *
 * Sends webhooks for order lifecycle events.
 * Uses detached JWT (RFC 7797) signatures for verification.
 *
 * Events:
 * - order.created: Order created from completed checkout
 * - order.updated: Order status changed
 * - order.shipped: Order shipped with tracking
 * - order.delivered: Order delivered
 * - order.cancelled: Order cancelled
 * - order.refunded: Order refunded
 *
 * @see Phase 3: Order Capability
 * @see https://ucp.dev/specification/order/#webhooks
 */

import { createHash } from 'crypto';
import type { UCPOrder, UCPFulfillmentEvent, UCPAdjustment } from './types.js';
import { signWebhookPayload } from './signing.js';

// =============================================================================
// Types
// =============================================================================

export type OrderWebhookEventType =
  | 'order.created'
  | 'order.updated'
  | 'order.shipped'
  | 'order.delivered'
  | 'order.cancelled'
  | 'order.refunded';

export interface OrderWebhookEvent {
  id: string;
  type: OrderWebhookEventType;
  created_at: string;
  data: {
    order: UCPOrder;
    previous_status?: string;
    event?: UCPFulfillmentEvent;
    adjustment?: UCPAdjustment;
  };
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: OrderWebhookEventType[];
  secret?: string;
  active: boolean;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  endpoint: string;
  status: 'pending' | 'delivered' | 'failed';
  statusCode?: number;
  attempts: number;
  lastAttemptAt?: Date;
  error?: string;
  createdAt: Date;
}

// =============================================================================
// In-Memory Store (for PoC)
// =============================================================================

const endpointStore = new Map<string, WebhookEndpoint>();
const deliveryStore = new Map<string, WebhookDelivery>();

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate webhook event ID
 */
function generateEventId(): string {
  return `whevt_${createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, 24)}`;
}

/**
 * Generate delivery ID
 */
function generateDeliveryId(): string {
  return `whdel_${createHash('sha256')
    .update(`${Date.now()}-${Math.random()}`)
    .digest('hex')
    .slice(0, 16)}`;
}

/**
 * Create webhook event payload
 */
function createWebhookEvent(
  type: OrderWebhookEventType,
  order: UCPOrder,
  extras?: {
    previous_status?: string;
    event?: UCPFulfillmentEvent;
    adjustment?: UCPAdjustment;
  }
): OrderWebhookEvent {
  return {
    id: generateEventId(),
    type,
    created_at: new Date().toISOString(),
    data: {
      order,
      ...extras,
    },
  };
}

// =============================================================================
// Webhook Endpoint Management
// =============================================================================

/**
 * Register a webhook endpoint
 */
export function registerWebhookEndpoint(
  tenantId: string,
  endpoint: Omit<WebhookEndpoint, 'id'>
): WebhookEndpoint {
  const id = `whep_${createHash('sha256')
    .update(`${tenantId}-${endpoint.url}`)
    .digest('hex')
    .slice(0, 16)}`;

  const stored: WebhookEndpoint = {
    id,
    ...endpoint,
  };

  endpointStore.set(id, stored);

  console.log(`[Order Webhooks] Registered endpoint ${id} for ${endpoint.url}`);

  return stored;
}

/**
 * Get webhook endpoints for a tenant
 */
export function getWebhookEndpoints(tenantId: string): WebhookEndpoint[] {
  // In production, filter by tenant_id
  return Array.from(endpointStore.values()).filter((e) => e.active);
}

/**
 * Deactivate a webhook endpoint
 */
export function deactivateWebhookEndpoint(endpointId: string): void {
  const endpoint = endpointStore.get(endpointId);
  if (endpoint) {
    endpoint.active = false;
    endpointStore.set(endpointId, endpoint);
  }
}

// =============================================================================
// Webhook Sending
// =============================================================================

/**
 * Send webhook to an endpoint
 */
async function sendWebhook(
  endpoint: WebhookEndpoint,
  event: OrderWebhookEvent
): Promise<WebhookDelivery> {
  const deliveryId = generateDeliveryId();
  const now = new Date();

  const delivery: WebhookDelivery = {
    id: deliveryId,
    webhookId: endpoint.id,
    eventId: event.id,
    endpoint: endpoint.url,
    status: 'pending',
    attempts: 0,
    createdAt: now,
  };

  deliveryStore.set(deliveryId, delivery);

  // Attempt to deliver
  try {
    delivery.attempts++;
    delivery.lastAttemptAt = new Date();

    const payload = JSON.stringify(event);

    // Sign the payload with detached JWT
    const signature = signWebhookPayload(payload);

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PayOS-Event': event.type,
        'X-PayOS-Event-ID': event.id,
        'X-PayOS-Delivery-ID': deliveryId,
        'Request-Signature': signature,
      },
      body: payload,
    });

    delivery.statusCode = response.status;

    if (response.ok) {
      delivery.status = 'delivered';
      console.log(`[Order Webhooks] Delivered ${event.type} to ${endpoint.url}`);
    } else {
      delivery.status = 'failed';
      delivery.error = `HTTP ${response.status}`;
      console.error(`[Order Webhooks] Failed to deliver ${event.type} to ${endpoint.url}: HTTP ${response.status}`);
    }
  } catch (error: any) {
    delivery.status = 'failed';
    delivery.error = error.message;
    console.error(`[Order Webhooks] Failed to deliver ${event.type} to ${endpoint.url}:`, error.message);
  }

  deliveryStore.set(deliveryId, delivery);

  return delivery;
}

/**
 * Send webhook event to all registered endpoints
 */
async function broadcastWebhook(
  tenantId: string,
  event: OrderWebhookEvent
): Promise<WebhookDelivery[]> {
  const endpoints = getWebhookEndpoints(tenantId).filter(
    (e) => e.events.includes(event.type) || e.events.includes('order.updated' as any)
  );

  if (endpoints.length === 0) {
    console.log(`[Order Webhooks] No endpoints registered for ${event.type}`);
    return [];
  }

  const deliveries = await Promise.all(
    endpoints.map((endpoint) => sendWebhook(endpoint, event))
  );

  return deliveries;
}

// =============================================================================
// Order Event Handlers
// =============================================================================

/**
 * Send order.created webhook
 */
export async function sendOrderCreatedWebhook(
  tenantId: string,
  order: UCPOrder
): Promise<WebhookDelivery[]> {
  const event = createWebhookEvent('order.created', order);
  return broadcastWebhook(tenantId, event);
}

/**
 * Send order.updated webhook
 */
export async function sendOrderUpdatedWebhook(
  tenantId: string,
  order: UCPOrder,
  previousStatus: string
): Promise<WebhookDelivery[]> {
  const event = createWebhookEvent('order.updated', order, { previous_status: previousStatus });
  return broadcastWebhook(tenantId, event);
}

/**
 * Send order.shipped webhook
 */
export async function sendOrderShippedWebhook(
  tenantId: string,
  order: UCPOrder,
  shippedEvent: UCPFulfillmentEvent
): Promise<WebhookDelivery[]> {
  const event = createWebhookEvent('order.shipped', order, { event: shippedEvent });
  return broadcastWebhook(tenantId, event);
}

/**
 * Send order.delivered webhook
 */
export async function sendOrderDeliveredWebhook(
  tenantId: string,
  order: UCPOrder,
  deliveredEvent: UCPFulfillmentEvent
): Promise<WebhookDelivery[]> {
  const event = createWebhookEvent('order.delivered', order, { event: deliveredEvent });
  return broadcastWebhook(tenantId, event);
}

/**
 * Send order.cancelled webhook
 */
export async function sendOrderCancelledWebhook(
  tenantId: string,
  order: UCPOrder
): Promise<WebhookDelivery[]> {
  const event = createWebhookEvent('order.cancelled', order);
  return broadcastWebhook(tenantId, event);
}

/**
 * Send order.refunded webhook
 */
export async function sendOrderRefundedWebhook(
  tenantId: string,
  order: UCPOrder,
  adjustment: UCPAdjustment
): Promise<WebhookDelivery[]> {
  const event = createWebhookEvent('order.refunded', order, { adjustment });
  return broadcastWebhook(tenantId, event);
}

// =============================================================================
// Delivery Management
// =============================================================================

/**
 * Get webhook deliveries for an event
 */
export function getDeliveriesForEvent(eventId: string): WebhookDelivery[] {
  return Array.from(deliveryStore.values()).filter((d) => d.eventId === eventId);
}

/**
 * Get recent deliveries for an endpoint
 */
export function getRecentDeliveries(
  endpointId: string,
  limit: number = 20
): WebhookDelivery[] {
  return Array.from(deliveryStore.values())
    .filter((d) => d.webhookId === endpointId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

/**
 * Retry failed delivery
 */
export async function retryDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
  const delivery = deliveryStore.get(deliveryId);
  if (!delivery || delivery.status !== 'failed') {
    return null;
  }

  const endpoint = endpointStore.get(delivery.webhookId);
  if (!endpoint || !endpoint.active) {
    return null;
  }

  // Get the original event (would need to store events in production)
  // For now, just update the delivery attempt
  delivery.attempts++;
  delivery.lastAttemptAt = new Date();
  delivery.status = 'pending';
  deliveryStore.set(deliveryId, delivery);

  return delivery;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Clear webhook stores (for testing)
 */
export function clearWebhookStores(): void {
  endpointStore.clear();
  deliveryStore.clear();
}
