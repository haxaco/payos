/**
 * A2A Service Barrel Export
 *
 * @see Epic 57: Google A2A Protocol Integration
 */

export * from './types.js';
export { generateAgentCard, generatePlatformCard } from './agent-card.js';
export { A2ATaskService } from './task-service.js';
export { handleJsonRpc } from './jsonrpc-handler.js';
export { A2APaymentHandler } from './payment-handler.js';
export { A2AClient } from './client.js';
export { A2ATaskProcessor } from './task-processor.js';
