/**
 * Demo branding lookup — YC two-tenant demo (Invu POS × Plumex).
 *
 * Hardcoded shortcut for filming. The real `tenants.branding` JSONB column +
 * dashboard layout integration ships next week. Until then, the dashboard
 * detects these tenant UUIDs and applies a per-tenant logo + accent.
 *
 * Tenant UUIDs are populated by `apps/api/scripts/seed-yc-demo.ts`. If you
 * re-run the seed against a fresh Supabase project, copy the printed UUIDs
 * back into this file.
 */

export interface DemoBranding {
  /** Display name shown in the header. */
  name: string;
  /** Short suffix shown after the name (e.g. role tag). Optional. */
  tagline?: string;
  /** Two-letter code for the avatar fallback when no logo is rendered. */
  initials: string;
  /** Tailwind gradient utility — applied to the rounded brand chip. */
  gradient: string;
  /** Hex accent used for the small status dot beside the chip. */
  dotColor: string;
  /** Country code for the flag emoji shown beside the name. */
  countryFlag: string;
  /** Optional one-line description of the tenant — shown only on the dashboard home. */
  description?: string;
}

export const DEMO_BRANDING: Record<string, DemoBranding> = {
  // Invu POS — host / processor tenant
  '00000000-1a00-de00-0000-000000000001': {
    name: 'Invu POS',
    tagline: 'Processor',
    initials: 'IV',
    gradient: 'from-rose-600 to-red-700',
    dotColor: '#E11D48',
    countryFlag: '🇵🇦',
    description: 'Latin American merchant processor — Panama, Costa Rica, DR, Colombia.',
  },
  // Plumex — Prague-based EU crypto wallet provider (partner tenant)
  'f83f1ce0-397f-49de-9a0d-de527e205a1b': {
    name: 'Plumex',
    tagline: 'EU Wallet',
    initials: 'PX',
    gradient: 'from-violet-600 to-indigo-700',
    dotColor: '#7C3AED',
    countryFlag: '🇨🇿',
    description: 'Prague-based crypto wallet for European agentic checkout.',
  },
};

/**
 * Returns the demo branding for a tenant, or null if the tenant is not part of
 * the YC demo (in which case the dashboard falls back to its generic chrome).
 */
export function getDemoBranding(tenantId: string | null | undefined): DemoBranding | null {
  if (!tenantId) return null;
  return DEMO_BRANDING[tenantId] ?? null;
}
