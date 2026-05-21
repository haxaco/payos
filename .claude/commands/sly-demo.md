---
description: Record a new Sly demo video (master, teaser, deep-dive, app-tour, or per-product). Uses the existing narrate-lib pipeline. Knows the tenants, routes, IDs, brand framing, and pre-flight discipline.
---

# Sly demo recorder

Generate a new narrated walkthrough using the existing pipeline at
`apps/demo/_shots/narrate-lib.mjs`. Output lands in `docs/demos/<slug>/`.

## When to use which variant

Ask the user which they want (or infer from the request). Existing variants and what they're for:

| Slug | Runtime | Purpose | Gen script |
|---|---|---|---|
| `sly` | ~2 min | Master pitch (VC/partner). 8 beats, 5 scenarios. | `gen-sly-narrated.mjs` |
| `sly-teaser` | ~50s | Social/landing-page autoplay. 4 beats. | `gen-sly-teaser.mjs` |
| `sly-deep` | ~2:30 | DD / engineering. 8 beats, extra Sly cuts per scenario. | `gen-sly-deep.mjs` |
| `sly-app-tour` | ~2:30 | Product walkthrough. 10 beats, Helix tenant. | `gen-sly-app-tour.mjs` |
| `coral` / `span` / `aster` / `forum` / `marketplace` | varies | Per-product demos. | `gen-<slug>-narrated.mjs` |

Full ranking + publishing plan: `docs/demos/VARIANTS.md`.

## Pre-flight checklist (always run first)

Verify these are running on the listed ports — pre-flight will fail fast if any is down.

| Port | Service | Health check |
|---|---|---|
| 4000 | Sly API | `curl -s -o /dev/null -w "%{http_code}" http://localhost:4000` → 404 (no `/`, but server up) |
| 3000 | @sly/web (dashboard) | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → 307 |
| 3211 | coral-mobile | 200 |
| 3220 | span-broker | 200 |
| 3230 | aster-merchants | 200 |
| 3231 | lume-goods | 200 |
| 3240 | forum-platform | 200 |
| 3241 | helix-live | 200 |

One-liner for all 8:

```bash
for p in 4000 3000 3211 3220 3230 3231 3240 3241; do printf "port %s: " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:$p" --max-time 2 2>/dev/null || echo DOWN; done
```

## Helper scripts (use these BEFORE editing things)

| Script | What it does | When to use |
|---|---|---|
| `node apps/demo/_shots/lib/probe-sly-state.mjs` | Prints the current tenant credentials, agent IDs, and dashboard routes pulled live from the gen scripts in `apps/demo/_shots/`. | First thing to run if you're adding a new variant or the tables below look stale. The gen scripts are the source of truth; this just summarizes them. Pass `--markdown` for table output ready to paste back into this skill. |
| `node apps/demo/_shots/lib/lint-narration.mjs <path> [N]` | Validates a `narration.md` file: sequential `## Beat N — …` headings, expected beat count, prose present, chip blocks well-formed, chip text not too long. Exit 1 on issues with diagnostics. | Before running a gen script; also wired into `gen-sly-narrated.mjs` as the canonical example (import `lintNarration` and call with `(path, expectedCount)`). |
| `--only=N,M` flag | Pass to any gen script to re-record only the listed (1-indexed) beats. Reuses cached video/audio for the rest. Drops one-beat iteration time from ~5 min to ~1 min on the master. Requires a full record first (populates the cache at `apps/demo/_shots/.video-cache/<slug>/`). Errors clearly if a non-recorded beat is missing from cache. | Iterating on a single beat's chip text, narration line, or product motion without paying for full re-record. |

## Tenant emails + key IDs

All seeded by the per-demo seed scripts (`apps/demo/_seed/seed-*-demo.ts`).
**Passwords**: the canonical values live in the gen scripts'
`*_LOGIN` constants and in the seed scripts themselves — do NOT
copy them into this skill (CLAUDE.md security rule). Run
`probe-sly-state.mjs` to dump the current set, or grep
`grep -h "_LOGIN" apps/demo/_shots/gen-*-narrated.mjs`.

| Tenant | Email | Use case |
|---|---|---|
| Coral (Maya) | `maya@coral-demo.app` | Consumer wallet |
| Crate (seller, cross-tenant) | `owner@crate-demo.app` | Coral cross-tenant proof |
| Span (Maya) | `maya@span-demo.app` | Cross-ecosystem broker |
| Outpost (seller) | `owner@outpost-demo.app` | Span cross-tenant proof |
| Aster operator | `operator@aster-demo.app` | Commerce governance |
| Lume (Aster seller) | `owner@lume-demo.app` | Aster cross-tenant proof |
| Forum operator | `operator@forum-demo.app` | AI hiring |
| Lume Market (Forum seller) | `owner@lumemarket-demo.app` | Forum cross-tenant proof |
| Helix operator | `operator@helix-demo.app` | Marketplace (richest data) |

