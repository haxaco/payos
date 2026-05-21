#!/usr/bin/env node
/**
 * Probe the current Sly demo state — tenant credentials, agent IDs,
 * and dashboard routes — straight from the gen scripts that produce
 * the videos. The gen scripts are the source of truth for what the
 * recording pipeline uses; if these get stale, pre-flight catches it.
 *
 * Use this when:
 *   - You're about to write a new demo and want the current ID map
 *   - The /sly-demo skill's embedded table looks stale
 *   - You reseeded and want to confirm IDs still match
 *
 * Run: node apps/demo/_shots/lib/probe-sly-state.mjs
 *   or: node apps/demo/_shots/lib/probe-sly-state.mjs --markdown
 *
 * Output: human-readable summary (default) or markdown tables (--markdown)
 * suitable for pasting into the skill or a doc.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath, dirname, basename } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolvePath(HERE, '..');
const ROOT = resolvePath(HERE, '../../../..');
const SEED_DIR = resolvePath(ROOT, 'apps/demo/_seed');

const args = process.argv.slice(2);
const FMT = args.includes('--markdown') ? 'md' : 'txt';

/** Extract `{ email, password }` LOGIN constants and bare AGENT_ID
 *  / *_ACCOUNT_ID constants from a gen script. */
function probeGenScript(file) {
  const src = readFileSync(file, 'utf8');
  const logins = [];
  const ids = [];
  const routes = new Set();
  // LOGIN-shaped: const X_LOGIN = { email: '...', password: '...' };
  for (const m of src.matchAll(
    /const\s+([A-Z_]+_LOGIN)\s*=\s*\{\s*email:\s*['"]([^'"]+)['"]\s*,\s*password:\s*['"]([^'"]+)['"]/g,
  )) {
    logins.push({ var: m[1], email: m[2], password: m[3] });
  }
  // UUID-shaped ID constants: const FOO_AGENT_ID = '...uuid...';
  // Match common naming patterns: *_AGENT_ID, *_ACCOUNT_ID, AGENT_ID, *_ID
  for (const m of src.matchAll(
    /const\s+([A-Z_]+(?:_AGENT_ID|_ACCOUNT_ID|_ID))\s*=\s*['"]([a-f0-9-]{20,})['"];?/g,
  )) {
    ids.push({ var: m[1], value: m[2] });
  }
  // Dashboard routes hit by the demo
  for (const m of src.matchAll(/\/dashboard\/[\w/-]+/g)) {
    routes.add(m[0].replace(/\$\{[^}]+\}/g, ':id'));
  }
  return { logins, ids, routes: [...routes].sort() };
}

/** Walk the gen scripts and union their probes. */
function probeAllGenScripts() {
  const files = readdirSync(SHOTS)
    .filter((f) => /^gen-[\w-]+\.mjs$/.test(f))
    .sort()
    .map((f) => resolvePath(SHOTS, f));

  const byScript = {};
  const allLogins = new Map();
  const allIds = new Map();
  const allRoutes = new Map();

  for (const file of files) {
    const slug = basename(file).replace(/^gen-|\.mjs$/g, '');
    const { logins, ids, routes } = probeGenScript(file);
    byScript[slug] = { logins, ids, routes };

    for (const l of logins) {
      if (!allLogins.has(l.email)) allLogins.set(l.email, { ...l, usedBy: [] });
      allLogins.get(l.email).usedBy.push(slug);
    }
    for (const i of ids) {
      if (!allIds.has(i.value)) allIds.set(i.value, { ...i, usedBy: [] });
      allIds.get(i.value).usedBy.push(slug);
    }
    for (const r of routes) {
      if (!allRoutes.has(r)) allRoutes.set(r, []);
      allRoutes.get(r).push(slug);
    }
  }

  return { byScript, allLogins, allIds, allRoutes };
}

/** Walk seed-*-demo.ts files and extract agent IDs that they create.
 *  Best-effort string extraction — the seeds use mixed patterns. */
function probeSeeds() {
  if (!safeStat(SEED_DIR)) return [];
  const files = readdirSync(SEED_DIR)
    .filter((f) => /^seed-[\w-]+-demo\.ts$/.test(f))
    .sort()
    .map((f) => resolvePath(SEED_DIR, f));
  const out = [];
  for (const file of files) {
    const slug = basename(file).replace(/^seed-|-demo\.ts$/g, '');
    let src;
    try { src = readFileSync(file, 'utf8'); } catch { continue; }
    // Pull agent creation calls that include a `name:` and an id-like
    // value. We don't try to be exhaustive — just enough to spot
    // mismatches with the gen scripts.
    const names = [];
    for (const m of src.matchAll(/name:\s*['"]([^'"]{1,80})['"]/g)) {
      const name = m[1];
      if (/agent|kya|account|tenant/i.test(name)) names.push(name);
    }
    out.push({ slug, file: basename(file), agentNamesSeen: [...new Set(names)] });
  }
  return out;
}

function safeStat(p) {
  try {
    readFileSync(p);
    return true;
  } catch {
    try {
      readdirSync(p);
      return true;
    } catch {
      return false;
    }
  }
}

// ── Render ───────────────────────────────────────────────────────────

function renderTxt(state, seeds) {
  const lines = [];
  lines.push('# Sly demo state — current ID/cred map\n');
  lines.push(`Generated from ${Object.keys(state.byScript).length} gen scripts in apps/demo/_shots/`);
  lines.push('');

  lines.push('## Tenants (LOGIN constants)');
  lines.push('');
  for (const l of [...state.allLogins.values()].sort((a, b) => a.email.localeCompare(b.email))) {
    lines.push(`  ${l.email}  /  ${l.password}`);
    lines.push(`    → var ${l.var}  in: ${l.usedBy.join(', ')}`);
  }
  lines.push('');

  lines.push('## Agent / account IDs');
  lines.push('');
  for (const i of [...state.allIds.values()].sort((a, b) => a.var.localeCompare(b.var))) {
    lines.push(`  ${i.var.padEnd(28)} ${i.value}`);
    lines.push(`    in: ${i.usedBy.join(', ')}`);
  }
  lines.push('');

  lines.push('## Dashboard routes referenced');
  lines.push('');
  for (const [r, scripts] of [...state.allRoutes.entries()].sort()) {
    lines.push(`  ${r}`);
    lines.push(`    used by: ${scripts.join(', ')}`);
  }
  lines.push('');

  if (seeds.length) {
    lines.push('## Seed files (agent/account names they create)');
    lines.push('');
    for (const s of seeds) {
      lines.push(`  ${s.file}`);
      for (const n of s.agentNamesSeen.slice(0, 6)) lines.push(`    - ${n}`);
      if (s.agentNamesSeen.length > 6) lines.push(`    … +${s.agentNamesSeen.length - 6} more`);
    }
  }

  return lines.join('\n');
}

function renderMd(state, seeds) {
  const lines = [];
  lines.push('# Sly demo state\n');
  lines.push(`Generated from ${Object.keys(state.byScript).length} gen scripts in \`apps/demo/_shots/\`.\n`);

  lines.push('## Tenants\n');
  lines.push('| Email | Password | Used by |');
  lines.push('|---|---|---|');
  for (const l of [...state.allLogins.values()].sort((a, b) => a.email.localeCompare(b.email))) {
    lines.push(`| \`${l.email}\` | \`${l.password}\` | ${l.usedBy.join(', ')} |`);
  }
  lines.push('');

  lines.push('## Agent / account IDs\n');
  lines.push('| Constant | Value | Used by |');
  lines.push('|---|---|---|');
  for (const i of [...state.allIds.values()].sort((a, b) => a.var.localeCompare(b.var))) {
    lines.push(`| \`${i.var}\` | \`${i.value}\` | ${i.usedBy.join(', ')} |`);
  }
  lines.push('');

  lines.push('## Dashboard routes\n');
  lines.push('| Route | Used by |');
  lines.push('|---|---|');
  for (const [r, scripts] of [...state.allRoutes.entries()].sort()) {
    lines.push(`| \`${r}\` | ${scripts.join(', ')} |`);
  }
  lines.push('');

  if (seeds.length) {
    lines.push('## Seed files\n');
    lines.push('| Seed | Entities seeded |');
    lines.push('|---|---|');
    for (const s of seeds) {
      const names = s.agentNamesSeen.slice(0, 6).join(' · ');
      lines.push(`| \`${s.file}\` | ${names}${s.agentNamesSeen.length > 6 ? ' …' : ''} |`);
    }
  }

  return lines.join('\n');
}

// ── Main ─────────────────────────────────────────────────────────────

const state = probeAllGenScripts();
const seeds = probeSeeds();
process.stdout.write((FMT === 'md' ? renderMd : renderTxt)(state, seeds));
process.stdout.write('\n');
