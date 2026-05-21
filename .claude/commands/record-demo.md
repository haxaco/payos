---
description: Generic recipe for producing polished narrated product demo videos with Playwright + ElevenLabs + ffmpeg. Self-contained — drop this file (and the referenced narrate-lib.mjs template) into another startup's repo to bootstrap their demo pipeline.
---

# Generic narrated-demo pipeline

A repeatable recipe for producing professional product demo videos
from a running web app. Designed for: pitch videos, social
teasers, app tours, feature explainers. Use this when you want
something that looks studio-produced but you don't have a video
team. Total cost per video: a few cents of ElevenLabs credits.

## What you get

A self-contained mp4 (~1–3 min) with:

- Branded ~1.5 s logo opener and ~3 s outro card
- High-quality TTS narration synced to product UI
- Live product motion (clicks, animations, transitions)
- Lower-third "chip" overlays for key punch phrases
- Optional deck-styled slate beats (hook, stats, close) between product beats
- Final mux: H.264 / AAC, 1600×1000 default, faststart for web

## The pipeline (4 stages)

```
narration.md  → ElevenLabs TTS → mp3 + duration
gen-<slug>.mjs → Playwright record → per-beat webm
ffmpeg                              → scale + pad + concat
                                    → mux narration over body
                                    → prepend opener, append outro
                                    → docs/demos/<slug>/<slug>-narrated.mp4
```

## Folder layout (per video)

```
docs/demos/<slug>/
  narration.md            # spoken script + chip overlays (source of truth)
  article.md              # the web one-pager copy (optional)
  index.html              # generated one-pager (optional, drops onto any static host)
  <slug>-narrated.mp4     # the final video
  screenshots/            # frame stills you want to keep around (optional)

apps/demo/_shots/
  narrate-lib.mjs         # the shared engine (TTS + record + mux)
  gen-<slug>.mjs          # per-video script: defines beats + URLs + acts
  .tts-cache/             # TTS cache (DON'T commit — cached by voice|model|settings|text)
  build-articles-html.mjs # optional: turns article.md → index.html
```

## The narrate-lib engine (already general-purpose)

Located at `apps/demo/_shots/narrate-lib.mjs` in this repo. It's
~400 lines, framework-agnostic, no project-specific code. Reads
`ELEVENLABS_API_KEY` from env. Copy this one file alongside your
gen scripts and you're done.

Public API:

```javascript
import { produceNarrated } from './narrate-lib.mjs';

await produceNarrated(
  'my-video',                              // slug → docs/demos/<slug>/
  { bg: '#ffffff',                         // recording background
    accent: '#00D4FF',                     // chip + slogan accent
    kicker: 'PRODUCT · TAGLINE',           // unused but stored
    title: 'The headline.' },              // unused but stored
  { width: 1600, height: 1000 },           // output canvas
  beats,                                   // array of beat configs
);
```

Each beat:

```javascript
{
  viewport: { width: 1600, height: 1000 }, // optional, defaults to output
  text: 'Spoken paragraph for this beat…', // ElevenLabs synthesizes this
  chips: ['CHIP ONE', 'CHIP TWO'],          // optional lower-third punches
  drive: async (page) => {                 // SILENT — cut from final mp4
    await page.goto(URL);                  //   do logins, pre-warm, anything slow
    await page.waitForTimeout(800);
  },
  act: async (page) => {                   // optional — runs DURING the hold
    await page.waitForTimeout(2000);       //   so on-screen motion plays
    await page.click('button');            //   while the narration is spoken
  },
}
```

## The 6-step workflow

### 1. Write `docs/demos/<slug>/narration.md`

```markdown
# My Video — what it is

(Headers like `## Beat 1 — …`, one paragraph each.
 Optional `**Chips:**` list per beat for lower-third overlays.)

## Beat 1 — Hook (slate)

Your customers want X. But Y is hard. **Tag** does Y, simply.

## Beat 2 — Proof (product)

Watch the product do Y. It happens in real time.

**Chips:**
- CHIP ONE
- CHIP TWO
```

### 2. Write `apps/demo/_shots/gen-<slug>.mjs`

Start from this template (it's complete — adjust beats and you're done):

```javascript
import { produceNarrated } from './narrate-lib.mjs';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';

