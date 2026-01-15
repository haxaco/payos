/**
 * Stripe Webhooks Handler
 * 
 * Receives and processes webhooks from Stripe for payment status updates.
 * 
 * @module routes/stripe-webhooks
 */

import { Hono } from 'hono';
import { createClient } from '../db/client.js';
import { getStripeClient, isStripeConfigured } from '../services/stripe/index.js';

const app = new Hono();

/**
 * POST /webhooks/stripe
 * Receive Stripe webhook events
 */
app.post('/', async (c) => {
  if (!isStripeConfigured()) {
    return c.json({ error: 'Stripe not configured' }, 503);
  }

  try {
    const signature = c.req.header('stripe-signature');
    if (!signature) {
      return c.json({ error: 'Missing Stripe signature' }, 400);
    }

    const payload = await c.req.text();
    const stripe = getStripeClient();

    // Verify signature
    if (!stripe.verifyWebhookSignature(payload, signature)) {
      console.error('[Stripe Webhook] Invalid signature');
      return c.json({ error: 'Invalid signature' }, 401);
    }

    const event = JSON.parse(payload);
    const eventType = event.type;
    const data = event.data?.object;

    console.log(`[Stripe Webhook] Received: ${eventType}`);

    const supabase = createClient();

    // Store webhook event for idempotency
    const { data: existing } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('event_id', event.id)
      .single();

    if (existing) {
      console.log(`[Stripe Webhook] Duplicate event: ${event.id}`);
      return c.json({ received: true, status: 'duplicate' });
    }

    // Record the webhook event
    await supabase
      .from('webhook_events')
      .insert({
        tenant_id: '00000000-0000-0000-0000-000000000000', // System tenant
        provider: 'stripe',
        event_id: event.id,
        event_type: eventType,
        payload: event,
        status: 'processing',
      });

    // Handle specific events
    switch (eventType) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(data);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(data);
        break;

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(data);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${eventType}`);
    }

    // Mark webhook as processed
    await supabase
      .from('webhook_events')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('event_id', event.id);

    return c.json({ received: true, status: 'processed' });
  } catch (error: any) {
    console.error('[Stripe Webhook] Error:', error);

    // Try to mark webhook as failed
    try {
      const payload = await c.req.text();
      const event = JSON.parse(payload);
      const supabase = createClient();
      await supabase
        .from('webhook_events')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('event_id', event.id);
    } catch {}

    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

/**
 * Handle successful payment
 */
async function handlePaymentIntentSucceeded(paymentIntent: any) {
  console.log(`[Stripe Webhook] Payment succeeded: ${paymentIntent.id}`);
  
  const supabase = createClient();
  const metadata = paymentIntent.metadata || {};

  // If this was an ACP payment, update the checkout
  if (metadata.source === 'acp' && metadata.checkout_id) {
    // Find checkout by stripe payment intent ID
    const { data: checkout } = await supabase
      .from('acp_checkouts')
      .select('id, tenant_id')
      .eq('checkout_data->>stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (checkout) {
      await supabase
        .from('acp_checkouts')
        .update({
          checkout_data: {
            stripe_payment_status: 'succeeded',
            stripe_payment_intent_id: paymentIntent.id,
          },
        })
        .eq('id', checkout.id);

      console.log(`[Stripe Webhook] Updated ACP checkout: ${checkout.id}`);
    }
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentIntentFailed(paymentIntent: any) {
  console.log(`[Stripe Webhook] Payment failed: ${paymentIntent.id}`);
  
  const supabase = createClient();
  const metadata = paymentIntent.metadata || {};

  if (metadata.source === 'acp') {
    const { data: checkout } = await supabase
      .from('acp_checkouts')
      .select('id')
      .eq('checkout_data->>stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (checkout) {
      await supabase
        .from('acp_checkouts')
        .update({
          status: 'failed',
          checkout_data: {
            stripe_payment_status: 'failed',
            stripe_payment_intent_id: paymentIntent.id,
            stripe_error: paymentIntent.last_payment_error?.message,
          },
        })
        .eq('id', checkout.id);

      console.log(`[Stripe Webhook] Marked ACP checkout as failed: ${checkout.id}`);
    }
  }
}

/**
 * Handle canceled payment
 */
async function handlePaymentIntentCanceled(paymentIntent: any) {
  console.log(`[Stripe Webhook] Payment canceled: ${paymentIntent.id}`);
  
  // Similar handling as failed
  const supabase = createClient();
  const metadata = paymentIntent.metadata || {};

  if (metadata.source === 'acp') {
    const { data: checkout } = await supabase
      .from('acp_checkouts')
      .select('id')
      .eq('checkout_data->>stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (checkout) {
      await supabase
        .from('acp_checkouts')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          checkout_data: {
            stripe_payment_status: 'canceled',
            stripe_payment_intent_id: paymentIntent.id,
          },
        })
        .eq('id', checkout.id);
    }
  }
}

export default app;



