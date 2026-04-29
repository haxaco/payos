#!/usr/bin/env tsx

/**
 * Census Scanner: Known Agents (knownagents.com)
 *
 * Scrapes the Known Agents directory — 1,600+ AI agents/bots/crawlers.
 * These are agents visiting websites (crawlers, assistants, coding agents).
 *
 * Usage: cd apps/api && npx tsx scripts/census-scan-knownagents.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
};

const CATEGORY_SLUGS = [
  'ai-agent', 'ai-assistant', 'ai-coding-agent', 'ai-data-provider',
  'ai-data-scraper', 'ai-search-crawler', 'archiver', 'automated-agent',
  'developer-helper', 'fetcher', 'intelligence-gatherer', 'scraper',
  'search-engine-crawler', 'security-scanner', 'seo-crawler',
  'uncategorized-agent', 'undocumented-ai-agent',
];

interface AgentEntry {
  agent_name: string;
  agent_token: string | null;
  agent_url: string;
  agent_type: string | null;
  operator_name: string | null;
  category: string | null;
  description: string | null;
  raw_entry: any;
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Census Scanner: Known Agents');
  console.log('═══════════════════════════════════════\n');

  // Step 1: Fetch main page to get all agent slugs
  console.log('  Fetching main agents page...');
  const res = await fetch('https://knownagents.com/agents', { headers: BROWSER_HEADERS });
  if (!res.ok) {
    console.error(`  Failed: ${res.status}`);
    process.exit(1);
  }
  const html = await res.text();
  console.log(`  Page size: ${(html.length / 1024).toFixed(0)} KB`);

  // Extract all agent slugs
  const slugRegex = /href="\/agents\/([^"?]+)"/g;
  const slugSet = new Set<string>();
  let match;
  while ((match = slugRegex.exec(html)) !== null) {
    const slug = match[1];
    // Skip category-like slugs
    if (!CATEGORY_SLUGS.includes(slug) && !slug.includes('/')) {
      slugSet.add(slug);
    }
  }

  const slugs = [...slugSet];
  console.log(`  Found ${slugs.length} unique agent slugs\n`);

  // Step 2: Extract agent names and types from the HTML
  // The page has agent entries with class patterns — let's extract what we can
  // Each agent appears as a table row or list item with name + type

  // Build agent entries from slugs + any inline data we can extract
  const agents: AgentEntry[] = [];

  // Try to extract name and category from nearby HTML context
  for (const slug of slugs) {
    // Convert slug to readable name
    const name = slug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .replace(/\b(Bot|Ai|Api|Seo|Llm|Url|Http|Www|Io)\b/gi, m => m.toUpperCase());

    // Try to find this agent's type from the HTML context
    const agentLinkPos = html.indexOf(`/agents/${slug}"`);
    let agentType: string | null = null;
    let description: string | null = null;

    if (agentLinkPos > 0) {
      // Look at surrounding HTML (±500 chars) for type and description
      const context = html.substring(Math.max(0, agentLinkPos - 300), agentLinkPos + 500);

      // Look for agent type badge/label
      const typeMatch = context.match(/agent-type[^>]*>([^<]+)/i)
        || context.match(/class="[^"]*type[^"]*"[^>]*>([^<]+)/i)
        || context.match(/data-type="([^"]+)"/i);
      if (typeMatch) agentType = typeMatch[1].trim();

      // Look for description
      const descMatch = context.match(/description[^>]*>([^<]{5,200})/i)
        || context.match(/<p[^>]*>([^<]{10,200})/i);
      if (descMatch) description = descMatch[1].trim();
    }

    agents.push({
      agent_name: name,
      agent_token: slug,
      agent_url: `https://knownagents.com/agents/${slug}`,
      agent_type: agentType,
      operator_name: null,
      category: null,
      description: description,
      raw_entry: { slug },
    });
  }

  // Step 3: Fetch category pages to enrich with types
  console.log('  Enriching with category data...');
  for (const catSlug of CATEGORY_SLUGS) {
    try {
      const catRes = await fetch(
        `https://knownagents.com/agents?agent_type_url_slug=${catSlug}`,
        { headers: BROWSER_HEADERS }
      );
      if (!catRes.ok) continue;
      const catHtml = await catRes.text();

      // Find which agent slugs appear on this category page
      const catSlugs = new Set<string>();
      let m;
      const rx = /href="\/agents\/([^"?]+)"/g;
      while ((m = rx.exec(catHtml)) !== null) {
        if (!CATEGORY_SLUGS.includes(m[1])) catSlugs.add(m[1]);
      }

      const catName = catSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      let enriched = 0;
      for (const agent of agents) {
        if (catSlugs.has(agent.agent_token!)) {
          if (!agent.category) {
            agent.category = catSlug;
            agent.agent_type = catName;
            enriched++;
          }
        }
      }

      console.log(`  ${catName}: ${catSlugs.size} agents on page, ${enriched} enriched`);
      await sleep(300);
    } catch {
      // skip
    }
  }

  // Count categorized vs uncategorized
  const categorized = agents.filter(a => a.category).length;
  console.log(`\n  Categorized: ${categorized}/${agents.length}`);

  // Step 4: Upsert
  console.log('  Upserting into census_known_agents...');
  const BATCH = 50;
  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < agents.length; i += BATCH) {
    const batch = agents.slice(i, i + BATCH);
    const { error } = await supabase
      .from('census_known_agents')
      .upsert(
        batch.map(a => ({ ...a, scanned_at: new Date().toISOString() })),
        { onConflict: 'agent_name' }
      );

    if (error) {
      console.error(`  ❌ Batch error: ${error.message}`);
      errors += batch.length;
    } else {
      upserted += batch.length;
    }
  }

  // Summary
  const cats = new Map<string, number>();
  for (const a of agents) {
    const c = a.agent_type || 'Uncategorized';
    cats.set(c, (cats.get(c) || 0) + 1);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  Known Agents Results');
  console.log('═══════════════════════════════════════');
  console.log(`  Agents found:     ${agents.length}`);
  console.log(`  Upserted:         ${upserted}`);
  console.log(`  Errors:           ${errors}`);
  console.log(`  Categorized:      ${categorized}`);
  console.log('\n  By type:');
  for (const [cat, count] of [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`    ${cat}: ${count}`);
  }
  console.log('═══════════════════════════════════════');

  process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