function loadBeats(slug, expected) {
  const root = fileURLToPath(new URL('../../..', import.meta.url));
  const path = resolvePath(root, `docs/demos/${slug}/narration.md`);
  const md = readFileSync(path, 'utf8');
  const parts = md.split(/^##\s+Beat\s+\d+/m).slice(1);
  const beats = parts.map((s) => {
    const body = s.replace(/^[^\n]*\n/, '');
    const [textPart, chipsPart] = body.split(/\*\*Chips:\*\*/i);
    const text = textPart.trim().replace(/\s+/g, ' ');
    const chips = (chipsPart ?? '').split('\n')
      .map((l) => l.match(/^[-*]\s+(.+?)\s*$/)).filter(Boolean)
      .map((m) => m[1].trim());
    return { text, chips };
  });
  if (beats.length !== expected) {
    console.error(`[${slug}] has ${beats.length} beats, expected ${expected}.`);
    process.exit(2);
  }
  return beats;
}

const N = loadBeats('my-video', 4);  // adjust expected count
const APP = 'http://localhost:3000';  // your product URL
const WIDE = { width: 1600, height: 1000 };
const BG = '#ffffff';
const ACCENT = '#00D4FF';

// Deck-styled slate helper: light bg, blurred orbs, gradient highlight.
// Customize the colors/fonts for your brand.
const GRADIENT = 'linear-gradient(135deg, #00D4FF 0%, #6366F1 50%, #8B5CF6 100%)';
const FONT = `<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;

function slate(inner) {
  return async (p) => {
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONT}<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background:${BG}; font-family:'Space Grotesk',sans-serif; color:#1a1a2e; }
.slide { position:relative; width:1600px; height:1000px; overflow:hidden;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:64px; text-align:center; gap:24px; }
.slide::before, .slide::after { content:''; position:absolute; width:760px; height:760px;
  border-radius:50%; filter:blur(150px); opacity:0.20; pointer-events:none; }
.slide::before { background:radial-gradient(circle,${ACCENT} 0%,transparent 70%); top:-260px; left:-200px; }
.slide::after  { background:radial-gradient(circle,#8B5CF6 0%,transparent 70%); bottom:-280px; right:-200px; }
.gradient-text { background:${GRADIENT};
  -webkit-background-clip:text; background-clip:text;
  -webkit-text-fill-color:transparent; color:transparent; }
</style></head><body><div class="slide">${inner}</div></body></html>`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await p.waitForTimeout(320);
  };
}

async function settle(p, ms = 700) {
  await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(ms);
}

