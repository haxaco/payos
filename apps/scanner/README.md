# @sly/scanner — Agentic Commerce Demand Scanner

**Epic 56** · Intelligence engine that scans merchant readiness for agentic commerce.

## Directory Structure

```
src/
├── probes/       # Protocol detection (UCP, ACP, x402, AP2, MCP, NLWeb, Visa VIC, Mastercard)
├── analyzers/    # Structured data, accessibility, checkout friction, scoring
├── queue/        # Batch processor with p-limit concurrency control
├── demand/       # Intelligence aggregator, synthetic tests, observatory, telemetry, prospect scoring
├── mcp/          # MCP server + tool definitions (13 tools)
├── routes/       # Hono API routes
├── db/           # Supabase client & query helpers
└── index.ts      # Hono entry point (port 4100)
seed/             # Pre-built scan lists (1,000 merchants)
```

## Three Operational Modes

1. **API On-Demand** — `POST /v1/scanner/scan` (single domain, 2-5s)
2. **CSV Batch Upload** — `POST /v1/scanner/scan/batch` (1,000 merchants in ~5-8 min)
3. **MCP Server for Claude** — 13 tools exposed via stdio transport

## Spec

Full spec: `docs/prd/epics/epic-56-agentic-commerce-demand-scanner.md`

## Dependencies

`undici`, `cheerio`, `p-limit`, `csv-parse`, `@modelcontextprotocol/sdk`, `zod`, `hono`, `@supabase/supabase-js`

No Puppeteer. Lightweight HTTP probing only.
