/**
 * Sly Smart Account Service (x402 Step 3 — Phase 1)
 *
 * Each agent can optionally upgrade from a raw secp256k1 EOA to a Coinbase
 * Smart Wallet. The smart wallet is:
 *
 *  - Owned by the agent's existing EOA key (stored encrypted in credential-vault)
 *  - Deployed via Coinbase's PUBLIC factory — no CDP API key needed
 *  - CREATE2-deterministic — the address is known before deployment
 *  - ERC-4337 compatible — gas abstraction + paymaster support ready
 *  - ERC-1271 compatible — can sign arbitrary messages, verified on-chain
 *
 * The factory address is the same on Base mainnet and Base Sepolia:
 *   0x0BA5ED0c6AA8c49038F819E587E2633c4A9F428a
 *
 * This is Phase 1 — foundation. Paymaster and bundler integration (for
 * gas-in-USDC and UserOperation submission) will come in a follow-up once
 * we have a funded Sly paymaster account.
 */
import { createPublicClient, http, encodeFunctionData, parseAbi, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { toCoinbaseSmartAccount, createBundlerClient } from 'viem/account-abstraction';
import { baseSepolia, base } from 'viem/chains';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deserializeAndDecrypt } from '../credential-vault/index.js';

// Bundler configuration with fallback support.
// Primary: Pimlico public endpoints (no API key for testnet).
// Fallback: configurable via env vars for production resilience.
// If the primary bundler fails (timeout, 5xx, network error), the fallback is tried.
const PIMLICO_URLS: Record<number, string> = {
  84532: 'https://public.pimlico.io/v2/84532/rpc',
  8453: 'https://public.pimlico.io/v2/8453/rpc',
};

function getBundlerUrls(chainId: number): string[] {
  const urls: string[] = [];

  // Primary: env override or Pimlico default
  const envPrimary = process.env[`BUNDLER_URL_${chainId}`] || process.env.BUNDLER_URL;
  if (envPrimary) {
    urls.push(envPrimary);
  } else if (PIMLICO_URLS[chainId]) {
    urls.push(PIMLICO_URLS[chainId]);
  }

  // Fallback: env override (separate from primary)
  const envFallback = process.env[`BUNDLER_URL_FALLBACK_${chainId}`] || process.env.BUNDLER_URL_FALLBACK;
  if (envFallback) {
    urls.push(envFallback);
  }

  // If primary is Pimlico and no explicit fallback, add Pimlico as self-retry
  // (many Pimlico failures are transient — a retry often succeeds)
  if (urls.length === 1 && PIMLICO_URLS[chainId]) {
    urls.push(PIMLICO_URLS[chainId]);
  }

  return urls;
}

// USDC contract addresses per chain (same as x402/signer.ts)
const USDC_ADDRESSES: Record<number, Address> = {
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

export type SmartAccountInfo = {
  address: Address;
  ownerAddress: Address;
  chainId: number;
  deployed: boolean;
  factoryAddress: Address;
};

const CHAIN_MAP = {
  84532: baseSepolia,
  8453: base,
} as const;

/**
 * Compute the deterministic smart account address for a given owner EOA.
 * Does NOT deploy the contract — returns the CREATE2 counterfactual address.
 * The smart account only needs to be deployed on first on-chain interaction.
 */
export async function deriveSmartAccountAddress(
  ownerPrivateKey: Hex,
  chainId: number = 84532,
): Promise<SmartAccountInfo> {
  const chain = CHAIN_MAP[chainId as keyof typeof CHAIN_MAP];
  if (!chain) {
    throw new Error(`Unsupported chain for smart account: ${chainId}`);
  }

  const ownerAccount = privateKeyToAccount(ownerPrivateKey);
  const client = createPublicClient({ chain, transport: http() });

  const smartAccount = await toCoinbaseSmartAccount({
    client,
    owners: [ownerAccount],
  });

  // Coinbase Smart Wallet factory (same address on mainnet + testnet)
  const factoryAddress = '0x0BA5ED0c6AA8c49038F819E587E2633c4A9F428a' as Address;

  // Check if the smart account has already been deployed (has bytecode)
  const bytecode = await client.getCode({ address: smartAccount.address });
  const deployed = bytecode !== undefined && bytecode !== '0x';

  return {
    address: smartAccount.address,
    ownerAddress: ownerAccount.address,
    chainId,
    deployed,
    factoryAddress,
  };
}

/**
 * Fetch the agent's EVM key and derive its smart account address.
 * Convenience wrapper used by the agents router.
 */
export async function getAgentSmartAccount(
  supabase: SupabaseClient,
  agentId: string,
  chainId: number = 84532,
): Promise<SmartAccountInfo | null> {
  const { data } = await (supabase.from('agent_signing_keys') as any)
    .select('private_key_encrypted, ethereum_address')
    .eq('agent_id', agentId)
    .eq('algorithm', 'secp256k1')
    .eq('status', 'active')
    .maybeSingle();

  if (!data) return null;

  const decrypted = deserializeAndDecrypt(data.private_key_encrypted);
  const privateKey = decrypted.privateKey as Hex;
  if (!privateKey || !privateKey.startsWith('0x')) {
    throw new Error('Invalid private key in vault');
  }

  return await deriveSmartAccountAddress(privateKey, chainId);
}

/**
 * Sign a personal-sign-style message via the smart account.
 * The returned signature is a WRAPPED signature (owner-sig + replay-protection
 * data) that the smart account's isValidSignature() function accepts per ERC-1271.
 *
 * For on-chain verification, a verifier calls:
 *   ISmartAccount(smartAccountAddress).isValidSignature(hash, signature)
 * which returns 0x1626ba7e if valid.
 *
 * NOTE: This signature is NOT a raw EOA signature — standard
 * recoverMessageAddress() will NOT return the smart account address.
 * Verification must go through the contract's isValidSignature() call.
 */
export async function signMessageViaSmartAccount(
  ownerPrivateKey: Hex,
  message: string,
  chainId: number = 84532,
): Promise<{ signature: Hex; smartAccountAddress: Address; ownerAddress: Address }> {
  const chain = CHAIN_MAP[chainId as keyof typeof CHAIN_MAP];
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);

  const ownerAccount = privateKeyToAccount(ownerPrivateKey);
  const client = createPublicClient({ chain, transport: http() });

  const smartAccount = await toCoinbaseSmartAccount({
    client,
    owners: [ownerAccount],
  });

  const signature = await smartAccount.signMessage({ message });

  return {
    signature,
    smartAccountAddress: smartAccount.address,
    ownerAddress: ownerAccount.address,
  };
}

