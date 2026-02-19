import { Hono } from 'hono';
import {
  getProspectList,
  getHeatMap,
  exportProspectsAsCSV,
} from '../demand/prospect-scoring.js';
import type { SalesPriority } from '@sly/types';

export const prospectsRouter = new Hono();

// GET /v1/scanner/prospects — scored prospect list
prospectsRouter.get('/prospects', async (c) => {
  const category = c.req.query('category') || undefined;
  const region = c.req.query('region') || undefined;
  const minOpportunity = c.req.query('min_opportunity');
  const priority = c.req.query('priority') as SalesPriority | undefined;
  const limitParam = c.req.query('limit');
  const limit = limitParam ? parseInt(limitParam) : 50;

  const prospects = await getProspectList({
    category,
    region,
    min_opportunity: minOpportunity ? parseInt(minOpportunity) : undefined,
    priority,
    limit: Math.min(limit, 200),
  });

  return c.json({ data: prospects, total: prospects.length });
});

// GET /v1/scanner/prospects/heat-map — category × region matrix
prospectsRouter.get('/prospects/heat-map', async (c) => {
  const heatMap = await getHeatMap();
  return c.json({ data: heatMap });
});

// GET /v1/scanner/prospects/export — CSV export for CRM
prospectsRouter.get('/prospects/export', async (c) => {
  const category = c.req.query('category') || undefined;
  const region = c.req.query('region') || undefined;
  const priority = c.req.query('priority') as SalesPriority | undefined;
  const limitParam = c.req.query('limit');
  const limit = limitParam ? parseInt(limitParam) : 200;

  const prospects = await getProspectList({
    category,
    region,
    priority,
    limit: Math.min(limit, 500),
  });

  const csv = exportProspectsAsCSV(prospects);

  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="sly-prospects-${new Date().toISOString().split('T')[0]}.csv"`);
  return c.body(csv);
});
