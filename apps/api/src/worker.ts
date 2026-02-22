/**
 * Standalone A2A Task Worker Entry Point (Story 58.10)
 *
 * Runs the A2A task worker as a separate process for production scaling.
 * Shares the same codebase as the in-process worker started from index.ts.
 *
 * Usage:
 *   A2A_WORKER_MAX_CONCURRENT=10 tsx src/worker.ts
 *   # or in production:
 *   node dist/worker.js
 *
 * Environment variables:
 *   A2A_WORKER_POLL_MS          - Poll interval in ms (default: 500)
 *   A2A_WORKER_MAX_CONCURRENT   - Max concurrent tasks (default: 5)
 *   A2A_WORKER_MAX_PER_TENANT   - Max concurrent per tenant (default: 3)
 *   A2A_WORKER_TASK_TIMEOUT     - Task processing timeout ms (default: 60000)
 *   A2A_WORKER_SHUTDOWN_GRACE   - Graceful shutdown period ms (default: 30000)
 */

import 'dotenv/config';
import { getA2ATaskWorker } from './workers/a2a-task-worker.js';

const worker = getA2ATaskWorker();

console.log(`
╔══════════════════════════════════════════════════╗
║          A2A Task Worker (Standalone)             ║
╠══════════════════════════════════════════════════╣
║  🤖 Mode: Standalone process                     ║
║  🔒 NODE_ENV: ${(process.env.NODE_ENV || 'development').padEnd(33)}║
╚══════════════════════════════════════════════════╝
`);

worker.start();

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down worker...`);
  await worker.stop();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
