import { Command } from 'commander';
import { output, error } from '../utils/output.js';

export function registerEnvCommands(program: Command) {
  const cmd = program.command('env').description('Environment management');

  cmd
    .command('get')
    .description('Show current environment info')
    .action(() => {
      try {
        const apiKey = process.env.SLY_API_KEY;
        if (!apiKey) {
          error('SLY_API_KEY environment variable is not set');
        }

        const environment = apiKey.startsWith('pk_live_') ? 'production' : 'sandbox';
        const masked = apiKey.slice(0, 12) + '***';

        output({
          environment,
          apiKeyPrefix: masked,
          apiUrl: process.env.SLY_API_URL || (environment === 'production' ? 'https://api.getsly.ai' : 'https://sandbox.getsly.ai'),
        });
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('switch <environment>')
    .description('Show instructions for switching between sandbox and production')
    .action((environment) => {
      if (environment !== 'sandbox' && environment !== 'production') {
        error('Environment must be "sandbox" or "production"');
      }

      const prefix = environment === 'production' ? 'pk_live_' : 'pk_test_';
      console.log(`To switch to ${environment}, set your API key:`);
      console.log(`  export SLY_API_KEY=${prefix}your_key_here`);
      if (environment === 'production') {
        console.log(`  export SLY_API_URL=https://api.getsly.ai`);
      } else {
        console.log(`  export SLY_API_URL=https://sandbox.getsly.ai`);
      }
    });

  cmd
    .command('whoami')
    .description('Get information about the current tenant/organization')
    .action(async () => {
      try {
        const apiKey = process.env.SLY_API_KEY;
        if (!apiKey) {
          error('SLY_API_KEY environment variable is not set');
        }
        // Lazy import to avoid requiring SLY_API_KEY for non-API commands
        const { createClient } = await import('../utils/auth.js');
        const sly = createClient();
        const result = await sly.request('/v1/context/whoami');
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });
}
