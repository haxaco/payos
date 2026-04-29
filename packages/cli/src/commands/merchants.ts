import { Command } from 'commander';
import { createClient } from '../utils/auth.js';
import { output, error } from '../utils/output.js';

export function registerMerchantsCommands(program: Command) {
  const cmd = program.command('merchants').description('Browse merchant catalogs');

  cmd
    .command('list')
    .description('List merchants with product catalogs')
    .option('--type <type>', 'Merchant type filter (e.g., restaurant, bar, hotel, retail)')
    .option('--country <country>', 'Country code filter (e.g., PA, CR)')
    .option('--search <search>', 'Search merchants by name')
    .option('--limit <limit>', 'Max results (default 50, max 100)', parseInt)
    .action(async (opts) => {
      try {
        const sly = createClient();
        const params = new URLSearchParams();
        if (opts.type) params.set('type', opts.type);
        if (opts.country) params.set('country', opts.country);
        if (opts.search) params.set('search', opts.search);
        if (opts.limit) params.set('limit', String(opts.limit));
        const qs = params.toString();
        const result = await sly.request(`/v1/ucp/merchants${qs ? `?${qs}` : ''}`);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('get <merchantId>')
    .description('Get a merchant\'s full product catalog')
    .action(async (merchantId) => {
      try {
        const sly = createClient();
        const result = await sly.request(`/v1/ucp/merchants/${merchantId}`);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });
}
