import { Command } from 'commander';
import { createClient } from '../utils/auth.js';
import { output, error } from '../utils/output.js';

export function registerMPPCommands(program: Command) {
  const cmd = program.command('mpp').description('MPP (Machine Payments Protocol) sessions and payments');

  cmd
    .command('sessions')
    .description('List MPP sessions')
    .option('--agent-id <agentId>', 'Filter by agent ID')
    .option('--status <status>', 'Filter by status (active, closed, expired, exhausted)')
    .option('--limit <limit>', 'Results per page', parseInt)
    .option('--offset <offset>', 'Offset for pagination', parseInt)
    .action(async (opts) => {
      try {
        const sly = createClient();
        const result = await sly.mpp.listSessions({
          agent_id: opts.agentId,
          status: opts.status,
          limit: opts.limit,
          offset: opts.offset,
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('get-session <id>')
    .description('Get MPP session details with voucher history')
    .action(async (id) => {
      try {
        const sly = createClient();
        const result = await sly.mpp.getSession(id);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('open')
    .description('Open a streaming MPP payment session')
    .requiredOption('--service-url <url>', 'URL of the service')
    .requiredOption('--deposit-amount <amount>', 'Initial deposit amount', parseFloat)
    .requiredOption('--agent-id <agentId>', 'UUID of the agent')
    .requiredOption('--wallet-id <walletId>', 'UUID of the wallet')
    .option('--max-budget <amount>', 'Maximum total budget', parseFloat)
    .option('--currency <currency>', 'Currency (default: USDC)')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {
          service_url: opts.serviceUrl,
          deposit_amount: opts.depositAmount,
          agent_id: opts.agentId,
          wallet_id: opts.walletId,
        };
        if (opts.maxBudget !== undefined) body.max_budget = opts.maxBudget;
        if (opts.currency) body.currency = opts.currency;
        const result = await sly.mpp.openSession(body as Parameters<typeof sly.mpp.openSession>[0]);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('pay')
    .description('Make a one-shot MPP payment to a service')
    .requiredOption('--service-url <url>', 'URL of the service to pay')
    .requiredOption('--amount <amount>', 'Payment amount', parseFloat)
    .requiredOption('--agent-id <agentId>', 'UUID of the agent making the payment')
    .option('--wallet-id <walletId>', 'UUID of the wallet to pay from')
    .option('--currency <currency>', 'Currency (default: USDC)')
    .option('--intent <intent>', 'Description of what the payment is for')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {
          service_url: opts.serviceUrl,
          amount: opts.amount,
          agent_id: opts.agentId,
        };
        if (opts.walletId) body.wallet_id = opts.walletId;
        if (opts.currency) body.currency = opts.currency;
        if (opts.intent) body.intent = opts.intent;
        const result = await sly.mpp.pay(body as Parameters<typeof sly.mpp.pay>[0]);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('close <sessionId>')
    .description('Close an active MPP session')
    .action(async (sessionId) => {
      try {
        const sly = createClient();
        const result = await sly.mpp.closeSession(sessionId);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('transfers')
    .description('List MPP payment transfers')
    .option('--service-url <url>', 'Filter by service URL')
    .option('--session-id <id>', 'Filter by session ID')
    .option('--limit <limit>', 'Results per page', parseInt)
    .option('--offset <offset>', 'Offset for pagination', parseInt)
    .action(async (opts) => {
      try {
        const sly = createClient();
        const result = await sly.mpp.listTransfers({
          service_url: opts.serviceUrl,
          session_id: opts.sessionId,
          limit: opts.limit,
          offset: opts.offset,
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('verify-receipt <receiptId>')
    .description('Verify an MPP payment receipt')
    .action(async (receiptId) => {
      try {
        const sly = createClient();
        const result = await sly.mpp.verifyReceipt(receiptId);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });
}
