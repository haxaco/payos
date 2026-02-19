# Epic 56: Agentic Commerce Demand Scanner 📡

## Overview

Build a systematic intelligence engine that scans, indexes, and reports on merchant readiness for agentic commerce across the web. This epic creates Sly's proprietary data moat — the equivalent of what Tollbit's "State of the Bots" reports did for AI content scraping, but for agent-initiated commerce. The scanner measures untapped demand that merchants are losing by not supporting agentic protocols, produces the data foundation for Sly's thought leadership and sales pipeline, and powers a public-facing "Agent Readiness Audit" tool for lead generation.

**Phase:** 4 (Customer Validation)  
**Priority:** P0 — Revenue-critical (demand intelligence drives sales pipeline)  
**Status:** 📋 New  
**Total Points:** 138  
**Stories:** 0/24  
**Dependencies:** Epic 43 (UCP), Epic 49 (Protocol Discovery), Epic 36 (SDK)  
**Doc:** `docs/prd/epics/epic-56-agentic-commerce-demand-scanner.md`

---

## Strategic Context

### The Tollbit Playbook — Applied to Commerce

Tollbit built a $31M company by answering one question publishers couldn't answer themselves: *"How much AI traffic is hitting your site, and how much revenue are you leaving on the table?"*

Sly needs to answer the equivalent question for merchants and enterprises: *"How many AI agents are trying to buy from you — and failing?"*

**The core insight:** Nobody is systematically measuring agentic commerce readiness across the web. No company tracks how many merchants support UCP, ACP, x402, MCP checkout, or structured product data for agents. No one publishes data on agent checkout success/failure rates, protocol adoption curves, or the "dark demand" that agents generate but merchants can't capture. Sly builds this intelligence layer and owns the category.

### Why This Is P0

1. **Sales enablement** — Every Sly customer conversation should open with: *"We scanned your site. Here's what you're missing."* This epic produces the data for that opener.
2. **Thought leadership** — A "State of Agentic Commerce" report positions Sly as the authority, the same way Tollbit's reports get cited by The Register, Digiday, Press Gazette, and Washington Post.
3. **Product-led growth** — The public Agent Readiness Audit tool generates inbound leads from merchants discovering their own gap.
4. **Competitive moat** — The data compounds. More scans → better benchmarks → more credible reports → more prospects → more customers → more transaction data → better scans. Flywheel.
5. **Investor signal** — Proprietary demand data is the strongest proof point for market timing. YC, Grove, and Series A investors can see the demand curve.

### What We Measure

| Signal Category | What It Shows | How We Detect It |
|-----------------|---------------|------------------|
| **Protocol Support** | Can agents check out? | Probe `/.well-known/ucp`, MCP endpoints, ACP checkout routes, x402 endpoints |
| **Structured Product Data** | Can agents understand the catalog? | Parse Schema.org Product/Offer markup, Open Graph, JSON-LD |
| **Agent Accessibility** | Is the site agent-friendly? | Check robots.txt for agent user-agents, CAPTCHA gates, JavaScript-required checkout |
| **Checkout Friction** | How hard is it for an agent to buy? | Measure steps-to-checkout, required fields, auth walls |
| **Payment Handler Coverage** | Which payment processors support agentic? | Detect Stripe, Shopify, Square, PayPal integrations + their agentic capabilities |
| **Geographic Readiness** | LATAM-specific gaps | Pix/SPEI/local payment availability, currency support, LATAM-specific checkout fields |

---

## Architecture & Stack Premise

### Design Principle: Scanner Lives in the Monorepo

The scanner is built as part of Sly's existing Turborepo monorepo, not as a separate service. This keeps it tightly integrated with shared types, database packages, and the existing API infrastructure while remaining independently deployable.

**Why in the monorepo:**
- Scanner types (`MerchantScan`, `ScanProtocolResult`, etc.) are consumed by the main API, the dashboard, and the MCP server — shared types must live in `packages/types`
- Database migrations use the same Supabase instance and follow the same migration patterns in `packages/db`
- Scanner probes reuse existing protocol knowledge from Epic 43 (UCP), Epic 36 (SDK)
- One `pnpm dev` runs everything locally
- CI/CD deploys scanner alongside or independently from the main API

### What the Scanner Actually Does

The scanner is almost entirely HTTP fetches. Stories 56.1–56.3 are: fetch a URL, parse the response, store results. There is no headless browser requirement for the core probes (protocol endpoints, robots.txt, schema.org, platform detection). The work is I/O bound waiting on HTTP responses, not compute bound.

This means the stack question is about **where to run it** and **how to trigger it** — not about heavy infrastructure.

### Monorepo Placement

```
sly/
├── apps/
│   ├── api/                          # Existing Hono API server (port 4000)
│   ├── dashboard/                    # Existing Next.js dashboard (port 3000)
│   └── scanner/                      # ⭐ NEW — Scanner service (port 4100)
│       ├── src/
│       │   ├── index.ts              # Hono server entry point
│       │   ├── app.ts                # Hono app setup
│       │   ├── routes/
│       │   │   ├── scan.ts           # POST /scan, GET /scan/:id
│       │   │   ├── batch.ts          # POST /batch, GET /batch/:id
│       │   │   ├── demand.ts         # Demand intelligence API routes
│       │   │   ├── tests.ts          # Synthetic agent test routes
│       │   │   ├── observatory.ts    # Agent observation routes
│       │   │   ├── prospects.ts      # Demand heat map & prospect scoring
│       │   │   └── health.ts         # Health check
│       │   ├── probes/
│       │   │   ├── ucp.ts            # UCP protocol probe
│       │   │   ├── acp.ts            # ACP protocol probe
│       │   │   ├── x402.ts           # x402 protocol probe
│       │   │   ├── ap2.ts            # AP2 protocol probe
│       │   │   ├── mcp.ts            # MCP protocol probe
│       │   │   ├── nlweb.ts          # NLWeb protocol probe
│       │   │   ├── visa-vic.ts       # Visa VIC probe
│       │   │   ├── mastercard-ap.ts  # Mastercard AgentPay probe
│       │   │   └── index.ts          # Probe runner (Promise.allSettled)
│       │   ├── analyzers/
│       │   │   ├── structured-data.ts    # Schema.org / JSON-LD / OG parser
│       │   │   ├── accessibility.ts      # robots.txt, CAPTCHA, platform detection
│       │   │   ├── checkout-friction.ts  # Guest checkout, step count, payment methods
│       │   │   └── readiness-score.ts    # Composite scoring algorithm
│       │   ├── queue/
│       │   │   ├── batch-processor.ts    # In-process batch queue with p-limit
│       │   │   └── csv-parser.ts         # CSV upload → scan targets
│       │   ├── demand/
│       │   │   ├── intelligence.ts       # Public demand data aggregation
│       │   │   ├── synthetic-tests.ts    # Agent shopping test runner
│       │   │   ├── observatory.ts        # Agent behavior monitoring
│       │   │   ├── telemetry.ts          # Transaction demand signals
│       │   │   └── prospect-scoring.ts   # Demand-readiness gap scoring
│       │   ├── mcp/
│       │   │   ├── server.ts             # MCP server entry (stdio + SSE transport)
│       │   │   └── tools.ts              # MCP tool definitions
│       │   └── db/
│       │       ├── client.ts             # Supabase client
│       │       └── queries.ts            # Typed scanner queries
│       ├── seed/
│       │   ├── shopify-top-500.csv       # Seed scan list: top Shopify stores
│       │   ├── dtc-brands-us-200.csv     # Seed: US DTC brands
│       │   ├── latam-ecommerce-100.csv   # Seed: LATAM e-commerce leaders
│       │   ├── b2b-saas-100.csv          # Seed: B2B/SaaS companies
│       │   ├── enterprise-procurement-50.csv
│       │   ├── travel-hospitality-50.csv
│       │   └── demand-intelligence-seed.json  # Pre-loaded demand data points
│       ├── package.json
│       ├── tsconfig.json
│       └── Dockerfile                    # Independent deployment
│
├── packages/
│   ├── types/
│   │   └── src/
│   │       ├── scanner.ts            # ⭐ NEW — Scanner type definitions
│   │       ├── demand.ts             # ⭐ NEW — Demand intelligence types
│   │       └── index.ts              # Re-export scanner types
│   ├── utils/
│   │   └── src/
│   │       └── readiness-score.ts    # ⭐ NEW — Shared scoring algorithm
│   └── db/
│       └── migrations/
│           ├── 020_scanner_tables.sql          # ⭐ NEW — Scanner tables
│           ├── 021_demand_intelligence.sql     # ⭐ NEW — Demand tables
│           └── 022_agent_shopping_tests.sql    # ⭐ NEW — Test result tables
│
├── turbo.json                        # Add scanner pipeline
├── pnpm-workspace.yaml               # Already includes apps/*
└── package.json
```

### Package Configuration

```json
// apps/scanner/package.json
{
  "name": "@sly/scanner",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "dev:mcp": "tsx src/mcp/server.ts",
    "build": "tsup src/index.ts src/mcp/server.ts --format cjs,esm --dts",
    "start": "node dist/index.js",
    "start:mcp": "node dist/mcp/server.js",
    "scan": "tsx src/cli.ts scan",
    "batch": "tsx src/cli.ts batch",
    "seed": "tsx src/cli.ts seed",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@sly/types": "workspace:*",
    "@sly/utils": "workspace:*",
    "@supabase/supabase-js": "^2.38.0",
    "@hono/node-server": "^1.3.0",
    "hono": "^3.11.0",
    "zod": "^3.22.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "cheerio": "^1.0.0",
    "undici": "^6.0.0",
    "p-limit": "^5.0.0",
    "csv-parse": "^5.5.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0"
  }
}
```

```json
// turbo.json — add scanner to pipeline
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": { "cache": false, "persistent": true },
    "dev:mcp": { "cache": false, "persistent": true },
    "seed": { "cache": false }
  }
}
```

### Three Trigger Modes

The scanner supports three consumption modes from the same core probe logic. All three share the same probes, analyzers, scoring algorithm, and database storage. The difference is how scans are initiated and how results are consumed.