Stable agent IDs (from per-demo seeds — verify by reading the seed file if they look stale):

| ID | Used for |
|---|---|
| `0b64d0fa-6f04-59c3-1a9e-776243571545` | Coral Shopping Agent |
| `d1d091a6-8a15-d44a-1977-79623e2413b9` | Claude Shopping Agent (Span) |
| `bf159c1e-d32c-2d43-02e7-a7e1cab94d81` | Velo (Aster buyer) |
| `d885b29e-06c9-8f57-12c8-b7b7d0a00d4c` | Quill (Forum AI hire) |
| `6e19bd53-4b5b-0aed-5caf-df9c5f852aef` | Beacon (Helix) |
| `973ee9a0-34f8-50f7-f9f3-0828fea3bb04` | Lume directory account |
| `9e108102-3453-ef5b-1f89-ef29639eb29b` | Mira (Lume Market seller account) |

## Dashboard routes that read clean per tenant

Use these for the "Sly behind the scenes" cuts. Each is verified to render with seeded data.

| Route | Best for |
|---|---|
| `/dashboard/agents` | Identity surface (KYA tiers, parent accounts) — Helix tenant has 14+ agents |
| `/dashboard/agents/<id>` | Single agent record (identity + recent activity + payouts) |
| `/dashboard/agentic-payments/acp/checkouts` | ACP checkouts (Coral, Helix have rows) |
| `/dashboard/agentic-payments/ucp/checkouts` | UCP checkouts (Span has rows) |
| `/dashboard/agentic-payments/ucp/orders` | UCP orders (Outpost cross-tenant — shows buyer attribution) |
| `/dashboard/agentic-payments/ap2/mandates` | AP2 spend ceilings (Aster, Span, Helix all populated) |
| `/dashboard/agentic-payments/x402/endpoints` | x402 pay-per-call endpoints (Helix has many) |
| `/dashboard/wallets` | Agent wallets with policies |
| `/dashboard/accounts` | Entity directory (humans + businesses) |
| `/dashboard/transfers` | Multi-protocol ledger (Helix has 4000+ rows) |
| `/dashboard/security/scopes` | One-shot scope grants lifecycle (Helix is most active) |

**Routes that DON'T exist** (common typos):
- `/dashboard/transactions` → use `/dashboard/transfers`
- `/dashboard/agentic-payments/x402` → use `/dashboard/agentic-payments/x402/endpoints`

## The pattern for product surfaces with MOTION

Statics read like images. Live motion sells. The selectors are stable across re-records:

### Coral wallet (port 3211) — buyer agent flow

```javascript
await p.getByRole('button', { name: /Send to Coral Shopping Agent/i }).click();
await p.getByText(/Your agent found a match/i).waitFor({ timeout: 15000 });
await p.getByRole('button', { name: /Approve payment/i }).click();
await p.getByRole('button', { name: /Approve treasury scope/i }).waitFor({ timeout: 15000 });
await p.getByRole('button', { name: /Approve treasury scope/i }).click();
await p.getByText(/Settled in/i).waitFor({ timeout: 25000 });
```

### Span broker (port 3220) — cross-ecosystem flow

```javascript
await p.getByRole('button', { name: /^Run demo$/i }).click();
await p.getByRole('button', { name: /Buy now/i }).waitFor({ timeout: 25000 });
await p.getByRole('button', { name: /Buy now/i }).click();
await p.getByText(/Settlement complete/i).first().waitFor({ timeout: 25000 });
```

## The 6-step workflow

1. **Decide arc + write `docs/demos/<slug>/narration.md`**
   - Use `## Beat N — …` headings, one paragraph per beat.
   - Optional `**Chips:**` block under each beat for lower-third punch phrases.
   - Slate beats carry their own hero text — no chips on those.

