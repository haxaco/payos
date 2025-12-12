import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';

// Import routes
import accountsRouter from './routes/accounts.js';
import agentsRouter from './routes/agents.js';
import transfersRouter from './routes/transfers.js';
import internalTransfersRouter from './routes/internal-transfers.js';
import streamsRouter from './routes/streams.js';
import quotesRouter from './routes/quotes.js';
import reportsRouter from './routes/reports.js';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
  })
);

// Health check (no auth)
app.get('/health', (c) =>
  c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  })
);

// API v1 routes (with auth)
const v1 = new Hono();
v1.use('*', authMiddleware);

v1.route('/accounts', accountsRouter);
v1.route('/agents', agentsRouter);
v1.route('/transfers', transfersRouter);
v1.route('/internal-transfers', internalTransfersRouter);
v1.route('/streams', streamsRouter);
v1.route('/quotes', quotesRouter);
v1.route('/reports', reportsRouter);

app.route('/v1', v1);

// Global error handler
app.onError(errorHandler);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default app;


