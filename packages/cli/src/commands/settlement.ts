import { Command } from 'commander';
import { createClient } from '../utils/auth.js';
import { output, error } from '../utils/output.js';

export function registerSettlementCommands(program: Command) {
  const cmd = program.command('settlement').description('Manage settlements and FX quotes');

  cmd
    .command('quote')
    .description('Get a settlement quote with FX rates and fees')
    .requiredOption('--from-currency <currency>', 'Source currency (USD, BRL, MXN, USDC)')
    .requiredOption('--to-currency <currency>', 'Destination currency (USD, BRL, MXN, USDC)')
    .requiredOption('--amount <amount>', 'Amount to convert')
    .option('--rail <rail>', 'Settlement rail (pix, spei, wire, usdc)')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const quote = await sly.getSettlementQuote({
          fromCurrency: opts.fromCurrency,
          toCurrency: opts.toCurrency,
          amount: opts.amount,
          rail: opts.rail,
        });
        output(quote);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('create')
    .description('Execute a settlement using a quote')
    .requiredOption('--quote-id <quoteId>', 'Quote ID from settlement quote')
    .requiredOption('--destination-account-id <accountId>', 'Destination account ID')
    .option('--metadata <json>', 'Optional metadata as JSON string')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {
          quoteId: opts.quoteId,
          destinationAccountId: opts.destinationAccountId,
        };
        if (opts.metadata) body.metadata = JSON.parse(opts.metadata);
        const settlement = await sly.createSettlement(body as Parameters<typeof sly.createSettlement>[0]);
        output(settlement);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('status <id>')
    .description('Check the status of a settlement')
    .action(async (id) => {
      try {
        const sly = createClient();
        const settlement = await sly.getSettlement(id);
        output(settlement);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });
}