2. **Write `apps/demo/_shots/gen-<slug>.mjs`**
   - Copy from the closest sibling (`gen-sly-narrated.mjs` for pitch, `gen-sly-app-tour.mjs` for tours).
   - **Critical**: do `loginAs(p, CREDS)` in `drive()` (silent, cut from final), not `act()` — login takes ~8s and eats the recorded hold otherwise.
   - For motion beats: `act()` does dwell → trigger flow → wait for completion → goto Sly dashboard.
   - For multi-cut Sly beats: `act()` chains gotos with dwells between (~5-7s per cut).
   - Import the linter so format errors surface before recording:
     ```javascript
     import { lintNarration } from './lib/lint-narration.mjs';
     lintNarration(resolvePath(root, `docs/demos/<slug>/narration.md`), <expectedBeats>);
     ```
   - See `gen-sly-narrated.mjs` for the canonical pattern.

3. **Pre-flight every URL the demo navigates**
   - Already encoded as a `validateFlow()` function in every gen script.
   - Visits each product surface + each Sly dashboard route.
   - Fails fast on 404 / error boundary / auth bounce → exit 2.
   - **Gotcha**: the Helix wall-board renders "X402 · 404 calls" as a metric badge. The `pageBroken()` regex must NOT match bare `404` — already fixed in master + variants. Required regex: `/this page couldn['']t load|page not found|page could not be found|something went wrong|application error/i`.

4. **Record**
   ```bash
   # Full record (first time, or after structural changes)
   node --env-file=apps/api/.env apps/demo/_shots/gen-<slug>.mjs

   # Iterate on just beat 3 (and re-mux from cache for the rest)
   node --env-file=apps/api/.env apps/demo/_shots/gen-<slug>.mjs --only=3

   # Iterate on two beats
   node --env-file=apps/api/.env apps/demo/_shots/gen-<slug>.mjs --only=3,7
   ```
   Caches:
   - TTS: `apps/demo/_shots/.tts-cache/` keyed by voice|model|settings|text — unchanged narration is never re-synthesized.
   - Video: `apps/demo/_shots/.video-cache/<slug>/` keyed by beat index — populated by full records, consumed by `--only` runs.

5. **Frame-QA**
   ```bash
   mkdir -p /tmp/frames && \
   for t in 5 15 30 45 60 75 90; do
     ffmpeg -y -ss "$t" -i docs/demos/<slug>/<slug>-narrated.mp4 -frames:v 1 -q:v 3 "/tmp/frames/t${t}s.jpg" 2>/dev/null
   done
   ```
   Then Read each frame to verify: right page rendered, chip text visible, no skeleton/loading state at the wrong moment, no login screen flashing through.

6. **Build the HTML one-pager**
   - Write `docs/demos/<slug>/article.md` (H1 + dek + section bodies, see existing demos for shape).
   - Add the variant to `apps/demo/_shots/build-articles-html.mjs` `DEMOS` array (slug, video filename, accent color, kicker, theme: 'light' | 'dark', pillars array).
   - Run `node apps/demo/_shots/build-articles-html.mjs` → emits `docs/demos/<slug>/index.html`.

## Discipline (learned the hard way)

- **Reseed before record** when on-screen numbers matter for narration. Each demo tenant has `RESET_DEMO=1 pnpm tsx apps/demo/_seed/seed-<demo>-demo.ts` from `apps/api`.
- **Cross-tenant cleanup is FK-aware**: see `apps/demo/_seed/lib/provision.ts`. Don't truncate `transfers` without first deleting `acp_checkouts` rows that reference them.
- **Login during silent drive(), navigation during act()**. Login is slow (~8s); putting it in act() eats the hold.
- **Two-phase beats need wide viewport**. The engine has one viewport per beat, so product + Sly dashboard in the same beat must both render at 1600×1000.
- **Don't pre-warm Sly during silent drive AND show product first** — the page state will jump. Pick one as the starting recorded surface.
- **macOS Screenshot filenames in `docs/logos/`** contain U+202F NARROW NO-BREAK SPACE — use globs (`docs/logos/*.png`) not literal spaces.

## What to do when invoked

1. Read `docs/demos/VARIANTS.md` for current variant inventory + recommendations.
2. Ask the user which variant they want, or what new variant to add.
3. If recording an existing variant: confirm prereqs + run the gen script + frame-QA.
4. If creating a new variant: walk the user through the arc (beat-by-beat), write narration.md, write gen script, pre-flight, record, frame-QA, build HTML, update VARIANTS.md with the new entry.

Reference files (don't re-explain — just point at them):
- `apps/demo/_shots/narrate-lib.mjs` — the shared engine (do NOT modify without strong reason)
- `apps/demo/_shots/gen-sly-narrated.mjs` — best template for pitch arcs
- `apps/demo/_shots/gen-sly-app-tour.mjs` — best template for product tours
- `apps/demo/_shots/build-articles-html.mjs` — HTML one-pager generator
- `docs/demos/VARIANTS.md` — publishing recommendations
