# Epic 96: ZeroDev Kernel Integration

**Status:** Discovery
**Phase:** TBD (Identity-First Demos / Partner Integration)
**Priority:** P1
**Dependencies:** Epic 73 (KYA), Epic 88 (MarketplaceRegistry — pattern reference), Epic 94 (Identity Badge SDK)
**Companion:** [`docs/prd/MARKETPLACES_STRATEGY.md`](../MARKETPLACES_STRATEGY.md), ZeroDev kernel docs
**Created:** May 2026

---

## Summary

Integrate Sly identity with ZeroDev kernel smart accounts so that an AI agent's wallet IS the carrier for its Sly identity. ERC-8004 NFT lives in a kernel account; Sly's session-key auth maps to ZeroDev session keys; gasless x402 settlement via ZeroDev paymasters. One agent, one kernel account, one Sly identity, multiple consumption surfaces. This is the integration story ZeroDev would actually amplify.

## Motivation

ZeroDev (zerodev.app) is the leading account abstraction infrastructure for Ethereum — kernel smart accounts, session keys, paymasters, gasless UX. The May 2026 conversation that triggered the marketplaces strategy was a ZeroDev discussion: they're interested in Sly because Sly's identity layer gives smart accounts something to *be*.

The natural integration:

- Agent's wallet is a ZeroDev kernel account (smart contract wallet) instead of an EOA
- ERC-8004 NFT lives in the kernel account
- Sly's Ed25519 agent sessions (Epic 72) map to ZeroDev session keys for gasless calls
- x402 settlements pay gas via ZeroDev paymaster (no ETH needed in the agent wallet)