```
┌─────────────────────────────────────────────────────────────────┐
│                     SCANNER CORE (shared)                        │
│                                                                  │
│  probes/     → HTTP fetches for each protocol                   │
│  analyzers/  → Parse HTML, structured data, robots.txt          │
│  scoring     → Compute readiness score 0-100                    │
│  storage     → Supabase (merchant_scans, scan_protocol_results) │
│                                                                  │
└────────┬──────────────────┬──────────────────┬──────────────────┘
         │                  │                  │
    ┌────▼────┐       ┌─────▼─────┐      ┌────▼────┐
    │ MODE 1  │       │  MODE 2   │      │ MODE 3  │
    │ API     │       │  CSV      │      │ MCP     │
    │ on-     │       │  batch    │      │ server  │
    │ demand  │       │  upload   │      │ for AI  │
    └─────────┘       └───────────┘      └─────────┘
```

#### Mode 1: API On-Demand (Hono REST)

Single scan via REST API. Returns results in 2-5 seconds. Powers the public Agent Readiness Audit tool (56.11) and sales conversations.

```
POST /v1/scanner/scan          → scan one domain, return full results
GET  /v1/scanner/scan/:id      → retrieve cached scan
POST /v1/scanner/scan/batch    → submit batch, returns batch_id
GET  /v1/scanner/scan/batch/:id → check batch progress & results
```

**Deployment:** Hono server on Railway/Render at port 4100. Separate from the main API so scanner traffic (potentially thousands of outbound HTTP requests during a batch) doesn't affect core payment APIs.

**When to use:** Sales calls ("scan this merchant right now"), public audit tool, webhook-triggered re-scans.

#### Mode 2: CSV Batch Upload

Upload a CSV of merchant names + URLs, scanner chews through them in the background. 1,000 merchants in ~5-8 minutes at 10-20 concurrent scans.

```csv
domain,merchant_name,category,country_code
liverpool.com.mx,Liverpool,retail,MX
amazon.com.mx,Amazon Mexico,marketplace,MX
mercadolibre.com.mx,MercadoLibre,marketplace,MX
```

Upload via API (`POST /v1/scanner/scan/batch` with `Content-Type: multipart/form-data`) or via CLI (`pnpm scan batch --file seed/latam-ecommerce-100.csv`).

Queue uses `p-limit` for in-process concurrency control. No external queue needed at this scale. Each scan is 2-5 seconds of HTTP probes — 10 concurrent = 100-250 scans/minute. The 1,000-merchant baseline runs in a single session.

**When to use:** Initial baseline dataset, weekly re-scans, prospect list processing, building the "State of Agentic Commerce" report dataset.

#### Mode 3: MCP Server for Claude (the killer mode)

Expose the scanner as MCP tools. Load as an MCP server in Claude (or any MCP-compatible AI), then use natural language to scan, query, analyze, and report.

```typescript
// MCP Tool Definitions
const SCANNER_MCP_TOOLS = [
  // Scanning
  'scan_merchant',          // Scan a single domain → full readiness results
  'batch_scan',             // Kick off batch scan → batch_id
  'get_batch_progress',     // Check batch status

  // Query existing data
  'get_scan_results',       // Retrieve cached scan for a domain
  'search_scans',           // Query scan database with filters
  'compare_merchants',      // Side-by-side readiness comparison

  // Demand intelligence
  'get_demand_brief',       // Generate demand narrative for category/region
  'get_demand_stats',       // Raw demand data points

  // Synthetic tests
  'run_agent_shopping_test', // Run 5-step agent test against a merchant
  'get_test_results',       // Retrieve test results

  // Analysis & reporting
  'get_readiness_report',   // Aggregate stats by category/region/platform
  'find_best_prospects',    // Top-N merchants by opportunity score
  'get_protocol_adoption',  // Protocol adoption rates across scanned universe
];
```

**Why MCP is the real unlock:**

1. **Claude IS the dashboard.** You don't need to build scan management UI (56.9) or analytics (56.10) up front. Ask Claude: "Which LATAM merchants block GPTBot but not ClaudeBot?" and it queries the scan database via MCP tools.

2. **Claude IS the report generator.** Tell Claude: "Write the State of Agentic Commerce Q1 2026 report using our scan data" — it pulls stats via MCP, drafts the report, includes citations.

3. **Claude IS the sales prep tool.** Before a meeting: "Scan liverpool.com.mx, run the agent shopping test, compare against amazon.com.mx, and draft a one-page brief." Claude runs all three tools and produces the deliverable.

4. **Batch orchestration with intelligence.** Upload a CSV into Claude, say "scan all of these and tell me which 10 to call first" — Claude calls `batch_scan`, waits for results, calls `find_best_prospects`, and produces a prioritized outreach list with reasoning.

**Deployment:** The MCP server runs as a separate entrypoint (`pnpm dev:mcp` or `node dist/mcp/server.js`). Supports both stdio transport (for local Claude Desktop / Claude Code) and SSE transport (for remote MCP connections). Shares the same probe logic and Supabase connection as Modes 1 and 2.

**MCP Server Configuration (for Claude Desktop):**

```json
{
  "mcpServers": {
    "sly-scanner": {
      "command": "node",
      "args": ["path/to/sly/apps/scanner/dist/mcp/server.js"],
      "env": {
        "SUPABASE_URL": "...",
        "SUPABASE_SERVICE_ROLE_KEY": "...",
        "SCANNER_MODE": "mcp"
      }
    }
  }
}
```

### Dependencies (Minimal)

The scanner has intentionally minimal dependencies. No Puppeteer, no headless Chrome, no heavy runtime.

| Package | Purpose | Size |
|---------|---------|------|
| `undici` | HTTP client (faster than node-fetch, built into Node) | Built-in |
| `cheerio` | HTML parsing for schema.org, robots.txt, platform detection | ~300KB |
| `p-limit` | Concurrency control for batch queue | 3KB |
| `csv-parse` | Parse CSV uploads for batch mode | 50KB |
| `zod` | Input validation (already in monorepo) | Shared |
| `hono` | HTTP server for API mode (already in monorepo) | Shared |
| `@supabase/supabase-js` | Database client (already in monorepo) | Shared |
| `@modelcontextprotocol/sdk` | MCP server for Mode 3 | ~100KB |

**What about cheerio vs headless browser for Story 56.2 (structured data)?**

Cheerio handles static HTML parsing for JSON-LD, Open Graph, and meta tags. This covers the vast majority of structured data detection — merchants add schema.org markup specifically for SEO crawlers, which means it's server-rendered by design. If a site renders everything client-side (SPA with no SSR), cheerio finds nothing. That's fine — flag it as `requires_javascript: true` in the accessibility results and move on. Don't let perfect block shipped.

### Environment Variables

```env
# apps/scanner/.env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Scanner config
SCANNER_PORT=4100
SCANNER_HOST=0.0.0.0
SCANNER_CONCURRENCY=10          # Max concurrent scans in batch mode
SCANNER_PROBE_TIMEOUT_MS=10000  # Per-probe timeout
SCANNER_USER_AGENT=SlyScanner/1.0 (+https://sly.dev/scanner)
SCANNER_MAX_BATCH_SIZE=500      # Max domains per batch request

# Rate limiting (be respectful)
SCANNER_RATE_LIMIT_PER_DOMAIN=5   # Max requests per domain per scan
SCANNER_RATE_LIMIT_DELAY_MS=200   # Delay between requests to same domain

# MCP mode
SCANNER_MCP_TRANSPORT=stdio       # stdio | sse
SCANNER_MCP_SSE_PORT=4101         # Only used if transport=sse
```

### Timeline to All Three Modes

| Mode | Depends On | Effort | When |
|------|-----------|--------|------|
| Mode 1 (API on-demand) | Probes + analyzers + scoring + routes | 2-3 days | Week 1 |
| Mode 2 (CSV batch) | Mode 1 + queue + CSV parser | Half day on top | Week 1 |
| Mode 3 (MCP server) | Mode 1 + MCP tool wrappers | 1 day on top | Week 1 |

All three modes operational in **Week 1** with a 1,000-merchant baseline scan complete.

---

## Data Model

### Database Migration

