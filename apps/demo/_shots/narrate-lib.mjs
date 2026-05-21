/**
 * Shared narrated-video engine for the Sly demos.
 *
 * Pipeline per demo:
 *  1. ElevenLabs TTS each script beat → mp3 (+ ffprobe duration)
 *  2. Playwright records ONE continuous walkthrough; each beat's screen
 *     is held for its narration duration (+ breathing room)
 *  3. Per-beat audio is padded with trailing silence to match the held
 *     video segment, concatenated → one narration track
 *  4. ffmpeg muxes narration over the recorded video (DSF3 / crf12) with
 *     a branded title card → docs/demos/<demo>/<demo>-narrated.mp4
 *
 * Reads ELEVENLABS_API_KEY from env (never hard-coded). Voice defaults to
 * "George — Warm, Captivating Storyteller" (good for story-led narration).
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, rm, copyFile, access, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

/**
 * --only=N,M flag: re-record ONLY the listed (1-indexed) beats, reuse
 * cached per-beat video/audio for the rest, then re-mux the final mp4.
 * Drops iteration time from ~5min (full record) to ~1min (one beat).
 *
 *   First time:           node gen-x.mjs                  # full record, populates cache
 *   Iterate one beat:     node gen-x.mjs --only=3         # only beat 3 re-recorded
 *   Iterate two beats:    node gen-x.mjs --only=3,7
 *   Force full rebuild:   rm -rf apps/demo/_shots/.video-cache/<slug>
 *
 * Cache lives at apps/demo/_shots/.video-cache/<slug>/{v,a}<i>.{mp4,m4a}
 * and is NOT committed (already excluded by parent .gitignore patterns).
 *
 * If --only is set but the cache is missing for a non-recorded beat,
 * we error out with a clear message asking for a full record first.
 */
const ONLY_BEATS = (() => {
  const arg = process.argv.find((a) => a.startsWith('--only='));
  if (!arg) return null;
  const nums = arg
    .split('=')[1]
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return nums.length ? new Set(nums) : null;
})();

const run = promisify(execFile);
const EK = process.env.ELEVENLABS_API_KEY;
const VOICE = process.env.ELEVEN_VOICE_ID || 'cgSgspJ2msm6clMCkdW9'; // Jessica — playful, bright, warm
const MODEL = 'eleven_turbo_v2_5';
const VOICE_SETTINGS = { stability: 0.4, similarity_boost: 0.8, style: 0.35, speed: 1.12 };
const DSF = 3;
const X264 = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '12', '-pix_fmt', 'yuv420p'];
const PAD = 0.35; // brisk — minimal dead air after each line

const HIDE_DEV_CHROME = `
  nextjs-portal{display:none!important}
  #__next-build-watcher,[data-nextjs-toast]{display:none!important}`;

// Persistent TTS cache: unchanged narration is never re-synthesized, so
// iterating on the *visuals* costs zero ElevenLabs credits. Key = voice +
// model + settings + text, so any narration/voice change re-synths only
// the lines that changed.
const TTS_CACHE = resolve(dirname(fileURLToPath(import.meta.url)), '.tts-cache');

/** Resolve which 0-indexed beat indices to (re)record this run.
 *  Returns ALL of them if --only wasn't passed; otherwise the
 *  subset (1-indexed args translated to 0-indexed). */
function beatsToRecord(total) {
  if (!ONLY_BEATS) return Array.from({ length: total }, (_, i) => i);
  return [...ONLY_BEATS].map((n) => n - 1).filter((i) => i >= 0 && i < total);
}
const cacheKey = (text) =>
  createHash('sha256')
    .update(`${VOICE}|${MODEL}|${JSON.stringify(VOICE_SETTINGS)}|${text}`)
    .digest('hex');
const exists = (p) => access(p).then(() => true).catch(() => false);

