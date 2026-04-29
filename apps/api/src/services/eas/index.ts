/**
 * EAS (Ethereum Attestation Service) — Trade Attestation
 *
 * Writes proof-of-work attestations for completed marketplace trades
 * to Base Sepolia via EAS. Each attestation records:
 *   - buyer + seller agent IDs
 *   - skill + amount
 *   - artifact hash (SHA-256 of the delivered work)
 *   - buyer + seller scores
 *
 * Schema is registered once; attestations reference the schema UID.
 * Anyone can verify on https://base-sepolia.easscan.org
 *
 * EAS on Base Sepolia:
 *   Contract: 0x4200000000000000000000000000000000000021
 *   SchemaRegistry: 0x4200000000000000000000000000000000000020
 */

import { encodePacked, keccak256, encodeAbiParameters, decodeEventLog, type Abi } from 'viem';
import { getWalletClient, getPublicClient, getChainConfig } from '../../config/blockchain.js';

const EAS_CONTRACT = '0x4200000000000000000000000000000000000021' as `0x${string}`;
const SCHEMA_REGISTRY = '0x4200000000000000000000000000000000000020' as `0x${string}`;

// Our trade attestation schema (registered once, then reused)
// Schema: "bytes32 taskHash, bytes32 buyerAgent, bytes32 sellerAgent, string skill, uint256 amount, bytes32 artifactHash, uint8 buyerScore, uint8 sellerScore"
const TRADE_SCHEMA = 'bytes32 taskHash,bytes32 buyerAgent,bytes32 sellerAgent,string skill,uint256 amount,bytes32 artifactHash,uint8 buyerScore,uint8 sellerScore';

// Cached schema UID (set after first registration or lookup)
let schemaUID: `0x${string}` | null = null;

// EAS ABI (minimal — just what we need)
const easAbi = [
  {
    name: 'attest',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      name: 'request',
      type: 'tuple',
      components: [
        { name: 'schema', type: 'bytes32' },
        { name: 'data', type: 'tuple', components: [
          { name: 'recipient', type: 'address' },
          { name: 'expirationTime', type: 'uint64' },
          { name: 'revocable', type: 'bool' },
          { name: 'refUID', type: 'bytes32' },
          { name: 'data', type: 'bytes' },
          { name: 'value', type: 'uint256' },
        ]},
      ],
    }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'Attested',
    type: 'event',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'attester', type: 'address', indexed: true },
      { name: 'uid', type: 'bytes32', indexed: false },
      { name: 'schemaUID', type: 'bytes32', indexed: true },
    ],
  },
] as const satisfies Abi;

const schemaRegistryAbi = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'schema', type: 'string' },
      { name: 'resolver', type: 'address' },
      { name: 'revocable', type: 'bool' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
] as const satisfies Abi;

function isEnabled(): boolean {
  return !!process.env.EVM_PRIVATE_KEY;
}

/** Convert a UUID string to bytes32 by hashing it */
function uuidToBytes32(uuid: string): `0x${string}` {
  return keccak256(encodePacked(['string'], [uuid]));
}

/**
 * Register our trade attestation schema on EAS (idempotent — only registers once).
 * Returns the schema UID.
 */
export async function ensureSchema(): Promise<`0x${string}` | null> {
  if (schemaUID) return schemaUID;
  if (!isEnabled()) return null;

  // Compute the expected schema UID (deterministic from schema + resolver + revocable)
  // For EAS, schema UID = keccak256(abi.encodePacked(schema, resolver, revocable))
  const expectedUID = keccak256(
    encodePacked(
      ['string', 'address', 'bool'],
      [TRADE_SCHEMA, '0x0000000000000000000000000000000000000000', true]
    )
  );

  // Check if already registered by trying to use it
  // (EAS doesn't have a simple "exists" check, so we just cache the UID)
  schemaUID = expectedUID;

  // Try to register (will revert if already exists — that's fine)
  try {
    const walletClient = getWalletClient();
    const txHash = await walletClient.writeContract({
      address: SCHEMA_REGISTRY,
      abi: schemaRegistryAbi,
      functionName: 'register',
      args: [TRADE_SCHEMA, '0x0000000000000000000000000000000000000000' as `0x${string}`, true],
    });
    const publicClient = getPublicClient();
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`[EAS] Schema registered: ${txHash}`);
  } catch (err: any) {
    // Already registered — that's fine
    if (!err.message?.includes('AlreadyExists')) {
      console.log(`[EAS] Schema registration skipped (likely already exists): ${err.message?.slice(0, 80)}`);
    }
  }

  return schemaUID;
}

export interface TradeAttestation {
  taskId: string;
  buyerAgentId: string;
  sellerAgentId: string;
  skill: string;
  amount: number;
  artifactHash: string; // hex string without 0x prefix
  buyerScore: number;
  sellerScore: number;
}

/**
 * Write a trade attestation to EAS on Base Sepolia.
 * Returns the attestation UID and tx hash, or null if disabled.
 */
export async function attestTrade(trade: TradeAttestation): Promise<{
  uid: string;
  txHash: string;
  eascanUrl: string;
} | null> {
  if (!isEnabled()) {
    console.log('[EAS] Attestation disabled (no EVM_PRIVATE_KEY)');
    return null;
  }

  const schema = await ensureSchema();
  if (!schema) return null;

  const config = getChainConfig();
  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  // Encode the attestation data
  const encodedData = encodeAbiParameters(
    [
      { type: 'bytes32', name: 'taskHash' },
      { type: 'bytes32', name: 'buyerAgent' },
      { type: 'bytes32', name: 'sellerAgent' },
      { type: 'string', name: 'skill' },
      { type: 'uint256', name: 'amount' },
      { type: 'bytes32', name: 'artifactHash' },
      { type: 'uint8', name: 'buyerScore' },
      { type: 'uint8', name: 'sellerScore' },
    ],
    [
      uuidToBytes32(trade.taskId),
      uuidToBytes32(trade.buyerAgentId),
      uuidToBytes32(trade.sellerAgentId),
      trade.skill,
      BigInt(Math.round(trade.amount * 1e6)), // USDC has 6 decimals
      `0x${trade.artifactHash.replace('0x', '').padEnd(64, '0')}` as `0x${string}`,
      trade.buyerScore,
      trade.sellerScore,
    ]
  );

  console.log(`[EAS] Attesting trade: ${trade.buyerAgentId.slice(0, 8)} → ${trade.sellerAgentId.slice(0, 8)} (${trade.skill}, $${trade.amount})`);

  const txHash = await walletClient.writeContract({
    address: EAS_CONTRACT,
    abi: easAbi,
    functionName: 'attest',
    args: [{
      schema,
      data: {
        recipient: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        expirationTime: 0n,
        revocable: true,
        refUID: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
        data: encodedData,
        value: 0n,
      },
    }],
  });

  console.log(`[EAS] Tx submitted: ${config.blockExplorerUrl}/tx/${txHash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  // Extract attestation UID from Attested event
  let uid = '';
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: easAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === 'Attested' && decoded.args?.uid) {
        uid = decoded.args.uid as string;
        break;
      }
    } catch {}
  }

  // If we couldn't decode the event, use the tx hash as fallback identifier
  if (!uid) uid = txHash;

  const eascanUrl = `https://base-sepolia.easscan.org/attestation/view/${uid}`;
  console.log(`[EAS] Attestation created: ${eascanUrl}`);

  return { uid, txHash, eascanUrl };
}
