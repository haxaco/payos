#!/usr/bin/env tsx

/**
 * Census Scanner — Agent Marketplace Profiler
 *
 * Scans live AI agent marketplaces (ClawMarket, MoltRoad, Moltbook) to profile
 * real agents with identity, wallet, and activity data. Part of Project Looking
 * Glass (SLY-534).
 *
 * Usage: pnpm --filter @sly/api tsx scripts/census-scanner.ts
 *
 * Idempotent — uses upsert on dedup_hash so re-runs update existing records.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

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

const SCAN_VERSION = '1.0';

// Browser-like headers to bypass MoltRoad bot protection
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://moltroad.com/',
  Origin: 'https://moltroad.com',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface CensusRecord {
  platform: 'clawmarket' | 'moltroad' | 'moltbook';
  platform_id: string;
  dedup_hash: string;
  name: string | null;
  description: string | null;
  wallet_address: string | null;
  avatar_url: string | null;
  twitter_handle: string | null;
  reputation: number | null;
  earnings: number | null;
  trust_score: number | null;
  karma: number | null;
  rank: number | null;
  rating: number | null;
  rating_count: number | null;
  followers: number | null;
  skills_published: number | null;
  skills_installed: number | null;
  verified: boolean;
  token_balance: number | null;
  bond_balance: number | null;
  listing_count: number | null;
  service_tags: string[] | null;
  achievements: Record<string, unknown> | null;
  claimed: boolean | null;
  kya_tier: number;
  kya_signals: Record<string, unknown>;
  data_completeness: number;
  raw_profile: Record<string, unknown>;
  scan_version: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeDedupHash(platform: string, platformId: string): string {
  return createHash('sha256').update(`${platform}:${platformId}`).digest('hex');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '5');
        console.warn(`  ⏳ Rate limited, waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }
      if (!res.ok && attempt < retries) {
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
      return res;
    } catch (err: any) {
      if (attempt === retries) throw err;
      console.warn(`  ⚠️  Fetch failed (attempt ${attempt + 1}/${retries + 1}): ${err.message}`);
      await sleep(1000 * Math.pow(2, attempt));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries + 1} attempts`);
}

const COMPLETENESS_FIELDS: (keyof CensusRecord)[] = [
  'name',
  'description',
  'wallet_address',
  'avatar_url',
  'twitter_handle',
  'reputation',
  'earnings',
  'trust_score',
  'karma',
  'rank',
  'rating',
  'rating_count',
  'followers',
  'skills_published',
  'verified',
  'token_balance',
  'listing_count',
  'service_tags',
];

function computeDataCompleteness(record: Partial<CensusRecord>): number {
  let filled = 0;
  for (const field of COMPLETENESS_FIELDS) {
    const val = record[field];
    if (val !== null && val !== undefined && val !== false && val !== 0) {
      filled++;
    }
  }
  return parseFloat((filled / COMPLETENESS_FIELDS.length).toFixed(3));
}

function classifyKyaTier(
  record: Partial<CensusRecord>
): { tier: number; signals: Record<string, unknown> } {
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
    (record.bond_balance || 0) > 0;
  const hasCommunityTrust =
    (record.rating_count || 0) >= 10 || (record.followers || 0) >= 50;

  signals.has_description = hasDescription;
  signals.has_capabilities = hasCapabilities;
  signals.has_verification = hasVerification;
  signals.has_reputation = hasReputation;
  signals.has_financial_activity = hasFinancialActivity;
  signals.has_community_trust = hasCommunityTrust;

  // T3: Trusted — verified + reputation + financial activity + community trust
  if (
    hasDescription &&
    hasCapabilities &&
    hasVerification &&
    hasReputation &&
    hasFinancialActivity &&
    hasCommunityTrust
  ) {
    signals.tier_reason = 'Verified identity + track record + financial activity + community trust';
    return { tier: 3, signals };
  }

  // T2: Verified — verified identity + some track record
  if (hasDescription && hasCapabilities && hasVerification && hasReputation) {
    signals.tier_reason = 'Verified identity + track record';
    return { tier: 2, signals };
  }

  // T1: Declared — has description and declared capabilities
  if (hasDescription && hasCapabilities) {
    signals.tier_reason = 'Declared identity and capabilities';
    return { tier: 1, signals };
  }

  // T0: Registered — exists on platform
  signals.tier_reason = 'Registered only';
  return { tier: 0, signals };
}

// ─── ClawMarket Scanner ─────────────────────────────────────────────────────

async function scanClawMarket(): Promise<CensusRecord[]> {
  console.log('\n🔍 Scanning ClawMarket...');
  const records: CensusRecord[] = [];

  const res = await fetchWithRetry('https://claw-market.xyz/api/agents');
  const data = await res.json();
  const agents: any[] = data.agents || data;

  console.log(`  Found ${agents.length} agents`);

  for (const agent of agents) {
    const platformId = agent.wallet || agent.id || agent.name;
    const partial: Partial<CensusRecord> = {
      platform: 'clawmarket',
      platform_id: platformId,
      name: agent.name || null,
      description: agent.description || null,
      wallet_address: agent.wallet || null,
      reputation: agent.reputation ?? null,
      earnings: agent.earnings ?? null,
      skills_published: agent.skillsPublished?.length ?? null,
      skills_installed: agent.skillsInstalled?.length ?? null,
      verified: false,
      service_tags: null,
    };

    const { tier, signals } = classifyKyaTier(partial);

    records.push({
      ...partial,
      dedup_hash: computeDedupHash('clawmarket', platformId),
      avatar_url: null,
      twitter_handle: null,
      trust_score: null,
      karma: null,
      rank: null,
      rating: null,
      rating_count: null,
      followers: null,
      token_balance: null,
      bond_balance: null,
      listing_count: null,
      achievements: null,
      claimed: null,
      kya_tier: tier,
      kya_signals: signals,
      data_completeness: computeDataCompleteness(partial),
      raw_profile: agent,
      scan_version: SCAN_VERSION,
    } as CensusRecord);
  }

  return records;
}

// ─── MoltRoad Scanner ────────────────────────────────────────────────────────

async function scanMoltRoad(): Promise<CensusRecord[]> {
  console.log('\n🔍 Scanning MoltRoad...');
  const records: CensusRecord[] = [];

  // Phase 1: Get all agent IDs — try large limit first, then paginate
  const agentIdSet = new Set<string>();

  // Try fetching all at once with a large limit
  for (const limit of [500, 100, 50]) {
    const res = await fetchWithRetry(
      `https://moltroad.com/api/v1/agents/recent?limit=${limit}`,
      { headers: BROWSER_HEADERS }
    );

    if (!res.ok) continue;

    const data = await res.json();
    const agents: any[] = data.agents || [];
    for (const a of agents) {
      if (a.id) agentIdSet.add(a.id);
    }

    console.log(`  Fetched ${agents.length} agents with limit=${limit} (${agentIdSet.size} unique, ${data.total || '?'} total)`);

    if (agentIdSet.size >= (data.total || 0)) break; // got them all
    if (agents.length >= 100) break; // good enough batch
    await sleep(300);
  }

  // If we didn't get all, try leaderboard and storefronts for more IDs
  const totalExpected = 439;
  if (agentIdSet.size < totalExpected) {
    console.log(`  Supplementing with leaderboard and storefronts...`);
    for (const endpoint of [
      '/stats/leaderboard?by=rating',
      '/stats/leaderboard?by=volume',
      '/stats/leaderboard?by=sales',
      '/agents/storefronts?limit=100',
    ]) {
      try {
        const res = await fetchWithRetry(
          `https://moltroad.com/api/v1${endpoint}`,
          { headers: BROWSER_HEADERS }
        );
        if (!res.ok) continue;
        const data = await res.json();
        const items: any[] = data.agents || data.storefronts || data.leaderboard || [];
        for (const item of items) {
          if (item.id) agentIdSet.add(item.id);
          if (item.agent_id) agentIdSet.add(item.agent_id);
        }
        await sleep(300);
      } catch { /* ignore */ }
    }
    console.log(`  After supplements: ${agentIdSet.size} unique IDs`);
  }

  const allAgentIds = [...agentIdSet];

  console.log(`  Fetching ${allAgentIds.length} individual profiles...`);

  // Phase 2: Fetch individual profiles for rich data
  let fetched = 0;
  for (const agentId of allAgentIds) {
    try {
      const res = await fetchWithRetry(
        `https://moltroad.com/api/v1/agents/${agentId}`,
        { headers: BROWSER_HEADERS }
      );

      if (!res.ok) {
        console.warn(`  ⚠️  Profile ${agentId} failed (${res.status})`);
        continue;
      }

      const profile = await res.json();

      const partial: Partial<CensusRecord> = {
        platform: 'moltroad',
        platform_id: agentId,
        name: profile.name || null,
        description: profile.bio || null,
        wallet_address: profile.wallet_address || null,
        avatar_url: profile.x_avatar || null,
        twitter_handle: profile.twitter_handle || null,
        reputation: null,
        earnings: null,
        trust_score: typeof profile.trust === 'number' ? profile.trust : (profile.trust?.level ?? null),
        rating: profile.rating ?? profile.weighted_rating ?? null,
        rating_count: profile.rating_count ?? null,
        rank: typeof profile.rank === 'number' ? profile.rank : null,
        verified: profile.verified === true,
        token_balance: profile.token_balance ?? null,
        bond_balance: profile.bond_balance ?? null,
        listing_count: profile.listing_count ?? profile.active_listings?.length ?? null,
        service_tags: profile.service_tags || null,
        achievements: profile.achievements || null,
      };

      const { tier, signals } = classifyKyaTier(partial);

      records.push({
        ...partial,
        dedup_hash: computeDedupHash('moltroad', agentId),
        karma: null,
        followers: null,
        skills_published: null,
        skills_installed: null,
        claimed: null,
        kya_tier: tier,
        kya_signals: signals,
        data_completeness: computeDataCompleteness(partial),
        raw_profile: profile,
        scan_version: SCAN_VERSION,
      } as CensusRecord);

      fetched++;
      if (fetched % 50 === 0) {
        console.log(`  Fetched ${fetched}/${allAgentIds.length} profiles`);
      }
    } catch (err: any) {
      console.warn(`  ⚠️  Profile ${agentId} error: ${err.message}`);
    }
    await sleep(200);
  }

  return records;
}