async function tts(text, outMp3) {
  await mkdir(TTS_CACHE, { recursive: true });
  const cached = resolve(TTS_CACHE, `${cacheKey(text)}.mp3`);
  if (await exists(cached)) {
    await copyFile(cached, outMp3);
    return;
  }
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': EK, 'content-type': 'application/json' },
      body: JSON.stringify({ text, model_id: MODEL, voice_settings: VOICE_SETTINGS }),
    },
  );
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(cached, buf);
  await copyFile(cached, outMp3);
}

async function durationOf(file) {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', file,
  ]);
  return parseFloat(stdout.trim()) || 0;
}

/**
 * @param demo  e.g. 'forum'
 * @param meta  { bg, accent, kicker, title }   title-card slate
 * @param viewport {width,height}
 * @param beats  [{ text, drive: async(page)=>{} }]  drive() navigates/acts
 *               to the beat's screen BEFORE the narration is held.
 */
export async function produceNarrated(demo, meta, viewport, beats) {
  if (!EK && (!ONLY_BEATS || beatsToRecord(beats.length).length))
    throw new Error('ELEVENLABS_API_KEY not set (apps/api/.env)');
  const ROOT = resolve(
    new URL('../../..', import.meta.url).pathname,
  );
  const OUT = resolve(ROOT, `docs/demos/${demo}`);
  const TMP = resolve(OUT, '_narr');
  const CACHE = resolve(dirname(fileURLToPath(import.meta.url)), '.video-cache', demo);
  await mkdir(TMP, { recursive: true });
  await mkdir(CACHE, { recursive: true });

  // Decide which beats to (re)record this run vs. read from cache.
  const recordSet = new Set(beatsToRecord(beats.length));
  if (ONLY_BEATS) {
    console.log(
      `[${demo}] --only=${[...ONLY_BEATS].sort((a, b) => a - b).join(',')} ` +
        `→ recording ${recordSet.size} beat(s), reusing ${beats.length - recordSet.size} from cache`,
    );
    // Validate cache exists for every beat NOT in recordSet.
    const missing = [];
    for (let i = 0; i < beats.length; i++) {
      if (recordSet.has(i)) continue;
      const cv = resolve(CACHE, `v${i}.mp4`);
      const ca = resolve(CACHE, `a${i}.m4a`);
      if (!(await exists(cv)) || !(await exists(ca))) missing.push(i + 1);
    }
    if (missing.length) {
      throw new Error(
        `[${demo}] --only requires cached beats but cache is missing for: ` +
          `${missing.join(', ')}. Run a full record first (node gen-${demo}.mjs without --only) ` +
          `to populate the cache, then re-run with --only.`,
      );
    }
  }

  // 1) TTS every beat we're recording, measure durations. For cached
  //    beats, derive duration from the cached audio file (so segs[i].speech
  //    stays accurate without spending TTS credits).
  if (recordSet.size) console.log(`[${demo}] synthesizing ${recordSet.size} narration beats…`);
  const segs = [];
  for (let i = 0; i < beats.length; i++) {
    if (recordSet.has(i)) {
      const mp3 = resolve(TMP, `b${i}.mp3`);
      await tts(beats[i].text, mp3);
      const d = await durationOf(mp3);
      segs.push({ i, mp3, speech: d, hold: d + PAD });
      console.log(`  beat ${i + 1}/${beats.length}  ${d.toFixed(1)}s  "${beats[i].text.slice(0, 54)}…"`);
    } else {
      // Cached — read duration from the cached audio segment, no TTS spend.
      const ca = resolve(CACHE, `a${i}.m4a`);
      const d = await durationOf(ca);
      segs.push({ i, mp3: null, speech: d, hold: d, cached: true });
      console.log(`  beat ${i + 1}/${beats.length}  ${d.toFixed(1)}s  [cached]`);
    }
  }

  // 2) Record each beat in its OWN context at its OWN viewport (so a
  //    phone-shaped beat is recorded phone-sized and a wide beat
  //    wide-sized). Each beat's webm is later scaled+padded onto the
  //    uniform output canvas. `viewport` is the final output canvas and
  //    the default for beats that don't set their own `viewport`.
  const browser = await chromium.launch();
  const initHideChrome = async (c) => {
    await c.addInitScript(() => {
      try { localStorage.setItem('theme', 'dark'); } catch {}
    });
    await c.addInitScript((css) => {
      const add = () => {
        try {
          if (document.getElementById('__rec_hide')) return;
          const s = document.createElement('style');
          s.id = '__rec_hide';
          s.textContent = css;
          (document.head || document.documentElement).appendChild(s);
        } catch {}
      };
      if (document.readyState !== 'loading') add();
      else document.addEventListener('DOMContentLoaded', add);
      window.addEventListener('load', add);
    }, HIDE_DEV_CHROME);
  };

  /** Inject a chip-overlay (brand-styled lower-third) + a per-document
   *  scheduler that reads its schedule from sessionStorage (so it
   *  survives the climax tour's same-origin navigations). The harness
   *  primes sessionStorage right before each beat's hold begins. */
  const initChips = async (c, accent) => {
    await c.addInitScript((ACCENT) => {
      const inject = () => {
        if (document.querySelector('.__chip_root')) return;
        if (!document.body) return;
        const css = document.createElement('style');
        // Pill is responsive: wraps to 2 lines instead of clipping on
        // narrow (phone) viewports, with a smaller font + padding.
        css.textContent =
          ".__chip_root{position:fixed;left:0;right:0;bottom:48px;z-index:2147483647;pointer-events:none;display:flex;justify-content:center;padding:0 12px}" +
          ".__chip_pill{background:rgba(8,10,18,0.88);color:" + ACCENT + ";" +
          "padding:12px 24px;border-radius:999px;" +
          "font:800 16px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" +
          "letter-spacing:0.12em;text-transform:uppercase;text-align:center;" +
          "box-shadow:0 12px 32px rgba(0,0,0,0.55);" +
          "opacity:0;transition:opacity 280ms ease;" +
          "backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);" +
          "max-width:88vw;white-space:normal}" +
          ".__chip_pill.__on{opacity:1}" +
          "@media (max-width:640px){" +
          ".__chip_root{bottom:36px}" +
          ".__chip_pill{font-size:12px;padding:9px 16px;letter-spacing:0.08em;border-radius:18px;max-width:92vw}" +
          "}";
        document.head.appendChild(css);
        const root = document.createElement('div');
        root.className = '__chip_root';
        const pill = document.createElement('div');
        pill.className = '__chip_pill';
        root.appendChild(pill);
        document.body.appendChild(root);
        if (window.__chips_apply) window.__chips_apply();
      };
      const apply = () => {
        let raw;
        try { raw = sessionStorage.getItem('__chips'); } catch {}
        if (!raw) return;
        let cfg;
        try { cfg = JSON.parse(raw); } catch { return; }
        if (!cfg || !cfg.items || !cfg.startedAt) return;
        const pill = document.querySelector('.__chip_pill');
        if (!pill) return;
        const now = Date.now();
        const elapsed = now - cfg.startedAt;
        if (window.__chip_timers) window.__chip_timers.forEach((t) => clearTimeout(t));
        window.__chip_timers = [];
        for (const item of cfg.items) {
          const showAt = item.t * 1000 - elapsed;
          const hideAt = (item.t + item.dur) * 1000 - elapsed;
          if (hideAt <= 0) continue;
          window.__chip_timers.push(setTimeout(() => {
            pill.textContent = item.text;
            pill.classList.add('__on');
          }, Math.max(0, showAt)));
          window.__chip_timers.push(setTimeout(() => {
            pill.classList.remove('__on');
          }, Math.max(0, hideAt)));
        }
      };
      window.__chips_apply = apply;
      if (document.readyState !== 'loading') inject();
      else document.addEventListener('DOMContentLoaded', inject);
      window.addEventListener('load', inject);
    }, accent);
  };
  for (let i = 0; i < beats.length; i++) {
    if (!recordSet.has(i)) {
      // Cached beat — vseg/seg point straight at the cache.
      segs[i].vseg = resolve(CACHE, `v${i}.mp4`);
      segs[i].seg  = resolve(CACHE, `a${i}.m4a`);
      continue;
    }
    const bv = beats[i].viewport ?? viewport;
    const ctx = await browser.newContext({
      viewport: bv,
      deviceScaleFactor: DSF,
      recordVideo: { dir: TMP, size: bv },
    });
    await initHideChrome(ctx);
    await initChips(ctx, meta.accent || '#ffffff');
    const page = await ctx.newPage();
    const recStart = Date.now();
    // drive() navigates SILENTLY (this dead-air is cut from the final
    // video). We record WHEN the beat's screen is ready, then hold it
    // for the narration length. An optional act() runs DURING that hold
    // so on-screen motion (a tap, an approval, a settle animation) plays
    // *while the narration is spoken* instead of being cut as dead air.
    try {
      await beats[i].drive(page);
    } catch (e) {
      console.log(`  ! beat ${i + 1} drive: ${String(e).split('\n')[0]}`);
    }
    segs[i].contentStart = (Date.now() - recStart) / 1000; // hold begins
    segs[i].vw = bv;
    const holdMs = Math.ceil(segs[i].hold * 1000);

    // Prime the chip lower-third schedule for this beat. Each chip
    // shows for an equal slot of the narration with a small gap for the
    // fade. sessionStorage survives same-origin navigations during act.
    const chips = Array.isArray(beats[i].chips) ? beats[i].chips : [];
    if (chips.length) {
      const slot = segs[i].hold / chips.length;
      const items = chips.map((text, idx) => ({
        text,
        t: idx * slot + 0.12,
        dur: Math.max(0.6, slot * 0.84),
      }));
      const cfg = { items, startedAt: Date.now() };
      await page
        .evaluate((c) => {
          try { sessionStorage.setItem('__chips', JSON.stringify(c)); } catch {}
          if (window.__chips_apply) window.__chips_apply();
        }, cfg)
        .catch(() => {});
    }

    if (beats[i].act) {
      const t0 = Date.now();
      try {
        await beats[i].act(page);
      } catch (e) {
        console.log(`  ! beat ${i + 1} act: ${String(e).split('\n')[0]}`);
      }
      const used = Date.now() - t0;
      if (used < holdMs) await page.waitForTimeout(holdMs - used);
    } else {
      await page.waitForTimeout(holdMs);
    }
    const video = page.video();
    await ctx.close();
    const w = resolve(TMP, `b${i}.webm`);
    if (video) await video.saveAs(w);
    segs[i].webm = w;
    segs[i].webmDur = await durationOf(w);
  }

  // 3) Per beat: cut ONLY the screen-ready window (drop the silent
  //    navigation), and build matching audio = speech + short PAD.
  //    No leading silence anywhere → continuous, gap-free narration.
  //    Cached beats already have vseg/seg pointing at the cache and
  //    are skipped here.
  const Wo = viewport.width, Ho = viewport.height;
  const bgHex = (meta.bg || '#000000').replace('#', '');
  for (const s of segs) {
    if (s.cached) continue;
    const d = s.speech;
    const vlen = Math.max(
      d + 0.05,
      Math.min(s.hold, s.webmDur - s.contentStart - 0.05),
    );
    const vseg = resolve(TMP, `v${s.i}.mp4`);
    await run('ffmpeg', [
      '-y', '-i', s.webm,
      '-ss', s.contentStart.toFixed(3), '-t', vlen.toFixed(3),
      '-vf',
      `scale=${Wo}:${Ho}:force_original_aspect_ratio=decrease:flags=lanczos,` +
        `pad=${Wo}:${Ho}:(ow-iw)/2:(oh-ih)/2:color=0x${bgHex},` +
        `fps=30,setsar=1,format=yuv420p`,
      ...X264, '-an', vseg,
    ]);
    const aseg = resolve(TMP, `a${s.i}.m4a`);
    await run('ffmpeg', [
      '-y', '-i', s.mp3,
      '-af', 'apad', '-t', vlen.toFixed(3),
      '-c:a', 'aac', '-b:a', '160k', aseg,
    ]);
    s.vseg = vseg;
    s.seg = aseg;
    // Promote this beat to the persistent cache so future --only runs
    // can reuse it without re-recording.
    await copyFile(vseg, resolve(CACHE, `v${s.i}.mp4`));
    await copyFile(aseg, resolve(CACHE, `a${s.i}.m4a`));
  }
  const vList = resolve(TMP, 'vlist.txt');
  const aList = resolve(TMP, 'alist.txt');
  await writeFile(vList, segs.map((s) => `file '${s.vseg}'`).join('\n'));
  await writeFile(aList, segs.map((s) => `file '${s.seg}'`).join('\n'));
  const body = resolve(TMP, 'body.mp4');
  const narration = resolve(TMP, 'narration.m4a');
  await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', vList, '-c', 'copy', body]);
  await run('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', aList, '-c', 'copy', narration]);

  // 4) Branded opener/outro card — used BOTH as the ~1.5s opener and the
  //    ~3s outro. Quick enough to read "what this is", then we cut to
  //    the product fast.
  //
  //    Brand is configurable via `meta`:
  //      meta.brand     — wordmark text (default 'Sly')
  //      meta.tagline   — slogan under the wordmark (default 'The Agentic Economy Platform')
  //      meta.logoPath  — absolute path to a transparent-bg PNG icon
  //                       (default <repo-root>/docs/logos/sly-mark.png).
  //                       Pass an empty string to suppress the icon and
  //                       render the wordmark alone.
  //      meta.brandBg   — card background (default '#0a0a13')
  const card = resolve(TMP, 'card.png');
  const endcard = resolve(TMP, 'endcard.png');
  {
    const brand = meta.brand ?? 'Sly';
    const tagline = meta.tagline ?? 'The Agentic Economy Platform';
    const logoPath = meta.logoPath ?? resolve(ROOT, 'docs/logos/sly-mark.png');
    const brandBg = meta.brandBg ?? '#0a0a13';
    let markUri = '';
    if (logoPath) {
      try {
        const markPng = await readFile(logoPath);
        markUri = `data:image/png;base64,${markPng.toString('base64')}`;
      } catch {
        // Missing logo is fine — wordmark-only card.
      }
    }
    const markH = Math.round(viewport.height / 2.6);
    const wordPx = Math.round(viewport.height / 3.1);
    const sloPx = Math.round(viewport.width / 32);
    const brandCard = `<!doctype html><html><body style="margin:0">
      <div style="width:${viewport.width}px;height:${viewport.height}px;background:${brandBg};
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#fff;gap:${Math.round(viewport.height / 26)}px">
        <div style="display:flex;align-items:center;gap:${Math.round(viewport.width / 46)}px">
          ${markUri ? `<img src="${markUri}" alt="" style="height:${markH}px;width:auto" />` : ''}
          <span style="color:#fff;font-weight:800;font-size:${wordPx}px;
            line-height:1;letter-spacing:-.02em">${brand}</span>
        </div>
        <div style="color:${meta.accent};font-weight:700;
          font-size:${sloPx}px;letter-spacing:.04em;
          text-align:center">${tagline}</div>
      </div></body></html>`;
    const cctx = await browser.newContext({ viewport, deviceScaleFactor: DSF });
    const cp = await cctx.newPage();
    await cp.setContent(brandCard);
    await cp.waitForTimeout(150);
    await cp.screenshot({ path: card });
    await cp.screenshot({ path: endcard });
    await cctx.close();
  }
  await browser.close();

  const W = viewport.width, H = viewport.height;
  const final = resolve(OUT, `${demo}-narrated.mp4`);
  await run('ffmpeg', [
    '-y',
    '-loop', '1', '-t', '1.5', '-i', card,
    '-i', body,
    '-i', narration,
    '-loop', '1', '-t', '3', '-i', endcard,
    '-filter_complex',
    `[0:v]scale=${W}:${H}:flags=lanczos,fps=30,setsar=1,format=yuv420p[c];` +
      `[1:v]scale=${W}:${H}:flags=lanczos,fps=30,setsar=1,format=yuv420p[b];` +
      `[3:v]scale=${W}:${H}:flags=lanczos,fps=30,setsar=1,format=yuv420p[e];` +
      `[c][b][e]concat=n=3:v=1:a=0[v];` +
      // narration starts when the 1.5s opener ends; apad → silence over
      // the body tail + the 3s outro. [v] is the finite stream, so
      // -shortest stops exactly at the end of the outro card.
      `[2:a]adelay=1500|1500,apad[a]`,
    '-map', '[v]', '-map', '[a]',
    ...X264, '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
    '-shortest', final,
  ]);
  await rm(TMP, { recursive: true, force: true }).catch(() => {});
  const dur = await durationOf(final);
  console.log(`\n✓ ${demo}-narrated.mp4 — ${dur.toFixed(0)}s → ${final}`);
  return final;
}