```sql
-- Migration: 020_scanner_tables.sql

-- 1. Merchant scan targets
CREATE TABLE IF NOT EXISTS merchant_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Target identification
  domain TEXT NOT NULL,
  url TEXT NOT NULL,
  merchant_name TEXT,
  merchant_category TEXT,  -- 'retail', 'saas', 'marketplace', 'restaurant', 'b2b', etc.
  country_code TEXT,       -- ISO 3166-1 alpha-2
  region TEXT,             -- 'latam', 'north_america', 'europe', 'apac'
  
  -- Overall scores (0-100)
  readiness_score INTEGER NOT NULL DEFAULT 0,
  protocol_score INTEGER NOT NULL DEFAULT 0,
  data_score INTEGER NOT NULL DEFAULT 0,
  accessibility_score INTEGER NOT NULL DEFAULT 0,
  checkout_score INTEGER NOT NULL DEFAULT 0,
  
  -- Scan metadata
  scan_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (scan_status IN ('pending', 'scanning', 'completed', 'failed', 'stale')),
  last_scanned_at TIMESTAMPTZ,
  scan_duration_ms INTEGER,
  scan_version TEXT NOT NULL DEFAULT '1.0',
  error_message TEXT,
  
  -- Deduplication
  UNIQUE(tenant_id, domain),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Protocol detection results (one row per protocol per scan)
CREATE TABLE IF NOT EXISTS scan_protocol_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_scan_id UUID NOT NULL REFERENCES merchant_scans(id) ON DELETE CASCADE,
  
  protocol TEXT NOT NULL 
    CHECK (protocol IN ('ucp', 'acp', 'ap2', 'x402', 'mcp', 'nlweb', 'visa_vic', 'mastercard_agentpay')),
  
  detected BOOLEAN NOT NULL DEFAULT false,
  detection_method TEXT,
  endpoint_url TEXT,
  capabilities JSONB DEFAULT '{}',
  response_time_ms INTEGER,
  is_functional BOOLEAN,
  last_verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Structured data detection
CREATE TABLE IF NOT EXISTS scan_structured_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_scan_id UUID NOT NULL REFERENCES merchant_scans(id) ON DELETE CASCADE,
  
  has_schema_product BOOLEAN NOT NULL DEFAULT false,
  has_schema_offer BOOLEAN NOT NULL DEFAULT false,
  has_schema_organization BOOLEAN NOT NULL DEFAULT false,
  has_json_ld BOOLEAN NOT NULL DEFAULT false,
  has_open_graph BOOLEAN NOT NULL DEFAULT false,
  has_microdata BOOLEAN NOT NULL DEFAULT false,
  
  product_count INTEGER DEFAULT 0,
  products_with_price INTEGER DEFAULT 0,
  products_with_availability INTEGER DEFAULT 0,
  products_with_sku INTEGER DEFAULT 0,
  products_with_image INTEGER DEFAULT 0,
  
  data_quality_score INTEGER NOT NULL DEFAULT 0,
  sample_products JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Accessibility & checkout analysis
CREATE TABLE IF NOT EXISTS scan_accessibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_scan_id UUID NOT NULL REFERENCES merchant_scans(id) ON DELETE CASCADE,
  
  robots_txt_exists BOOLEAN NOT NULL DEFAULT false,
  robots_blocks_gptbot BOOLEAN DEFAULT false,
  robots_blocks_claudebot BOOLEAN DEFAULT false,
  robots_blocks_googlebot BOOLEAN DEFAULT false,
  robots_blocks_all_bots BOOLEAN DEFAULT false,
  robots_allows_agents BOOLEAN DEFAULT false,
  robots_raw TEXT,
  
  requires_javascript BOOLEAN DEFAULT false,
  has_captcha BOOLEAN DEFAULT false,
  requires_account BOOLEAN DEFAULT false,
  guest_checkout_available BOOLEAN DEFAULT false,
  checkout_steps_count INTEGER,
  
  payment_processors JSONB DEFAULT '[]',
  supports_digital_wallets BOOLEAN DEFAULT false,
  supports_crypto BOOLEAN DEFAULT false,
  supports_pix BOOLEAN DEFAULT false,
  supports_spei BOOLEAN DEFAULT false,
  
  ecommerce_platform TEXT,
  platform_version TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Scan batches
CREATE TABLE IF NOT EXISTS scan_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  name TEXT NOT NULL,
  description TEXT,
  batch_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (batch_type IN ('manual', 'scheduled', 'report', 'prospect_list')),
  
  target_domains JSONB NOT NULL DEFAULT '[]',
  scan_config JSONB DEFAULT '{}',
  
  total_targets INTEGER NOT NULL DEFAULT 0,
  completed_targets INTEGER NOT NULL DEFAULT 0,
  failed_targets INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Historical snapshots for trend tracking
CREATE TABLE IF NOT EXISTS scan_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  snapshot_date DATE NOT NULL,
  snapshot_period TEXT NOT NULL DEFAULT 'weekly'
    CHECK (snapshot_period IN ('daily', 'weekly', 'monthly', 'quarterly')),
  
  total_merchants_scanned INTEGER NOT NULL DEFAULT 0,
  
  ucp_adoption_rate NUMERIC(5,2) DEFAULT 0,
  acp_adoption_rate NUMERIC(5,2) DEFAULT 0,
  ap2_adoption_rate NUMERIC(5,2) DEFAULT 0,
  x402_adoption_rate NUMERIC(5,2) DEFAULT 0,
  mcp_adoption_rate NUMERIC(5,2) DEFAULT 0,
  any_protocol_adoption_rate NUMERIC(5,2) DEFAULT 0,
  
  schema_org_adoption_rate NUMERIC(5,2) DEFAULT 0,
  json_ld_adoption_rate NUMERIC(5,2) DEFAULT 0,
  
  agent_blocking_rate NUMERIC(5,2) DEFAULT 0,
  captcha_rate NUMERIC(5,2) DEFAULT 0,
  guest_checkout_rate NUMERIC(5,2) DEFAULT 0,
  
  avg_readiness_score NUMERIC(5,2) DEFAULT 0,
  avg_protocol_score NUMERIC(5,2) DEFAULT 0,
  avg_data_score NUMERIC(5,2) DEFAULT 0,
  
  scores_by_category JSONB DEFAULT '{}',
  scores_by_region JSONB DEFAULT '{}',
  scores_by_platform JSONB DEFAULT '{}',
  
  UNIQUE(snapshot_date, snapshot_period),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_merchant_scans_tenant ON merchant_scans(tenant_id);
CREATE INDEX idx_merchant_scans_domain ON merchant_scans(domain);
CREATE INDEX idx_merchant_scans_readiness ON merchant_scans(readiness_score DESC);
CREATE INDEX idx_merchant_scans_category ON merchant_scans(merchant_category);
CREATE INDEX idx_merchant_scans_region ON merchant_scans(region);
CREATE INDEX idx_merchant_scans_status ON merchant_scans(scan_status);
CREATE INDEX idx_scan_protocol_results_scan ON scan_protocol_results(merchant_scan_id);
CREATE INDEX idx_scan_protocol_results_protocol ON scan_protocol_results(protocol);
CREATE INDEX idx_scan_batches_tenant ON scan_batches(tenant_id);
CREATE INDEX idx_scan_snapshots_date ON scan_snapshots(snapshot_date DESC);

-- RLS Policies
ALTER TABLE merchant_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_protocol_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_structured_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_accessibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON merchant_scans
  FOR ALL USING (tenant_id = (SELECT auth.uid()));
CREATE POLICY "tenant_read_protocols" ON scan_protocol_results
  FOR SELECT USING (merchant_scan_id IN (SELECT id FROM merchant_scans WHERE tenant_id = (SELECT auth.uid())));
CREATE POLICY "tenant_read_structured" ON scan_structured_data
  FOR SELECT USING (merchant_scan_id IN (SELECT id FROM merchant_scans WHERE tenant_id = (SELECT auth.uid())));
CREATE POLICY "tenant_read_accessibility" ON scan_accessibility
  FOR SELECT USING (merchant_scan_id IN (SELECT id FROM merchant_scans WHERE tenant_id = (SELECT auth.uid())));
CREATE POLICY "tenant_batches" ON scan_batches
  FOR ALL USING (tenant_id = (SELECT auth.uid()));

-- Service role policies for scanner worker
CREATE POLICY "service_all_scans" ON merchant_scans
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_protocols" ON scan_protocol_results
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_structured" ON scan_structured_data
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_accessibility" ON scan_accessibility
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_batches" ON scan_batches
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_all_snapshots" ON scan_snapshots
  FOR ALL USING (true) WITH CHECK (true);
```

### TypeScript Types

```typescript
// packages/types/src/scanner.ts

export interface MerchantScan {
  id: string;
  tenant_id: string;
  domain: string;
  url: string;
  merchant_name?: string;
  merchant_category?: MerchantCategory;
  country_code?: string;
  region?: ScanRegion;
  
  readiness_score: number;
  protocol_score: number;
  data_score: number;
  accessibility_score: number;
  checkout_score: number;
  
  scan_status: ScanStatus;
  last_scanned_at?: string;
  scan_duration_ms?: number;
  scan_version: string;
  error_message?: string;
  
  protocol_results?: ScanProtocolResult[];
  structured_data?: ScanStructuredData;
  accessibility?: ScanAccessibility;
  
  created_at: string;
  updated_at: string;
}

export type ScanStatus = 'pending' | 'scanning' | 'completed' | 'failed' | 'stale';
export type ScanRegion = 'latam' | 'north_america' | 'europe' | 'apac' | 'africa' | 'mena';
export type MerchantCategory = 
  | 'retail' | 'saas' | 'marketplace' | 'restaurant' | 'b2b' 
  | 'travel' | 'fintech' | 'healthcare' | 'media' | 'other';

export type AgenticProtocol = 
  | 'ucp' | 'acp' | 'ap2' | 'x402' | 'mcp' | 'nlweb' 
  | 'visa_vic' | 'mastercard_agentpay';

export interface ScanProtocolResult {
  id: string;
  merchant_scan_id: string;
  protocol: AgenticProtocol;
  detected: boolean;
  detection_method?: string;
  endpoint_url?: string;
  capabilities: Record<string, unknown>;
  response_time_ms?: number;
  is_functional?: boolean;
  last_verified_at?: string;
  created_at: string;
}

export interface ScanStructuredData {
  id: string;
  merchant_scan_id: string;
  has_schema_product: boolean;
  has_schema_offer: boolean;
  has_schema_organization: boolean;
  has_json_ld: boolean;
  has_open_graph: boolean;
  has_microdata: boolean;
  product_count: number;
  products_with_price: number;
  products_with_availability: number;
  products_with_sku: number;
  products_with_image: number;
  data_quality_score: number;
  sample_products: SampleProduct[];
  created_at: string;
}

export interface SampleProduct {
  name: string;
  price?: number;
  currency?: string;
  availability?: string;
  sku?: string;
  image_url?: string;
  url?: string;
}

export interface ScanAccessibility {
  id: string;
  merchant_scan_id: string;
  robots_txt_exists: boolean;
  robots_blocks_gptbot: boolean;
  robots_blocks_claudebot: boolean;
  robots_blocks_googlebot: boolean;
  robots_blocks_all_bots: boolean;
  robots_allows_agents: boolean;
  robots_raw?: string;
  requires_javascript: boolean;
  has_captcha: boolean;
  requires_account: boolean;
  guest_checkout_available: boolean;
  checkout_steps_count?: number;
  payment_processors: string[];
  supports_digital_wallets: boolean;
  supports_crypto: boolean;
  supports_pix: boolean;
  supports_spei: boolean;
  ecommerce_platform?: string;
  platform_version?: string;
  created_at: string;
}

export interface ScanBatch {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  batch_type: 'manual' | 'scheduled' | 'report' | 'prospect_list';
  target_domains: string[];
  scan_config: Record<string, unknown>;
  total_targets: number;
  completed_targets: number;
  failed_targets: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ScanSnapshot {
  id: string;
  snapshot_date: string;
  snapshot_period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  total_merchants_scanned: number;
  ucp_adoption_rate: number;
  acp_adoption_rate: number;
  ap2_adoption_rate: number;
  x402_adoption_rate: number;
  mcp_adoption_rate: number;
  any_protocol_adoption_rate: number;
  schema_org_adoption_rate: number;
  json_ld_adoption_rate: number;
  agent_blocking_rate: number;
  captcha_rate: number;
  guest_checkout_rate: number;
  avg_readiness_score: number;
  avg_protocol_score: number;
  avg_data_score: number;
  scores_by_category: Record<string, { avg_score: number; count: number }>;
  scores_by_region: Record<string, { avg_score: number; count: number }>;
  scores_by_platform: Record<string, { avg_score: number; count: number }>;
  created_at: string;
}

export const READINESS_GRADES = {
  A: { min: 80, label: 'Agent-Ready', color: '#22c55e' },
  B: { min: 60, label: 'Partially Ready', color: '#84cc16' },
  C: { min: 40, label: 'Basic Support', color: '#eab308' },
  D: { min: 20, label: 'Minimal', color: '#f97316' },
  F: { min: 0,  label: 'Not Ready', color: '#ef4444' },
} as const;
```

