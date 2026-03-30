import { Command } from 'commander';
import { createClient } from '../utils/auth.js';
import { output, error } from '../utils/output.js';

export function registerAgentsCommands(program: Command) {
  const cmd = program.command('agents').description('Manage AI agents');

  cmd
    .command('create')
    .description('Register a new AI agent under a business account')
    .requiredOption('--account-id <accountId>', 'UUID of the parent business account')
    .requiredOption('--name <name>', 'Name for the agent')
    .option('--description <description>', 'Description of what the agent does')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {
          accountId: opts.accountId,
          name: opts.name,
        };
        if (opts.description) body.description = opts.description;
        const result = await sly.request('/v1/agents', {
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
    .description('Get agent details')
    .action(async (id) => {
      try {
        const sly = createClient();
        const result = await sly.request(`/v1/agents/${id}`);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('delete <id>')
    .description('Delete an agent')
    .action(async (id) => {
      try {
        const sly = createClient();
        const result = await sly.request(`/v1/agents/${id}`, { method: 'DELETE' });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('verify <id>')
    .description('Verify an agent at a KYA tier')
    .requiredOption('--tier <tier>', 'KYA verification tier (1, 2, or 3)', parseInt)
    .action(async (id, opts) => {
      try {
        const sly = createClient();
        const result = await sly.request(`/v1/agents/${id}/verify`, {
          method: 'POST',
          body: JSON.stringify({ tier: opts.tier }),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('limits <id>')
    .description('Get spending limits and current usage for an agent')
    .action(async (id) => {
      try {
        const sly = createClient();
        const result = await sly.request(`/v1/agents/${id}/limits`);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('transactions <id>')
    .description('Get transaction history for an agent')
    .option('--limit <limit>', 'Max results per page', parseInt)
    .option('--offset <offset>', 'Offset for pagination', parseInt)
    .option('--from <from>', 'Filter from date (ISO 8601)')
    .option('--to <to>', 'Filter to date (ISO 8601)')
    .action(async (id, opts) => {
      try {
        const sly = createClient();
        const params = new URLSearchParams();
        if (opts.limit) params.set('limit', String(opts.limit));
        if (opts.offset) params.set('offset', String(opts.offset));
        if (opts.from) params.set('from', opts.from);
        if (opts.to) params.set('to', opts.to);
        const qs = params.toString();
        const result = await sly.request(`/v1/agents/${id}/transactions${qs ? `?${qs}` : ''}`);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });
}
