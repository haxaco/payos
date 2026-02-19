import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const SCANNER_TOOLS: Tool[] = [
  // Scanning
  {
    name: 'scan_merchant',
    description: 'Scan a single merchant domain for agentic commerce readiness. Returns protocol support, structured data, accessibility, and readiness score.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        domain: { type: 'string', description: 'Domain to scan (e.g., "shopify.com")' },
        merchant_name: { type: 'string', description: 'Optional merchant name' },
        merchant_category: {
          type: 'string',
          description: 'Category',
          enum: ['retail', 'saas', 'marketplace', 'restaurant', 'b2b', 'travel', 'fintech', 'healthcare', 'media', 'other'],
        },
        country_code: { type: 'string', description: 'ISO 3166-1 alpha-2 country code' },
        region: {
          type: 'string',
          enum: ['latam', 'north_america', 'europe', 'apac', 'africa', 'mena'],
        },
      },
      required: ['domain'],
    },
  },
  {
    name: 'batch_scan',
    description: 'Start a batch scan of multiple domains. Returns batch ID for progress tracking.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        domains: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              domain: { type: 'string' },
              merchant_name: { type: 'string' },
              merchant_category: { type: 'string' },
              country_code: { type: 'string' },
              region: { type: 'string' },
            },
            required: ['domain'],
          },
          description: 'Array of domains to scan',
        },
        name: { type: 'string', description: 'Batch name' },
      },
      required: ['domains'],
    },
  },
  {
    name: 'get_batch_progress',
    description: 'Check the progress of a batch scan.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        batch_id: { type: 'string', description: 'Batch ID' },
      },
      required: ['batch_id'],
    },
  },

  // Query existing data
  {
    name: 'get_scan_results',
    description: 'Get cached scan results for a domain.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        domain: { type: 'string', description: 'Domain to look up' },
      },
      required: ['domain'],
    },
  },
  {
    name: 'search_scans',
    description: 'Search scan database with filters. Returns paginated results.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Filter by merchant category' },
        region: { type: 'string', description: 'Filter by region' },
        status: { type: 'string', description: 'Filter by scan status' },
        min_score: { type: 'number', description: 'Minimum readiness score' },
        max_score: { type: 'number', description: 'Maximum readiness score' },
        page: { type: 'number', description: 'Page number (default 1)' },
        limit: { type: 'number', description: 'Results per page (default 20, max 100)' },
      },
    },
  },
  {
    name: 'compare_merchants',
    description: 'Side-by-side comparison of readiness scores for multiple merchants.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        domains: {
          type: 'array',
          items: { type: 'string' },
          description: 'Domains to compare (2-10)',
        },
      },
      required: ['domains'],
    },
  },

  // Analysis & reporting
  {
    name: 'get_readiness_report',
    description: 'Get aggregate readiness statistics across all scanned merchants.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'find_best_prospects',
    description: 'Find the best prospects by opportunity score (high demand + low readiness = high opportunity).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Filter by category' },
        region: { type: 'string', description: 'Filter by region' },
        limit: { type: 'number', description: 'Number of results (default 10)' },
      },
    },
  },
  {
    name: 'get_protocol_adoption',
    description: 'Get protocol adoption rates across scanned merchants.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },

  // Demand intelligence
  {
    name: 'get_demand_brief',
    description: 'Generate a demand narrative for a category and/or region.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: { type: 'string', description: 'Merchant category' },
        region: { type: 'string', description: 'Region filter' },
      },
    },
  },
  {
    name: 'get_demand_stats',
    description: 'Get raw demand intelligence data points.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        source: { type: 'string', description: 'Filter by data source' },
        metric: { type: 'string', description: 'Filter by metric name' },
        category: { type: 'string', description: 'Filter by category' },
        region: { type: 'string', description: 'Filter by region' },
        limit: { type: 'number', description: 'Max results (default 50)' },
      },
    },
  },

  // Synthetic agent shopping tests
  {
    name: 'run_agent_shopping_test',
    description: 'Run a synthetic agent shopping test against a merchant. Simulates a 5-step shopping flow (discovery, selection, cart, checkout, payment) to find where agents get blocked.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        domain: { type: 'string', description: 'Domain to test (e.g., "shopify.com")' },
        test_type: {
          type: 'string',
          enum: ['browse', 'search', 'add_to_cart', 'checkout', 'full_flow'],
          description: 'Type of test to run. "full_flow" runs all 5 steps (default).',
        },
      },
      required: ['domain'],
    },
  },
  {
    name: 'get_test_results',
    description: 'Get results from a previous agent shopping test, including blockers and recommendations.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        domain: { type: 'string', description: 'Domain to look up test results for' },
      },
      required: ['domain'],
    },
  },

  // Agent Behavior Observatory
  {
    name: 'get_agent_activity',
    description: 'Get an agent behavior observatory report showing AI agent activity in the wild — which merchants are referenced by AI search engines, protocol drift, and LATAM coverage analysis.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        since: { type: 'string', description: 'ISO 8601 date to filter observations from (e.g., "2026-01-01")' },
      },
    },
  },
];
