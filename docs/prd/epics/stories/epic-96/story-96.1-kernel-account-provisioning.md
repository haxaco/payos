# Story 96.1: Kernel Account Provisioning

**Status:** Planned
**Epic:** [Epic 96 — ZeroDev Kernel Integration](../../epic-96-zerodev-kernel-integration.md)
**Points:** 8
**Priority:** P0
**Dependencies:** Existing CDP wallet pattern at `apps/api/src/services/agent-evm-keys.ts`

---

Extend `apps/api/src/services/agent-evm-keys.ts` (current CDP/EOA provisioner) with a parallel ZeroDev path. When `POST /v1/agents` is called with `walletProvider: 'zerodev'`, deploy a kernel smart account on Base Sepolia (or Base mainnet in prod), persist the kernel address + the operator-held master signer reference, and return both addresses.

```typescript
// apps/api/src/services/agent-evm-keys.ts
export async function provisionAgentWallet(
  tenantId: string,
  agentId: string,
  opts: { walletProvider: 'cdp' | 'zerodev'; chainId: number },
): Promise<{ address: string; kernel_address?: string; provider: string }>;
```

## Acceptance

- [ ] `walletProvider: 'zerodev'` deploys a kernel account on the configured chain
- [ ] Master signer key stored in the same KMS/encrypted store as CDP keys
- [ ] Provisioning idempotent — replaying a creation with the same agent_id returns the existing kernel address
- [ ] Failed deploys leave the agent in a recoverable state (no half-provisioned wallets)
- [ ] `agents.wallet_provider` column tracks `'cdp' | 'zerodev'`
- [ ] Pinned ZeroDev SDK version documented in `package.json` and `docs/decisions/`

## Technical notes

Custody model matches CDP: Sly platform holds the master signing key; agents only get session-key access. Reference the existing CDP provisioning flow line-by-line to keep the new path symmetric. Capture deploy gas costs in the audit log — that's the tenant bill-back input.

## Dependencies

Existing CDP wallet pattern at `apps/api/src/services/agent-evm-keys.ts`.