/**
 * Sign EIP-712 typed data via the smart account. Produces an ERC-1271
 * compatible signature. Used for x402 payment authorizations when the payer
 * is a smart account rather than an EOA.
 */
export async function signTypedDataViaSmartAccount(
  ownerPrivateKey: Hex,
  typedData: Parameters<Awaited<ReturnType<typeof toCoinbaseSmartAccount>>['signTypedData']>[0],
  chainId: number = 84532,
): Promise<{ signature: Hex; smartAccountAddress: Address; ownerAddress: Address }> {
  const chain = CHAIN_MAP[chainId as keyof typeof CHAIN_MAP];
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);

  const ownerAccount = privateKeyToAccount(ownerPrivateKey);
  const client = createPublicClient({ chain, transport: http() });

  const smartAccount = await toCoinbaseSmartAccount({
    client,
    owners: [ownerAccount],
  });

  const signature = await smartAccount.signTypedData(typedData);

  return {
    signature,
    smartAccountAddress: smartAccount.address,
    ownerAddress: ownerAccount.address,
  };
}

// ---------------------------------------------------------------------------
// x402 Step 3 Phase 2: UserOperation execution via bundler
// ---------------------------------------------------------------------------

export type SendUserOpResult = {
  userOpHash: Hex;
  txHash?: Hex;
  smartAccountAddress: Address;
  status: 'pending' | 'included' | 'failed';
  blockNumber?: bigint;
};

/**
 * Send a USDC transfer from an agent's smart wallet via an ERC-4337 UserOperation.
 * The bundler (Pimlico public endpoint) handles wrapping, paymaster resolution,
 * and on-chain submission. The smart wallet is deployed atomically with the
 * first UserOp if not already deployed.
 *
 * For Phase 2, gas is paid by the smart wallet itself from its ETH balance.
 * True gas-in-USDC via paymaster comes in a follow-up once we have a funded
 * Pimlico API key. This endpoint still demonstrates the core architectural
 * unlock: agents never manage keys, never sign transactions directly, never
 * touch the bundler — they just call a Sly endpoint and Sly handles the ERC-4337
 * plumbing.
 */