### Readiness Score Algorithm

```typescript
// packages/utils/src/readiness-score.ts

export function computeReadinessScore(input: {
  protocol: ScanProtocolResult[];
  structured: ScanStructuredData;
  accessibility: ScanAccessibility;
}): {
  readiness_score: number;
  protocol_score: number;
  data_score: number;
  accessibility_score: number;
  checkout_score: number;
} {
  // --- PROTOCOL SCORE (40% weight) ---
  let protocolScore = 0;
  const protocols = input.protocol.filter(p => p.detected);
  
  if (protocols.some(p => p.protocol === 'ucp' && p.is_functional)) protocolScore += 30;
  else if (protocols.some(p => p.protocol === 'ucp')) protocolScore += 20;
  
  if (protocols.some(p => p.protocol === 'acp' && p.is_functional)) protocolScore += 20;
  else if (protocols.some(p => p.protocol === 'acp')) protocolScore += 12;
  
  if (protocols.some(p => p.protocol === 'mcp' && p.is_functional)) protocolScore += 15;
  else if (protocols.some(p => p.protocol === 'mcp')) protocolScore += 8;
  
  if (protocols.some(p => p.protocol === 'x402' && p.is_functional)) protocolScore += 10;
  if (protocols.some(p => p.protocol === 'ap2' && p.is_functional)) protocolScore += 10;
  if (protocols.some(p => p.protocol === 'visa_vic')) protocolScore += 5;
  if (protocols.some(p => p.protocol === 'mastercard_agentpay')) protocolScore += 5;
  if (protocols.some(p => p.protocol === 'nlweb')) protocolScore += 5;
  
  protocolScore = Math.min(100, protocolScore);
  
  // --- DATA SCORE (25% weight) ---
  let dataScore = 0;
  const sd = input.structured;
  
  if (sd.has_json_ld) dataScore += 25;
  else if (sd.has_microdata) dataScore += 15;
  
  if (sd.has_schema_product) dataScore += 20;
  if (sd.has_schema_offer) dataScore += 15;
  if (sd.has_open_graph) dataScore += 10;
  
  if (sd.product_count > 0) {
    const priceRate = sd.products_with_price / sd.product_count;
    const availRate = sd.products_with_availability / sd.product_count;
    const skuRate = sd.products_with_sku / sd.product_count;
    const imgRate = sd.products_with_image / sd.product_count;
    
    dataScore += Math.round(priceRate * 10);
    dataScore += Math.round(availRate * 8);
    dataScore += Math.round(skuRate * 6);
    dataScore += Math.round(imgRate * 6);
  }
  
  dataScore = Math.min(100, dataScore);
  
  // --- ACCESSIBILITY SCORE (20% weight) ---
  let accessScore = 100;
  const acc = input.accessibility;
  
  if (acc.robots_blocks_all_bots) accessScore -= 40;
  else {
    if (acc.robots_blocks_gptbot) accessScore -= 10;
    if (acc.robots_blocks_claudebot) accessScore -= 10;
  }
  if (acc.has_captcha) accessScore -= 25;
  if (acc.requires_javascript) accessScore -= 15;
  if (!acc.robots_txt_exists) accessScore -= 5;
  if (acc.robots_allows_agents) accessScore += 10;
  
  accessScore = Math.max(0, Math.min(100, accessScore));
  
  // --- CHECKOUT SCORE (15% weight) ---
  let checkoutScore = 0;
  
  if (acc.guest_checkout_available) checkoutScore += 30;
  if (!acc.requires_account) checkoutScore += 20;
  
  if (acc.checkout_steps_count !== undefined) {
    if (acc.checkout_steps_count <= 1) checkoutScore += 25;
    else if (acc.checkout_steps_count <= 3) checkoutScore += 15;
    else if (acc.checkout_steps_count <= 5) checkoutScore += 5;
  }
  
  if (acc.payment_processors.length >= 3) checkoutScore += 10;
  else if (acc.payment_processors.length >= 1) checkoutScore += 5;
  
  if (acc.supports_digital_wallets) checkoutScore += 5;
  if (acc.supports_crypto) checkoutScore += 5;
  if (acc.supports_pix) checkoutScore += 3;
  if (acc.supports_spei) checkoutScore += 2;
  
  checkoutScore = Math.min(100, checkoutScore);
  
  // --- COMPOSITE ---
  const readinessScore = Math.round(
    protocolScore * 0.40 +
    dataScore * 0.25 +
    accessScore * 0.20 +
    checkoutScore * 0.15
  );
  
  return {
    readiness_score: readinessScore,
    protocol_score: protocolScore,
    data_score: dataScore,
    accessibility_score: accessScore,
    checkout_score: checkoutScore,
  };
}
```

---

## Stories

### SUPPLY-SIDE SCANNER (56.1–56.18)

#### Story 56.1: Scanner Core Engine — Protocol Probes
**Priority:** P0  
**Points:** 8  
**Effort:** 1-2 days  
**File:** `apps/scanner/src/probes/`

**Description:**  
Build the core scanning engine that probes a given domain for agentic commerce protocol support. Each protocol probe runs independently via `Promise.allSettled` and reports results. This is the foundational layer all other stories depend on.

**Protocol Detection Methods:**

| Protocol | Detection Method | Endpoint/Signal |
|----------|-----------------|-----------------| 
| UCP | HTTP GET `/.well-known/ucp` | Parse JSON profile for capabilities, handlers, checkout_types |
| ACP | HTTP OPTIONS/GET on common ACP paths | Check for `X-ACP-Version` header, `/acp/checkout` route |
| x402 | HTTP GET known x402 endpoints | Check for `402 Payment Required` response + x402 headers |
| AP2 | DNS TXT record + `/.well-known/ap2` | Look for AP2 mandate configuration |
| MCP | HTTP GET `/.well-known/mcp` or `/mcp` | Parse MCP server manifest for tools |
| NLWeb | HTTP GET `/ask` or `/.well-known/nlweb` | Check for NLWeb protocol response |
| Visa VIC | HTML meta tags, checkout page inspection | Detect Visa Intelligent Commerce JS SDK |
| Mastercard AgentPay | HTML meta tags | Detect Mastercard agent payment markers |

**Probe Runner Architecture:**

```typescript
// apps/scanner/src/probes/index.ts
import pLimit from 'p-limit';

const limit = pLimit(8); // 8 probes run concurrently per domain

export async function runProbes(domain: string, config: ScanConfig): Promise<ProbeResult[]> {
  const probes = [
    limit(() => probeUCP(domain, config)),
    limit(() => probeACP(domain, config)),
    limit(() => probeX402(domain, config)),
    limit(() => probeAP2(domain, config)),
    limit(() => probeMCP(domain, config)),
    limit(() => probeNLWeb(domain, config)),
    limit(() => probeVisaVIC(domain, config)),
    limit(() => probeMastercardAP(domain, config)),
  ];

  const results = await Promise.allSettled(probes);
  return results.map((r, i) => 
    r.status === 'fulfilled' ? r.value : { protocol: PROBE_ORDER[i], detected: false, error: r.reason }
  );
}
```

**Acceptance Criteria:**
- [ ] Scanner probes all 8 protocol types for a given domain
- [ ] Each probe runs with independent timeout (default 10s) and error handling
- [ ] Probes execute concurrently via `Promise.allSettled`
- [ ] UCP detection via `/.well-known/ucp` returns parsed profile
- [ ] ACP detection checks common checkout routes and headers
- [ ] MCP detection checks `/.well-known/mcp` and parses manifest
- [ ] Results stored in `scan_protocol_results` table
- [ ] Scan status transitions: pending → scanning → completed/failed
- [ ] Total scan duration tracked in `scan_duration_ms`
- [ ] Failed probes don't block other probes from completing
- [ ] Rate limiting: max 5 concurrent scans per tenant

---

#### Story 56.2: Structured Data Analyzer
**Priority:** P0  
**Points:** 5  
**Effort:** 1 day  
**File:** `apps/scanner/src/analyzers/structured-data.ts`

**Description:**  
Parse a merchant's HTML pages to detect structured product data (Schema.org, JSON-LD, Open Graph, Microdata) using `cheerio`. Determines whether an AI agent could understand the product catalog without visual parsing. Uses static HTML parsing only — no headless browser.

**Detection Logic:**
1. Fetch homepage + up to 3 product pages (if discoverable via sitemap.xml or common paths)
2. Parse HTML for `<script type="application/ld+json">` blocks
3. Check for Schema.org Product, Offer, Organization types
4. Parse Open Graph `<meta property="og:*">` tags
5. Detect Microdata `itemscope itemtype` attributes
6. Score product data completeness: price, availability, SKU, image coverage

