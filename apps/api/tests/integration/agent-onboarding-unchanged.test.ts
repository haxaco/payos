import { describe, it, expect } from 'vitest';

// Open-beta hardening — public agent onboarding still works (no regression)
// AND stays correctly gated when closed beta is on.
//
// Run with:
//   INTEGRATION=true pnpm --filter @sly/api test tests/integration/agent-onboarding-unchanged.test.ts
//
// These are PUBLIC endpoints (no Authorization header):
//   - POST /v1/auth/agent-signup
//   - POST /v1/onboarding/agent/one-click
//
// CLOSED-BETA STATE (verified against the running dev API): the dev env has
// PAYOS_FEATURE_CLOSED_BETA=true, so:
//   - agent-signup with no inviteCode → 403 "invite code is required ...".
//   - one-click with an email but no inviteCode → 202 pending_review (an
//     unactivated beta application, NOT an active agent + token).
//
// Per the task constraints we MUST NOT fabricate or mint beta codes. So the
// happy-path assertions (token present, no pk_, kyaTier 0) are it.skip'd with
// the closed-beta reason. We DO assert the gate behaviour itself — that is a
// real, load-bearing hardening control (public self-registration cannot mint a
// usable agent without beta access), not a vacuous pass. The suite will
// automatically start exercising the happy path the moment closed beta is
// turned off (the it.skip becomes the only thing standing in the way and the
// gate test will flip), at which point flip them to `it`.

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const skipIntegration = !process.env.INTEGRATION;

const jsonHeaders = { 'Content-Type': 'application/json' };
const uniq = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe.skipIf(skipIntegration)('Public agent onboarding (open-beta gating)', () => {
  it('agent-signup is closed-beta gated (no invite code → 403, no token leaked)', async () => {
    const res = await fetch(`${BASE_URL}/v1/auth/agent-signup`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        name: `OnboardProbe ${uniq()}`,
        ownerEmail: `probe-${uniq()}@example.com`,
      }),
    });

    // Two valid open-beta abuse controls can fire here:
    //   403 → closed-beta invite gate (active in dev)
    //   429 → per-IP rate limiter (agent_signup, 5/hour, runs first)
    // If BOTH were removed this becomes a 201 and the test fails loudly —
    // exactly the regression signal we want.
    expect([403, 429]).toContain(res.status);
    const raw = await res.text();
    if (res.status === 403) {
      expect(raw.toLowerCase()).toContain('invite code');
    } else {
      expect(raw.toLowerCase()).toContain('too many');
    }
    // Hard invariant regardless of which gate fired: a *rejected* signup must
    // never leak credentials of any kind.
    expect(raw).not.toMatch(/agent_[A-Za-z0-9]/);
    expect(raw).not.toMatch(/pk_(test|live)_/);
  });

  it('one-click with email but no invite is queued for review, not activated (no token leaked)', async () => {
    const res = await fetch(`${BASE_URL}/v1/onboarding/agent/one-click`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        name: `OneClickProbe ${uniq()}`,
        email: `oneclick-${uniq()}@example.com`,
      }),
    });

    // Closed beta with an email and no code → application submitted, 202.
    // The per-IP rate limiter (agent_onboard, 5/hour) runs before that and
    // can return 429 — also a valid hardened outcome.
    expect([202, 429]).toContain(res.status);
    const body = await res.json();
    const raw = JSON.stringify(body);
    if (res.status === 202) {
      const data = body.data ?? body; // tolerate wrapped/unwrapped
      expect(data.status).toBe('pending_review');
    } else {
      expect(String(body.error ?? '')).toMatch(/too many/i);
    }
    // Must NOT have minted an active agent / token while merely "pending"
    // (or rate-limited).
    expect(raw).not.toMatch(/agent_[A-Za-z0-9]/);
    expect(raw).not.toMatch(/pk_(test|live)_/);
  });

  // ---- Happy-path assertions: blocked by closed beta in dev. ----
  // Cannot run without a real beta invite code, which the task forbids us from
  // fabricating. Documented skip (not a silent pass).
  it.skip('agent-signup returns an agent_* token, NO pk_ key, kyaTier 0 [SKIPPED: closed beta active in dev — needs a real invite code; do not fabricate]', async () => {
    const res = await fetch(`${BASE_URL}/v1/auth/agent-signup`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ name: `OnboardOK ${uniq()}`, ownerEmail: `ok-${uniq()}@example.com` }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    const data = body.data ?? body;
    expect(data.credentials.token).toMatch(/^agent_/);
    expect(JSON.stringify(body)).not.toMatch(/pk_(test|live)_/);
    expect(data.agent.kyaTier).toBe(0);
  });

  it.skip('one-click creates an active agent with a token [SKIPPED: closed beta active in dev — needs a real invite code; do not fabricate]', async () => {
    const res = await fetch(`${BASE_URL}/v1/onboarding/agent/one-click`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ name: `OneClickOK ${uniq()}` }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    const data = body.data ?? body;
    expect(data.status).toBe('active');
    expect(data.credentials.token).toMatch(/^agent_/);
    expect(data.agent.kyaTier).toBe(0);
  });
});
