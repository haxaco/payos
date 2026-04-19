#!/usr/bin/env tsx

/**
 * Census Enrichment: On-Chain Data
 *
 * Reads wallet addresses from census_scans, queries Base chain for
 * balances and transaction history, updates records in-place.
 *
 * Usage: cd apps/api && npx tsx scripts/census-enrich-onchain.ts
 *
 * Env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required)
 *   BASE_MAINNET_RPC_URL (optional, defaults to https://mainnet.base.org)
 *   BASESCAN_API_KEY (optional, needed for tx timestamps)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  createPublicClient,
  http,
  formatEther,
  formatUnits,
  type Address,
  type PublicClient,
  erc20Abi,
} from 'viem';
import { base } from 'viem/chains';

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

const RPC_URL = process.env.BASE_MAINNET_RPC_URL || 'https://mainnet.base.org';
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || '';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address;
const MOLTROAD_TOKEN = '0x1B5E07d4d2f753fA2f7f1940A00e2273C19ecB07' as Address;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── On-Chain Fetching ───────────────────────────────────────────────────────

interface OnChainData {
  tx_count: number;
  eth_balance: number;
  usdc_balance: number;
  moltroad_balance: number;
  first_tx_at: string | null;
  last_tx_at: string | null;
}

function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

async function fetchBalancesAndTxCount(
  client: PublicClient,
  wallet: Address,
  moltroadDecimals: number,
  retries = 3
): Promise<Omit<OnChainData, 'first_tx_at' | 'last_tx_at'>> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Use multicall to batch all reads into fewer RPC calls
      const results = await client.multicall({
        contracts: [
          {
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [wallet],
          },
          {
            address: MOLTROAD_TOKEN,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [wallet],
          },
        ],
      });

      // These can't be batched via multicall, do sequentially
      const ethBalance = await client.getBalance({ address: wallet });
      await sleep(200);
      const txCount = await client.getTransactionCount({ address: wallet });

      const usdcBalance = results[0].status === 'success' ? (results[0].result as bigint) : 0n;
      const moltroadBalance = results[1].status === 'success' ? (results[1].result as bigint) : 0n;

      return {
        tx_count: txCount,
        eth_balance: parseFloat(formatEther(ethBalance)),
        usdc_balance: parseFloat(formatUnits(usdcBalance, 6)),
        moltroad_balance: parseFloat(formatUnits(moltroadBalance, moltroadDecimals)),
      };
    } catch (err: any) {
      if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        const backoff = 2000 * Math.pow(2, attempt);
        console.warn(`  ⏳ RPC rate limited, backing off ${(backoff / 1000).toFixed(0)}s...`);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed after ${retries + 1} attempts`);
}

async function fetchTxTimestamps(
  wallet: Address
): Promise<{ first_tx_at: string | null; last_tx_at: string | null }> {
  if (!BASESCAN_API_KEY) {
    return { first_tx_at: null, last_tx_at: null };
  }

  const result: { first_tx_at: string | null; last_tx_at: string | null } = {
    first_tx_at: null,
    last_tx_at: null,
  };

  for (const [key, sort] of [
    ['first_tx_at', 'asc'],
    ['last_tx_at', 'desc'],
  ] as const) {
    try {
      const url = `https://api.basescan.org/api?module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&page=1&offset=1&sort=${sort}&apikey=${BASESCAN_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === '1' && data.result?.length > 0) {
        const ts = parseInt(data.result[0].timeStamp);
        result[key] = new Date(ts * 1000).toISOString();
      }
      await sleep(220); // Basescan rate limit: 5/sec
    } catch {
      // Skip timestamps on error
    }
  }

  return result;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Census Enrichment: On-Chain Data');
  console.log('═══════════════════════════════════════');

  // Init viem client
  const client = createPublicClient({
    chain: base,
    transport: http(RPC_URL),
  });

  console.log(`  RPC: ${RPC_URL}`);
  console.log(`  Basescan API: ${BASESCAN_API_KEY ? 'configured' : 'not set (skipping tx timestamps)'}`);

  // Get MOLTROAD token decimals
  let moltroadDecimals = 18;
  try {
    const dec = await client.readContract({
      address: MOLTROAD_TOKEN,
      abi: erc20Abi,
      functionName: 'decimals',
    });
    moltroadDecimals = dec as number;
    console.log(`  MOLTROAD token decimals: ${moltroadDecimals}`);
  } catch {
    console.warn('  ⚠️  Could not read MOLTROAD decimals, defaulting to 18');
  }

  // Query wallets from census_scans
  const { data: rows, error } = await supabase
    .from('census_scans')
    .select('id, platform, name, wallet_address')
    .not('wallet_address', 'is', null);

  if (error || !rows) {
    console.error('Failed to query census_scans:', error?.message);
    process.exit(1);
  }

  console.log(`\n  Found ${rows.length} records with wallets`);

  // Dedupe wallets and filter invalid addresses
  const walletToRows = new Map<string, typeof rows>();
  let skipped = 0;
  for (const row of rows) {
    const addr = row.wallet_address!.toLowerCase();
    if (!isValidAddress(addr)) {
      skipped++;
      continue;
    }
    if (!walletToRows.has(addr)) walletToRows.set(addr, []);
    walletToRows.get(addr)!.push(row);
  }
  if (skipped > 0) console.log(`  Skipped ${skipped} invalid addresses`);

  console.log(`  ${walletToRows.size} unique wallets to query\n`);

  let enriched = 0;
  let withTx = 0;
  let withUsdc = 0;
  let errors = 0;

  for (const [wallet, agentRows] of walletToRows) {
    try {
      // Fetch balances
      const balances = await fetchBalancesAndTxCount(
        client,
        wallet as Address,
        moltroadDecimals
      );

      // Fetch tx timestamps (rate limited)
      const timestamps = await fetchTxTimestamps(wallet as Address);

      const onchainData = { ...balances, ...timestamps };

      if (onchainData.tx_count > 0) withTx++;
      if (onchainData.usdc_balance > 0) withUsdc++;

      // Update all census_scans rows that share this wallet
      for (const row of agentRows) {
        const { error: updateErr } = await supabase
          .from('census_scans')
          .update({
            tx_count: onchainData.tx_count,
            eth_balance: onchainData.eth_balance,
            usdc_balance: onchainData.usdc_balance,
            moltroad_balance: onchainData.moltroad_balance,
            first_tx_at: onchainData.first_tx_at,
            last_tx_at: onchainData.last_tx_at,
            enriched_at: new Date().toISOString(),
          })
          .eq('id', row.id);

        if (updateErr) {
          console.error(`  ❌ Update failed for ${row.name}: ${updateErr.message}`);
          errors++;
        }
      }

      enriched++;
      if (enriched % 20 === 0) {
        console.log(`  Enriched ${enriched}/${walletToRows.size} wallets...`);
      }

      // Respect public RPC rate limits
      await sleep(500);
    } catch (err: any) {
      console.warn(`  ⚠️  Wallet ${wallet.slice(0, 10)}... failed: ${err.message}`);
      errors++;
    }
  }

  // Print summary
  console.log('\n═══════════════════════════════════════');
  console.log('  On-Chain Enrichment Results');
  console.log('═══════════════════════════════════════');
  console.log(`  Wallets queried:   ${walletToRows.size}`);
  console.log(`  Successfully:      ${enriched}`);
  console.log(`  Errors:            ${errors}`);
  console.log(`  With transactions: ${withTx} (${((withTx / walletToRows.size) * 100).toFixed(1)}%)`);
  console.log(`  With USDC balance: ${withUsdc} (${((withUsdc / walletToRows.size) * 100).toFixed(1)}%)`);
  console.log('═══════════════════════════════════════');

  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
