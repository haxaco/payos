#!/usr/bin/env tsx

/**
 * Census Scanner: MCP Registry
 *
 * Scans the official MCP Registry API for all registered servers.
 * Stores results in census_mcp_servers table.
 *
 * Usage: cd apps/api && npx tsx scripts/census-scan-mcp.ts
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

const API_BASE = 'https://registry.modelcontextprotocol.io/v0.1';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface McpServer {
  server_name: string;
  description: string | null;
  version: string | null;
  repo_url: string | null;
  repo_source: string | null;
  website_url: string | null;
  remote_type: string | null;
  remote_url: string | null;
  icon_url: string | null;
  published_at: string | null;
  updated_at: string | null;
  status: string | null;
  is_latest: boolean | null;
  raw_entry: any;
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Census Scanner: MCP Registry');
  console.log('═══════════════════════════════════════\n');

  const allServers: McpServer[] = [];
  let cursor: string | null = null;
  let page = 0;
  const limit = 100;

  while (true) {
    let url = `${API_BASE}/servers?limit=${limit}&version=latest`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  API error: ${res.status} ${res.statusText}`);
      break;
    }

    const data = await res.json();
    const servers: any[] = data.servers || [];

    if (servers.length === 0) break;

    for (const entry of servers) {
      const s = entry.server || {};
      const meta = entry._meta?.['io.modelcontextprotocol.registry/official'] || {};
      const remote = (s.remotes || [])[0] || {};
      const icon = (s.icons || [])[0] || {};

      allServers.push({
        server_name: s.name || '',
        description: s.description || null,
        version: s.version || null,
        repo_url: s.repository?.url || null,
        repo_source: s.repository?.source || null,
        website_url: s.websiteUrl || null,
        remote_type: remote.type || null,
        remote_url: remote.url || null,
        icon_url: icon.src || null,
        published_at: meta.publishedAt || null,
        updated_at: meta.updatedAt || null,
        status: meta.status || null,
        is_latest: meta.isLatest ?? null,
        raw_entry: entry,
      });
    }

    page++;
    console.log(`  Page ${page}: ${allServers.length} servers total`);

    // Check for next page cursor
    const linkHeader = res.headers.get('link');
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<[^>]*[?&]cursor=([^&>]+)[^>]*>;\s*rel="next"/);
      if (nextMatch) {
        cursor = decodeURIComponent(nextMatch[1]);
      } else {
        break;
      }
    } else if (servers.length < limit) {
      break;
    } else {
      // Try using last server name as cursor
      const lastName = servers[servers.length - 1]?.server?.name;
      if (lastName && lastName !== cursor) {
        cursor = lastName;
      } else {
        break;
      }
    }

    await sleep(500);
  }

  // Dedupe by server_name (keep latest version)
  const deduped = new Map<string, McpServer>();
  for (const s of allServers) {
    if (!deduped.has(s.server_name) || s.is_latest) {
      deduped.set(s.server_name, s);
    }
  }

  const unique = [...deduped.values()];
  console.log(`\n  Total: ${allServers.length} entries, ${unique.length} unique servers`);

  // Upsert into Supabase
  console.log('  Upserting into census_mcp_servers...');
  const BATCH = 50;
  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const { error } = await supabase
      .from('census_mcp_servers')
      .upsert(batch.map(s => ({ ...s, scanned_at: new Date().toISOString() })), {
        onConflict: 'server_name',
      });

    if (error) {
      console.error(`  ❌ Batch error: ${error.message}`);
      errors += batch.length;
    } else {
      upserted += batch.length;
    }
  }

  // Analyze
  const categories = new Map<string, number>();
  const sources = new Map<string, number>();
  const remoteTypes = new Map<string, number>();
  let withRepo = 0, withRemote = 0, withWebsite = 0;

  for (const s of unique) {
    if (s.repo_source) sources.set(s.repo_source, (sources.get(s.repo_source) || 0) + 1);
    if (s.remote_type) {
      remoteTypes.set(s.remote_type, (remoteTypes.get(s.remote_type) || 0) + 1);
      withRemote++;
    }
    if (s.repo_url) withRepo++;
    if (s.website_url) withWebsite++;

    // Extract category from name namespace
    const ns = (s.server_name || '').split('/')[0];
    const tld = ns.split('.')[0];
    categories.set(tld, (categories.get(tld) || 0) + 1);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  MCP Registry Results');
  console.log('═══════════════════════════════════════');
  console.log(`  Servers scanned:  ${unique.length}`);
  console.log(`  Upserted:         ${upserted}`);
  console.log(`  Errors:           ${errors}`);
  console.log(`  With repo:        ${withRepo}`);
  console.log(`  With remote URL:  ${withRemote}`);
  console.log(`  With website:     ${withWebsite}`);
  console.log('\n  Remote types:');
  for (const [t, c] of [...remoteTypes.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${t}: ${c}`);
  }
  console.log('\n  Top namespaces:');
  for (const [ns, c] of [...categories.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`    ${ns}: ${c}`);
  }
  console.log('═══════════════════════════════════════');

  process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