**Acceptance Criteria:**
- [ ] Fetches and parses homepage HTML via `cheerio`
- [ ] Discovers product pages via sitemap.xml, `/products`, or links
- [ ] Extracts JSON-LD blocks and identifies Schema.org types
- [ ] Detects Open Graph product metadata
- [ ] Detects Microdata markup
- [ ] Counts products with price, availability, SKU, image
- [ ] Stores up to 5 sample products in `sample_products`
- [ ] Computes `data_quality_score` (0-100)
- [ ] Handles malformed HTML gracefully
- [ ] Total processing time < 15 seconds per domain

---

#### Story 56.3: Accessibility & Checkout Friction Analyzer
**Priority:** P0  
**Points:** 5  
**Effort:** 1 day  
**File:** `apps/scanner/src/analyzers/accessibility.ts`

**Description:**  
Analyze how accessible a merchant's site is to AI agents. Checks robots.txt, detects CAPTCHAs and JS-gated content, identifies e-commerce platform, and catalogs payment methods.

**Platform Detection Signatures:**

| Platform | Signal |
|----------|--------|
| Shopify | `Shopify.theme`, `cdn.shopify.com`, `myshopify.com` |
| WooCommerce | `wc-cart`, `woocommerce`, `wp-content/plugins/woocommerce` |
| Magento | `mage/`, `Magento_`, `static/frontend` |
| BigCommerce | `bigcommerce.com`, `cdn11.bigcommerce.com` |
| Squarespace | `squarespace.com`, `static1.squarespace.com` |
| Wix | `wixsite.com`, `static.wixstatic.com` |
| Custom | No known platform signatures detected |

**Acceptance Criteria:**
- [ ] Parses robots.txt and reports per-bot blocking status
- [ ] Detects CAPTCHA scripts (reCAPTCHA, hCaptcha, Turnstile)
- [ ] Identifies e-commerce platform from HTML/JS signatures
- [ ] Detects payment processors (Stripe, PayPal, Square, Shopify Payments, MercadoPago)
- [ ] Detects Pix and SPEI support for LATAM merchants
- [ ] Checks for guest checkout availability
- [ ] Estimates checkout step count where detectable
- [ ] All results stored in `scan_accessibility`
- [ ] Handles sites that redirect or block automated requests gracefully

---

#### Story 56.4: Readiness Score Computation & Storage
**Priority:** P0  
**Points:** 3  
**Effort:** 4 hours  
**File:** `packages/utils/src/readiness-score.ts`

**Description:**  
Implement the composite readiness scoring algorithm. Lives in `packages/utils` so it's shared between the scanner service, the main API, and the MCP server. This is the number that drives the entire narrative — *"Your site scores 12/100 for agentic commerce readiness."*

**Acceptance Criteria:**
- [ ] Implements `computeReadinessScore()` per algorithm spec above
- [ ] Weighted composite: Protocol 40%, Data 25%, Accessibility 20%, Checkout 15%
- [ ] All sub-scores stored independently
- [ ] Grade assignment (A/B/C/D/F) based on thresholds
- [ ] Handles partial scan results
- [ ] Unit tests cover edge cases: perfect score, zero score, partial data
- [ ] Exported from `@sly/utils` for cross-package consumption

---

#### Story 56.5: Batch Scanner & Queue System
**Priority:** P0  
**Points:** 5  
**Effort:** 1 day  
**File:** `apps/scanner/src/queue/batch-processor.ts`

**Description:**  
Build the batch scanning infrastructure using `p-limit` for in-process concurrency control. No external queue needed — at 10-20 concurrent scans, a single process handles 1,000 merchants in ~5-8 minutes. Supports CSV upload, JSON array, and CLI invocation.

**Queue Design:**
- In-process queue with `p-limit` (concurrency default: 10)
- Domain-level deduplication within batch
- Progress tracking via `scan_batches` table
- Automatic retry on transient failures (max 2 retries)
- Respectful rate limiting: 1 request/sec pacing per domain

**Acceptance Criteria:**
- [ ] `POST /v1/scanner/scan/batch` accepts up to 500 domains (JSON or CSV)
- [ ] Queue processes domains with configurable concurrency (default 10)
- [ ] Batch progress tracked: total, completed, failed counts
- [ ] Domain deduplication (same domain in batch → scan once)
- [ ] Re-scan logic: skip if scanned within configurable freshness window (default 7 days)
- [ ] Batch status transitions: pending → running → completed/failed/cancelled
- [ ] `DELETE /v1/scanner/scan/batch/:id` cancels running batch
- [ ] Batch results retrievable as paginated list
- [ ] Error isolation: one failed domain doesn't affect others
- [ ] CSV parsing via `csv-parse` with header detection

---

#### Story 56.6: Pre-Built Scan Lists (Seed Data)
**Priority:** P0  
**Points:** 5  
**Effort:** 1 day  
**File:** `apps/scanner/seed/`

**Description:**  
Curate and build the initial target lists that produce the first dataset for the "State of Agentic Commerce" report. Stored as CSV files in the scanner's `seed/` directory, importable via CLI or batch API.

**Target Lists:**

| List | Count | Purpose | Source |
|------|-------|---------|--------|
| **Top Shopify Stores** | 500 | Highest UCP adoption probability | BuiltWith, Store Leads |
| **Top DTC Brands (US)** | 200 | Consumer commerce baseline | PipeCandy, SimilarWeb |
| **LATAM E-commerce Leaders** | 100 | Sly's core market | Statista, Ecommerce Foundation |
| **B2B/SaaS Companies** | 100 | API-first → higher x402/MCP likelihood | G2 top 100, ProductHunt |
| **Enterprise Procurement** | 50 | Governance sales target | Fortune 500 with e-procurement |
| **Travel & Hospitality** | 50 | Operator-style agent target | Top OTAs, hotel chains |

**Total baseline universe: 1,000 merchants**

**Acceptance Criteria:**
- [ ] CSV seed files created for all 6 target lists in `apps/scanner/seed/`
- [ ] Each target has domain, name, category, country, region minimum
- [ ] LATAM list includes Brazil (50), Mexico (30), Colombia (10), Argentina (10)
- [ ] Seed data importable via `pnpm seed` CLI command
- [ ] Deduplication logic prevents scanning same domain from different lists twice

---

#### Story 56.7: Scanner API Routes & Zod Validation
**Priority:** P0  
**Points:** 5  
**Effort:** 1 day  
**File:** `apps/scanner/src/routes/`

**Description:**  
Build the Hono API surface for the scanner. All inputs validated with Zod schemas. This is the Mode 1 (on-demand) and Mode 2 (batch) entry point.

**API Routes:**

```
# Single scan
POST   /v1/scanner/scan              — Initiate scan for a single domain
GET    /v1/scanner/scan/:id          — Get scan results

# Batch scan
POST   /v1/scanner/scan/batch        — Submit batch (JSON or CSV)
GET    /v1/scanner/scan/batch/:id    — Get batch progress & results
DELETE /v1/scanner/scan/batch/:id    — Cancel running batch

# Query
GET    /v1/scanner/scans             — List scans with filters
GET    /v1/scanner/scans/stats       — Aggregate statistics
GET    /v1/scanner/scans/by-domain/:domain  — Get scan by domain
```

**Acceptance Criteria:**
- [ ] All routes use Zod input validation
- [ ] URL normalization (strip protocol, www, trailing slash)
- [ ] Consistent error responses with proper HTTP status codes
- [ ] Pagination support on list endpoints
- [ ] Filtering by category, region, score range, status
- [ ] API key authentication via `X-API-Key` header
- [ ] OpenAPI spec generated from Zod schemas

---

#### Story 56.8: Snapshot Generator & Trend Tracking
**Priority:** P1  
**Points:** 5  
**Effort:** 1 day  
**File:** `apps/scanner/src/analyzers/`

**Description:**  
Compute and store periodic snapshots of aggregate scanner data for trend tracking. Runs after batch scans complete or on a weekly schedule.

**Acceptance Criteria:**
- [ ] Snapshot computation from all completed scans in period
- [ ] Protocol adoption rates calculated per snapshot
- [ ] Breakdowns by category, region, platform stored as JSONB
- [ ] Week-over-week trend calculation
- [ ] MCP tool: `get_adoption_trends` returns historical snapshots

---

#### Story 56.9: Dashboard — Scan Management UI
**Priority:** P2 (Claude via MCP replaces this for Phase 1)  
**Points:** 5  
**Effort:** 1 day  
**File:** `apps/dashboard/`

**Description:**  
Dashboard UI for managing scans, viewing results, and triggering new scans. **Deprioritized to P2** because the MCP server (Story 56.14) provides the same functionality through Claude, which is faster to ship and more flexible for exploratory analysis.

Build this when: (a) we have a non-technical user who needs scan management without Claude, or (b) the public audit tool (56.11) needs a results dashboard for merchant-facing use.

**Acceptance Criteria:**
- [ ] Scan list with sortable columns (domain, score, status, last scanned)
- [ ] Scan detail view with protocol/data/accessibility breakdown
- [ ] Trigger new scan from UI
- [ ] Batch upload UI with CSV drag-and-drop
- [ ] Score visualization with grade badges

---

#### Story 56.10: Dashboard — Analytics & Trends
**Priority:** P2 (Claude via MCP replaces this for Phase 1)  
**Points:** 5  
**Effort:** 1 day  
**File:** `apps/dashboard/`

**Description:**  
Analytics charts showing readiness score distribution, protocol adoption trends, category comparisons, and regional heat maps. **Deprioritized to P2** — Claude + MCP handles ad-hoc analysis better than pre-built charts in early stages.

**Acceptance Criteria:**
- [ ] Readiness score distribution histogram
- [ ] Protocol adoption bar chart
- [ ] Category comparison radar chart
- [ ] Regional heat map
- [ ] Trend lines from snapshot data

---

#### Story 56.11: Public Agent Readiness Audit Tool
**Priority:** P0  
**Points:** 8  
**Effort:** 1-2 days  
**File:** `apps/dashboard/` (public route, no auth)

**Description:**  
Public-facing tool where anyone enters their domain and gets a readiness report. Primary lead generation mechanism. Lives as a public route in the dashboard app — no auth required to initiate a scan, but results capture includes email for lead funnel.

