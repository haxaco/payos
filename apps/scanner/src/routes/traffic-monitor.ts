import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { generateSnippet } from '../snippet/agent-monitor.js';
import * as queries from '../db/queries.js';

export const trafficMonitorRouter = new Hono();

// Open CORS for beacon endpoint only
trafficMonitorRouter.use('/beacon', cors({ origin: '*' }));

const beaconSchema = z.object({
  site_id: z.string().min(1).max(100),
  page_path: z.string().max(2000).default('/'),
  agent_type: z.string().min(1).max(100),
  detection_method: z.enum(['user_agent', 'referral', 'header']),
  referrer: z.string().max(2000).optional(),
  timestamp: z.string().optional(),
});

// GET /v1/scanner/snippet.js?site_id=xxx — serve the JS snippet
trafficMonitorRouter.get('/snippet.js', async (c) => {
  const siteId = c.req.query('site_id');
  if (!siteId) {
    return c.text('// Error: site_id query parameter is required', 400);
  }

  const baseUrl = process.env.SCANNER_BASE_URL || `${c.req.url.split('/v1')[0]}`;
  const beaconUrl = `${baseUrl}/v1/scanner/beacon`;
  const snippet = generateSnippet(siteId, beaconUrl);

  c.header('Content-Type', 'application/javascript');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.body(snippet);
});

// POST /v1/scanner/beacon — receive traffic events from the snippet
trafficMonitorRouter.post('/beacon', async (c) => {
  let body: unknown;
  try {
    const text = await c.req.text();
    body = JSON.parse(text);
  } catch {
    return c.body(null, 204);
  }

  const parsed = beaconSchema.safeParse(body);
  if (!parsed.success) {
    return c.body(null, 204);
  }

  const event = parsed.data;

  // Extract domain from Origin or Referer header
  const origin = c.req.header('origin') || c.req.header('referer') || '';
  let domain = '';
  try {
    domain = new URL(origin).hostname;
  } catch {
    // If no valid origin, try to extract from referer in payload
    if (event.referrer) {
      try {
        domain = new URL(event.referrer).hostname;
      } catch {
        domain = 'unknown';
      }
    } else {
      domain = 'unknown';
    }
  }

  // Rate limit: 1000 events/day per site_id
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  try {
    const todayCount = await queries.getTrafficEventCount(event.site_id, dayStart.toISOString());
    if (todayCount >= 1000) {
      return c.body(null, 204);
    }
  } catch {
    // If rate limit check fails, still accept the event
  }

  // Fire-and-forget insert
  queries.insertAgentTrafficEvent({
    site_id: event.site_id,
    domain,
    page_path: event.page_path,
    agent_type: event.agent_type,
    detection_method: event.detection_method,
    referrer: event.referrer,
  }).catch((err) => {
    console.error('[Traffic Monitor] Failed to insert event:', err.message);
  });

  return c.body(null, 204);
});

// GET /v1/scanner/traffic/:site_id — return aggregated stats
trafficMonitorRouter.get('/traffic/:site_id', async (c) => {
  const siteId = c.req.param('site_id');
  const stats = await queries.getTrafficStats(siteId);

  if (!stats) {
    return c.json({ error: 'No traffic data found for this site_id' }, 404);
  }

  return c.json(stats);
});

