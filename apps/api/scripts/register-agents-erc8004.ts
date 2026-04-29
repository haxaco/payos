/**
 * Backfill script: Register existing agents on-chain via ERC-8004
 *
 * Finds all active agents without an erc8004_agent_id and registers each
 * sequentially on the ERC-8004 Identity Registry (Base Sepolia / Base Mainnet).
 *
 * Usage:
 *   cd apps/api && source .env && npx tsx scripts/register-agents-erc8004.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http } from 'viem';
import { baseSepolia, base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { registerAgent, isRegistrationEnabled } from '../src/services/erc8004/registry.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!isRegistrationEnabled()) {
  console.error('ERC-8004 registration is disabled. Check EVM_PRIVATE_KEY and PAYOS_ENVIRONMENT.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== ERC-8004 Agent Backfill ===\n');

  const { data: agents, error } = await supabase
    .from('agents')
    .select('id, name, description')
    .is('erc8004_agent_id', null)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to query agents:', error.message);
    process.exit(1);
  }

  if (!agents || agents.length === 0) {
    console.log('No agents need registration. All done!');
    return;
  }

  console.log(`Found ${agents.length} agents to register.\n`);

  // Fetch initial nonce to avoid stale-nonce errors on public RPC
  const pk = process.env.EVM_PRIVATE_KEY!;
  const formattedKey = (pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`;
  const account = privateKeyToAccount(formattedKey);
  const isProduction = (process.env.PAYOS_ENVIRONMENT || 'mock') === 'production';
  const chain = isProduction ? base : baseSepolia;
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || (isProduction ? 'https://mainnet.base.org' : 'https://sepolia.base.org');
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

  let nonce = await publicClient.getTransactionCount({ address: account.address });
  console.log(`Starting nonce: ${nonce}\n`);

  let success = 0;
  let failed = 0;

  for (const agent of agents) {
    console.log(`[${success + failed + 1}/${agents.length}] Registering "${agent.name}" (${agent.id})...`);
    try {
      const onChainId = await registerAgent(agent.id, agent.name, agent.description || '', { nonce });
      if (onChainId) {
        success++;
        nonce++;
        console.log(`  -> On-chain ID: ${onChainId}\n`);
      } else {
        failed++;
        console.log(`  -> Failed (no on-chain ID returned)\n`);
      }
    } catch (err: any) {
      failed++;
      console.error(`  -> Error: ${err.message}\n`);
    }
  }

  console.log('=== Summary ===');
  console.log(`  Registered: ${success}`);
  console.log(`  Failed:     ${failed}`);
  console.log(`  Total:      ${agents.length}`);
}

main().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
