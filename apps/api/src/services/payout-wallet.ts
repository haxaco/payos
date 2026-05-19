/**
 * Tenant payout-wallet service.
 *
 * Resolves the on-chain payTo address Sly needs to put on a published
 * x402 endpoint's 402 challenge. Auto-provisions a CDP smart wallet when
 * the tenant has none bound yet.
 *
 * RLS: every query filters by tenant_id. The Supabase client uses the
 * service role (bypasses RLS) so explicit filtering is mandatory — see
 * CLAUDE.md "Never skip tenant filtering".
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApiError, ValidationError, WalletRequiredError } from '../middleware/error.js';
import { getCdpCredentials } from './coinbase/cdp-client.js';

/**
 * Payout-wallet provisioning failed for an attributable, non-bug reason —
 * CDP credentials absent in this environment, the CDP SDK not installed, the
 * provider's interface drifted, or the provider returned no usable address.
 *
 * This is deliberately NOT a raw Error/TypeError: the publish-x402 flow
 * catches anything thrown here and surfaces `err.message` as
 * `payout_wallet_unavailable: <message>`, so the message must name the cause.
 * 422 (not 500) because it is an environment/config gap, not a server bug.
 */
class PayoutWalletProvisioningError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(`Payout wallet provisioning unavailable: ${message}`, 422, details, {
      code: 'PAYOUT_WALLET_PROVISIONING_UNAVAILABLE',
      suggestion:
        'Bind an on-chain payout wallet manually (POST /v1/x402/wallets) or configure CDP credentials for this environment before enabling auto-provisioning.',
      docsUrl: 'https://docs.payos.ai/x402/publish',
    });
    this.name = 'PayoutWalletProvisioningError';
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Network mapping
// ────────────────────────────────────────────────────────────────────────────

/**
 * Map the Sly-internal network slug to a CAIP-2 identifier. The DB stores
 * either form (the migration's CHECK constraint accepts both); the CDP
 * Facilitator and Bazaar always want CAIP-2.
 *
 * Unknown slugs pass through unchanged so this never blocks a tenant
 * from binding a custom L2 — the CHECK on tenant_payout_wallets.network
 * still gates the format.
 */
