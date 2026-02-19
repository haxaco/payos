import { Hono } from 'hono';
import { z } from 'zod';
import {
  runObservatorySweep,
  recordObservation,
  getMerchantLeaderboard,
  getAgentActivityReport,
} from '../demand/observatory.js';
import * as queries from '../db/queries.js';

export const observatoryRouter = new Hono();

const observationSchema = z.object({
  domain: z.string().min(1).max(253),
  observation_type: z.enum([
    'ai_search_result', 'product_recommendation', 'protocol_announcement',
    'agent_marketplace', 'news_mention', 'manual',
  ]),
  source: z.enum([
    'perplexity', 'chatgpt', 'google_ai', 'bing_copilot',
    'mcp_registry', 'press', 'social', 'manual', 'scan_drift',
  ]),
  query: z.string().optional(),
  evidence: z.string().min(1),
  evidence_url: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});

// POST /v1/scanner/observatory/sweep — run automated observation collection
observatoryRouter.post('/observatory/sweep', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const result = await runObservatorySweep({
    crawl_registries: body.crawl_registries,
    detect_drift: body.detect_drift,
    check_domains: body.check_domains,
  });
  return c.json(result);
});

// POST /v1/scanner/observatory/observations — record a manual observation
observatoryRouter.post('/observatory/observations', async (c) => {
  const body = await c.req.json();
  const parsed = observationSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.flatten() }, 400);
  }

  const { id } = await recordObservation(parsed.data);
  return c.json({ id }, 201);
});

// GET /v1/scanner/observatory/observations — list observations
observatoryRouter.get('/observatory/observations', async (c) => {
  const domain = c.req.query('domain');
  const type = c.req.query('type');
  const source = c.req.query('source');
  const since = c.req.query('since');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200);

  const data = await queries.getAgentObservations({
    domain: domain || undefined,
    observation_type: type || undefined,
    source: source || undefined,
    since: since || undefined,
    limit,
  });

  return c.json({ data });
});

// GET /v1/scanner/observatory/leaderboard — most AI-referenced merchants
observatoryRouter.get('/observatory/leaderboard', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
  const since = c.req.query('since');

  const data = await getMerchantLeaderboard(limit, since || undefined);
  return c.json({ data });
});

// GET /v1/scanner/observatory/report — activity report
observatoryRouter.get('/observatory/report', async (c) => {
  const since = c.req.query('since');
  const report = await getAgentActivityReport(since || undefined);
  return c.json(report);
});

// GET /v1/scanner/observatory/stats — observation stats
observatoryRouter.get('/observatory/stats', async (c) => {
  const stats = await queries.getObservationStats();
  return c.json(stats);
});
