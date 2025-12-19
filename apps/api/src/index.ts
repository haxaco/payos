import 'dotenv/config';
import { serve } from '@hono/node-server';
import app from './app.js';
import { getScheduledTransferWorker } from './workers/scheduled-transfers.js';

// Railway uses PORT, fallback to API_PORT for local dev
const port = parseInt(process.env.PORT || process.env.API_PORT || '4000');
// Railway expects 0.0.0.0 (all interfaces), not localhost
// Only use API_HOST if explicitly set (for local dev)
const host = process.env.API_HOST || '0.0.0.0';
const enableScheduledTransfers = process.env.ENABLE_SCHEDULED_TRANSFERS === 'true';
const mockMode = process.env.MOCK_SCHEDULED_TRANSFERS === 'true' || process.env.NODE_ENV === 'development';

console.log(`
╔════════════════════════════════════════════╗
║           PayOS API Server                 ║
╠════════════════════════════════════════════╣
║  🚀 Starting on http://${host}:${port}         ║
║  📚 Health: http://${host}:${port}/health      ║
║  🔒 Environment: ${(process.env.NODE_ENV || 'development').padEnd(16)}║
║  ⚙️  Scheduled Transfers: ${enableScheduledTransfers ? (mockMode ? 'ENABLED (MOCK)' : 'ENABLED (REAL)') : 'DISABLED'.padEnd(13)}║
╚════════════════════════════════════════════╝
`);

// Start scheduled transfer worker (only if enabled)
let worker: ReturnType<typeof getScheduledTransferWorker> | null = null;
if (enableScheduledTransfers) {
  worker = getScheduledTransferWorker(mockMode);
  const workerInterval = mockMode ? 30000 : 60000; // 30s in mock mode, 1min in real mode
  worker.start(workerInterval);
} else {
  console.log('⚠️  Scheduled transfer worker is DISABLED. Set ENABLE_SCHEDULED_TRANSFERS=true to enable.');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (worker) {
    worker.stop();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  if (worker) {
    worker.stop();
  }
  process.exit(0);
});

try {
  serve({
    fetch: app.fetch,
    port,
    hostname: host,
  });
  
  console.log(`✅ Server is listening on ${host}:${port}`);
  console.log(`📍 Railway URL: https://${process.env.RAILWAY_PUBLIC_DOMAIN || 'your-app.railway.app'}`);
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}


