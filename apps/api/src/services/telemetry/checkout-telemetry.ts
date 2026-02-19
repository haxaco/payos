/**
 * Checkout Telemetry Service (Story 56.22)
 *
 * Fire-and-forget telemetry for checkout events across all 4 protocols.
 * Records demand signals to the global checkout_telemetry table.
 * Never blocks checkout flows — errors are logged via console.warn.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CheckoutTelemetryEvent, MerchantDemandSignal } from '@sly/types';

export function createCheckoutTelemetryService(supabase: SupabaseClient) {
  /**
   * Record a telemetry event (fire-and-forget).
   * Never throws — errors are logged via console.warn.
   */
  function record(event: CheckoutTelemetryEvent): void {
    const domain = event.merchant_domain
      ? extractMerchantDomain(event.merchant_domain)
      : event.merchant_id
        ? extractMerchantDomain(event.merchant_id)
        : null;

    supabase
      .from('checkout_telemetry')
      .insert({
        protocol: event.protocol,
        event_type: event.event_type,
        success: event.success,
        merchant_id: event.merchant_id || null,
        merchant_domain: domain,
        merchant_name: event.merchant_name || null,
        failure_reason: event.failure_reason || null,
        failure_code: event.failure_code || null,
        error_details: event.error_details || null,
        agent_id: event.agent_id || null,
        agent_name: event.agent_name || null,
        kya_tier: event.kya_tier ?? null,
        amount: event.amount ?? null,
        currency: event.currency || null,
        protocol_metadata: event.protocol_metadata || {},
      })
      .then(({ error }) => {
        if (error) {
          console.warn('[Telemetry] Failed to record event:', error.message);
        }
      });
  }

  /**
   * Query top merchants by checkout attempt count.
   * Aggregates in app code since Supabase JS lacks GROUP BY.
   */
  async function getTopMerchants(options: {
    limit?: number;
    since?: string;
    failures_only?: boolean;
  } = {}): Promise<MerchantDemandSignal[]> {
    const limit = options.limit || 20;

    let query = supabase
      .from('checkout_telemetry')
      .select('merchant_domain, merchant_name, success, failure_reason, protocol, agent_id, created_at');

    if (options.since) {
      query = query.gte('created_at', options.since);
    }

    // Filter out rows without a merchant_domain
    query = query.not('merchant_domain', 'is', null);

    const { data, error } = await query;

    if (error) {
      console.warn('[Telemetry] Failed to query telemetry:', error.message);
      return [];
    }

    // Aggregate by merchant_domain
    const byDomain: Record<string, {
      merchant_name?: string;
      total: number;
      failed: number;
      failure_reasons: Record<string, number>;
      protocols: Set<string>;
      agents: Set<string>;
      first_seen: string;
      last_seen: string;
    }> = {};

    for (const row of (data || [])) {
      const domain = row.merchant_domain;
      if (!domain) continue;

      if (!byDomain[domain]) {
        byDomain[domain] = {
          merchant_name: row.merchant_name || undefined,
          total: 0,
          failed: 0,
          failure_reasons: {},
          protocols: new Set(),
          agents: new Set(),
          first_seen: row.created_at,
          last_seen: row.created_at,
        };
      }

      const entry = byDomain[domain];
      entry.total++;
      if (!row.success) {
        entry.failed++;
        if (row.failure_reason) {
          entry.failure_reasons[row.failure_reason] = (entry.failure_reasons[row.failure_reason] || 0) + 1;
        }
      }
      entry.protocols.add(row.protocol);
      if (row.agent_id) entry.agents.add(row.agent_id);
      if (row.merchant_name && !entry.merchant_name) entry.merchant_name = row.merchant_name;
      if (row.created_at < entry.first_seen) entry.first_seen = row.created_at;
      if (row.created_at > entry.last_seen) entry.last_seen = row.created_at;
    }

    let signals: MerchantDemandSignal[] = Object.entries(byDomain).map(([domain, info]) => ({
      merchant_domain: domain,
      merchant_name: info.merchant_name,
      total_attempts: info.total,
      failed_attempts: info.failed,
      success_rate: info.total > 0 ? Math.round(((info.total - info.failed) / info.total) * 100) : 0,
      failure_reasons: info.failure_reasons,
      protocols_attempted: Array.from(info.protocols),
      unique_agents: info.agents.size,
      first_seen: info.first_seen,
      last_seen: info.last_seen,
    }));

    if (options.failures_only) {
      signals = signals.filter(s => s.failed_attempts > 0);
    }

    // Sort by total attempts descending
    signals.sort((a, b) => b.total_attempts - a.total_attempts);

    return signals.slice(0, limit);
  }

  return { record, getTopMerchants };
}

/**
 * Extract bare domain from URLs, merchant IDs, or domain strings.
 * Returns null if extraction fails.
 */
export function extractMerchantDomain(input: string): string | null {
  if (!input) return null;

  try {
    // If it looks like a URL, parse it
    if (input.startsWith('http://') || input.startsWith('https://')) {
      const url = new URL(input);
      return url.hostname.replace(/^www\./, '');
    }

    // If it contains dots and looks like a domain
    if (input.includes('.') && !input.includes(' ')) {
      // Try parsing as URL with protocol prefix
      try {
        const url = new URL(`https://${input}`);
        return url.hostname.replace(/^www\./, '');
      } catch {
        // Fall through
      }
    }

    // Return as-is if it looks like a simple identifier (merchant_id)
    if (/^[a-zA-Z0-9._-]+$/.test(input)) {
      return input.toLowerCase();
    }

    return null;
  } catch {
    return null;
  }
}
