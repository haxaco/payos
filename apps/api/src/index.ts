import { serve } from '@hono/node-server';
import app from './app.js';
import { getScheduledTransferWorker } from './workers/scheduled-transfers.js';

const port = parseInt(process.env.API_PORT || '4000');
const host = process.env.API_HOST || '0.0.0.0';
const mockMode = process.env.MOCK_SCHEDULED_TRANSFERS === 'true' || process.env.NODE_ENV === 'development';

console.log(`
╔════════════════════════════════════════════╗
║           PayOS API Server                 ║
╠════════════════════════════════════════════╣
║  🚀 Starting on http://${host}:${port}         ║
║  📚 Health: http://${host}:${port}/health      ║
║  🔒 Environment: ${(process.env.NODE_ENV || 'development').padEnd(16)}║
║  ⚙️  Scheduled Transfers: ${mockMode ? 'MOCK MODE' : 'REAL MODE'}    ║
╚════════════════════════════════════════════╝
`);

// Start scheduled transfer worker
const worker = getScheduledTransferWorker(mockMode);
const workerInterval = mockMode ? 30000 : 60000; // 30s in mock mode, 1min in real mode
worker.start(workerInterval);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  worker.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  worker.stop();
  process.exit(0);
});

serve({
  fetch: app.fetch,
  port,
  hostname: host,
});


