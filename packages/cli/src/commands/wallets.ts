import { Command } from 'commander';
import { createClient } from '../utils/auth.js';
import { output, error } from '../utils/output.js';

export function registerWalletsCommands(program: Command) {
  const cmd = program.command('wallets').description('Manage wallets');

  cmd
    .command('list')
    .description('List wallets')
    .option('--status <status>', 'Filter by status (active, frozen, depleted)')
    .option('--owner-account-id <id>', 'Filter by owner account UUID')
    .option('--managed-by-agent-id <id>', 'Filter by managing agent UUID')
    .option('--page <page>', 'Page number', parseInt)
    .option('--limit <limit>', 'Results per page', parseInt)
    .action(async (opts) => {
      try {
        const sly = createClient();
        const params = new URLSearchParams();
        if (opts.status) params.set('status', opts.status);
        if (opts.ownerAccountId) params.set('owner_account_id', opts.ownerAccountId);
        if (opts.managedByAgentId) params.set('managed_by_agent_id', opts.managedByAgentId);
        if (opts.page) params.set('page', String(opts.page));
        if (opts.limit) params.set('limit', String(opts.limit));
        const qs = params.toString();
        const result = await sly.request(`/v1/wallets${qs ? `?${qs}` : ''}`);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('create')
    .description('Create a new wallet for an account')
    .requiredOption('--account-id <accountId>', 'UUID of the owning account')
    .option('--name <name>', 'Human-readable wallet name')
    .option('--blockchain <blockchain>', 'Blockchain network (base, eth, polygon, avax, sol)')
    .option('--wallet-type <walletType>', 'Wallet type (internal, circle_custodial, circle_mpc)')
    .option('--currency <currency>', 'Wallet currency (USDC, EURC)')
    .option('--managed-by-agent-id <agentId>', 'UUID of managing agent')
    .option('--purpose <purpose>', 'Purpose of the wallet')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = { accountId: opts.accountId };
        if (opts.name) body.name = opts.name;
        if (opts.blockchain) body.blockchain = opts.blockchain;
        if (opts.walletType) body.walletType = opts.walletType;
        if (opts.currency) body.currency = opts.currency;
        if (opts.managedByAgentId) body.managedByAgentId = opts.managedByAgentId;
        if (opts.purpose) body.purpose = opts.purpose;
        const result = await sly.request('/v1/wallets', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('get <id>')
    .description('Get wallet details')
    .action(async (id) => {
      try {
        const sly = createClient();
        const result = await sly.request(`/v1/wallets/${id}`);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('balance <id>')
    .description('Get wallet balance')
    .action(async (id) => {
      try {
        const sly = createClient();
        const result = await sly.request(`/v1/wallets/${id}/balance`);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('fund <id>')
    .description('Add test funds to a wallet (sandbox only)')
    .requiredOption('--amount <amount>', 'Amount of test funds to add', parseFloat)
    .option('--currency <currency>', 'Currency (USDC, EURC)')
    .option('--reference <reference>', 'Reference note')
    .action(async (id, opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = { amount: opts.amount };
        if (opts.currency) body.currency = opts.currency;
        if (opts.reference) body.reference = opts.reference;
        const result = await sly.request(`/v1/wallets/${id}/test-fund`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('deposit <id>')
    .description('Deposit funds into a wallet')
    .requiredOption('--amount <amount>', 'Amount to deposit', parseFloat)
    .requiredOption('--from-account-id <accountId>', 'UUID of the source account')
    .option('--reference <reference>', 'Reference note')
    .action(async (id, opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {
          amount: opts.amount,
          fromAccountId: opts.fromAccountId,
        };
        if (opts.reference) body.reference = opts.reference;
        const result = await sly.request(`/v1/wallets/${id}/deposit`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('withdraw <id>')
    .description('Withdraw funds from a wallet')
    .requiredOption('--amount <amount>', 'Amount to withdraw', parseFloat)
    .requiredOption('--destination-account-id <accountId>', 'UUID of the destination account')
    .option('--reference <reference>', 'Reference note')
    .action(async (id, opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {
          amount: opts.amount,
          destinationAccountId: opts.destinationAccountId,
        };
        if (opts.reference) body.reference = opts.reference;
        const result = await sly.request(`/v1/wallets/${id}/withdraw`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });
}