**Acceptance Criteria:**
- [ ] Public URL: `audit.sly.dev` or `sly.dev/audit`
- [ ] Single input: domain/URL field
- [ ] Triggers scan via scanner API (Mode 1)
- [ ] Shows animated progress while scanning (2-5 seconds)
- [ ] Displays readiness grade (A-F) with sub-scores
- [ ] Protocol-by-protocol breakdown with detected/not-detected
- [ ] "Your competitors' average: X" comparison stat
- [ ] Email capture for detailed report
- [ ] Social sharing (score card image)
- [ ] CTA to "Talk to Sly about enabling agent commerce"

---

#### Story 56.12: Report Generator — State of Agentic Commerce
**Priority:** P1 (Claude via MCP generates reports faster)  
**Points:** 8  
**Effort:** 1-2 days  
**File:** `apps/scanner/src/`

**Description:**  
Automated report generation from scanner data. **Note:** For Phase 1, Claude + MCP tools produces better reports faster. This story builds the structured data export and template system for when we need repeatable, automated report generation without human-in-the-loop.

**Acceptance Criteria:**
- [ ] Report data assembly from all scanner tables
- [ ] Markdown template with variable substitution
- [ ] Key statistics: total scanned, avg readiness, protocol adoption rates
- [ ] Category and region breakdowns
- [ ] Top 10 most-ready and least-ready merchants
- [ ] Export as Markdown and JSON
- [ ] MCP tool: `generate_report_data` returns structured report payload

---

#### Story 56.13: SDK Integration — Scanner as a Service
**Priority:** P1  
**Points:** 5  
**Effort:** 1 day  

**Description:**  
Expose scanner via `@sly/sdk` so customers can scan merchants programmatically from their own applications.

**Acceptance Criteria:**
- [ ] `sly.scanner.scan(domain)` in SDK
- [ ] `sly.scanner.batchScan(domains[])` in SDK
- [ ] `sly.scanner.getResults(domain)` in SDK
- [ ] TypeScript types from `@sly/types` for all responses
- [ ] Rate limiting per API key

---

#### Story 56.14: MCP Server — Scanner Tools for AI Agents
**Priority:** P0 ⬆️ (promoted from P1 — this is the primary analysis interface)  
**Points:** 5  
**Effort:** 1 day  
**File:** `apps/scanner/src/mcp/`

**Description:**  
Expose the scanner as an MCP server that Claude (or any MCP-compatible AI) can use as tools. This is the **primary interface** for Phase 1 — Claude becomes the dashboard, the report generator, and the sales prep tool.

**MCP Tool Definitions:**

```typescript
// apps/scanner/src/mcp/tools.ts

export const SCANNER_TOOLS = [
  {
    name: 'scan_merchant',
    description: 'Scan a single merchant domain for agentic commerce readiness. Returns protocol detection, structured data analysis, accessibility scores, and composite readiness grade.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Merchant domain to scan (e.g., "shop.example.com")' },
        merchant_name: { type: 'string', description: 'Optional merchant name for labeling' },
        category: { type: 'string', description: 'Merchant category (retail, saas, marketplace, etc.)' },
        country_code: { type: 'string', description: 'ISO country code (e.g., "MX", "BR")' },
      },
      required: ['domain'],
    },
  },
  {
    name: 'batch_scan',
    description: 'Start a batch scan of multiple domains. Returns a batch_id for tracking progress.',
    inputSchema: {
      type: 'object',
      properties: {
        domains: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              domain: { type: 'string' },
              merchant_name: { type: 'string' },
              category: { type: 'string' },
              country_code: { type: 'string' },
            },
            required: ['domain'],
          },
          description: 'Array of merchant domains to scan',
        },
        batch_name: { type: 'string', description: 'Name for this batch' },
      },
      required: ['domains'],
    },
  },
  {
    name: 'get_batch_progress',
    description: 'Check the progress of a running batch scan.',
    inputSchema: {
      type: 'object',
      properties: {
        batch_id: { type: 'string', description: 'Batch ID from batch_scan' },
      },
      required: ['batch_id'],
    },
  },
  {
    name: 'get_scan_results',
    description: 'Retrieve cached scan results for a domain. Returns full readiness breakdown if the domain has been previously scanned.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Domain to look up' },
      },
      required: ['domain'],
    },
  },
  {
    name: 'search_scans',
    description: 'Query the scan database with filters. Find merchants by category, region, score range, protocol support, or platform.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by merchant category' },
        region: { type: 'string', description: 'Filter by region (latam, north_america, europe, apac)' },
        country_code: { type: 'string', description: 'Filter by country' },
        min_readiness_score: { type: 'number', description: 'Minimum readiness score' },
        max_readiness_score: { type: 'number', description: 'Maximum readiness score' },
        has_protocol: { type: 'string', description: 'Filter to merchants with specific protocol (ucp, acp, x402, mcp)' },
        platform: { type: 'string', description: 'Filter by e-commerce platform (shopify, woocommerce, etc.)' },
        sort_by: { type: 'string', enum: ['readiness_score', 'domain', 'last_scanned_at'], description: 'Sort field' },
        sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction' },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'compare_merchants',
    description: 'Side-by-side readiness comparison of 2-5 merchants. Shows protocol support, scores, and relative positioning.',
    inputSchema: {
      type: 'object',
      properties: {
        domains: {
          type: 'array',
          items: { type: 'string' },
          minItems: 2,
          maxItems: 5,
          description: 'Domains to compare',
        },
      },
      required: ['domains'],
    },
  },
  {
    name: 'get_demand_brief',
    description: 'Generate a demand intelligence narrative for a merchant category and/or region. Includes Tollbit data, market research, and protocol adoption context.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Merchant category' },
        region: { type: 'string', description: 'Geographic region' },
        country: { type: 'string', description: 'Specific country' },
      },
    },
  },
  {
    name: 'get_demand_stats',
    description: 'Raw demand intelligence data points from Tollbit, Cloudflare, market research, and protocol announcements.',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Filter by data source (tollbit, cloudflare, visa, mckinsey, etc.)' },
        metric: { type: 'string', description: 'Filter by metric name' },
      },
    },
  },
  {
    name: 'run_agent_shopping_test',
    description: 'Run a synthetic 5-step agent shopping test against a merchant. Tests discovery, selection, cart, checkout, and payment. Returns step-by-step results with failure point and remediation recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Merchant domain to test' },
        product_query: { type: 'string', description: 'What to try to buy (e.g., "running shoes")' },
      },
      required: ['domain'],
    },
  },
  {
    name: 'get_test_results',
    description: 'Retrieve synthetic agent shopping test results for a merchant.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Merchant domain' },
      },
      required: ['domain'],
    },
  },
  {
    name: 'get_readiness_report',
    description: 'Aggregate readiness statistics across the scanned universe. Breakdown by category, region, platform, and protocol.',
    inputSchema: {
      type: 'object',
      properties: {
        group_by: { type: 'string', enum: ['category', 'region', 'platform', 'protocol'], description: 'How to group the stats' },
        category: { type: 'string', description: 'Optional filter' },
        region: { type: 'string', description: 'Optional filter' },
      },
    },
  },
  {
    name: 'find_best_prospects',
    description: 'Return top-N merchants ranked by opportunity score (high demand + low readiness = biggest opportunity). Used for sales prioritization.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category' },
        region: { type: 'string', description: 'Filter by region' },
        limit: { type: 'number', description: 'How many prospects to return (default 10)' },
      },
    },
  },
  {
    name: 'get_protocol_adoption',
    description: 'Protocol adoption rates across the scanned universe. Shows which protocols are being deployed and where.',
    inputSchema: {
      type: 'object',
      properties: {
        protocol: { type: 'string', description: 'Specific protocol to drill into' },
        group_by: { type: 'string', enum: ['category', 'region', 'platform'], description: 'How to slice adoption data' },
      },
    },
  },
];
```

**MCP Server Entry Point:**

