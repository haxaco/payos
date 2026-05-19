/**
 * Web feature flags.
 *
 * Reads `NEXT_PUBLIC_FEATURE_<NAME>` env vars. Flags default to OFF so a
 * half-built (WIP) surface is never exposed to users until it's real and
 * backed by a working API. Enable per-flag in the deployment env, e.g.
 * `NEXT_PUBLIC_FEATURE_TEMPLATES=true`.
 *
 * NOTE: Next.js inlines NEXT_PUBLIC_* at build time, so flags must be
 * referenced via the static map below (not dynamic string interpolation).
 */
const FLAGS = {
  // Payment/stream templates — UI is mock-only, no backend yet. WIP.
  // Tracked in docs/prd/epics/stories/wip/web-templates-wip.md
  templates: process.env.NEXT_PUBLIC_FEATURE_TEMPLATES === 'true',
} as const;

export type WebFeature = keyof typeof FLAGS;

export function isWebFeatureEnabled(feature: WebFeature): boolean {
  return FLAGS[feature] === true;
}
