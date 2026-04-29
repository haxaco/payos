#!/usr/bin/env tsx

/**
 * Census Scanner: Virtuals Protocol
 *
 * Scans the Virtuals Protocol API for tokenized AI agents.
 * Stores results in census_scans table with platform='virtuals'.
 *
 * Usage: cd apps/api && npx tsx scripts/census-scan-virtuals.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

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

function computeDedupHash(platform: string, id: string): string {
  return createHash('sha256').update(`${platform}:${id}`).digest('hex');
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Census Scanner: Virtuals Protocol');
  console.log('═══════════════════════════════════════\n');

  const allAgents: any[] = [];
  let page = 1;
  const pageSize = 10; // API caps at 10
  const maxAgents = 5000; // Sample cap — 38K+ total exist

  while (allAgents.length < maxAgents) {
    try {
      const res = await fetch(
        `https://api.virtuals.io/api/virtuals?limit=${pageSize}&page=${page}`
      );

      if (!res.ok) {
        console.warn(`  Page ${page} failed: ${res.status}`);
        break;
      }

      const json = await res.json();
      const agents: any[] = json.data || [];
      const total = json.meta?.pagination?.total || 0;
      const pageCount = json.meta?.pagination?.pageCount || 0;

      if (!Array.isArray(agents) || agents.length === 0) break;

      allAgents.push(...agents);

      if (page % 50 === 0 || page === 1) {
        console.log(`  Page ${page}/${Math.min(pageCount, maxAgents/pageSize)}: ${allAgents.length} agents (${total} total on platform)`);
      }

      if (page >= pageCount) break;
      page++;
      await sleep(200);
    } catch (err: any) {
      console.warn(`  Page ${page} error: ${err.message}`);
      // Retry once after a pause
      await sleep(2000);
      page++;
    }
  }

  console.log(`\n  Fetched ${allAgents.length} agents from Virtuals Protocol`);

  // Map to census_scans format
  const records = allAgents.map((a) => {
    const platformId = a.id?.toString() || a.uid || a.name;
    return {
      platform: 'virtuals' as const,
      platform_id: platformId,
      dedup_hash: computeDedupHash('virtuals', platformId),
      name: a.name || null,
      description: (a.description || '').substring(0, 2000) || null,
      wallet_address: a.walletAddress || a.tbaAddress || null,
      avatar_url: a.image || null,
      twitter_handle: null, // would need to parse socials
      reputation: null,
      earnings: null,
      trust_score: null,
      karma: null,
      rank: null,
      rating: null,
      rating_count: null,
      followers: a.holderCount || null,
      skills_published: null,
      skills_installed: null,
      verified: a.isVerified || false,
      token_balance: a.totalValueLocked ? parseFloat(a.totalValueLocked) : null,
      bond_balance: null,
      listing_count: null,
      service_tags: a.category ? [a.category, a.role].filter(Boolean) : null,
      achievements: null,
      claimed: null,
      kya_tier: 0,
      kya_signals: {
        has_description: !!a.description,
        has_wallet: !!(a.walletAddress || a.tbaAddress),
        has_token: !!a.tokenAddress,
        has_verification: a.isVerified || false,
        market_cap: a.mcapInVirtual || 0,
        holder_count: a.holderCount || 0,
        tier_reason: 'Registered on Virtuals Protocol',
      },
      data_completeness: 0,
      raw_profile: a,
      scan_version: '1.0',
    };
  });

  // Calculate data completeness
  const fields = ['name', 'description', 'wallet_address', 'avatar_url', 'followers', 'verified', 'token_balance', 'service_tags'];
  for (const r of records) {
    let filled = 0;
    for (const f of fields) {
      const v = (r as any)[f];
      if (v !== null && v !== undefined && v !== false && v !== 0 && v !== '') filled++;
    }
    r.data_completeness = parseFloat((filled / fields.length).toFixed(3));
  }

  // Classify KYA tiers
  for (const r of records) {
    const hasDesc = !!(r.description);
    const hasCapabilities = (r.service_tags?.length || 0) > 0;
    const hasVerification = r.verified;
    const hasFinancial = (r.token_balance || 0) > 0 || !!(r.wallet_address);

    if (hasDesc && hasCapabilities && hasVerification) {
      r.kya_tier = 2;
      r.kya_signals.tier_reason = 'Verified + declared capabilities';
    } else if (hasDesc && hasCapabilities) {
      r.kya_tier = 1;
      r.kya_signals.tier_reason = 'Declared identity and capabilities';
    } else {
      r.kya_tier = 0;
    }
  }

  // Dedupe
  const dedupMap = new Map<string, typeof records[0]>();
  for (const r of records) dedupMap.set(r.dedup_hash, r);
  const deduped = [...dedupMap.values()];

  console.log(`  Deduped: ${deduped.length} unique agents`);

  // Upsert
  console.log('  Upserting into census_scans...');
  const BATCH = 50;
  let upserted = 0, errors = 0;

  for (let i = 0; i < deduped.length; i += BATCH) {
    const batch = deduped.slice(i, i + BATCH);
    const { error } = await supabase
      .from('census_scans')
      .upsert(
        batch.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
        { onConflict: 'dedup_hash' }
      );

    if (error) {
      console.error(`  ❌ Batch error: ${error.message}`);
      errors += batch.length;
    } else {
      upserted += batch.length;
    }
  }

  // Stats
  const tierCounts = [0, 0, 0, 0];
  let withWallet = 0, withDesc = 0, verified = 0;
  for (const r of deduped) {
    tierCounts[r.kya_tier]++;
    if (r.wallet_address) withWallet++;
    if (r.description) withDesc++;
    if (r.verified) verified++;
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  Virtuals Protocol Results');
  console.log('═══════════════════════════════════════');
  console.log(`  Agents scanned:   ${deduped.length}`);
  console.log(`  Upserted:         ${upserted}`);
  console.log(`  Errors:           ${errors}`);
  console.log(`  With wallet:      ${withWallet}`);
  console.log(`  With description: ${withDesc}`);
  console.log(`  Verified:         ${verified}`);
  console.log(`  KYA T0: ${tierCounts[0]}  T1: ${tierCounts[1]}  T2: ${tierCounts[2]}  T3: ${tierCounts[3]}`);
  console.log('═══════════════════════════════════════');

  process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
