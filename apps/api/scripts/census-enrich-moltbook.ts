#!/usr/bin/env tsx

/**
 * Census Enrichment: Moltbook Profiles
 *
 * Searches for Moltbook agents' posts to extract richer profile data
 * (followers, claimed status, etc.) that wasn't available from leaderboard.
 *
 * Usage: cd apps/api && npx tsx scripts/census-enrich-moltbook.ts
 *
 * Rate limit: 60 req/min -> 1.1s between requests
 * For 255 agents: ~5 minutes runtime
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ─── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── Rate-Limited Fetch ──────────────────────────────────────────────────────

let lastRequestTime = 0;
const MIN_INTERVAL = 1100; // 60 req/min + buffer

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function moltbookFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL - (now - lastRequestTime));
  if (wait > 0) await sleep(wait);
  lastRequestTime = Date.now();

  const res = await fetch(url);

  // Check rate limit headers
  const remaining = parseInt(res.headers.get('x-ratelimit-remaining') || '60');
  if (remaining < 5) {
    const resetTs = parseInt(res.headers.get('x-ratelimit-reset') || '0');
    if (resetTs > 0) {
      const waitMs = Math.max(0, resetTs * 1000 - Date.now());
      if (waitMs > 0 && waitMs < 120000) {
        console.warn(`  ⏳ Rate limit low (${remaining}), waiting ${(waitMs / 1000).toFixed(0)}s...`);
        await sleep(waitMs);
      }
    }
  }

  return res;
}

// ─── Profile Search ──────────────────────────────────────────────────────────

interface MoltbookAuthor {
  id?: string;
  name: string;
  karma?: number;
  followers?: number;
  claimed?: boolean;
  avatar_url?: string | null;
}

async function searchAgentProfile(
  agentName: string,
  platformId: string
): Promise<MoltbookAuthor | null> {
  try {
    const res = await moltbookFetch(
      `https://moltbook.com/api/v1/search?q=${encodeURIComponent(agentName)}&limit=20`
    );

    if (!res.ok) return null;

    const data = await res.json();
    const posts: any[] = data.posts || data.results || [];

    if (posts.length === 0) return null;

    // First try: match by platform_id
    for (const post of posts) {
      if (post.author?.id === platformId) {
        return post.author;
      }
    }

    // Second try: match by name (case-insensitive)
    for (const post of posts) {
      if (post.author?.name?.toLowerCase() === agentName.toLowerCase()) {
        return post.author;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ─── KYA Reclassification ────────────────────────────────────────────────────

function reclassifyKyaTier(record: any): { kya_tier: number; kya_signals: Record<string, unknown> } {
  const signals: Record<string, unknown> = {};

  const hasDescription = !!(record.description || record.name);
  const hasCapabilities =
    (record.skills_published || 0) > 0 ||
    (record.listing_count || 0) > 0 ||
    (record.service_tags?.length || 0) > 0;
  const hasVerification = record.verified === true || !!record.twitter_handle;
  const hasReputation =
    (record.reputation || 0) >= 50 ||
    (record.rating || 0) >= 4.0 ||
    (record.karma || 0) >= 100;
  const hasFinancialActivity =
    (record.earnings || 0) > 0 ||
    (record.token_balance || 0) > 0 ||
    (record.bond_balance || 0) > 0 ||
    (record.tx_count || 0) > 0 ||
    (record.usdc_balance || 0) > 0;
  const hasCommunityTrust =
    (record.rating_count || 0) >= 10 || (record.followers || 0) >= 50;

  signals.has_description = hasDescription;
  signals.has_capabilities = hasCapabilities;
  signals.has_verification = hasVerification;
  signals.has_reputation = hasReputation;
  signals.has_financial_activity = hasFinancialActivity;
  signals.has_community_trust = hasCommunityTrust;

  if (hasDescription && hasCapabilities && hasVerification && hasReputation && hasFinancialActivity && hasCommunityTrust) {
    signals.tier_reason = 'Verified identity + track record + financial activity + community trust';
    return { kya_tier: 3, kya_signals: signals };
  }
  if (hasDescription && hasCapabilities && hasVerification && hasReputation) {
    signals.tier_reason = 'Verified identity + track record';
    return { kya_tier: 2, kya_signals: signals };
  }
  if (hasDescription && hasCapabilities) {
    signals.tier_reason = 'Declared identity and capabilities';
    return { kya_tier: 1, kya_signals: signals };
  }
  signals.tier_reason = 'Registered only';
  return { kya_tier: 0, kya_signals: signals };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Census Enrichment: Moltbook Profiles');
  console.log('═══════════════════════════════════════');

  // Query Moltbook agents that need enrichment
  const { data: rows, error } = await supabase
    .from('census_scans')
    .select('*')
    .eq('platform', 'moltbook')
    .or('followers.is.null,claimed.is.null');

  if (error || !rows) {
    console.error('Failed to query census_scans:', error?.message);
    process.exit(1);
  }

  console.log(`  ${rows.length} Moltbook agents to enrich\n`);

  let enriched = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const agentName = row.name;

    if (!agentName) {
      notFound++;
      continue;
    }

    const author = await searchAgentProfile(agentName, row.platform_id);

    if (!author) {
      notFound++;
      continue;
    }

    // Merge: only fill in NULL fields
    const updates: Record<string, any> = {
      enriched_at: new Date().toISOString(),
    };

    if (row.followers === null && author.followers !== undefined) {
      updates.followers = author.followers;
    }
    if (row.claimed === null && author.claimed !== undefined) {
      updates.claimed = author.claimed;
    }
    if (row.avatar_url === null && author.avatar_url) {
      updates.avatar_url = author.avatar_url;
    }
    if (row.karma === null && author.karma !== undefined) {
      updates.karma = author.karma;
    }

    // Reclassify KYA tier with enriched data
    const enrichedRecord = { ...row, ...updates };
    const { kya_tier, kya_signals } = reclassifyKyaTier(enrichedRecord);
    updates.kya_tier = kya_tier;
    updates.kya_signals = kya_signals;

    const { error: updateErr } = await supabase
      .from('census_scans')
      .update(updates)
      .eq('id', row.id);

    if (updateErr) {
      console.error(`  ❌ Update failed for ${agentName}: ${updateErr.message}`);
      errors++;
    } else {
      enriched++;
    }

    if ((i + 1) % 25 === 0) {
      console.log(`  Progress: ${i + 1}/${rows.length} (enriched: ${enriched}, not found: ${notFound})`);
    }
  }

  // Print summary
  console.log('\n═══════════════════════════════════════');
  console.log('  Moltbook Enrichment Results');
  console.log('═══════════════════════════════════════');
  console.log(`  Total agents:   ${rows.length}`);
  console.log(`  Enriched:       ${enriched} (${((enriched / rows.length) * 100).toFixed(1)}%)`);
  console.log(`  Not found:      ${notFound}`);
  console.log(`  Errors:         ${errors}`);
  console.log('═══════════════════════════════════════');

  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
