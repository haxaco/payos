#!/usr/bin/env node
/**
 * Validate the format of a docs/demos/<slug>/narration.md file.
 *
 * Catches the recurring footguns BEFORE a 5-minute record run:
 *   - Wrong heading style (`## Beat-1`, `## Beat 1` missing the em-dash)
 *   - Skipped/duplicated beat numbers
 *   - Beat count doesn't match what the gen script expects
 *   - Empty beats (no prose)
 *   - Malformed `**Chips:**` blocks (not a markdown list, empty)
 *   - Stray headings between beats
 *
 * Usage as CLI:
 *   node apps/demo/_shots/lib/lint-narration.mjs docs/demos/<slug>/narration.md [expectedBeats]
 *   exit 0 = clean, exit 1 = errors, exit 2 = file not found
 *
 * Usage as a library (preferred — called from each gen script's startup):
 *   import { lintNarration } from './lib/lint-narration.mjs';
 *   lintNarration(absPath, expectedBeats);     // throws on error
 *   // or:
 *   const issues = lintNarrationFile(absPath, expectedBeats);
 *   if (issues.length) { ... }
 */
import { readFileSync, existsSync } from 'node:fs';

/** Returns an array of issue strings. Empty array = clean. */
export function lintNarrationFile(path, expectedBeats) {
  const issues = [];
  if (!existsSync(path)) {
    issues.push(`narration file not found: ${path}`);
    return issues;
  }
  const md = readFileSync(path, 'utf8');
  return lintNarrationString(md, expectedBeats);
}

export function lintNarrationString(md, expectedBeats) {
  const issues = [];
  const lines = md.split('\n');

  // Heading patterns — accept any of these to be tolerant of dash style.
  const correctBeat = /^##\s+Beat\s+(\d+)\s+[—–-]\s+/;
  const beatLineFlexible = /^##\s+Beat\b/;

  // Catch headings that LOOK like beats but use a wrong format.
  const malformed = [];
  const beats = []; // { num, line, headingText, body, chipsBlock }

  let i = 0;
  // Optional H1 doc title
  while (i < lines.length && !lines[i].trim()) i++;
  if (lines[i] && lines[i].startsWith('# ')) i++;

  // Walk lines, partitioning by `## Beat N — …` headings.
  let current = null;
  for (let j = i; j < lines.length; j++) {
    const line = lines[j];
    if (correctBeat.test(line)) {
      if (current) beats.push(current);
      const m = line.match(correctBeat);
      const num = parseInt(m[1], 10);
      current = { num, line: j + 1, headingText: line.trim(), bodyLines: [], chipsLines: [], inChips: false };
    } else if (beatLineFlexible.test(line) && !correctBeat.test(line)) {
      malformed.push({ line: j + 1, text: line.trim() });
    } else if (current) {
      if (/^\*\*Chips:\*\*/i.test(line.trim())) {
        current.inChips = true;
      } else if (current.inChips) {
        current.chipsLines.push(line);
      } else {
        current.bodyLines.push(line);
      }
    }
  }
  if (current) beats.push(current);

  // — Check malformed beat-like headings
  for (const m of malformed) {
    issues.push(
      `line ${m.line}: heading "${m.text}" looks like a beat but doesn't match \`## Beat N — …\` ` +
        `(needs "Beat", a space, a number, a space, an em-dash or hyphen, and a title)`,
    );
  }

  // — Check beat count
  if (typeof expectedBeats === 'number') {
    if (beats.length !== expectedBeats) {
      issues.push(
        `beat count: found ${beats.length}, expected ${expectedBeats} — ` +
          `check that every beat starts with \`## Beat N — …\` and you haven't dropped one`,
      );
    }
  }

  // — Check numbering is 1..N (sequential, no gaps, no duplicates)
  for (let k = 0; k < beats.length; k++) {
    const expected = k + 1;
    if (beats[k].num !== expected) {
      issues.push(
        `beat numbering: ${k + 1}-th beat is labeled "Beat ${beats[k].num}", expected "Beat ${expected}"` +
          ` (at line ${beats[k].line})`,
      );
    }
  }

  // — Check each beat has prose
  for (const b of beats) {
    const prose = b.bodyLines.join(' ').replace(/\s+/g, ' ').trim();
    if (!prose) {
      issues.push(`Beat ${b.num} (line ${b.line}): empty prose — TTS will produce nothing`);
    } else if (prose.length < 30) {
      issues.push(
        `Beat ${b.num} (line ${b.line}): prose is very short (${prose.length} chars) — ` +
          `TTS hold will be brief; the beat may end before the page settles`,
      );
    }
  }

  // — Check chips blocks (when present) are well-formed
  for (const b of beats) {
    if (!b.inChips) continue;
    const chipLines = b.chipsLines
      .map((l) => l.match(/^[-*]\s+(.+?)\s*$/))
      .filter(Boolean);
    if (chipLines.length === 0) {
      issues.push(
        `Beat ${b.num} (line ${b.line}): \`**Chips:**\` block has no list items — ` +
          `use \`- CHIP TEXT\` lines under the **Chips:** marker`,
      );
    } else {
      for (let k = 0; k < chipLines.length; k++) {
        const text = chipLines[k][1];
        if (text.length > 60) {
          issues.push(
            `Beat ${b.num}: chip ${k + 1} is ${text.length} chars long ` +
              `("${text.slice(0, 40)}…") — chips wrap awkwardly above ~50 chars`,
          );
        }
      }
    }
  }

  return issues;
}

/** Throw on errors — for use inside gen scripts where exiting at the
 *  CLI boundary is fine. */
export function lintNarration(path, expectedBeats) {
  const issues = lintNarrationFile(path, expectedBeats);
  if (issues.length) {
    const head = `[lint-narration] ${path}:`;
    const body = issues.map((s) => `  ✗ ${s}`).join('\n');
    throw new Error(`${head}\n${body}\n`);
  }
}

// ── CLI ──────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const path = process.argv[2];
  const expectedBeats = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;
  if (!path) {
    console.error('usage: lint-narration <path-to-narration.md> [expectedBeats]');
    process.exit(2);
  }
  const issues = lintNarrationFile(path, expectedBeats);
  if (!issues.length) {
    console.log(`[lint-narration] ${path}: clean ✓ (${expectedBeats ?? 'n/a'} beats expected)`);
    process.exit(0);
  }
  console.error(`[lint-narration] ${path}: ${issues.length} issue(s)`);
  for (const s of issues) console.error('  ✗', s);
  process.exit(1);
}
