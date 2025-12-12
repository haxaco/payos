import { serve } from '@hono/node-server';
import app from './app.js';

const port = parseInt(process.env.API_PORT || '4000');
const host = process.env.API_HOST || '0.0.0.0';

console.log(`
╔════════════════════════════════════════════╗
║           PayOS API Server                 ║
╠════════════════════════════════════════════╣
║  🚀 Starting on http://${host}:${port}         ║
║  📚 Health: http://${host}:${port}/health      ║
║  🔒 Environment: ${(process.env.NODE_ENV || 'development').padEnd(16)}║
╚════════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port,
  hostname: host,
});

