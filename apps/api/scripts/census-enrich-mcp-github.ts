#!/usr/bin/env tsx

/**
 * Census Enrichment: MCP Server GitHub Stats
 *
 * Enriches census_mcp_servers with GitHub stars, forks, issues, watchers,
 * language, last push date, and created date.
 *
 * Usage: cd apps/api && npx tsx scripts/census-enrich-mcp-github.ts
 *
 * Env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required)
 *   GITHUB_TOKEN (recommended — 5,000 req/hr vs 60 req/hr unauthenticated)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

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

interface GitHubStats {
  stars: number;
  forks: number;
  open_issues: number;
  watchers: number;
  language: string | null;
  created_at: string | null;
  pushed_at: string | null;
  archived: boolean;
  topics: string[];
  license: string | null;
  size_kb: number;
}

async function fetchGitHubStats(repoUrl: string): Promise<GitHubStats | null> {
  // Extract owner/repo from URL
  // Handle formats: https://github.com/owner/repo, https://github.com/owner/repo.git, with subfolder
  let path = repoUrl.replace('https://github.com/', '').replace('.git', '');
  // Remove subfolder paths
  const parts = path.split('/');
  if (parts.length < 2) return null;
  const owner = parts[0];
  const repo = parts[1];

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'census-scanner/1.0',
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });

    if (res.status === 404) return null;
    if (res.status === 403 || res.status === 429) {
      // Rate limited
      const resetHeader = res.headers.get('x-ratelimit-reset');
      if (resetHeader) {
        const waitMs = Math.max(0, parseInt(resetHeader) * 1000 - Date.now());
        if (waitMs > 0 && waitMs < 3600000) {
          console.warn(`  ⏳ GitHub rate limited, waiting ${(waitMs / 1000).toFixed(0)}s...`);
          await sleep(waitMs + 1000);
          return fetchGitHubStats(repoUrl); // retry
        }
      }
      return null;
    }
    if (!res.ok) return null;

    const d = await res.json();

    return {
      stars: d.stargazers_count || 0,
      forks: d.forks_count || 0,
      open_issues: d.open_issues_count || 0,
      watchers: d.subscribers_count || 0,
      language: d.language || null,
      created_at: d.created_at || null,
      pushed_at: d.pushed_at || null,
      archived: d.archived || false,
      topics: d.topics || [],
      license: d.license?.spdx_id || null,
      size_kb: d.size || 0,
    };
  } catch {
    return null;
  }
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  MCP GitHub Enrichment');
  console.log('═══════════════════════════════════════');
  console.log(`  GitHub token: ${GITHUB_TOKEN ? 'configured (5,000 req/hr)' : 'NOT SET (60 req/hr — will be slow!)'}`);

  // Check rate limit
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'census-scanner/1.0',
  };
  if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  const rlRes = await fetch('https://api.github.com/rate_limit', { headers });
  const rl = await rlRes.json();
  const remaining = rl.resources?.core?.remaining || 0;
  const limit = rl.resources?.core?.limit || 0;
  console.log(`  Rate limit: ${remaining}/${limit} remaining\n`);

  // Query all MCP servers with GitHub repos (paginate past 1000 default)
  const rows: any[] = [];
  let offset = 0;
  while (true) {
    const { data, error: qErr } = await supabase
      .from('census_mcp_servers')
      .select('id, server_name, repo_url, raw_entry')
      .like('repo_url', 'https://github.com/%')
      .range(offset, offset + 999);
    if (qErr || !data || data.length === 0) break;
    rows.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  const error = null;

  if (error || !rows) {
    console.error('Query failed:', error?.message);
    process.exit(1);
  }

  // Skip already-enriched ones (check if raw_entry has github_stats)
  const toEnrich = rows.filter(r => {
    const existing = r.raw_entry?.github_stats;
    return !existing;
  });

  console.log(`  Total with GitHub repos: ${rows.length}`);
  console.log(`  Already enriched: ${rows.length - toEnrich.length}`);
  console.log(`  To enrich: ${toEnrich.length}`);

  if (toEnrich.length === 0) {
    console.log('  Nothing to do!');
    process.exit(0);
  }

  // Dedupe repos (some MCP servers share the same repo with subfolder)
  const repoToRows = new Map<string, typeof toEnrich>();
  for (const row of toEnrich) {
    let repoKey = row.repo_url!.replace('.git', '').split('/').slice(3, 5).join('/').toLowerCase();
    if (!repoToRows.has(repoKey)) repoToRows.set(repoKey, []);
    repoToRows.get(repoKey)!.push(row);
  }
  console.log(`  Unique repos to query: ${repoToRows.size}\n`);

  const delay = GITHUB_TOKEN ? 750 : 61000; // 5000/hr = 1.4/sec, but be safe
  let enriched = 0;
  let notFound = 0;
  let errors = 0;
  let totalStars = 0;

  for (const [repoKey, serverRows] of repoToRows) {
    const stats = await fetchGitHubStats(`https://github.com/${repoKey}`);

    if (!stats) {
      notFound++;
      // Still mark as enriched so we don't retry
      for (const row of serverRows) {
        await supabase.from('census_mcp_servers').update({
          raw_entry: { ...row.raw_entry, github_stats: { error: 'not_found' } },
        }).eq('id', row.id);
      }
    } else {
      totalStars += stats.stars;

      for (const row of serverRows) {
        const { error: updateErr } = await supabase
          .from('census_mcp_servers')
          .update({
            raw_entry: { ...row.raw_entry, github_stats: stats },
          })
          .eq('id', row.id);

        if (updateErr) {
          errors++;
        }
      }
      enriched++;
    }

    if ((enriched + notFound) % 100 === 0) {
      console.log(`  Progress: ${enriched + notFound}/${repoToRows.size} repos (${enriched} enriched, ${notFound} not found, ${totalStars.toLocaleString()} total stars)`);
    }

    await sleep(delay);
  }

  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('  MCP GitHub Enrichment Results');
  console.log('═══════════════════════════════════════');
  console.log(`  Repos queried:    ${repoToRows.size}`);
  console.log(`  Enriched:         ${enriched}`);
  console.log(`  Not found (404):  ${notFound}`);
  console.log(`  Errors:           ${errors}`);
  console.log(`  Total stars:      ${totalStars.toLocaleString()}`);
  console.log('═══════════════════════════════════════');

  // Quick top-10
  const { data: top } = await supabase
    .from('census_mcp_servers')
    .select('server_name, raw_entry')
    .not('raw_entry->github_stats->stars', 'is', null)
    .order('raw_entry->github_stats->stars', { ascending: false })
    .limit(10);

  if (top && top.length > 0) {
    console.log('\n  Top 10 by GitHub stars:');
    for (const t of top) {
      const gs = t.raw_entry?.github_stats;
      if (gs && gs.stars !== undefined) {
        console.log(`    ${gs.stars.toLocaleString().padStart(8)} ⭐ | ${t.server_name}`);
      }
    }
  }

  process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
