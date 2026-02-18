import type { ProbeResult } from '../probes/types.js';

interface AccessibilityData {
  ecommerce_platform?: string;
  payment_processors: string[];
}

/**
 * Post-processing step that enriches probe results with eligibility signals
 * based on cross-cutting data from accessibility analysis.
 *
 * e.g. Stripe.js detected + ACP not confirmed → ACP status: 'eligible'
 * e.g. Shopify platform → UCP + ACP status: 'platform_enabled'
 */
export function enrichProbeResults(
  probeResults: ProbeResult[],
  accessibility: AccessibilityData,
): ProbeResult[] {
  const platform = accessibility.ecommerce_platform?.toLowerCase();
  const processors = accessibility.payment_processors.map(p => p.toLowerCase());
  const hasStripe = processors.includes('stripe');

  return probeResults.map(result => {
    // Don't downgrade confirmed results
    if (result.status === 'confirmed') return result;

    const enriched = { ...result };

    // Platform-enabled signals
    // ACP = OpenAI + Stripe Agentic Commerce Protocol (powers ChatGPT Instant Checkout)
    if (platform === 'shopify') {
      if (result.protocol === 'ucp' && result.status === 'not_detected') {
        enriched.status = 'platform_enabled';
        enriched.confidence = 'medium';
        enriched.eligibility_signals = [...(enriched.eligibility_signals || []), 'Shopify platform supports UCP integration'];
      }
      if (result.protocol === 'acp' && result.status === 'not_detected') {
        enriched.status = 'platform_enabled';
        enriched.confidence = 'medium';
        enriched.eligibility_signals = [...(enriched.eligibility_signals || []), 'Shopify supports ACP — ChatGPT Instant Checkout available via platform'];
      }
    }

    if (platform === 'etsy') {
      if (result.protocol === 'acp' && result.status === 'not_detected') {
        enriched.status = 'platform_enabled';
        enriched.confidence = 'high';
        enriched.eligibility_signals = [...(enriched.eligibility_signals || []), 'Etsy has live ACP integration — ChatGPT Instant Checkout enabled'];
      }
    }

    if (platform === 'amazon') {
      if (result.protocol === 'acp' && result.status === 'not_detected') {
        enriched.status = 'platform_enabled';
        enriched.confidence = 'low';
        enriched.eligibility_signals = [...(enriched.eligibility_signals || []), 'Amazon marketplace can support ACP integration'];
      }
    }

    if (platform === 'woocommerce') {
      if (result.protocol === 'ucp' && result.status === 'not_detected') {
        enriched.status = 'platform_enabled';
        enriched.confidence = 'medium';
        enriched.eligibility_signals = [...(enriched.eligibility_signals || []), 'WooCommerce platform supports UCP plugin'];
      }
    }

    if (platform === 'bigcommerce') {
      if (result.protocol === 'ucp' && result.status === 'not_detected') {
        enriched.status = 'platform_enabled';
        enriched.confidence = 'low';
        enriched.eligibility_signals = [...(enriched.eligibility_signals || []), 'BigCommerce platform can support UCP integration'];
      }
    }

    // Payment processor eligibility signals (only if not already platform_enabled)
    if (enriched.status === 'not_detected') {
      if (hasStripe && result.protocol === 'acp') {
        enriched.status = 'eligible';
        enriched.confidence = 'medium';
        enriched.eligibility_signals = [...(enriched.eligibility_signals || []), 'Stripe detected — can enable ACP (ChatGPT Instant Checkout) via Stripe integration'];
      }
    }

    return enriched;
  });
}
