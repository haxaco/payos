import type { BusinessModel } from '@sly/types';
import type { ProbeResult } from '../probes/types.js';

interface ClassificationInput {
  merchant_category?: string;
  ecommerce_platform?: string;
  has_schema_product: boolean;
  has_schema_offer: boolean;
  product_count: number;
  html_signals?: HtmlSignals;
  has_homepage?: boolean;
  detected_protocols?: string[];
}

interface HtmlSignals {
  has_api_docs: boolean;
  has_pricing_page: boolean;
  has_blog: boolean;
  has_signup: boolean;
}

// Protocol applicability: which protocols make sense for which business models
const PROTOCOL_APPLICABILITY: Record<BusinessModel, Set<string>> = {
  retail: new Set(['ucp', 'acp', 'ap2', 'mcp', 'nlweb', 'visa_vic', 'mastercard_agentpay']),
  marketplace: new Set(['ucp', 'acp', 'ap2', 'mcp', 'nlweb', 'visa_vic', 'mastercard_agentpay']),
  saas: new Set(['acp', 'ap2', 'mcp', 'x402']),
  api_provider: new Set(['x402', 'mcp', 'ap2']),
  content: new Set(['x402', 'mcp', 'nlweb']),
};

/**
 * Classify a merchant's business model based on available signals.
 * Priority: user-provided category > platform > structured data > defaults
 */
export function classifyBusinessModel(input: ClassificationInput): BusinessModel {
  // 1. User-provided category (highest priority)
  if (input.merchant_category) {
    const mapped = mapCategoryToModel(input.merchant_category);
    if (mapped) return mapped;
  }

  // 2. Detected platform implies business model
  if (input.ecommerce_platform) {
    const platformModel = mapPlatformToModel(input.ecommerce_platform);
    if (platformModel) return platformModel;
  }

  // 3. Structured data signals
  if (input.has_schema_product || input.product_count > 0) {
    return 'retail';
  }

  // 4. HTML signals
  if (input.html_signals) {
    if (input.html_signals.has_api_docs) return 'api_provider';
    if (input.html_signals.has_pricing_page && input.html_signals.has_signup) return 'saas';
    if (input.html_signals.has_blog && !input.html_signals.has_pricing_page) return 'content';
  }

  // 5. Protocol-based inference: if x402 is confirmed, likely an API provider
  if (input.detected_protocols?.includes('x402')) return 'api_provider';

  // 6. No homepage + no platform + no products = likely API service, not retail
  if (input.has_homepage === false && !input.ecommerce_platform && !input.has_schema_product) {
    return 'api_provider';
  }

  // Default: retail (most common for commerce scanning)
  return 'retail';
}

function mapCategoryToModel(category: string): BusinessModel | null {
  const lower = category.toLowerCase();
  if (['retail', 'restaurant', 'travel'].includes(lower)) return 'retail';
  if (['saas', 'fintech', 'healthcare'].includes(lower)) return 'saas';
  if (['marketplace'].includes(lower)) return 'marketplace';
  if (['media'].includes(lower)) return 'content';
  if (['b2b'].includes(lower)) return 'saas';
  return null;
}

function mapPlatformToModel(platform: string): BusinessModel | null {
  const lower = platform.toLowerCase();
  if (['shopify', 'woocommerce', 'magento', 'bigcommerce', 'prestashop', 'salesforce_commerce', 'squarespace', 'wix'].includes(lower)) {
    return 'retail';
  }
  if (['etsy', 'amazon', 'ebay', 'walmart', 'mercadolibre'].includes(lower)) return 'marketplace';
  return null;
}

/**
 * Mark protocols as not_applicable based on business model.
 * e.g. x402 is not applicable to retail stores.
 */
export function applyBusinessModelFilter(
  probeResults: ProbeResult[],
  businessModel: BusinessModel,
): ProbeResult[] {
  const applicable = PROTOCOL_APPLICABILITY[businessModel];

  return probeResults.map(result => {
    // Don't override confirmed detections — if it's actually there, report it
    if (result.status === 'confirmed') return result;

    if (!applicable.has(result.protocol) && result.status === 'not_detected') {
      return {
        ...result,
        status: 'not_applicable' as const,
        confidence: 'high' as const,
      };
    }

    return result;
  });
}