```typescript
// apps/scanner/src/mcp/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SCANNER_TOOLS } from './tools.js';
import { handleToolCall } from './handlers.js';

const server = new Server({
  name: 'sly-scanner',
  version: '1.0.0',
}, {
  capabilities: { tools: {} },
});

server.setRequestHandler('tools/list', async () => ({
  tools: SCANNER_TOOLS,
}));

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  return handleToolCall(name, args);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Acceptance Criteria:**
- [ ] MCP server exposes all 13 scanner tools
- [ ] `scan_merchant` triggers real-time scan and returns full results
- [ ] `batch_scan` kicks off background batch, returns batch_id
- [ ] `search_scans` queries Supabase with all filter combinations
- [ ] `compare_merchants` returns structured comparison table
- [ ] `get_demand_brief` generates demand narrative from stored intelligence
- [ ] `run_agent_shopping_test` executes 5-step test and returns step log
- [ ] `find_best_prospects` returns opportunity-scored prospect list
- [ ] Stdio transport works with Claude Desktop / Claude Code
- [ ] SSE transport works for remote MCP connections
- [ ] `pnpm dev:mcp` starts MCP server in development mode
- [ ] Error handling returns structured error messages (not crashes)

---

#### Story 56.15: Competitive Intelligence — Tollbit Cross-Reference
**Priority:** P2  
**Points:** 3  
**Effort:** 4 hours  

**Description:**  
Cross-reference scanner results with Tollbit's published data. Map Tollbit publisher categories to Sly merchant categories and overlay bot-to-human ratios.

**Acceptance Criteria:**
- [ ] Tollbit category mapping to Sly merchant categories
- [ ] Bot-to-human ratio lookup per category
- [ ] Data stored in demand_intelligence table
- [ ] MCP tool: `get_tollbit_context` for sales conversations

---

#### Story 56.16: Scheduled Re-scans & Drift Detection
**Priority:** P2  
**Points:** 3  
**Effort:** 4 hours  

**Description:**  
Detect when merchants add or remove protocol support. Weekly re-scan of the baseline universe, compare results against previous scan, flag changes.

**Acceptance Criteria:**
- [ ] Cron-triggered re-scan of all `stale` merchants (>7 days since last scan)
- [ ] Diff detection: new protocol detected, protocol removed, score change >10 pts
- [ ] Change events logged for trend analysis
- [ ] MCP tool: `get_recent_changes` returns merchants with score changes

---

#### Story 56.17: Export & Reporting API
**Priority:** P2  
**Points:** 3  
**Effort:** 4 hours  

**Description:**  
Export scan data as CSV, JSON, or Markdown for CRM import, presentations, and external reporting.

**Acceptance Criteria:**
- [ ] `GET /v1/scanner/export?format=csv` — Full scan database
- [ ] `GET /v1/scanner/export?format=json` — Structured JSON
- [ ] `GET /v1/scanner/export?format=markdown` — Formatted report
- [ ] Filterable by same parameters as search endpoint

---

#### Story 56.18: Scan Data Seeding & First Baseline Report
**Priority:** P0  
**Points:** 8  
**Effort:** 1-2 days  

**Description:**  
Run the first baseline scan of 1,000 merchants, analyze results, produce the first "State of Agentic Commerce" dataset. This is the proof that the scanner works and the data is valuable.

**Execution Plan:**
1. Load all seed CSVs via `pnpm seed`
2. Run batch scan via Mode 2 (CSV batch) or Mode 3 (ask Claude to scan them all)
3. Compute snapshots
4. Use Claude + MCP to analyze results and draft first report

**Acceptance Criteria:**
- [ ] All 1,000 seed merchants scanned successfully (>90% completion rate)
- [ ] Snapshot computed with baseline metrics
- [ ] Protocol adoption rates: UCP, ACP, x402, MCP, NLWeb by category/region
- [ ] Average readiness score by category and region
- [ ] Top 50 most agent-ready merchants identified
- [ ] Bottom 50 least-ready merchants with highest potential identified
- [ ] Data is queryable via MCP tools
- [ ] First draft of "State of Agentic Commerce Q1 2026" producible from this data

---

### DEMAND-SIDE INTELLIGENCE (56.19–56.24)

#### Story 56.19: Public Demand Intelligence Aggregator
**Priority:** P0  
**Points:** 5  
**Effort:** 1 day  
**File:** `apps/scanner/src/demand/intelligence.ts`
**Migration:** `packages/db/migrations/021_demand_intelligence.sql`

**Description:**  
Assemble a structured, citable demand intelligence dataset from publicly available sources. Every Sly sales conversation should be anchored by this data. The scanner tells you "this merchant scores 12/100." The demand aggregator tells you "merchants in their category are seeing 18x more AI traffic than 12 months ago." Together: massive demand + zero readiness = urgent opportunity.

**Data Sources (all public):**

| Source | What It Provides | Update Frequency |
|--------|-----------------|------------------|
| **Tollbit State of the Bots** | Bot-to-human ratios, AI scraping growth rates, robots.txt compliance | Quarterly |
| **Cloudflare Radar** | Internet-wide bot traffic %, AI bot classification | Quarterly |
| **AI Platform Usage** | ChatGPT 800M weekly users, Perplexity MAU, Google AI Mode rollout | As announced |
| **Market Research** | McKinsey $3-5T, Visa 47%, Adobe 4,700% AI-driven retail traffic | As published |
| **Protocol Announcements** | UCP endorsements (20+), ACP merchant count, x402 adoption | Monthly |
| **AI Shopping Agent Launches** | Operator, Perplexity Shopping, Google AI Mode, Amazon Buy for Me | As launched |

**Database Schema:**

```sql
-- Migration: 021_demand_intelligence.sql

