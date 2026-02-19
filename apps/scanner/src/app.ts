import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { timing } from 'hono/timing';
import { secureHeaders } from 'hono/secure-headers';
import { prettyJSON } from 'hono/pretty-json';
import { scanRouter } from './routes/scan.js';
import { batchRouter } from './routes/batch.js';
import { testsRouter } from './routes/tests.js';
import { observatoryRouter } from './routes/observatory.js';
import { prospectsRouter } from './routes/prospects.js';
import { healthRouter } from './routes/health.js';
import { trafficMonitorRouter } from './routes/traffic-monitor.js';
import { reportsRouter } from './routes/reports.js';

const app = new Hono();

// Global middleware
app.use('*', timing());
app.use('*', secureHeaders());
app.use('*', cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Tenant-ID'],
}));

if (process.env.NODE_ENV === 'development') {
  app.use('*', prettyJSON());
}

// Request ID middleware
app.use('*', async (c, next) => {
  const requestId = c.req.header('x-request-id') || crypto.randomUUID();
  c.header('X-Request-ID', requestId);
  await next();
});

// Public routes
app.route('/', healthRouter);

// V1 API routes
const v1 = new Hono();
v1.route('/scanner', scanRouter);
v1.route('/scanner', batchRouter);
v1.route('/scanner', testsRouter);
v1.route('/scanner', observatoryRouter);
v1.route('/scanner', prospectsRouter);
v1.route('/scanner', trafficMonitorRouter);
v1.route('/scanner', reportsRouter);

app.route('/v1', v1);

// Global error handler
app.onError((err, c) => {
  console.error('[Scanner Error]', err.message);
  const status = 'statusCode' in err ? (err as any).statusCode : 500;
  return c.json(
    { error: err.message || 'Internal Server Error' },
    status,
  );
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', message: `Route ${c.req.method} ${c.req.path} not found` }, 404);
});

export default app;
