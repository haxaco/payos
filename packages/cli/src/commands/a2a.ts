import { Command } from 'commander';
import { createClient } from '../utils/auth.js';
import { output, error } from '../utils/output.js';

export function registerA2ACommands(program: Command) {
  const cmd = program.command('a2a').description('A2A (Agent-to-Agent Protocol) task management');

  cmd
    .command('discover <agentId>')
    .description('Discover an agent\'s capabilities via its Agent Card')
    .action(async (agentId) => {
      try {
        const sly = createClient();
        const result = await sly.a2a.discover(agentId);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('send')
    .description('Send a message to an A2A agent')
    .requiredOption('--agent-id <agentId>', 'Local Sly agent ID')
    .requiredOption('--message <message>', 'Text message to send to the agent')
    .option('--context-id <contextId>', 'Context ID for multi-turn conversations')
    .option('--skill-id <skillId>', 'Skill ID to target')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const result = await sly.a2a.sendMessage(opts.agentId, {
          message: opts.message,
          contextId: opts.contextId,
          skillId: opts.skillId,
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('get-task')
    .description('Get the status and details of an A2A task')
    .requiredOption('--agent-id <agentId>', 'Agent ID')
    .requiredOption('--task-id <taskId>', 'Task ID')
    .option('--history-length <length>', 'Number of history items to include', parseInt)
    .action(async (opts) => {
      try {
        const sly = createClient();
        const result = await sly.a2a.getTask(opts.agentId, opts.taskId, opts.historyLength);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('tasks')
    .description('List A2A tasks')
    .option('--agent-id <agentId>', 'Filter by agent ID')
    .option('--state <state>', 'Filter by state (submitted, working, input-required, completed, failed, canceled, rejected)')
    .option('--direction <direction>', 'Filter by direction (inbound, outbound)')
    .option('--limit <limit>', 'Results per page', parseInt)
    .option('--page <page>', 'Page number', parseInt)
    .action(async (opts) => {
      try {
        const sly = createClient();
        const result = await sly.a2a.listTasks({
          agentId: opts.agentId,
          state: opts.state,
          direction: opts.direction,
          limit: opts.limit,
          page: opts.page,
        });
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('respond <taskId>')
    .description('Respond to a task in input-required state')
    .requiredOption('--message <message>', 'Response message')
    .action(async (taskId, opts) => {
      try {
        const sly = createClient();
        const result = await sly.a2a.respond(taskId, opts.message);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });

  cmd
    .command('cancel')
    .description('Cancel an A2A task')
    .requiredOption('--agent-id <agentId>', 'Agent ID')
    .requiredOption('--task-id <taskId>', 'Task ID')
    .action(async (opts) => {
      try {
        const sly = createClient();
        const result = await sly.a2a.cancelTask(opts.agentId, opts.taskId);
        output(result);
      } catch (e: unknown) {
        error((e as Error).message);
      }
    });
}