This integration:
- Solves a real UX problem (agents shouldn't need ETH for gas)
- Gives ZeroDev a story for AI agent customers
- Gives Sly a story for "identity-on-smart-account"
- Doesn't require federation, multi-marketplace, or any new platform abstraction — just plumbing

## SDK Impact Assessment

| Feature/Endpoint | Needs SDK? | Module | Priority |
|---|---|---|---|
| Provision agent wallet via ZeroDev | ✅ Yes | `sly.agents` | P0 |
| Session key issuance | ✅ Yes | `sly.agents` | P0 |
| Paymaster-sponsored x402 settle | ✅ Yes | `sly.x402` | P0 |
| `walletProvider: 'zerodev'` flag | ✅ Yes | Types only | P0 |

## Scope

**In scope (v1 — pilot integration):**

1. **Wallet provisioning option**: when creating an agent (`POST /v1/agents`), the operator can choose `walletProvider: 'cdp'` (default, existing) or `walletProvider: 'zerodev'` (new). ZeroDev variant calls the ZeroDev kernel SDK to deploy a kernel smart account on Base Sepolia / Base mainnet.

2. **Sly platform → ZeroDev key custody**: same custody model as CDP variant (Sly holds the master signing key encrypted; agent gets session-key access). For ZeroDev, master key controls the kernel; session keys are issued via ZeroDev's session-key infrastructure.

3. **ERC-8004 NFT in kernel account**: when an agent is minted, the NFT mints to the kernel account address (not to the EOA). All existing ERC-8004 read paths transparently work because ERC-8004 only cares about the holding address.

4. **Session-key bridge**: Epic 72's Ed25519 agent sessions map to ZeroDev session keys 1:1. When Sly issues an Ed25519 session, it issues a corresponding ZeroDev session-key authorization that allows the session to make on-chain calls without holding the kernel master key.

5. **Gasless x402 via paymaster**: x402 settlement calls (e.g. `transferWithAuthorization` to the facilitator) are sponsored by a Sly-managed ZeroDev paymaster. The agent doesn't need ETH; settlement gas is billed back to the operator's tenant.

6. **Identity Badge SDK extension** (Epic 94): badge variants for agents on ZeroDev kernels include the kernel address + ZeroDev branding.

7. **Demo + co-marketing**: joint blog post / docs page with ZeroDev showing an agent built on kernel + Sly identity.

**Out of scope (deferred):**

- Other AA providers (Pimlico, Biconomy, Alchemy) — once kernel pattern is locked, others follow
- Cross-chain kernel accounts (mainnet only initially)
- Kernel account upgrade flows (operators want to upgrade an existing CDP-wallet agent to ZeroDev — separate epic)
- Agent self-management of kernel (operator transfers control to the agent's own session key) — distant future

## Stories

Each story spec lives in its own file at [`./stories/epic-96/`](./stories/epic-96/). See [`./stories/README.md`](./stories/README.md) for the convention.

> **Pilot integration epic.** Partner conversation with ZeroDev is what triggered the marketplaces strategy thread. Stories below assume the ZeroDev kernel SDK on Base Sepolia / Base mainnet; pin a known-good SDK version early to avoid churn during build. Co-marketing (96.9) is contingent on partner alignment.

### Phase 1: Wallet Plumbing — 21 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [96.1](./stories/epic-96/story-96.1-kernel-account-provisioning.md) | Kernel Account Provisioning | 8 | P0 | Planned |
| [96.2](./stories/epic-96/story-96.2-session-key-bridge.md) | Session-Key Bridge — Ed25519 ↔ ZeroDev | 8 | P0 | Planned |
| [96.3](./stories/epic-96/story-96.3-erc8004-nft-mint-to-kernel.md) | ERC-8004 NFT Mint to Kernel Address | 5 | P0 | Planned |

### Phase 2: Gasless x402 — 13 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [96.4](./stories/epic-96/story-96.4-paymaster-sponsored-x402.md) | Paymaster-Sponsored x402 Settle | 8 | P0 | Planned |
| [96.5](./stories/epic-96/story-96.5-tenant-paymaster-billing.md) | Tenant-Level Paymaster Billing | 5 | P0 | Planned |

### Phase 3: Surfaces & Launch — 19 points

| Story | Title | Points | Priority | Status |
|---|---|---|---|---|
| [96.6](./stories/epic-96/story-96.6-sdk-walletprovider-option.md) | SDK — `walletProvider: 'zerodev'` Option | 3 | P0 | Planned |
| [96.7](./stories/epic-96/story-96.7-identity-badge-kernel-variant.md) | Identity Badge — Kernel-Account Variant | 3 | P1 | Planned |
| [96.8](./stories/epic-96/story-96.8-end-to-end-joint-demo.md) | End-to-End Joint Demo | 5 | P0 | Planned |
| [96.9](./stories/epic-96/story-96.9-co-marketing-blog-docs.md) | Co-Marketing — Blog Post + Docs | 3 | P1 | Planned |
| [96.10](./stories/epic-96/story-96.10-tests-provisioning-paymaster.md) | Tests — Provisioning, Sessions, Paymaster | 5 | P0 | Planned |

**Total:** ~53 points across 10 stories.

## Definition of Done

- [ ] Agent provisionable on ZeroDev kernel via `POST /v1/agents` with `walletProvider: 'zerodev'`
- [ ] Ed25519 session keys issue corresponding ZeroDev session-key authorizations
- [ ] ERC-8004 NFT mintable into kernel account; all read paths work
- [ ] x402 settlement runs gasless via paymaster, billed back to tenant
- [ ] Joint demo published with ZeroDev (blog + docs)
- [ ] At least one external developer running an agent on the kernel + Sly stack

## Risks

- **ZeroDev SDK churn.** Their SDK still evolves quickly. Pin a known-good version; revisit with each major release.
- **Paymaster cost model.** Gasless UX is great until the gas bill arrives. Need clear bill-back to tenants + visibility ("gas spent: $X this month") in Sly Console.
- **Multi-AA-provider symmetry.** Once we ship ZeroDev, every other AA provider will ask. Keep the wallet-provider abstraction generic so adding Pimlico / Biconomy doesn't require a new epic each time.

## References

- ZeroDev kernel docs (https://docs.zerodev.app/)
- Epic 72 — Agent Key-Pair Auth (Ed25519 sessions — pattern to bridge)
- `apps/api/src/services/agent-evm-keys.ts` — current EOA provisioning (the new kernel path is parallel)
- ERC-4337 / EntryPoint contracts on Base
