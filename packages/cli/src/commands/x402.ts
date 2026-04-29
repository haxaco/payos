import { Command } from 'commander';
import { createClient } from '../utils/auth.js';
import { output, error } from '../utils/output.js';

export function registerX402Commands(program: Command) {
  const cmd = program.command('x402').description('x402 micropayment endpoints');

  cmd
    .command('endpoints')
    .description('List x402 payment endpoints')
    .option('--status <status>', 'Filter by status (active, paused, disabled)')
    .option('--account-id <id>', 'Filter by account UUID')
    .option('--page <page>', 'Page number', parseInt)
    .option('--limit <limit>', 'Results per page', parseInt)
    .action(async (opts) => {
      try {
        const sly = createClient();
        const params = new URLSearchParams();
        if (opts.status) params.set('status', opts.status);
        if (opts.accountId) params.set('account_id', opts.accountId);
        if (opts.page) params.set('page', String(opts.page));
        if (opts.limit) params.set('limit', String(opts.limit));
        const qs = params.toString();
        const result = await sly.request(`/v1/x402/endpoints${qs ? `?${qs}` : ''}`);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('get-endpoint <id>')
    .description('Get x402 endpoint details')
    .action(async (id) => {
      try {
        const sly = createClient();
        const result = await sly.request(`/v1/x402/endpoints/${id}`);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('create-endpoint')
    .description('Register an x402 payment endpoint')
    .requiredOption('--name <name>', 'Endpoint name')
    .requiredOption('--path <path>', 'API path (must start with /)')
    .requiredOption('--method <method>', 'HTTP method (GET, POST, PUT, DELETE, PATCH, ANY)')
    .requiredOption('--account-id <accountId>', 'UUID of the account receiving payments')
    .requiredOption('--base-price <price>', 'Price per request in token units', parseFloat)
    .option('--currency <currency>', 'Payment currency (USDC, EURC)')
    .option('--description <description>', 'What this endpoint provides')
    .option('--webhook-url <url>', 'URL to notify on payment')
    .option('--network <network>', 'Blockchain network')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {
          name: opts.name,
          path: opts.path,
          method: opts.method,
          accountId: opts.accountId,
          basePrice: opts.basePrice,
        };
        if (opts.currency) body.currency = opts.currency;
        if (opts.description) body.description = opts.description;
        if (opts.webhookUrl) body.webhookUrl = opts.webhookUrl;
        if (opts.network) body.network = opts.network;
        const result = await sly.request('/v1/x402/endpoints', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('pay')
    .description('Make an x402 micropayment to a paid endpoint')
    .requiredOption('--endpoint-id <endpointId>', 'UUID of the x402 endpoint to pay')
    .requiredOption('--wallet-id <walletId>', 'UUID of the wallet to pay from')
    .requiredOption('--amount <amount>', 'Payment amount', parseFloat)
    .requiredOption('--currency <currency>', 'Payment currency (USDC, EURC)')
    .requiredOption('--method <method>', 'HTTP method of the request being paid for')
    .requiredOption('--path <path>', 'Path of the request being paid for')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const result = await sly.request('/v1/x402/payments', {
          method: 'POST',
          body: JSON.stringify({
            endpointId: opts.endpointId,
            walletId: opts.walletId,
            amount: opts.amount,
            currency: opts.currency,
            method: opts.method,
            path: opts.path,
          }),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('verify')
    .description('Verify an x402 payment')
    .option('--jwt <jwt>', 'JWT payment proof for fast verification')
    .option('--request-id <requestId>', 'Request ID for database verification')
    .option('--transfer-id <transferId>', 'Transfer ID for database verification')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {};
        if (opts.jwt) body.jwt = opts.jwt;
        if (opts.requestId) body.requestId = opts.requestId;
        if (opts.transferId) body.transferId = opts.transferId;
        const result = await sly.request('/v1/x402/verify', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });
}
