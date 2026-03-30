import { Command } from 'commander';
import { createClient } from '../utils/auth.js';
import { output, error } from '../utils/output.js';

export function registerUCPCommands(program: Command) {
  const cmd = program.command('ucp').description('UCP (Universal Commerce Protocol) operations');

  cmd
    .command('discover <merchantUrl>')
    .description('Discover a UCP merchant\'s capabilities')
    .action(async (merchantUrl) => {
      try {
        const sly = createClient();
        const result = await sly.request('/v1/ucp/discover', {
          method: 'POST',
          body: JSON.stringify({ merchantUrl }),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('checkouts')
    .description('List UCP checkout sessions')
    .option('--status <status>', 'Filter by status')
    .option('--agent-id <agentId>', 'Filter by agent ID')
    .option('--page <page>', 'Page number', parseInt)
    .option('--limit <limit>', 'Results per page', parseInt)
    .action(async (opts) => {
      try {
        const sly = createClient();
        const params = new URLSearchParams();
        if (opts.status) params.set('status', opts.status);
        if (opts.agentId) params.set('agent_id', opts.agentId);
        if (opts.page) params.set('page', String(opts.page));
        if (opts.limit) params.set('limit', String(opts.limit));
        const qs = params.toString();
        const result = await sly.request(`/v1/ucp/checkouts${qs ? `?${qs}` : ''}`);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('create-checkout')
    .description('Create a UCP checkout session')
    .requiredOption('--currency <currency>', 'ISO 4217 pricing currency (e.g., USD)')
    .requiredOption('--line-items <json>', 'Line items as JSON array')
    .option('--buyer <json>', 'Buyer info as JSON')
    .option('--shipping-address <json>', 'Shipping address as JSON')
    .option('--checkout-type <type>', 'Checkout type (physical, digital, service)')
    .option('--agent-id <agentId>', 'Agent ID to attribute this checkout to')
    .option('--metadata <json>', 'Custom metadata as JSON')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {
          currency: opts.currency,
          line_items: JSON.parse(opts.lineItems),
        };
        if (opts.buyer) body.buyer = JSON.parse(opts.buyer);
        if (opts.shippingAddress) body.shipping_address = JSON.parse(opts.shippingAddress);
        if (opts.checkoutType) body.checkout_type = opts.checkoutType;
        if (opts.agentId) body.agent_id = opts.agentId;
        if (opts.metadata) body.metadata = JSON.parse(opts.metadata);
        const result = await sly.request('/v1/ucp/checkouts', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('get-checkout <id>')
    .description('Get UCP checkout details')
    .action(async (id) => {
      try {
        const sly = createClient();
        const result = await sly.request(`/v1/ucp/checkouts/${id}`);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('complete-checkout <id>')
    .description('Complete a UCP checkout')
    .action(async (id) => {
      try {
        const sly = createClient();
        const result = await sly.request(`/v1/ucp/checkouts/${id}/complete`, {
          method: 'POST',
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('cancel-checkout <id>')
    .description('Cancel a UCP checkout session')
    .action(async (id) => {
      try {
        const sly = createClient();
        const result = await sly.request(`/v1/ucp/checkouts/${id}/cancel`, {
          method: 'POST',
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('add-instrument <checkoutId>')
    .description('Add a payment instrument to a UCP checkout')
    .requiredOption('--instrument-id <id>', 'Unique instrument identifier')
    .requiredOption('--handler <handler>', 'Payment handler (e.g., sly)')
    .requiredOption('--type <type>', 'Instrument type (e.g., usdc)')
    .option('--last4 <last4>', 'Last 4 digits')
    .option('--brand <brand>', 'Brand name')
    .action(async (checkoutId, opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {
          id: opts.instrumentId,
          handler: opts.handler,
          type: opts.type,
        };
        if (opts.last4) body.last4 = opts.last4;
        if (opts.brand) body.brand = opts.brand;
        const result = await sly.request(`/v1/ucp/checkouts/${checkoutId}/instruments`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('orders')
    .description('List UCP orders')
    .option('--status <status>', 'Filter by order status')
    .option('--agent-id <agentId>', 'Filter by agent ID')
    .option('--page <page>', 'Page number', parseInt)
    .option('--limit <limit>', 'Results per page', parseInt)
    .action(async (opts) => {
      try {
        const sly = createClient();
        const params = new URLSearchParams();
        if (opts.status) params.set('status', opts.status);
        if (opts.agentId) params.set('agent_id', opts.agentId);
        if (opts.page) params.set('page', String(opts.page));
        if (opts.limit) params.set('limit', String(opts.limit));
        const qs = params.toString();
        const result = await sly.request(`/v1/ucp/orders${qs ? `?${qs}` : ''}`);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('get-order <id>')
    .description('Get UCP order details')
    .action(async (id) => {
      try {
        const sly = createClient();
        const result = await sly.request(`/v1/ucp/orders/${id}`);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('update-order-status <orderId>')
    .description('Update UCP order status')
    .requiredOption('--status <status>', 'New order status (processing, shipped, delivered)')
    .action(async (orderId, opts) => {
      try {
        const sly = createClient();
        const result = await sly.request(`/v1/ucp/orders/${orderId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: opts.status }),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('cancel-order <orderId>')
    .description('Cancel a UCP order')
    .option('--reason <reason>', 'Cancellation reason')
    .action(async (orderId, opts) => {
      try {
        const sly = createClient();
        const result = await sly.request(`/v1/ucp/orders/${orderId}/cancel`, {
          method: 'POST',
          body: JSON.stringify({ reason: opts.reason }),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('add-event <orderId>')
    .description('Record a fulfillment event on a UCP order')
    .requiredOption('--type <type>', 'Event type (shipped, in_transit, out_for_delivery, delivered, returned)')
    .requiredOption('--description <description>', 'Event description')
    .option('--tracking-number <trackingNumber>', 'Tracking number')
    .option('--carrier <carrier>', 'Shipping carrier')
    .action(async (orderId, opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {
          type: opts.type,
          description: opts.description,
        };
        if (opts.trackingNumber) body.tracking_number = opts.trackingNumber;
        if (opts.carrier) body.carrier = opts.carrier;
        const result = await sly.request(`/v1/ucp/orders/${orderId}/events`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });
}
