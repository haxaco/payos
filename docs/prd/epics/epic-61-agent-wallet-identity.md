# Epic 61: Agent Wallet Identity & Verification

**Status:** Planned | **Phase:** 5.2 | **Priority:** P2
**Depends on:** Epic 59 (SSO + SIWE), Epic 60 (A2A Agent Onboarding)

## Summary

Agents can link Ethereum wallets as persistent identity. Wallets serve as a verification mechanism for KYA tier upgrades. Humans can claim agents via matching wallet addresses through the dashboard.

## Motivation

With SIWE wallet login (Epic 59) and A2A agent onboarding (Epic 60) complete, a natural extension is allowing agents to link wallets. This bridges human identity (wallet used for dashboard login) with agent identity (wallet linked to an agent record), enabling:

- Persistent agent identity across re-registrations (wallet address doesn't change even if agent token rotates)
- On-chain verification for KYA tier upgrades (wallet balance, age, transaction history)
- Simplified agent claiming — if the human's SIWE wallet matches an agent's linked wallet, claiming is instant

## Stories (Rough Outline — Points TBD)

| Story | Title | Description |
|-------|-------|-------------|
| **61.1** | Agent wallet linking endpoint | `POST /v1/agents/:id/wallet` — link a wallet address to an agent |
| **61.2** | Wallet signature challenge/verify for agents | Reuse SIWE challenge/verify service for agent wallet proof |
| **61.3** | KYA tier upgrade via on-chain verification | Check wallet balance, age, tx history → auto-upgrade KYA tier (e.g., 0 → 1) |
| **61.4** | Dashboard agent claiming via wallet match | Human SIWE wallet == agent-linked wallet → instant claim |
| **61.5** | Dual auth for high-value operations | Agent token + wallet signature required for withdrawals, large transfers |
| **61.6** | Agent wallet identity persistence | Wallet address persists across agent re-registrations and token rotations |
| **61.7** | Agent wallet dashboard UI | View linked wallet, verification status, KYA tier in dashboard |

## Technical Notes

- Reuse `apps/api/src/services/wallet/siwe-auth.ts` for signature verification
- Wallet address storage follows the same pattern as `user_profiles.wallet_address` (added in Epic 59 SIWE migration)
- New column `agents.wallet_address` with unique index
- On-chain verification can use the existing `WalletVerificationService` in `services/wallet/verification.ts`
