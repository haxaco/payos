#!/usr/bin/env tsx

/**
 * Census Export — Dumps all census_scans data to JSON for the explorer.
 * Usage: cd apps/api && npx tsx scripts/census-export.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('Exporting census data...');

  // Fetch all agents in batches (Supabase has a 1000 row default limit)
  const allAgents: any[] = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const { data, error } = await supabase
      .from('census_scans')
      .select('*')
      .order('kya_tier', { ascending: false })
      .order('data_completeness', { ascending: false })
      .order('tx_count', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Query error:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allAgents.push(...data);
    console.log(`  Fetched ${allAgents.length} agents...`);
    if (data.length < limit) break;
    offset += limit;
  }

  console.log(`Total: ${allAgents.length} agents`);

  // Write as JS file that can be loaded by the explorer
  const output = `// Census data export — ${new Date().toISOString()}
// ${allAgents.length} agents across ${[...new Set(allAgents.map(a => a.platform))].join(', ')}
const CENSUS_DATA = ${JSON.stringify(allAgents, null, 2)};
`;

  const outPath = new URL('.', import.meta.url).pathname + '/census-data.js';
  writeFileSync(outPath, output);
  console.log(`Written to ${outPath} (${(output.length / 1024 / 1024).toFixed(1)} MB)`);

  // Also write a compact version
  const compact = allAgents.map(a => ({
    n: a.name,
    p: a.platform,
    t: a.kya_tier,
    dc: parseFloat(a.data_completeness),
    v: a.verified || false,
    tw: a.twitter_handle || '',
    w: a.wallet_address || '',
    d: a.description || '',
    av: a.avatar_url || '',
    tx: a.tx_count || 0,
    u: parseFloat(a.usdc_balance || '0'),
    tb: parseFloat(a.token_balance || '0'),
    k: a.karma || 0,
    l: a.listing_count || 0,
    sp: a.skills_published || 0,
    r: parseFloat(a.rating || '0'),
    rc: a.rating_count || 0,
    st: a.service_tags || [],
    ts: a.trust_score || 0,
    bb: parseFloat(a.bond_balance || '0'),
    eb: parseFloat(a.eth_balance || '0'),
    mb: parseFloat(a.moltroad_balance || '0'),
    fl: a.followers || 0,
    cl: a.claimed,
    ea: a.earnings || 0,
    rp: a.raw_profile || {},
  }));

  const compactOutput = `const CENSUS = ${JSON.stringify(compact)};`;
  const compactPath = new URL('.', import.meta.url).pathname + '/census-compact.js';
  writeFileSync(compactPath, compactOutput);
  console.log(`Compact: ${compactPath} (${(compactOutput.length / 1024).toFixed(0)} KB)`);

  // Stats
  const platforms = new Map<string, number>();
  for (const a of allAgents) {
    platforms.set(a.platform, (platforms.get(a.platform) || 0) + 1);
  }
  console.log('\nPlatform breakdown:');
  for (const [p, c] of platforms) console.log(`  ${p}: ${c}`);
  console.log(`T1+: ${allAgents.filter(a => a.kya_tier >= 1).length}`);
  console.log(`With wallet: ${allAgents.filter(a => a.wallet_address).length}`);
  console.log(`With raw_profile: ${allAgents.filter(a => a.raw_profile && Object.keys(a.raw_profile).length > 0).length}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
