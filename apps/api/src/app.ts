import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { rateLimiter, authRateLimiter } from './middleware/rate-limit.js';
import { requestId, securityHeaders } from './middleware/security.js';

// Import routes
import accountsRouter from './routes/accounts.js';
import agentsRouter from './routes/agents.js';
import transfersRouter from './routes/transfers.js';
import internalTransfersRouter from './routes/internal-transfers.js';
import streamsRouter from './routes/streams.js';
import quotesRouter from './routes/quotes.js';
import reportsRouter from './routes/reports.js';

const app = new Hono();

// ============================================
// GLOBAL MIDDLEWARE (applies to all routes)
// ============================================

// Request ID for tracing
app.use('*', requestId);

// Security headers
app.use('*', secureHeaders());
app.use('*', securityHeaders);

// Request logging (disable in production or use structured logging)
if (process.env.NODE_ENV !== 'production') {
  app.use('*', logger());
}

// Pretty JSON in development
if (process.env.NODE_ENV !== 'production') {
  app.use('*', prettyJSON());
}

// CORS configuration
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'X-Request-ID'],
    exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-Request-ID'],
    credentials: true,
    maxAge: 86400, // 24 hours
  })
);

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================

// Health check
app.get('/health', (c) =>
  c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  })
);

// Ready check (for k8s readiness probes)
app.get('/ready', (c) =>
  c.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  })
);

// ============================================
// API v1 ROUTES (auth required)
// ============================================

const v1 = new Hono();

// Rate limiting for all API routes
v1.use('*', rateLimiter());

// Stricter rate limit for auth (applied before auth middleware)
v1.use('*', authRateLimiter);

// Authentication
v1.use('*', authMiddleware);

// Mount route handlers
v1.route('/accounts', accountsRouter);
v1.route('/agents', agentsRouter);
v1.route('/transfers', transfersRouter);
v1.route('/internal-transfers', internalTransfersRouter);
v1.route('/streams', streamsRouter);
v1.route('/quotes', quotesRouter);
v1.route('/reports', reportsRouter);

app.route('/v1', v1);

// ============================================
// ERROR HANDLING
// ============================================

// Global error handler
app.onError(errorHandler);

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

export default app;