async function pageBroken(p) {
  try {
    const txt = (await p.locator('body').innerText({ timeout: 5000 })).toLowerCase();
    // IMPORTANT: don't match bare "404" — many UIs render it as a count badge.
    return /this page couldn['’]t load|page not found|page could not be found|something went wrong|application error/i.test(txt);
  } catch { return false; }
}

const beats = [
  // B1 — Hook slate
  { viewport: WIDE, text: N[0].text, chips: N[0].chips,
    drive: slate(`<h1 style="font-size:120px; line-height:1.1">Your <span class="gradient-text">tagline</span>.</h1>`) },

  // B2 — Product motion
  { viewport: WIDE, text: N[1].text, chips: N[1].chips,
    drive: async (p) => {
      await p.goto(APP, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      await settle(p, 800);
    },
    act: async (p) => {
      await p.waitForTimeout(1500);
      // Trigger product motion: click a button, watch a thing happen.
      await p.getByRole('button', { name: /Start demo/i }).click().catch(() => {});
      await p.getByText(/Done/i).waitFor({ timeout: 25000 }).catch(() => {});
    },
  },

  // Add more beats as needed…
];

async function validateFlow() {
  console.log('[my-video] pre-flight…');
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: WIDE });
  const p = await c.newPage();
  const fails = [];
  try {
    // Visit every URL the demo will navigate. Fail fast on 404 / error boundary.
    const r = await p.goto(APP, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settle(p, 400);
    if (!r || r.status() >= 400) fails.push(`${APP} → HTTP ${r?.status()}`);
    if (await pageBroken(p)) fails.push(`${APP} → error boundary`);
    // …add more checkUrl calls for every URL the demo touches
  } finally {
    await b.close();
  }
  if (fails.length) {
    console.error(`[my-video] PRE-FLIGHT FAILED:`);
    for (const f of fails) console.error('  ✗', f);
    process.exit(2);
  }
  console.log('[my-video] pre-flight OK ✓');
}

await validateFlow();
await produceNarrated('my-video',
  { bg: BG, accent: ACCENT, kicker: 'MY · DEMO', title: 'Tagline.' },
  WIDE, beats);
```

### 3. Pre-flight (built into every gen script)

The `validateFlow()` function visits every URL the demo will
navigate, checks HTTP status, looks for error boundaries, and
verifies the app didn't auth-bounce. Exits 2 on any failure
**before recording**, so you don't waste a 3-minute record run on
broken data.

**Implementation gotcha** — your `pageBroken()` regex must NOT
match bare `404` if your app renders that string as a metric
badge or count anywhere. Use this regex:

```javascript
/this page couldn['']t load|page not found|page could not be found|something went wrong|application error/i
```

### 4. Record

```bash
export ELEVENLABS_API_KEY=sk-…

# First time / structural change → full record
node apps/demo/_shots/gen-my-video.mjs

# Iterate on just one beat (re-uses cached video for the others)
node apps/demo/_shots/gen-my-video.mjs --only=3
```

Two caches make iteration fast:

- **TTS cache** at `apps/demo/_shots/.tts-cache/` keyed by
  voice|model|settings|text. Unchanged narration lines never re-spend
  ElevenLabs credits.
- **Video cache** at `apps/demo/_shots/.video-cache/<slug>/` populated
  by every full record. The `--only=N,M` flag re-records only the
  listed (1-indexed) beats and reuses cached video/audio for the
  rest — drops one-beat iteration from ~5 min to ~1 min on a master
  video. Errors clearly if you `--only` before a full record has
  populated the cache.

Bonus: lint the narration before recording to surface format errors
(wrong headings, miscounted beats, malformed chip blocks) immediately
instead of failing mid-record:

```javascript
import { lintNarration } from './lib/lint-narration.mjs';
lintNarration('docs/demos/my-video/narration.md', /* expectedBeats */ 5);
```

### 5. Frame-QA every beat

```bash
mkdir -p /tmp/frames
for t in 5 15 30 45 60 75 90; do
  ffmpeg -y -ss "$t" -i docs/demos/my-video/my-video-narrated.mp4 \
    -frames:v 1 -q:v 3 "/tmp/frames/t${t}s.jpg" 2>/dev/null
done
```

Then look at each frame. Check:
- Right page rendered (not a skeleton, not a login form)
- Chip text visible at the right moment
- Product motion captured (not just static state)
- Slate beats centered with the right font

If a frame is wrong, fix the act() pacing or the URL, then
re-record. TTS cache means iterations are fast.

### 6. Build the HTML one-pager (optional)

The `build-articles-html.mjs` script (in this repo) takes a
`docs/demos/<slug>/article.md` and produces a self-contained
`index.html` you can drop onto any static host.

## Discipline (lessons learned)

### Login goes in `drive()`, not `act()`

`drive()` runs silently before the recorded hold begins.
Anything slow (login, data fetches, hot navigation) lives there.
`act()` runs DURING the hold — anything you do here is on screen.

### One viewport per beat (engine constraint)

Each beat's recording context is created at one viewport. You
can't switch mid-beat. If you want a phone-shaped surface AND a
desktop dashboard in the same beat, render the phone in a
centered phone-shaped container at desktop viewport.

### Two-phase beats: product → behind-the-scenes

Strongest demo arc per beat is **product (5–7s) → cut to your
back-end record showing the same transaction (5–10s)**. The
viewer sees the surface, then sees the receipt. Repeat per
scenario.

### Cross-tenant proofs require separate beats

If you want to show the same transaction landing in two different
tenants/accounts (e.g., buyer-side vs. seller-side), put each in
its own beat with its own silent login. Doing both in one beat's
`act()` shows a login form on-screen during the transition —
ugly.

### Don't over-narrate

Each beat's TTS audio length sets the hold time. If your `act()`
has 12 seconds of motion but the narration is only 6 seconds, the
beat ends mid-motion. Either extend narration or shorten the act.

### Reseed before record when numbers matter

If on-screen counters / volumes are part of your story, reseed
your demo data right before recording so the numbers are clean.

### Visual identity matters

Pick one accent color, one heading font, one mono font. Keep the
brand opener and outro consistent across all videos. Viewers
binding "this look = this product" pays off the second time they
see your work.

## Producing multiple variants from the same source

Once you have one solid arc, generate variants cheaply:

| Variant | What changes |
|---|---|
| **60s teaser** | Drop to 3–4 beats, keep your two strongest scenarios |
| **2-min pitch** | The canonical version |
| **3-min deep-dive** | Add 1–2 extra back-end cuts per scenario |
| **Product tour** | No scenarios, just a walkthrough of features |
| **Feature explainer** | One scenario, more text, slower pace |

Each variant gets its own gen script + narration.md + folder.
TTS cache means most narration cost is paid once.

## Setup checklist for a new repo

1. `pnpm add -D playwright` (record engine)
2. Install ffmpeg (`brew install ffmpeg` on macOS)
3. Get an ElevenLabs API key (`sk-…`) and put it in `.env`
4. Copy `apps/demo/_shots/narrate-lib.mjs` from a working repo
5. Pick a Jessica/George/Sarah voice ID at elevenlabs.io (or use
   the default in narrate-lib)
6. Get your brand logo as a transparent PNG → save as `docs/logos/sly-mark.png`
   (or change the path in narrate-lib's brand card)
7. Write your first `gen-<slug>.mjs` from the template above
8. `node gen-<slug>.mjs` → ship

## What to do when invoked

If the user is starting fresh in a repo without the pipeline:

1. Confirm playwright + ffmpeg + ELEVENLABS_API_KEY are available
2. Help them write the first `narration.md` (what's the arc?)
3. Generate the gen script from the template above
4. Run pre-flight + record
5. Frame-QA together

If the user already has the pipeline set up and is adding a new variant:

1. Read existing `narration.md` files and gen scripts to match style
2. Help them draft the new arc
3. Generate the new gen script
4. Pre-flight + record + QA

## Reference

The engine + the four Sly variants that produced this skill:
`apps/demo/_shots/narrate-lib.mjs` (engine) and the four
`gen-sly-*.mjs` files (production examples). See `docs/demos/VARIANTS.md`
in the Sly repo for an example "rank + publish" doc.
