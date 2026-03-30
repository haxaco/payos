import { Command } from 'commander';
import { createClient } from '../utils/auth.js';
import { output, error } from '../utils/output.js';

export function registerACPCommands(program: Command) {
  const cmd = program.command('acp').description('ACP (Agentic Commerce Protocol) checkout-based payments');

  cmd
    .command('checkouts')
    .description('List ACP checkouts')
    .option('--status <status>', 'Filter by status (pending, completed, cancelled, expired)')
    .option('--agent-id <agentId>', 'Filter by agent ID')
    .option('--merchant-id <merchantId>', 'Filter by merchant ID')
    .option('--limit <limit>', 'Max results', parseInt)
    .action(async (opts) => {
      try {
        const sly = createClient();
        const result = await sly.acp.listCheckouts({
          status: opts.status,
          agent_id: opts.agentId,
          merchant_id: opts.merchantId,
          limit: opts.limit,
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('get <checkoutId>')
    .description('Get checkout details')
    .action(async (checkoutId) => {
      try {
        const sly = createClient();
        const result = await sly.acp.getCheckout(checkoutId);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('create')
    .description('Create a checkout session')
    .requiredOption('--checkout-id <checkoutId>', 'Unique checkout identifier')
    .requiredOption('--agent-id <agentId>', 'UUID of the agent')
    .requiredOption('--merchant-id <merchantId>', 'Merchant identifier')
    .requiredOption('--items <json>', 'Items as JSON array')
    .option('--account-id <accountId>', 'UUID of the funding account')
    .option('--tax-amount <amount>', 'Tax amount', parseFloat)
    .option('--shipping-amount <amount>', 'Shipping amount', parseFloat)
    .option('--payment-method <method>', 'Payment method')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {
          checkout_id: opts.checkoutId,
          agent_id: opts.agentId,
          merchant_id: opts.merchantId,
          items: JSON.parse(opts.items),
        };
        if (opts.accountId) body.account_id = opts.accountId;
        if (opts.taxAmount !== undefined) body.tax_amount = opts.taxAmount;
        if (opts.shippingAmount !== undefined) body.shipping_amount = opts.shippingAmount;
        if (opts.paymentMethod) body.payment_method = opts.paymentMethod;
        const result = await sly.acp.createCheckout(body as Parameters<typeof sly.acp.createCheckout>[0]);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('complete <checkoutId>')
    .description('Complete and pay for a checkout')
    .option('--shared-payment-token <token>', 'Shared payment token (auto-generated in sandbox)')
    .option('--payment-method <method>', 'Payment method')
    .action(async (checkoutId, opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {};
        if (opts.sharedPaymentToken) body.shared_payment_token = opts.sharedPaymentToken;
        if (opts.paymentMethod) body.payment_method = opts.paymentMethod;
        const result = await sly.acp.completeCheckout(checkoutId, body as Parameters<typeof sly.acp.completeCheckout>[1]);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('cancel <checkoutId>')
    .description('Cancel a checkout')
    .action(async (checkoutId) => {
      try {
        const sly = createClient();
        const result = await sly.acp.cancelCheckout(checkoutId);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });
}
