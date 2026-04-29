# Epic 77: BYO Wallet Custody for Agent Signing

## Summary

Let tenants bring their own wallets for agent x402 signing instead of relying on Sly-custodied keys. Support three custody modes alongside the existing Sly-custodied one: **session-key delegation** (smart-wallet owners), **managed-provider** (Privy, Turnkey, Fireblocks), and **interactive WalletConnect** for low-volume human-in-the-loop flows.

## Motivation

Today Sly always generates a fresh secp256k1 EOA and stores the encrypted private key in `agent_signing_keys`. That's fine for demos and autonomous bots funded by the tenant, but blocks three real customer segments:

1. **Crypto-native agents** who already hold USDC in a MetaMask / Coinbase Wallet / Safe and don't want to transfer funds into a Sly-custodied address just to pay per-call.
2. **Enterprises** with corporate custody at Privy / Turnkey / Fireblocks — security/compliance teams won't approve Sly holding private keys for treasury operations.
3. **Multi-sig / hardware-wallet users** who need to sign from a Ledger or Safe. Currently impossible.

Without BYO, Sly's x402 offering is limited to the "Sly is your custodian" model, which competes directly with CDP Smart Wallets and self-custody — neither a winning fight for us.

## Custody modes to support

| Mode | Who holds the key | Signs via | Agent autonomy | v1 priority |
|------|------------------|-----------|----------------|-------------|
| `sly` | Sly credential-vault | Local AES-GCM decrypt + viem | Full | ✅ Shipped |
| `byo_session_key` | Customer smart wallet; Sly holds scoped session key | Local sign as session-key owner | Full (within scope) | **P0** |
| `byo_managed` | Third-party provider (Privy / Turnkey / Fireblocks / CDP) | Provider SDK / API | Full | **P1** |
| `byo_interactive` | Customer EOA (MetaMask, hardware) | WalletConnect popup | Human-in-loop only | P2 |

## Prerequisites

None — all three modes build on the existing `/v1/agents/:id/x402-sign` route. No new routes needed.

## Code changes

### 1. Schema — `agent_signing_keys` custody column

Migration: `apps/api/supabase/migrations/YYYYMMDD_byo_wallet_custody.sql`

```sql
ALTER TABLE agent_signing_keys
  ADD COLUMN custody TEXT NOT NULL DEFAULT 'sly'
    CHECK (custody IN ('sly', 'byo_session_key', 'byo_managed', 'byo_interactive')),
  ADD COLUMN custody_provider TEXT,       -- 'privy' | 'turnkey' | 'fireblocks' | 'cdp' | null
  ADD COLUMN external_wallet_id TEXT,     -- provider-specific id (Privy wallet id, etc)
  ADD COLUMN delegation_grant JSONB,      -- session-key scope: spend cap, deadline, token list
  ADD COLUMN owner_address TEXT;          -- smart-wallet address when custody='byo_session_key'

-- Enforce: non-'sly' custody must NOT have encrypted key stored
ALTER TABLE agent_signing_keys ADD CONSTRAINT byo_no_local_key
  CHECK (
    (custody = 'sly' AND private_key_encrypted IS NOT NULL) OR
    (custody != 'sly' AND private_key_encrypted IS NULL)
  );
```

### 2. Signer service — dispatch on custody

`apps/api/src/services/x402/signer.ts`: `signTransferWithAuthorization` becomes a thin router:

```ts
export async function signTransferWithAuthorization(keyRecord, params) {
  switch (keyRecord.custody) {
    case 'sly':               return signLocal(keyRecord, params);          // current path
    case 'byo_session_key':   return signWithSessionKey(keyRecord, params); // new
    case 'byo_managed':       return signViaProvider(keyRecord, params);    // new
    case 'byo_interactive':   throw new SignatureRequiredExternallyError(); // returns a challenge
    default: throw new Error(`Unknown custody: ${keyRecord.custody}`);
  }
}
```

New files:
- `apps/api/src/services/x402/signers/session-key.ts` — decrypts the session-key (still Sly-held, but scoped), signs, validates spend against `delegation_grant`.
- `apps/api/src/services/x402/signers/providers/privy.ts`, `turnkey.ts`, `fireblocks.ts`, `cdp.ts` — each wraps the provider's sign-typed-data API.
- `apps/api/src/services/x402/signers/wallet-connect.ts` — for interactive mode, returns a signed payload via WalletConnect relay (requires client round-trip).

