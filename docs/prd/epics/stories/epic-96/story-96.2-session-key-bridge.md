# Story 96.2: Session-Key Bridge — Ed25519 ↔ ZeroDev

**Status:** Planned
**Epic:** [Epic 96 — ZeroDev Kernel Integration](../../epic-96-zerodev-kernel-integration.md)
**Points:** 8
**Priority:** P0
**Dependencies:** Story 96.1; Epic 72 (Ed25519 sessions)

---

Map Epic 72's Ed25519 agent sessions 1:1 onto ZeroDev session keys. When Sly issues a new Ed25519 session token, it also issues a corresponding ZeroDev session-key authorization (scoped to specific call selectors — e.g. `transferWithAuthorization` for x402 settlement) that allows the session to make on-chain calls without holding the kernel master key. Revoking the Ed25519 session revokes the on-chain session key.

## Acceptance

- [ ] Issuing an Ed25519 session also issues a ZeroDev session-key authorization on-chain (or in ZeroDev's session-key system)
- [ ] Authorization is scoped to a documented allowlist of contract calls (x402 facilitator at minimum)
- [ ] Revocation propagates: revoking the Sly session also revokes the ZeroDev session key
- [ ] TTL parity: ZeroDev session key expires at or before the Ed25519 session TTL
- [ ] Per-session daily spend cap configurable; defaults to the agent's KYA tier daily limit
- [ ] Authorization writes are batched / lazy so session creation latency doesn't double

## Technical notes

Don't issue a fresh on-chain session-key authorization on every Ed25519 session — the on-chain cost is non-trivial. Consider lazy issuance on first on-chain call OR a small pool of pre-issued session keys per agent. Make this an explicit design call in `docs/decisions/`.

## Dependencies

Story 96.1; Epic 72 (Ed25519 sessions).