// ─── Moltbook Scanner ────────────────────────────────────────────────────────

let moltbookLastRequest = 0;
const MOLTBOOK_MIN_INTERVAL = 1100; // 60 req/min = 1 req/sec + buffer

async function moltbookFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, MOLTBOOK_MIN_INTERVAL - (now - moltbookLastRequest));
  if (wait > 0) await sleep(wait);
  moltbookLastRequest = Date.now();

  const res = await fetchWithRetry(url);

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

async function scanMoltbook(): Promise<CensusRecord[]> {
  console.log('\n🔍 Scanning Moltbook...');
  const uniqueAgents = new Map<string, any>();

  // Phase 1: Leaderboard (top 100 agents by karma)
  console.log('  Phase 1: Leaderboard...');
  for (let skip = 0; skip < 100; skip += 50) {
    try {
      const res = await moltbookFetch(
        `https://moltbook.com/api/v1/agents/leaderboard?skip=${skip}&take=50`
      );
      if (!res.ok) {
        console.warn(`  ⚠️  Leaderboard skip=${skip} failed (${res.status})`);
        break;
      }
      const data = await res.json();
      const agents: any[] = data.agents || data;

      for (const agent of agents) {
        const id = agent.id || agent.name;
        if (id && !uniqueAgents.has(id)) {
          uniqueAgents.set(id, { ...agent, source: 'leaderboard' });
        }
      }
    } catch (err: any) {
      console.warn(`  ⚠️  Leaderboard error: ${err.message}`);
    }
  }

  console.log(`  Leaderboard: ${uniqueAgents.size} agents`);

  // Phase 2: Post author mining (20 pages x 50 posts)
  console.log('  Phase 2: Mining post authors...');
  let cursor: string | null = null;
  const maxPages = 20;

  for (let page = 0; page < maxPages; page++) {
    try {
      let url = 'https://moltbook.com/api/v1/posts?limit=50';
      if (cursor) url += `&cursor=${cursor}`;

      const res = await moltbookFetch(url);
      if (!res.ok) {
        console.warn(`  ⚠️  Posts page ${page} failed (${res.status})`);
        break;
      }
      const data = await res.json();
      const posts: any[] = data.posts || [];

      if (posts.length === 0) break;

      for (const post of posts) {
        const author = post.author;
        if (!author) continue;
        const id = author.id || author.name;
        if (id && !uniqueAgents.has(id)) {
          uniqueAgents.set(id, { ...author, source: 'post_author' });
        }
      }

      // Handle cursor pagination
      cursor = data.next_cursor || posts[posts.length - 1]?.id || null;
      if (!data.has_more && !cursor) break;

      if ((page + 1) % 5 === 0) {
        console.log(`  Page ${page + 1}/${maxPages}: ${uniqueAgents.size} unique agents so far`);
      }
    } catch (err: any) {
      console.warn(`  ⚠️  Posts page ${page} error: ${err.message}`);
      break;
    }
  }

  console.log(`  Total unique agents: ${uniqueAgents.size}`);

  // Build census records
  const records: CensusRecord[] = [];

  for (const [id, agent] of uniqueAgents) {
    const partial: Partial<CensusRecord> = {
      platform: 'moltbook',
      platform_id: id,
      name: agent.name || null,
      description: null,
      wallet_address: null,
      avatar_url: agent.avatar_url || null,
      twitter_handle: null,
      karma: agent.karma ?? null,
      rank: typeof agent.rank === 'number' ? agent.rank : null,
      followers: agent.followers ?? null,
      claimed: agent.claimed ?? null,
      verified: false,
      reputation: agent.karma ? Math.min(100, agent.karma / 1000) : null,
    };

    const { tier, signals } = classifyKyaTier(partial);

    records.push({
      ...partial,
      dedup_hash: computeDedupHash('moltbook', id),
      earnings: null,
      trust_score: null,
      rating: null,
      rating_count: null,
      skills_published: null,
      skills_installed: null,
      token_balance: null,
      bond_balance: null,
      listing_count: null,
      service_tags: null,
      achievements: null,
      kya_tier: tier,
      kya_signals: signals,
      data_completeness: computeDataCompleteness(partial),
      raw_profile: agent,
      scan_version: SCAN_VERSION,
    } as CensusRecord);
  }

  return records;
}

