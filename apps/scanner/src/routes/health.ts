import { Hono } from 'hono';

export const healthRouter = new Hono();

healthRouter.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'sly-scanner',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/ready', (c) => {
  return c.json({
    status: 'ready',
    service: 'sly-scanner',
  });
});
