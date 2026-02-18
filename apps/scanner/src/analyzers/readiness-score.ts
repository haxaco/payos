import { computeReadinessScore, getReadinessGrade } from '@sly/utils';
import type { ReadinessScoreInput, ReadinessScoreResult } from '@sly/utils';
import type { ProbeResult } from '../probes/types.js';

export { computeReadinessScore, getReadinessGrade };
export type { ReadinessScoreInput, ReadinessScoreResult };

export function computeScoreFromScanResults(
  probeResults: ProbeResult[],
  structuredData: {
    has_schema_product: boolean;
    has_schema_offer: boolean;
    has_schema_organization: boolean;
    has_json_ld: boolean;
    has_open_graph: boolean;
    has_microdata: boolean;
    product_count: number;
    products_with_price: number;
    products_with_availability: number;
    products_with_sku: number;
    products_with_image: number;
  },
  accessibility: {
    robots_txt_exists: boolean;
    robots_blocks_gptbot: boolean;
    robots_blocks_claudebot: boolean;
    robots_blocks_all_bots: boolean;
    robots_allows_agents: boolean;
    has_captcha: boolean;
    requires_javascript: boolean;
    guest_checkout_available: boolean;
    requires_account: boolean;
    checkout_steps_count?: number;
    payment_processors: string[];
    supports_digital_wallets: boolean;
    supports_crypto: boolean;
    supports_pix: boolean;
    supports_spei: boolean;
  },
): ReadinessScoreResult {
  return computeReadinessScore({
    protocol: probeResults.map(p => ({
      protocol: p.protocol,
      detected: p.detected,
      is_functional: p.is_functional,
    })),
    structured: structuredData,
    accessibility,
  });
}