// GET /v1/scanner/traffic/:site_id/embed — return HTML dashboard
trafficMonitorRouter.get('/traffic/:site_id/embed', async (c) => {
  const siteId = c.req.param('site_id');
  const stats = await queries.getTrafficStats(siteId);

  const hasData = stats !== null;
  const totalVisits = stats?.total_visits || 0;
  const uniqueAgents = stats?.unique_agents || 0;
  const agentBreakdown = stats?.agent_breakdown || {};
  const topPages = stats?.top_pages || [];
  const dailyTrend = stats?.daily_trend || [];
  const domain = stats?.domain || 'your site';

  // Estimate lost revenue: assume 3% conversion rate, $50 avg order
  const estimatedLostRevenue = Math.round(totalVisits * 0.03 * 50);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Agent Traffic — ${domain}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px;min-height:100vh}
.container{max-width:900px;margin:0 auto}
h1{font-size:1.5rem;margin-bottom:4px;color:#f8fafc}
.subtitle{color:#94a3b8;margin-bottom:24px;font-size:0.875rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px}
.card{background:#1e293b;border-radius:12px;padding:20px;border:1px solid #334155}
.card-label{font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px}
.card-value{font-size:1.75rem;font-weight:700;color:#f8fafc}
.card-value.alert{color:#f97316}
.section{background:#1e293b;border-radius:12px;padding:20px;border:1px solid #334155;margin-bottom:16px}
.section h2{font-size:1rem;margin-bottom:12px;color:#f8fafc}
.bar-chart{display:flex;flex-direction:column;gap:8px}
.bar-row{display:flex;align-items:center;gap:8px}
.bar-label{width:140px;font-size:0.813rem;color:#cbd5e1;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar-track{flex:1;height:24px;background:#0f172a;border-radius:4px;overflow:hidden;position:relative}
.bar-fill{height:100%;background:linear-gradient(90deg,#3b82f6,#8b5cf6);border-radius:4px;min-width:2px}
.bar-count{position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:0.75rem;color:#e2e8f0}
.trend{display:flex;align-items:flex-end;gap:2px;height:80px;padding-top:8px}
.trend-bar{flex:1;background:linear-gradient(0deg,#3b82f6,#8b5cf6);border-radius:2px 2px 0 0;min-height:2px}
.trend-labels{display:flex;justify-content:space-between;font-size:0.625rem;color:#64748b;margin-top:4px}
.cta{background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:12px;padding:24px;text-align:center;margin-top:24px}
.cta h2{font-size:1.25rem;margin-bottom:8px}
.cta p{color:#e2e8f0;margin-bottom:16px;font-size:0.875rem}
.cta a{display:inline-block;background:#f8fafc;color:#1e293b;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.875rem}
.empty{text-align:center;padding:48px 24px;color:#64748b}
</style>
</head>
<body>
<div class="container">
<h1>AI Agent Traffic Monitor</h1>
<p class="subtitle">${domain} — Site ID: ${siteId}</p>
${hasData ? `
<div class="grid">
<div class="card"><div class="card-label">AI Agent Visits</div><div class="card-value">${totalVisits.toLocaleString()}</div></div>
<div class="card"><div class="card-label">Unique Agent Types</div><div class="card-value">${uniqueAgents}</div></div>
<div class="card"><div class="card-label">Conversions from AI</div><div class="card-value alert">0</div></div>
<div class="card"><div class="card-label">Est. Lost Revenue</div><div class="card-value alert">$${estimatedLostRevenue.toLocaleString()}</div></div>
</div>

${dailyTrend.length > 1 ? `
<div class="section">
<h2>Daily Agent Visits</h2>
<div class="trend">${dailyTrend.map(d => {
    const max = Math.max(...dailyTrend.map(t => t.visits));
    const pct = max > 0 ? (d.visits / max) * 100 : 0;
    return `<div class="trend-bar" style="height:${Math.max(pct, 3)}%" title="${d.date}: ${d.visits}"></div>`;
  }).join('')}</div>
<div class="trend-labels"><span>${dailyTrend[0].date}</span><span>${dailyTrend[dailyTrend.length - 1].date}</span></div>
</div>` : ''}

<div class="section">
<h2>Agent Breakdown</h2>
<div class="bar-chart">${Object.entries(agentBreakdown).sort(([,a],[,b]) => b - a).slice(0, 10).map(([agent, count]) => {
    const pct = totalVisits > 0 ? (count / totalVisits) * 100 : 0;
    return `<div class="bar-row"><div class="bar-label">${agent}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(pct, 1)}%"></div><div class="bar-count">${count}</div></div></div>`;
  }).join('')}</div>
</div>

${topPages.length > 0 ? `
<div class="section">
<h2>Top Pages Visited</h2>
<div class="bar-chart">${topPages.slice(0, 10).map(p => {
    const pct = totalVisits > 0 ? (p.visits / totalVisits) * 100 : 0;
    return `<div class="bar-row"><div class="bar-label">${p.path}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(pct, 1)}%"></div><div class="bar-count">${p.visits}</div></div></div>`;
  }).join('')}</div>
</div>` : ''}

<div class="cta">
<h2>You got ${totalVisits.toLocaleString()} agent visits. 0 converted.</h2>
<p>AI agents are visiting your site but can't complete purchases. Let Sly fix that with agentic commerce protocols.</p>
<a href="https://sly.com/contact?ref=traffic-monitor&site=${siteId}">Talk to Sly</a>
</div>
` : `
<div class="empty">
<h2>No traffic data yet</h2>
<p>Install the snippet and wait for AI agents to visit your site.</p>
</div>
`}
</div>
</body>
</html>`;

  c.header('Content-Type', 'text/html; charset=utf-8');
  c.header('Cache-Control', 'public, max-age=60');
  return c.body(html);
});
