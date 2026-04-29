/**
 * Provision a Sly-managed CDP smart wallet to act as the publish-probe
 * wallet. This is the wallet that pays the synthetic first-settle when a
 * tenant clicks "Publish to Agentic.Market" — the call CDP needs to see
 * before it indexes the listing on Bazaar / agentic.market.
 *
 * Usage:
 *   pnpm --filter @sly/api tsx scripts/provision-publish-probe-wallet.ts
 *   pnpm --filter @sly/api tsx scripts/provision-publish-probe-wallet.ts --network=base-sepolia
 *
 * The script:
 *   1. Verifies CDP credentials are present.
 *   2. Lazily loads `@coinbase/cdp-sdk` and creates a smart account.
 *   3. Prints the wallet address + funding instructions.
 *
 * After provisioning, fund the wallet from your master EOA, then set:
 *
 *   SLY_PUBLISH_PROBE_WALLET_ID=<the printed address>
 *   SLY_PUBLISH_PROBE_BUDGET_USDC=10
 *
 * in Railway (production + sandbox environments).
 *
 * Per-publish probe spend = endpoint.basePrice (typically <$0.01 USDC).
 * The wallet does not need a private key on our side — CDP signs on behalf
 * of the smart account when its address appears in `from` on /settle calls.
 */

import 'dotenv/config';
import { getCdpCredentials } from '../src/services/coinbase/cdp-client.js';

interface ProvisionedWallet {
  address: string;
  network: string;
  raw?: unknown;
}

const NETWORK_ARG = process.argv.find((a) => a.startsWith('--network='));
const network = NETWORK_ARG?.split('=')[1] || 'base-mainnet';

async function main() {
  console.log('[provision-publish-probe] starting');
  console.log(`[provision-publish-probe] target network: ${network}`);

  const creds = getCdpCredentials();
  if (!creds) {
    console.error(
      '[provision-publish-probe] FAILED: CDP credentials not set. Need ' +
        '(CDP_API_KEY_ID || CDP_API_KEY_NAME) AND ' +
        '(CDP_API_KEY_SECRET || CDP_PRIVATE_KEY || CDP_API_KEY_PRIVATE_KEY).'
    );
    process.exit(1);
  }
  console.log(
    `[provision-publish-probe] CDP creds resolved (apiKeyId=${creds.apiKeyId.slice(0, 8)}…)`
  );

  let CdpClient: any;
  try {
    const mod: any = await import('@coinbase/cdp-sdk');
    CdpClient = mod?.CdpClient;
  } catch (err: any) {
    console.error(
      `[provision-publish-probe] FAILED: cannot load @coinbase/cdp-sdk: ${err?.message || err}`
    );
    process.exit(1);
  }

  if (!CdpClient) {
    console.error(
      '[provision-publish-probe] FAILED: @coinbase/cdp-sdk did not export CdpClient. ' +
        'SDK shape may have drifted; check package version.'
    );
    process.exit(1);
  }

  const cdp = new CdpClient({
    apiKeyId: creds.apiKeyId,
    apiKeySecret: creds.apiKeySecret,
  });

  // Try the documented smart-account creation method first; fall back to
  // alternatives because the SDK shape varies across minor versions. Same
  // fallback ladder as apps/api/src/services/payout-wallet.ts.
  let provisioned: ProvisionedWallet | null = null;
  try {
    if (cdp?.evm?.createSmartAccount) {
      const out = await cdp.evm.createSmartAccount({});
      if (out?.address) provisioned = { address: out.address, network, raw: out };
    } else if (cdp?.smartAccounts?.create) {
      const out = await cdp.smartAccounts.create({});
      if (out?.address) provisioned = { address: out.address, network, raw: out };
    } else if (cdp?.evm?.createAccount) {
      const out = await cdp.evm.createAccount({});
      if (out?.address) provisioned = { address: out.address, network, raw: out };
    } else {
      console.error(
        '[provision-publish-probe] FAILED: no usable smart-account creation method on CdpClient. ' +
          'Tried evm.createSmartAccount, smartAccounts.create, evm.createAccount.'
      );
      process.exit(1);
    }
  } catch (err: any) {
    console.error(
      `[provision-publish-probe] FAILED: CDP returned an error during creation: ${err?.message || err}`
    );
    process.exit(1);
  }

  if (!provisioned || !/^0x[0-9a-fA-F]{40}$/.test(provisioned.address)) {
    console.error(
      `[provision-publish-probe] FAILED: provisioning returned no usable address (got ${provisioned?.address})`
    );
    process.exit(1);
  }

  console.log('');
  console.log('=== Probe wallet provisioned ===');
  console.log(`  Address: ${provisioned.address}`);
  console.log(`  Network: ${network}`);
  console.log('');
  console.log('Next steps:');
  console.log('');
  console.log(
    '  1. Fund this wallet from your master EOA. CDP smart accounts are gasless ' +
      'when CDP\'s paymaster is available, so on Base you typically only need USDC.'
  );
  console.log(
    `     - Send a small float in USDC (e.g. $10–$25) to ${provisioned.address} on ${network}.`
  );
  console.log(
    '     - Per-publish probe spend = the endpoint\'s basePrice (typically <$0.01 USDC).'
  );
  console.log('');
  console.log(
    '  2. Set the Railway env vars (production + sandbox):'
  );
  console.log(`       SLY_PUBLISH_PROBE_WALLET_ID=${provisioned.address}`);
  console.log('       SLY_PUBLISH_PROBE_BUDGET_USDC=10');
  console.log('');
  console.log(
    '     CLI: railway variables --set SLY_PUBLISH_PROBE_WALLET_ID=' +
      provisioned.address +
      ' --service payos --environment production'
  );
  console.log('');
  console.log(
    '  3. Trigger a test publish from the dashboard. The first-settle from this ' +
      'wallet should produce EXTENSION-RESPONSES: processing, and the listing ' +
      'should appear at https://api.agentic.market/v1/services/search?q={service_slug}.'
  );
}

main().catch((err) => {
  console.error('[provision-publish-probe] unexpected error:', err);
  process.exit(1);
});
