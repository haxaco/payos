import { Command } from 'commander';
import { createClient } from '../utils/auth.js';
import { output, error } from '../utils/output.js';

export function registerSupportCommands(program: Command) {
  const cmd = program.command('support').description('Support and dispute management');

  cmd
    .command('explain-rejection')
    .description('Explain why a transaction was rejected')
    .option('--error-code <code>', 'Error code from the rejection')
    .option('--transaction-id <id>', 'UUID of the rejected transaction')
    .option('--agent-id <id>', 'UUID of the agent')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {};
        if (opts.errorCode) body.error_code = opts.errorCode;
        if (opts.transactionId) body.transaction_id = opts.transactionId;
        if (opts.agentId) body.agent_id = opts.agentId;
        const result = await sly.request('/v1/support/explain-rejection', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('request-limit-increase')
    .description('Submit a request to increase an agent\'s spending limit')
    .requiredOption('--agent-id <agentId>', 'UUID of the agent')
    .requiredOption('--limit-type <type>', 'Which limit to increase (per_transaction, daily, monthly)')
    .requiredOption('--requested-amount <amount>', 'The new desired limit amount (USD)', parseFloat)
    .requiredOption('--reason <reason>', 'Business justification')
    .option('--duration <duration>', 'How long the increase should last (temporary_24h, temporary_7d, permanent)')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {
          agent_id: opts.agentId,
          limit_type: opts.limitType,
          requested_amount: opts.requestedAmount,
          reason: opts.reason,
        };
        if (opts.duration) body.duration = opts.duration;
        const result = await sly.request('/v1/support/request-limit-increase', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('open-dispute')
    .description('Open a dispute for a completed transaction')
    .requiredOption('--transaction-id <id>', 'UUID of the transaction')
    .requiredOption('--reason <reason>', 'Reason (service_not_received, duplicate_charge, unauthorized, amount_incorrect, quality_issue, other)')
    .requiredOption('--description <description>', 'Detailed description of the issue')
    .option('--requested-resolution <resolution>', 'Requested resolution (full_refund, partial_refund, credit, other)')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {
          transaction_id: opts.transactionId,
          reason: opts.reason,
          description: opts.description,
        };
        if (opts.requestedResolution) body.requested_resolution = opts.requestedResolution;
        const result = await sly.request('/v1/support/open-dispute', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('escalate')
    .description('Escalate an issue to a human support operator')
    .requiredOption('--reason <reason>', 'Why this is being escalated (complex_issue, agent_requested, security_concern, policy_exception, bug_report)')
    .requiredOption('--summary <summary>', 'Summary of the issue')
    .option('--agent-id <agentId>', 'UUID of the agent')
    .option('--priority <priority>', 'Priority level (low, medium, high, critical)')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const body: Record<string, unknown> = {
          reason: opts.reason,
          summary: opts.summary,
        };
        if (opts.agentId) body.agent_id = opts.agentId;
        if (opts.priority) body.priority = opts.priority;
        const result = await sly.request('/v1/support/escalate', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });
}