// ─── Upsert ──────────────────────────────────────────────────────────────────

async function upsertRecords(
  records: CensusRecord[]
): Promise<{ upserted: number; errors: number }> {
  // Deduplicate by dedup_hash (last one wins)
  const dedupMap = new Map<string, CensusRecord>();
  for (const r of records) dedupMap.set(r.dedup_hash, r);
  const deduped = [...dedupMap.values()];

  const BATCH_SIZE = 50;
  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('census_scans')
      .upsert(
        batch.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
        { onConflict: 'dedup_hash' }
      );

    if (error) {
      console.error(`  ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} error: ${error.message}`);
      errors += batch.length;
    } else {
      upserted += batch.length;
    }
  }

  return { upserted, errors };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Census Scanner v1.0');
  console.log('  Scanning AI Agent Marketplaces');
  console.log('═══════════════════════════════════════');

  const startTime = Date.now();
  const allRecords: CensusRecord[] = [];
  const platformStats: Record<string, { count: number; duration: number; error?: string }> = {};

  const scanners: [string, () => Promise<CensusRecord[]>][] = [
    ['ClawMarket', scanClawMarket],
    ['MoltRoad', scanMoltRoad],
    ['Moltbook', scanMoltbook],
  ];

  for (const [name, scanner] of scanners) {
    const t0 = Date.now();
    try {
      const records = await scanner();
      allRecords.push(...records);
      platformStats[name] = { count: records.length, duration: Date.now() - t0 };
      console.log(`  ✅ ${name}: ${records.length} agents in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    } catch (err: any) {
      platformStats[name] = { count: 0, duration: Date.now() - t0, error: err.message };
      console.error(`  ❌ ${name} failed: ${err.message}`);
    }
  }

  // Upsert all records
  console.log(`\n📥 Upserting ${allRecords.length} records into Supabase...`);
  const { upserted, errors } = await upsertRecords(allRecords);

  // Print summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const tierCounts = [0, 0, 0, 0];
  let withWallet = 0;
  let withVerification = 0;
  let withTwitter = 0;

  for (const r of allRecords) {
    tierCounts[r.kya_tier]++;
    if (r.wallet_address) withWallet++;
    if (r.verified) withVerification++;
    if (r.twitter_handle) withTwitter++;
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  Census Results');
  console.log('═══════════════════════════════════════');
  console.log(`  Total agents scanned: ${allRecords.length}`);
  console.log(`  DB upserted:         ${upserted}`);
  console.log(`  DB errors:           ${errors}`);
  console.log(`  Duration:            ${elapsed}s`);
  console.log('');
  console.log('  By Platform:');
  for (const [name, stats] of Object.entries(platformStats)) {
    const status = stats.error ? `❌ ${stats.error}` : `${stats.count} agents`;
    console.log(`    ${name.padEnd(12)} ${status} (${(stats.duration / 1000).toFixed(1)}s)`);
  }
  console.log('');
  console.log('  By KYA Tier:');
  console.log(`    T0 Registered:  ${tierCounts[0]}`);
  console.log(`    T1 Declared:    ${tierCounts[1]}`);
  console.log(`    T2 Verified:    ${tierCounts[2]}`);
  console.log(`    T3 Trusted:     ${tierCounts[3]}`);
  console.log('');
  console.log('  Coverage:');
  console.log(`    With wallet:    ${withWallet} (${((withWallet / allRecords.length) * 100).toFixed(1)}%)`);
  console.log(`    Verified (X):   ${withVerification} (${((withVerification / allRecords.length) * 100).toFixed(1)}%)`);
  console.log(`    Twitter handle: ${withTwitter} (${((withTwitter / allRecords.length) * 100).toFixed(1)}%)`);
  console.log('═══════════════════════════════════════');

  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
