# Story 87.4: Persona Starter Integration for KYB Doc Verification

**Status:** Planned
**Epic:** [Epic 87 — KYM (Know Your Marketplace) Trust Layer](../../epic-87-kym-trust-layer.md)
**Points:** 8
**Priority:** P1
**Dependencies:** Story 87.3, Epic 73.10/73.11 (Persona infrastructure)

---

Wire `POST /v1/marketplaces/:id/verify` to Persona Starter for T2 KYB document verification — business registration, UBO disclosure (25%+ owners), signatory ID + selfie liveness, business address proof. Reuses the Persona SDK already integrated in Epic 73.10/73.11. Webhook handler at `POST /v1/marketplaces/persona/webhook` updates `kym_status` on inquiry completion.

## Acceptance

- [ ] Persona SDK embedded in the verification flow (Story 87.9 wires UI)
- [ ] Webhook validates HMAC signature
- [ ] Successful inquiry auto-elevates T2; failed inquiry sets `kym_status = 'rejected'`
- [ ] `kym_metadata.persona_inquiry_id` recorded for audit
- [ ] T3 path NOT routed to Persona — T3 always goes through admin review (Story 87.6)

## Technical notes

Reuse the webhook signature-verification utility from Epic 73 work. Persona Starter tier should be sufficient for marketplace volume in v1; revisit if onboarding load grows past Starter quota. T3 stays manual because the kill-switch authority + audit attestation is a relationship, not a document upload.

## Dependencies

87.3, plus Epic 73.10/73.11 (Persona infrastructure).
