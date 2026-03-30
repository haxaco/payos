#!/usr/bin/env node
import { Command } from 'commander';
import { registerAccountsCommands } from './commands/accounts.js';
import { registerAgentsCommands } from './commands/agents.js';
import { registerWalletsCommands } from './commands/wallets.js';
import { registerSettlementCommands } from './commands/settlement.js';
import { registerX402Commands } from './commands/x402.js';
import { registerAP2Commands } from './commands/ap2.js';
import { registerACPCommands } from './commands/acp.js';
import { registerUCPCommands } from './commands/ucp.js';
import { registerMPPCommands } from './commands/mpp.js';
import { registerA2ACommands } from './commands/a2a.js';
import { registerAgentWalletsCommands } from './commands/agent-wallets.js';
import { registerMerchantsCommands } from './commands/merchants.js';
import { registerSupportCommands } from './commands/support.js';
import { registerEnvCommands } from './commands/env.js';

const program = new Command()
  .name('sly')
  .description('Sly CLI — the agentic economy platform')
  .version('0.1.0');

registerAccountsCommands(program);
registerAgentsCommands(program);
registerWalletsCommands(program);
registerSettlementCommands(program);
registerX402Commands(program);
registerAP2Commands(program);
registerACPCommands(program);
registerUCPCommands(program);
registerMPPCommands(program);
registerA2ACommands(program);
registerAgentWalletsCommands(program);
registerMerchantsCommands(program);
registerSupportCommands(program);
registerEnvCommands(program);

program.parse();