export function mapSlyNetworkToCAIP2(network: string): string {
  if (!network) return network;
  if (network.startsWith('eip155:')) return network;

  switch (network) {
    case 'base-mainnet':
      return 'eip155:8453';
    case 'base-sepolia':
      return 'eip155:84532';
    case 'ethereum-mainnet':
      return 'eip155:1';
    case 'optimism-mainnet':
      return 'eip155:10';
    case 'arbitrum-mainnet':
      return 'eip155:42161';
    default:
      return network;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Address validation (lightweight)
// ────────────────────────────────────────────────────────────────────────────

/**
 * EVM address shape check. We deliberately don't enforce EIP-55 checksum
 * here — many existing tenants store lowercase addresses, and re-checksumming
 * happens at signing time via viem.
 */
export function isEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

export interface PayoutWalletRow {
  id: string;
  tenantId: string;
  accountId: string;
  network: string;
  address: string;
  provisionedBy: 'user' | 'auto';
  provider: 'cdp' | 'privy' | 'external';
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

function rowToWallet(row: any): PayoutWalletRow {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    accountId: row.account_id,
    network: row.network,
    address: row.address,
    provisionedBy: row.provisioned_by,
    provider: row.provider,
    metadata: row.metadata ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface GetOrProvisionOpts {
  /**
   * If true and no wallet is bound, mint a CDP smart wallet and persist it
   * with provisioned_by='auto', provider='cdp'. Defaults to false so callers
   * have to opt in — uncontrolled provisioning would silently spend CDP
   * quota.
   */
  autoProvision?: boolean;
}

/**
 * Look up the wallet bound to (tenant, account, network). Returns null when
 * none exists and autoProvision is false. When autoProvision is true and
 * none exists, calls CDP Wallet API to mint one.
 */
export async function getOrProvision(
  supabase: SupabaseClient,
  tenantId: string,
  accountId: string,
  network: string,
  opts: GetOrProvisionOpts = {}
): Promise<PayoutWalletRow> {
  const caip2 = mapSlyNetworkToCAIP2(network);

  // Look up against both the CAIP-2 form and the original slug — the
  // table accepts either, so we match either way.
  const { data: rows, error } = await supabase
    .from('tenant_payout_wallets')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .in('network', Array.from(new Set([caip2, network])))
    .limit(1);

  if (error) {
    throw new ApiError(
      `Failed to query tenant_payout_wallets: ${error.message}`,
      500,
      { tenantId, accountId, network },
      { code: 'PAYOUT_WALLET_QUERY_FAILED' }
    );
  }

  if (rows && rows.length > 0) {
    return rowToWallet(rows[0]);
  }

  if (!opts.autoProvision) {
    throw new WalletRequiredError(network, accountId);
  }

  // Auto-provision via CDP Wallet API. The CDP SDK is a transitive dep of
  // @coinbase/x402; we lazy-import to keep the service runnable in tests
  // without CDP creds set.
  const address = await provisionCdpSmartWallet(caip2);

  // provisionCdpSmartWallet already guards its return, but assert the contract
  // here too: this is the value that becomes the on-chain payTo, and a bad
  // address must surface as a typed/attributable error rather than poisoning
  // the row or throwing a raw TypeError further downstream.
  if (!address || !isEvmAddress(address)) {
    throw new PayoutWalletProvisioningError(
      `CDP provisioning returned no usable EVM address for network ${caip2}`,
      { network: caip2 }
    );
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('tenant_payout_wallets')
    .insert({
      tenant_id: tenantId,
      account_id: accountId,
      network: caip2,
      address,
      provisioned_by: 'auto',
      provider: 'cdp',
      metadata: { provisioned_at: new Date().toISOString() },
    })
    .select()
    .single();

  if (insertErr || !inserted) {
    throw new ApiError(
      `Failed to persist auto-provisioned wallet: ${insertErr?.message || 'no row returned'}`,
      500,
      { tenantId, accountId, network: caip2 },
      { code: 'PAYOUT_WALLET_PERSIST_FAILED' }
    );
  }
  return rowToWallet(inserted);
}

/**
 * Bind an existing on-chain address as the payTo for (tenant, account, network).
 * Validates EVM address shape; throws if a row already exists for the tuple
 * (the unique index would also catch this, but a typed error is friendlier).
 */
export async function bind(
  supabase: SupabaseClient,
  tenantId: string,
  accountId: string,
  network: string,
  address: string,
  provider: 'cdp' | 'privy' | 'external' = 'external'
): Promise<PayoutWalletRow> {
  if (!isEvmAddress(address)) {
    throw new ValidationError(`Invalid EVM address: ${address}`, { address });
  }
  const caip2 = mapSlyNetworkToCAIP2(network);

  const { data: existing } = await supabase
    .from('tenant_payout_wallets')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('account_id', accountId)
    .eq('network', caip2)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new ApiError(
      `Payout wallet already bound for account ${accountId} on ${caip2} — call update instead`,
      409,
      { accountId, network: caip2 },
      {
        code: 'PAYOUT_WALLET_ALREADY_BOUND',
        suggestion: 'Use the update endpoint to change the bound payout wallet instead of binding a new one.',
      }
    );
  }

  const { data, error } = await supabase
    .from('tenant_payout_wallets')
    .insert({
      tenant_id: tenantId,
      account_id: accountId,
      network: caip2,
      address,
      provisioned_by: 'user',
      provider,
      metadata: { bound_at: new Date().toISOString() },
    })
    .select()
    .single();

  if (error || !data) {
    throw new ApiError(
      `Failed to bind payout wallet: ${error?.message || 'no row returned'}`,
      500,
      { tenantId, accountId, network: caip2 },
      { code: 'PAYOUT_WALLET_BIND_FAILED' }
    );
  }
  return rowToWallet(data);
}

// ────────────────────────────────────────────────────────────────────────────
// CDP wallet provisioning (best-effort lazy import)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Mint a CDP smart wallet and return its address. Called only when the
 * tenant has opted into auto-provisioning. CDP credentials (under any
 * supported env-var name pair) must be present — see getCdpCredentials().
 *
 * Implementation is best-effort behind a lazy require of `@coinbase/cdp-sdk`
 * so the service keeps building/testing in environments without CDP set up.
 */
async function provisionCdpSmartWallet(caip2Network: string): Promise<string> {
  const creds = getCdpCredentials();
  if (!creds) {
    throw new PayoutWalletProvisioningError(
      `CDP credentials not configured for network ${caip2Network} ` +
        '(set CDP_API_KEY_ID/CDP_API_KEY_NAME and CDP_API_KEY_SECRET/CDP_API_KEY_PRIVATE_KEY)',
      { network: caip2Network, reason: 'cdp_credentials_missing' }
    );
  }
  if (!creds.walletSecret) {
    throw new PayoutWalletProvisioningError(
      'CDP_WALLET_SECRET not set — required by @coinbase/cdp-sdk 1.40+ for wallet ' +
        'create/sign operations. Obtain it from portal.cdp.coinbase.com (Wallet Secret tab on the API key).',
      { network: caip2Network, reason: 'cdp_wallet_secret_missing' }
    );
  }
  const { apiKeyId, apiKeySecret, walletSecret } = creds;

  let CdpClient: any;
  try {
    // Dynamic import via expression so TypeScript doesn't statically resolve
    // the module — the SDK is only present transitively via @coinbase/x402,
    // and we want builds to succeed in environments where it isn't.
    const mod: any = await (Function('return import("@coinbase/cdp-sdk")')() as Promise<any>);
    CdpClient = mod?.CdpClient;
  } catch (err) {
    throw new PayoutWalletProvisioningError(
      `@coinbase/cdp-sdk is not installed — install it or bind a wallet manually (${(err as Error).message})`,
      { network: caip2Network, reason: 'cdp_sdk_missing' }
    );
  }

  if (!CdpClient) {
    throw new PayoutWalletProvisioningError(
      '@coinbase/cdp-sdk did not export CdpClient — wallet provisioning unsupported on this SDK version',
      { network: caip2Network, reason: 'cdp_sdk_interface_drift' }
    );
  }

  // The CDP SDK's exact method name varies across minor versions; we try
  // the documented one first and fall back to alternatives without
  // exploding on an interface drift. Wrap construction + the provider call
  // so a raw provider exception (including the historical
  // `TypeError: Cannot read properties of undefined (reading 'address')`)
  // becomes a typed, attributable error rather than an opaque 500.
  let addr: string | undefined;
  try {
    const cdp = new CdpClient({ apiKeyId, apiKeySecret, walletSecret });
    if (cdp?.evm?.createSmartAccount) {
      const out = await cdp.evm.createSmartAccount({});
      addr = out?.address;
    } else if (cdp?.smartAccounts?.create) {
      const out = await cdp.smartAccounts.create({});
      addr = out?.address;
    } else if (cdp?.evm?.createAccount) {
      const out = await cdp.evm.createAccount({});
      addr = out?.address;
    } else {
      throw new PayoutWalletProvisioningError(
        'installed @coinbase/cdp-sdk exposes no known smart-account create method ' +
          '(evm.createSmartAccount / smartAccounts.create / evm.createAccount)',
        { network: caip2Network, reason: 'cdp_sdk_interface_drift' }
      );
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new PayoutWalletProvisioningError(
      `CDP provider call failed for network ${caip2Network}: ${(err as Error).message}`,
      { network: caip2Network, reason: 'cdp_provider_error' }
    );
  }

  if (!addr || !isEvmAddress(addr)) {
    throw new PayoutWalletProvisioningError(
      `CDP wallet provisioning returned no usable address for network ${caip2Network}`,
      { network: caip2Network, reason: 'cdp_no_address' }
    );
  }
  return addr;
}