### 3. Provisioning routes — new flavors

Keep existing `POST /v1/agents/:id/evm-keys` (→ custody='sly').

Add:
- `POST /v1/agents/:id/evm-keys/byo-session-key` — body: `{ ownerAddress, sessionKeySignedGrant, delegationScope }`. Validates the signed grant against the owner smart wallet on-chain, stores the session-key privately, sets `custody='byo_session_key'`.
- `POST /v1/agents/:id/evm-keys/byo-managed` — body: `{ provider, walletId, providerCredentialRef }`. Stores the provider pointer, sets `custody='byo_managed'`.
- `POST /v1/agents/:id/evm-keys/byo-interactive` — body: `{ walletAddress }`. No key material stored. Any later sign requires the caller to deliver a signed payload via WalletConnect — server validates + persists the signed auth.

### 4. Dashboard — "Link external wallet" flow

`apps/web/src/components/agents/wallet-tab.tsx`:
- New "Link external wallet" CTA on the `X402EoaCard`.
- Opens a modal with three options: Session key (Coinbase CDP / Privy smart account flow), Managed provider (provider picker → OAuth/API-key entry), WalletConnect (interactive).
- Card now renders a custody badge: `Sly-custodied` | `Session key · Coinbase` | `Privy` | `WalletConnect (interactive)`.
- Live on-chain balance polling is unchanged — it's address-based, works for any custody.

### 5. x402_fetch MCP tool — interactive handoff

For `byo_interactive`, `x402_fetch` can't complete autonomously. It returns a `{ signatureRequired: true, challenge: {...} }` payload that the caller delivers to the user's wallet. The MCP server would need a paired tool to accept the returned signature and finalize — `x402_submit_signed_payment`.

### 6. Env-chain enforcement — per custody check

The enforcement added in `dab76789` (test↔sepolia, live↔mainnet) still applies. For managed providers, additionally validate that the provider's configured chain matches `agent.environment` — reject at provisioning time if Privy wallet is on a chain the agent shouldn't sign on.

## Story breakdown

- **77.1** — Schema migration + `custody` column + CHECK constraint. Backfill existing rows to 'sly'. (1pt)
- **77.2** — Signer dispatch + refactor existing path into `signers/sly.ts`. Tests assert no regression. (2pt)
- **77.3** — Session key signer (`byo_session_key`) + Coinbase CDP session key flow as first provider. (5pt)
- **77.4** — Provisioning route `POST /v1/agents/:id/evm-keys/byo-session-key` + on-chain grant validation. (3pt)
- **77.5** — Dashboard "Link external wallet" modal — Coinbase CDP option only (v1). (3pt)
- **77.6** — Privy managed-provider signer. (3pt)
- **77.7** — Turnkey managed-provider signer. (3pt)
- **77.8** — Fireblocks managed-provider signer. (5pt — most integration work, enterprise scope)
- **77.9** — WalletConnect interactive flow + `x402_submit_signed_payment` MCP tool. (5pt)
- **77.10** — Custody badges + provider attribution in dashboard + transfer detail page. (2pt)

**Total: ~32pt**. Ship 77.1–77.5 as the MVP (14pt) to cover the crypto-native segment first.

## Risks

- **Session-key delegation isn't standardized yet.** ERC-7715 is draft; CDP / Biconomy / Safe each have their own flavor. Pick one (Coinbase CDP) for v1, design the API so other flavors plug in as additional providers later.
- **Managed providers vary wildly in API shape.** Abstract to a `Signer` interface that all providers implement, don't let Privy-specific types leak into the route handler.
- **On-chain grant verification adds latency.** Provisioning-time check is fine; per-sign re-verification would add seconds. Cache grant validity window + invalidate on expiry.
- **Compliance: "who is the agent of record when BYO?"** For managed custody the custodian is a regulated entity — our KYA attestations need to reference that instead of our own credential-vault. Legal review before shipping `byo_managed`.

## Related

- Epic 72 (agent keypair auth) — session tokens are a simpler version of the same pattern; the BYO machinery can reuse the ed25519 handshake for provisioning.
- Existing Coinbase CDP Smart Wallet chunks in the build (`smart-account-*.js`) — partial plumbing already present; story 77.3 extends rather than creates.