/**
 * Beat-0 — the agentic-economy + Sly framing every demo opens on. Renders a
 * branded world slate (siblings named, the current one lit, "powered by Sly")
 * and narrates the setup so "Sly" is audible in the first ~10 seconds.
 *
 * @param o { demo:'Forum', bg, accent, tail }  tail = one clause naming THIS
 *          demo's job, e.g. "where a company hires its first AI employee."
 */
export function agenticIntroBeat({ demo, bg = '#0d1020', accent = '#8b9bff', tail }) {
  const SIBS = ['Coral', 'Span', 'Aster', 'Forum', 'Helix'];
  const text =
    `Agents that earn, hire, and pay each other — all running on Sly. ` +
    `This is ${demo}: ${tail}`;
  const drive = async (p) => {
    const vw = p.viewportSize() ?? { width: 1600, height: 1000 };
    const chips = SIBS.map((s) => {
      const on = s.toLowerCase() === demo.toLowerCase();
      return `<span style="padding:10px 22px;border-radius:999px;font-size:${Math.round(
        vw.width / 54,
      )}px;font-weight:700;${
        on
          ? `background:${accent};color:#0b0e1a;`
          : 'background:#ffffff14;color:#ffffffaa;'
      }">${s}</span>`;
    }).join('');
    await p.setContent(`<!doctype html><html><body style="margin:0">
      <div style="width:${vw.width}px;height:${vw.height}px;background:${bg};
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#fff;gap:30px">
        <div style="color:${accent};font-weight:800;letter-spacing:.3em;
          font-size:${Math.round(vw.width / 50)}px">THE AGENTIC ECONOMY</div>
        <div style="font-size:${Math.round(vw.width / 30)}px;font-weight:600;
          text-align:center;max-width:78%;line-height:1.2">
          Agents that earn, hire, and pay each other</div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center;
          margin-top:6px">${chips}</div>
        <div style="position:absolute;bottom:46px;color:#ffffff88;
          font-size:${Math.round(vw.width / 70)}px;letter-spacing:.22em;
          font-weight:600">ALL RUNNING ON&nbsp;&nbsp;<span style="color:${accent}">SLY</span></div>
      </div></body></html>`);
    await p.waitForTimeout(150);
  };
  return { text, drive };
}
