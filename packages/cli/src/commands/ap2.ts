import { Command } from 'commander';
import { createClient } from '../utils/auth.js';
import { output, error } from '../utils/output.js';

export function registerAP2Commands(program: Command) {
  const cmd = program.command('ap2').description('AP2 (Agent-to-Agent Protocol) mandate-based payments');

  cmd
    .command('mandates')
    .description('List mandates')
    .option('--status <status>', 'Filter by status (active, completed, cancelled, expired)')
    .option('--agent-id <agentId>', 'Filter by agent ID')
    .option('--account-id <accountId>', 'Filter by account ID')
    .option('--limit <limit>', 'Max results', parseInt)
    .action(async (opts) => {
      try {
        const sly = createClient();
        const result = await sly.ap2.listMandates({
          status: opts.status,
          agent_id: opts.agentId,
          account_id: opts.accountId,
          limit: opts.limit,
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('get <mandateId>')
    .description('Get mandate details with execution history')
    .action(async (mandateId) => {
      try {
        const sly = createClient();
        const result = await sly.ap2.getMandate(mandateId);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('create')
    .description('Create a spending mandate for an agent')
    .requiredOption('--mandate-id <mandateId>', 'Unique mandate identifier')
    .requiredOption('--agent-id <agentId>', 'UUID of the agent')
    .requiredOption('--account-id <accountId>', 'UUID of the funding account')
    .requiredOption('--authorized-amount <amount>', 'Maximum spending amount', parseFloat)
    .option('--currency <currency>', 'Currency (default: USD)')
    .option('--mandate-type <type>', 'Type: intent, cart, or payment (default: payment)')
    .option('--description <description>', 'Human-readable description')
    .option('--expires-at <date>', 'ISO 8601 expiration timestamp')
    .option('--metadata <json>', 'Metadata as JSON string')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {
          mandate_id: opts.mandateId,
          agent_id: opts.agentId,
          account_id: opts.accountId,
          authorized_amount: opts.authorizedAmount,
        };
        if (opts.currency) body.currency = opts.currency;
        if (opts.mandateType) body.mandate_type = opts.mandateType;
        if (opts.description) body.description = opts.description;
        if (opts.expiresAt) body.expires_at = opts.expiresAt;
        if (opts.metadata) body.metadata = JSON.parse(opts.metadata);
        const result = await sly.ap2.createMandate(body as Parameters<typeof sly.ap2.createMandate>[0]);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('execute <mandateId>')
    .description('Execute a payment against a mandate')
    .requiredOption('--amount <amount>', 'Amount to pay', parseFloat)
    .option('--currency <currency>', 'Currency')
    .option('--description <description>', 'Description of this payment')
    .action(async (mandateId, opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = { amount: opts.amount };
        if (opts.currency) body.currency = opts.currency;
        if (opts.description) body.description = opts.description;
        const result = await sly.ap2.executeMandate(mandateId, body as Parameters<typeof sly.ap2.executeMandate>[1]);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('cancel <mandateId>')
    .description('Cancel an active mandate')
    .action(async (mandateId) => {
      try {
        const sly = createClient();
        const result = await sly.ap2.cancelMandate(mandateId);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('update <mandateId>')
    .description('Update a mandate')
    .option('--authorized-amount <amount>', 'New authorized amount', parseFloat)
    .option('--status <status>', 'New status')
    .option('--expires-at <date>', 'New expiration (ISO 8601)')
    .option('--description <description>', 'Updated description')
    .option('--metadata <json>', 'Updated metadata as JSON string')
    .action(async (mandateId, opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {};
        if (opts.authorizedAmount !== undefined) body.authorized_amount = opts.authorizedAmount;
        if (opts.status) body.status = opts.status;
        if (opts.expiresAt) body.expires_at = opts.expiresAt;
        if (opts.description) body.description = opts.description;
        if (opts.metadata) body.metadata = JSON.parse(opts.metadata);
        const result = await sly.request(`/v1/ap2/mandates/${mandateId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });
}