CREATE TABLE IF NOT EXISTS demand_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  source_url TEXT,
  source_date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  category TEXT,
  region TEXT,
  protocol TEXT,
  platform TEXT,
  period_start DATE,
  period_end DATE,
  confidence TEXT DEFAULT 'published'
    CHECK (confidence IN ('published', 'inferred', 'estimated')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_demand_intel_source ON demand_intelligence(source);
CREATE INDEX idx_demand_intel_category ON demand_intelligence(category);
CREATE INDEX idx_demand_intel_metric ON demand_intelligence(metric_name);
CREATE INDEX idx_demand_intel_date ON demand_intelligence(source_date DESC);
```

**Pre-Loaded Seed Data (in `apps/scanner/seed/demand-intelligence-seed.json`):**

```typescript
const SEED_DEMAND_DATA = [
  // Tollbit Q4 2025
  { source: 'tollbit', metric_name: 'bot_to_human_ratio', metric_value: 31, metric_unit: 'ratio',
    notes: '1 bot visit per 31 human visits across 500+ publisher sites' },
  { source: 'tollbit', metric_name: 'ai_traffic_growth_qoq', metric_value: 20, metric_unit: 'percent' },
  { source: 'tollbit', metric_name: 'rag_bot_growth_qoq', metric_value: 33, metric_unit: 'percent' },
  { source: 'tollbit', metric_name: 'ai_search_indexer_growth_qoq', metric_value: 59, metric_unit: 'percent' },
  { source: 'tollbit', metric_name: 'robots_txt_violation_rate', metric_value: 30, metric_unit: 'percent' },
  { source: 'tollbit', metric_name: 'ctr_from_ai_tools', metric_value: 0.27, metric_unit: 'percent' },
  { source: 'tollbit', metric_name: 'human_traffic_decline', metric_value: -5, metric_unit: 'percent' },
  
  // Market research
  { source: 'visa', metric_name: 'consumers_shopping_via_agents', metric_value: 47, metric_unit: 'percent' },
  { source: 'tsys', metric_name: 'consumers_expect_agent_shopping', metric_value: 81, metric_unit: 'percent' },
  { source: 'first_insight', metric_name: 'consumers_plan_buy_through_ai', metric_value: 68, metric_unit: 'percent' },
  { source: 'adobe', metric_name: 'ai_driven_retail_traffic_yoy', metric_value: 4700, metric_unit: 'percent' },
  { source: 'mckinsey', metric_name: 'agentic_commerce_2030_tam', metric_value: 5000000000000, metric_unit: 'usd' },
  { source: 'forrester', metric_name: 'b2b_agent_intermediated_2028', metric_value: 90, metric_unit: 'percent' },
  { source: 'openai', metric_name: 'weekly_active_users', metric_value: 800000000, metric_unit: 'count' },
  { source: 'g2', metric_name: 'enterprises_with_ai_agents', metric_value: 57, metric_unit: 'percent' },
  
  // Protocol adoption
  { source: 'google_shopify', metric_name: 'ucp_endorsing_companies', metric_value: 20, metric_unit: 'count',
    protocol: 'ucp', notes: 'Stripe, Visa, Mastercard, Walmart, Target, Shopify' },
  { source: 'shopify', metric_name: 'ucp_potential_merchants', metric_value: 1000000, metric_unit: 'count', protocol: 'ucp' },
];
```

**Acceptance Criteria:**
- [ ] `demand_intelligence` table created with seed data (20+ data points)
- [ ] API endpoints return data filterable by category, region, protocol
- [ ] `getDemandBrief()` generates demand narratives per category/region
- [ ] Each data point tracks source URL, date, and confidence level
- [ ] Demand data cross-referenced with scanner readiness scores for "gap" metric
- [ ] Admin endpoints for adding new data points
- [ ] MCP tool: `get_demand_brief` and `get_demand_stats`

---

#### Story 56.20: Synthetic Agent Shopping Tests
**Priority:** P0  
**Points:** 13  
**Effort:** 2-3 days  
**File:** `apps/scanner/src/demand/synthetic-tests.ts`
**Migration:** `packages/db/migrations/022_agent_shopping_tests.sql`

**Description:**  
The highest-impact story in the entire epic. Actually run AI shopping agents against target merchant sites and document exactly where they fail. The output is a per-merchant "Agent Shopping Test Report" for sales meetings.

**Test Architecture:**

```
Step 1: DISCOVERY   — Can agent find products? (sitemap, search, navigation)
Step 2: SELECTION   — Can agent choose a product? (variant, size, color, pricing)
Step 3: CART        — Can agent add to cart? (programmatic add-to-cart)
Step 4: CHECKOUT    — Can agent initiate checkout? (CAPTCHA? login? protocol?)
Step 5: PAYMENT     — Can agent complete payment? (UCP/ACP/x402 support?)
```

**Implementation:** Deterministic HTTP flow, not LLM-driven. For each merchant:

1. **Discovery:** Fetch sitemap.xml → find product URLs. Fallback: parse homepage links to `/products`, `/collections`, `/shop`. Parse for Schema.org Product entities.
2. **Selection:** Pick first product with complete structured data. Parse price, currency, variants.
3. **Cart:** Attempt programmatic add-to-cart. Shopify: `POST /cart/add.js`. WooCommerce: `POST /?wc-ajax=add_to_cart`. Custom: look for form action.
4. **Checkout:** Attempt to reach checkout. Check for CAPTCHA, login requirement, UCP/ACP/MCP endpoints.
5. **Payment:** If checkout reachable, check payment methods available to agents.

**No actual purchase is ever completed — test stops before submitting payment.**

**Test Result Schema:**

```typescript
export interface AgentShoppingTestResult {
  id: string;
  merchant_scan_id: string;
  test_date: string;
  target_url: string;
  product_query: string;
  agent_type: string;
  steps_completed: number;     // 1-5
  max_step_reached: AgentTestStep;
  failure_point?: {
    step: AgentTestStep;
    blocker: AgentTestBlocker;
    detail: string;
  };
  step_log: AgentTestStepLog[];
  estimated_monthly_agent_visits: number;
  estimated_lost_conversions: number;
  estimated_lost_revenue_usd: number;
  recommendations: AgentTestRecommendation[];
  test_duration_ms: number;
  created_at: string;
}

export type AgentTestStep = 'discovery' | 'selection' | 'cart' | 'checkout' | 'payment';

export type AgentTestBlocker = 
  | 'no_structured_data' | 'javascript_required' | 'captcha_blocked'
  | 'no_guest_checkout' | 'no_api_checkout' | 'no_agent_protocol'
  | 'payment_wall' | 'robots_blocked' | 'geo_restricted'
  | 'rate_limited' | 'unknown_error';
```

**Acceptance Criteria:**
- [ ] Test runner executes 5-step flow against any merchant URL
- [ ] Each step independently timed, logged, and pass/fail recorded
- [ ] Failure point captured with specific blocker type and detail
- [ ] Revenue impact estimated using demand intelligence + category benchmarks
- [ ] Platform-specific recommendations (Shopify → "toggle UCP", etc.)
- [ ] Results stored in `agent_shopping_tests` table
- [ ] Batch test endpoint processes up to 50 merchants concurrently
- [ ] Report exportable as Markdown and JSON
- [ ] MCP tool: `run_agent_shopping_test`
- [ ] Tests respect rate limits: max 10 requests per merchant, 1 req/sec pacing
- [ ] No actual purchase is ever completed

---

#### Story 56.21: Agent Behavior Observatory
**Priority:** P0  
**Points:** 8  
**Effort:** 1-2 days  
**File:** `apps/scanner/src/demand/observatory.ts`

**Description:**  
Monitor what real AI shopping tools are doing in the wild. Track which merchants ChatGPT Operator, Perplexity Shopping, Google AI Mode reference and recommend. Observational intelligence — watch the agents, don't control them.

**Observation Methods:**

| Method | What It Captures |
|--------|-----------------|
| **AI Search Monitoring** | Query AI tools with commercial queries, record which merchants surface |
| **Product Recommendation Tracking** | Track which merchants/products AI tools recommend per category |
| **AI Shopping News Monitor** | Track press reports of agent purchase successes/failures |
| **Protocol Integration Announcements** | Monitor Shopify/Stripe/Google for new protocol support |
| **Agent Marketplace Crawl** | Crawl MCP server lists and A2A registries for commerce agents |

**Acceptance Criteria:**
- [ ] Automated weekly queries against available AI search tools
- [ ] Results stored in `agent_observations` table with evidence
- [ ] "Most AI-Referenced Merchants" leaderboard computed weekly
- [ ] Cross-reference with scanner data
- [ ] LATAM-specific coverage gap analysis
- [ ] Manual observation entry for news/announcements
- [ ] MCP tool: `get_agent_activity`

---

#### Story 56.22: Transaction Demand Telemetry
**Priority:** P1  
**Points:** 5  
**Effort:** 1 day  
**File:** `apps/api/src/` (instrumentation in main API)

**Description:**  
Instrument all Sly checkout flows (UCP, ACP, x402, AP2) to capture failed merchant lookups and transaction attempt patterns. Every failed lookup is a demand signal. This data compounds as Sly's customer base grows.

**Note:** This story modifies the **main API** (`apps/api`), not the scanner, because it instruments existing checkout endpoints.

**Acceptance Criteria:**
- [ ] All UCP, ACP, x402, AP2 endpoints instrumented with telemetry events
- [ ] Failed lookups capture target domain and failure reason
- [ ] Protocol fallback chains recorded
- [ ] No PII stored
- [ ] Aggregate query: "top 20 merchants agents are trying to reach"
- [ ] Data feeds into demand intelligence

---

#### Story 56.23: Demand Heat Map & Prospect Scoring
**Priority:** P1  
**Points:** 5  
**Effort:** 1 day  
**File:** `apps/scanner/src/demand/prospect-scoring.ts`

**Description:**  
Combine all demand signals with readiness scores to produce a composite **opportunity score** per merchant. High demand + low readiness = call them first.

**Scoring:**
```
demand_score = 30% public_intelligence + 25% synthetic_test + 25% observatory + 20% telemetry
opportunity_score = demand × (1 - readiness/100)
```

**Acceptance Criteria:**
- [ ] Demand score computed from all 4 signal sources
- [ ] Opportunity score = demand × (1 - readiness/100)
- [ ] Prospect list sorted by opportunity score
- [ ] Sales priority assignment: critical/high/medium/low
- [ ] Heat map: category × region matrix
- [ ] Export prospect list as CSV for CRM
- [ ] MCP tool: `find_best_prospects`

---

#### Story 56.24: Agent Traffic Monitor (Free Tier Tool)
**Priority:** P2  
**Points:** 13  
**Effort:** 2-3 days  

**Description:**  
Lightweight JavaScript snippet that merchants install to detect AI agent traffic on their own site. **Last step in the sales funnel** — only offered after demand is proven via 56.19-56.23.

**Sales sequence:**
1. *You bring data (56.19)* — "Your category sees 1 AI visit per 31 humans."
2. *You bring proof (56.20)* — "We ran an agent against your site. It failed at checkout."
3. *They're interested* — "Want to see YOUR actual agent traffic? Free snippet, 5 minutes."
4. *They install it* — "You got 847 agent visits this week. 0 converted. Let's fix that with Sly."

**Acceptance Criteria:**
- [ ] JavaScript snippet < 5KB gzipped, async loading
- [ ] Detects known AI user-agents (GPTBot, ClaudeBot, PerplexityBot)
- [ ] Detects AI referrals (chat.openai.com, perplexity.ai, gemini.google.com)
- [ ] Merchant dashboard: agent visits, top agents, top pages, estimated revenue loss
- [ ] Shopify app option with one-click install
- [ ] Data visible within 24 hours
- [ ] Aggregate data feeds into Sly demand intelligence (with merchant consent)
- [ ] Free tier with CTA to Sly integration

---

## Epic 56 Summary

| Story | Name | Points | Priority | Mode | Status |
|-------|------|--------|----------|------|--------|
| **SUPPLY-SIDE SCANNER** | | | | | |
| 56.1 | Scanner Core Engine — Protocol Probes | 8 | P0 | 1,2,3 | 📋 |
| 56.2 | Structured Data Analyzer | 5 | P0 | 1,2,3 | 📋 |
| 56.3 | Accessibility & Checkout Friction Analyzer | 5 | P0 | 1,2,3 | 📋 |
| 56.4 | Readiness Score Computation & Storage | 3 | P0 | shared | 📋 |
| 56.5 | Batch Scanner & Queue System | 5 | P0 | 2 | 📋 |
| 56.6 | Pre-Built Scan Lists (Seed Data) | 5 | P0 | 2,3 | 📋 |
| 56.7 | Scanner API Routes & Zod Validation | 5 | P0 | 1,2 | 📋 |
| 56.8 | Snapshot Generator & Trend Tracking | 5 | P1 | 1,2,3 | 📋 |
| 56.9 | Dashboard — Scan Management UI | 5 | P2 | — | 📋 |
| 56.10 | Dashboard — Analytics & Trends | 5 | P2 | — | 📋 |
| 56.11 | Public Agent Readiness Audit Tool | 8 | P0 | 1 | 📋 |
| 56.12 | Report Generator | 8 | P1 | 3 | 📋 |
| 56.13 | SDK Integration — Scanner as a Service | 5 | P1 | 1 | 📋 |
| 56.14 | MCP Server — Scanner Tools for AI Agents | 5 | **P0** ⬆️ | 3 | 📋 |
| 56.15 | Competitive Intelligence — Tollbit Cross-Ref | 3 | P2 | 3 | 📋 |
| 56.16 | Scheduled Re-scans & Drift Detection | 3 | P2 | 2 | 📋 |
| 56.17 | Export & Reporting API | 3 | P2 | 1 | 📋 |
| 56.18 | Scan Data Seeding & First Baseline Report | 8 | P0 | 2,3 | 📋 |
| **DEMAND-SIDE INTELLIGENCE** | | | | | |
| 56.19 | Public Demand Intelligence Aggregator | 5 | P0 | 1,3 | 📋 |
| 56.20 | Synthetic Agent Shopping Tests | 13 | P0 | 1,3 | 📋 |
| 56.21 | Agent Behavior Observatory | 8 | P0 | 3 | 📋 |
| 56.22 | Transaction Demand Telemetry | 5 | P1 | — | 📋 |
| 56.23 | Demand Heat Map & Prospect Scoring | 5 | P1 | 1,3 | 📋 |
| 56.24 | Agent Traffic Monitor (Free Tier Tool) | 13 | P2 | — | 📋 |
| **TOTAL** | | **138** | | | **0/24** |

**Mode column:** Which trigger mode(s) each story powers. "shared" = used by all modes. "—" = independent of scanner modes.

## Implementation Sequence

```
Week 1 (P0 Foundation — All Three Modes):
  56.1 → 56.2 → 56.3 → 56.4  (Core probes + analyzers + scoring)
  56.5 → 56.7                  (Batch queue + API routes → Modes 1 & 2 live)
  56.14                        (MCP server → Mode 3 live)
  56.6                         (Seed data loaded)

  Result: All 3 modes operational. Can scan any merchant via API, CSV, or Claude.

Week 2 (P0 Demand Proof):
  56.19                        (Demand intelligence seeded)
  56.20                        (Synthetic agent shopping tests)
  56.21                        (Agent behavior observatory)

  Result: Complete demand story. Readiness + demand = sales-ready data.

Week 3 (P0 Public + First Report):
  56.11                        (Public audit tool live)
  56.18                        (1,000 merchants scanned, first baseline report)

  Result: Lead generation tool live. First "State of Agentic Commerce" dataset.

Week 4+ (P1 Enhancements):
  56.8                         (Snapshot trends)
  56.12                        (Report generator templates)
  56.13                        (SDK integration)
  56.22 → 56.23               (Telemetry + prospect scoring)

Week 6+ (P2 — Build when needed):
  56.9 → 56.10                (Dashboard UI — when non-technical users need it)
  56.15 → 56.16 → 56.17      (Competitive intel, re-scans, exports)
  56.24                        (Traffic monitor — only after proving demand)
```

**Critical Path:** 56.1-56.4 → 56.5+56.7+56.14 (three modes) → 56.19-56.21 (demand) → 56.11+56.18 (public tool + report)

**Key Architecture Decision:** MCP (Mode 3) is P0 because Claude replaces the need for a dashboard, report generator, and analytics UI in Phase 1. Build the data layer and the MCP tools — Claude handles the presentation layer.