export async function sendUsdcViaSmartAccount(params: {
  ownerPrivateKey: Hex;
  to: Address;
  valueUnits: bigint; // USDC units (6 decimals, so 100000 = 0.1 USDC)
  chainId?: number;
}): Promise<SendUserOpResult> {
  const chainId = params.chainId || 84532;
  const chain = CHAIN_MAP[chainId as keyof typeof CHAIN_MAP];
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);

  const bundlerUrls = getBundlerUrls(chainId);
  if (bundlerUrls.length === 0) throw new Error(`No bundler configured for chain ${chainId}`);

  const usdcAddress = USDC_ADDRESSES[chainId];
  if (!usdcAddress) throw new Error(`No USDC contract for chain ${chainId}`);

  const ownerAccount = privateKeyToAccount(params.ownerPrivateKey);
  const publicClient = createPublicClient({ chain, transport: http() });

  const smartAccount = await toCoinbaseSmartAccount({
    client: publicClient,
    owners: [ownerAccount],
  });

  // Encode the USDC.transfer(to, value) calldata
  const erc20Abi = parseAbi(['function transfer(address to, uint256 value)']);
  const transferCalldata = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'transfer',
    args: [params.to, params.valueUnits],
  });

  // Try each bundler URL in order (primary, then fallback).
  // Most failures are transient (Pimlico rate limit, network blip) — a retry
  // often succeeds even against the same endpoint.
  let lastError: Error | null = null;
  for (let i = 0; i < bundlerUrls.length; i++) {
    const bundlerUrl = bundlerUrls[i];
    const isRetry = i > 0;
    if (isRetry) {
      console.log(`[smart-account] Bundler attempt ${i + 1}/${bundlerUrls.length}: ${bundlerUrl}`);
    }

    try {
      const bundlerClient = createBundlerClient({
        account: smartAccount,
        client: publicClient,
        transport: http(bundlerUrl),
      });

      const userOpHash = await bundlerClient.sendUserOperation({
        account: smartAccount,
        calls: [{ to: usdcAddress, data: transferCalldata, value: 0n }],
      });

      // Wait for inclusion
      try {
        const receipt = await bundlerClient.waitForUserOperationReceipt({
          hash: userOpHash,
          timeout: 60_000,
        });
        return {
          userOpHash,
          txHash: receipt.receipt.transactionHash,
          smartAccountAddress: smartAccount.address,
          status: receipt.success ? 'included' as const : 'failed' as const,
          blockNumber: receipt.receipt.blockNumber,
        };
      } catch {
        // Timeout waiting for receipt — return hash for caller to poll
        return {
          userOpHash,
          smartAccountAddress: smartAccount.address,
          status: 'pending' as const,
        };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[smart-account] Bundler ${bundlerUrl} failed: ${err.message?.slice(0, 200)}`);
      // Continue to next bundler URL
    }
  }

  // All bundlers failed
  throw lastError || new Error('All bundler endpoints failed');
}

/**
 * Sync a smart wallet's on-chain USDC balance back to the wallets table.
 * Called after each UserOp and periodically by the balance sync worker.
 */
export async function syncSmartWalletBalance(
  supabase: SupabaseClient,
  walletAddress: Address,
  chainId: number = 84532,
): Promise<{ balance: number; synced: boolean }> {
  try {
    const balance = await getSmartAccountUsdcBalance(walletAddress, chainId);
    const balanceNum = Number(balance) / 1e6; // USDC has 6 decimals

    const { error } = await supabase
      .from('wallets')
      .update({
        balance: balanceNum,
        last_synced_at: new Date().toISOString(),
        sync_enabled: true,
      })
      .eq('wallet_address', walletAddress)
      .eq('wallet_type', 'smart_wallet');

    return { balance: balanceNum, synced: !error };
  } catch {
    return { balance: 0, synced: false };
  }
}

/**
 * Sync ALL smart wallet balances in the wallets table.
 * Called by the periodic balance sync worker.
 */
export async function syncAllSmartWalletBalances(
  supabase: SupabaseClient,
  chainId: number = 84532,
): Promise<{ synced: number; failed: number }> {
  const { data: wallets } = await supabase
    .from('wallets')
    .select('id, wallet_address')
    .eq('wallet_type', 'smart_wallet')
    .eq('status', 'active');

  let synced = 0, failed = 0;
  for (const w of wallets || []) {
    if (!w.wallet_address) { failed++; continue; }
    const result = await syncSmartWalletBalance(supabase, w.wallet_address as Address, chainId);
    if (result.synced) synced++; else failed++;
  }
  return { synced, failed };
}

/**
 * Read the USDC balance of a smart account (wraps a standard ERC-20 balanceOf
 * call — the smart account doesn't need to be deployed for this to work).
 */
export async function getSmartAccountUsdcBalance(
  address: Address,
  chainId: number = 84532,
): Promise<bigint> {
  const chain = CHAIN_MAP[chainId as keyof typeof CHAIN_MAP];
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`);

  const usdcAddress = USDC_ADDRESSES[chainId];
  if (!usdcAddress) throw new Error(`No USDC contract for chain ${chainId}`);

  const publicClient = createPublicClient({ chain, transport: http() });
  const balance = await publicClient.readContract({
    address: usdcAddress,
    abi: parseAbi(['function balanceOf(address account) view returns (uint256)']),
    functionName: 'balanceOf',
    args: [address],
  });

  return balance as bigint;
}
