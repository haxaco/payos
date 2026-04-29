import { Command } from 'commander';
import { createClient } from '../utils/auth.js';
import { output, error } from '../utils/output.js';

export function registerAccountsCommands(program: Command) {
  const cmd = program.command('accounts').description('Manage accounts (entities in the payment ledger)');

  cmd
    .command('list')
    .description('List accounts')
    .option('--status <status>', 'Filter by status (active, inactive, suspended)')
    .option('--type <type>', 'Filter by type (person, business)')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const params = new URLSearchParams();
        if (opts.status) params.set('status', opts.status);
        if (opts.type) params.set('type', opts.type);
        const qs = params.toString();
        const result = await sly.request(`/v1/accounts${qs ? `?${qs}` : ''}`);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('create')
    .description('Create a new account')
    .requiredOption('--name <name>', 'Account holder name')
    .requiredOption('--type <type>', 'Account type (person, business)')
    .option('--email <email>', 'Email address')
    .option('--metadata <json>', 'Metadata as JSON string')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = { name: opts.name, type: opts.type };
        if (opts.email) body.email = opts.email;
        if (opts.metadata) body.metadata = JSON.parse(opts.metadata);
        const result = await sly.request('/v1/accounts', {
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
    .description('Get account details')
    .action(async (id) => {
      try {
        const sly = createClient();
        const result = await sly.request(`/v1/accounts/${id}`);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('update <id>')
    .description('Update an account')
    .option('--name <name>', 'New name')
    .option('--email <email>', 'New email')
    .option('--metadata <json>', 'Metadata as JSON string')
    .action(async (id, opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {};
        if (opts.name) body.name = opts.name;
        if (opts.email) body.email = opts.email;
        if (opts.metadata) body.metadata = JSON.parse(opts.metadata);
        const result = await sly.request(`/v1/accounts/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });
}
