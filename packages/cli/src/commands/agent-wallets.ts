import { Command } from 'commander';
import { createClient } from '../utils/auth.js';
import { output, error } from '../utils/output.js';

export function registerAgentWalletsCommands(program: Command) {
  const cmd = program.command('agent-wallets').description('Agent wallet policies, exposures, and governance');

  cmd
    .command('get <agentId>')
    .description('Get agent wallet details including balance and spending policy')
    .action(async (agentId) => {
      try {
        const sly = createClient();
        const result = await sly.agentWallets.getWallet(agentId);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('evaluate-policy <agentId>')
    .description('Evaluate contract policy for an agent payment (dry-run)')
    .requiredOption('--amount <amount>', 'Payment amount to evaluate', parseFloat)
    .option('--currency <currency>', 'Currency (default: USDC)')
    .option('--action-type <type>', 'Action type (payment, escrow_create, escrow_release, contract_sign, negotiation_check, counterparty_check)')
    .option('--contract-type <type>', 'Contract type')
    .option('--counterparty-agent-id <id>', 'UUID of the counterparty agent')
    .option('--counterparty-address <addr>', 'Wallet address of external counterparty')
    .action(async (agentId, opts) => {
      try {
        const sly = createClient();
        const result = await sly.agentWallets.evaluatePolicy(agentId, {
          amount: opts.amount,
          currency: opts.currency,
          actionType: opts.actionType || 'negotiation_check',
          contractType: opts.contractType,
          counterpartyAgentId: opts.counterpartyAgentId,
          counterpartyAddress: opts.counterpartyAddress,
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('exposures <agentId>')
    .description('List per-counterparty exposure windows for an agent wallet')
    .action(async (agentId) => {
      try {
        const sly = createClient();
        const result = await sly.agentWallets.getExposures(agentId);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('evaluations <agentId>')
    .description('Get the policy evaluation audit log for an agent wallet')
    .option('--page <page>', 'Page number', parseInt)
    .option('--limit <limit>', 'Results per page', parseInt)
    .action(async (agentId, opts) => {
      try {
        const sly = createClient();
        const result = await sly.agentWallets.getEvaluations(agentId, {
          page: opts.page,
          limit: opts.limit,
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('freeze <agentId>')
    .description('Freeze an agent\'s wallet (disables all payments)')
    .action(async (agentId) => {
      try {
        const sly = createClient();
        const result = await sly.agentWallets.freezeWallet(agentId);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('unfreeze <agentId>')
    .description('Unfreeze an agent\'s wallet')
    .action(async (agentId) => {
      try {
        const sly = createClient();
        const result = await sly.agentWallets.unfreezeWallet(agentId);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('set-policy <agentId>')
    .description('Set or update the spending and contract policy on an agent\'s wallet')
    .option('--daily-spend-limit <amount>', 'Daily spending limit', parseFloat)
    .option('--monthly-spend-limit <amount>', 'Monthly spending limit', parseFloat)
    .option('--requires-approval-above <amount>', 'Amount above which human approval is required', parseFloat)
    .option('--approved-vendors <json>', 'Approved vendor domains as JSON array')
    .option('--contract-policy <json>', 'Contract policy rules as JSON object')
    .action(async (agentId, opts) => {
      try {
        const sly = createClient();
        const policy: Record<string, unknown> = {};
        if (opts.dailySpendLimit !== undefined) policy.dailySpendLimit = opts.dailySpendLimit;
        if (opts.monthlySpendLimit !== undefined) policy.monthlySpendLimit = opts.monthlySpendLimit;
        if (opts.requiresApprovalAbove !== undefined) policy.requiresApprovalAbove = opts.requiresApprovalAbove;
        if (opts.approvedVendors) policy.approvedVendors = JSON.parse(opts.approvedVendors);
        if (opts.contractPolicy) policy.contractPolicy = JSON.parse(opts.contractPolicy);
        const result = await sly.agentWallets.setContractPolicy(agentId, policy as Parameters<typeof sly.agentWallets.setContractPolicy>[1]);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });
}
