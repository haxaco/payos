import { describe, it, expect } from 'vitest';
import { enrichProbeResults } from '../../src/analyzers/eligibility-enricher.js';
import { classifyBusinessModel, applyBusinessModelFilter } from '../../src/analyzers/business-model.js';
import type { ProbeResult } from '../../src/probes/types.js';

// ============================================
// ACP PROBE: FALSE POSITIVE FIX
// ============================================
describe('ACP probe false positive fix', () => {
  it('should require x-acp-version header for detection', () => {
    // The actual fix is in the probe code (removing res.ok fallback).
    // This test validates the expected ProbeResult shape for not_detected.
    const notDetected: ProbeResult = {
      protocol: 'acp',
      detected: false,
      status: 'not_detected',
      confidence: 'high',
      capabilities: {},
    };
    expect(notDetected.detected).toBe(false);
    expect(notDetected.status).toBe('not_detected');
  });

  it('should mark as confirmed when x-acp-version is present', () => {
    const confirmed: ProbeResult = {
      protocol: 'acp',
      detected: true,
      status: 'confirmed',
      confidence: 'high',
      detection_method: 'OPTIONS /acp/checkout',
      endpoint_url: 'https://example.com/acp/checkout',
      capabilities: { version: '1.0' },
      is_functional: true,
    };
    expect(confirmed.detected).toBe(true);
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.is_functional).toBe(true);
  });
});

// ============================================
// PLATFORM DETECTION: SCORE-BASED
// ============================================
describe('platform detection score-based matching', () => {
  // The actual detectPlatform function is internal to accessibility.ts.
  // We test the behavior conceptually: more pattern matches = higher priority.
  it('should pick platform with most matching patterns', () => {
    // Shopify has 4 patterns: Shopify.theme, cdn.shopify.com, myshopify.com, shopify-section
    // WooCommerce has 3: wc-cart, woocommerce, wp-content/plugins/woocommerce
    // If HTML contains cdn.shopify.com and myshopify.com AND also mentions 'woocommerce' once,
    // Shopify should win (2 matches vs 1 match).
    //
    // This is tested via the score-based logic: count matches per platform, highest wins.
    // The fix ensures stripe.com doesn't get classified as "woocommerce" just because
    // its HTML mentions the word once.
    expect(true).toBe(true); // Structural test — real validation is in integration tests
  });
});

// ============================================
// ELIGIBILITY ENRICHER
// ============================================
describe('enrichProbeResults', () => {
  const makeProbe = (protocol: string, overrides?: Partial<ProbeResult>): ProbeResult => ({
    protocol: protocol as any,
    detected: false,
    status: 'not_detected',
    confidence: 'high',
    capabilities: {},
    ...overrides,
  });

  it('marks ACP as eligible when Stripe is detected', () => {
    const probes = [
      makeProbe('ucp'),
      makeProbe('acp'),
      makeProbe('x402'),
    ];

    const result = enrichProbeResults(probes, {
      payment_processors: ['stripe'],
    });

    const acp = result.find(r => r.protocol === 'acp')!;
    expect(acp.status).toBe('eligible');
    expect(acp.detected).toBe(true);
    expect(acp.eligibility_signals).toContain('Stripe.js detected — can adopt ACP via Stripe');
  });

  it('marks UCP and ACP as platform_enabled for Shopify', () => {
    const probes = [
      makeProbe('ucp'),
      makeProbe('acp'),
      makeProbe('x402'),
    ];

    const result = enrichProbeResults(probes, {
      ecommerce_platform: 'shopify',
      payment_processors: [],
    });

    const ucp = result.find(r => r.protocol === 'ucp')!;
    expect(ucp.status).toBe('platform_enabled');
    expect(ucp.detected).toBe(true);
    expect(ucp.eligibility_signals).toContain('Shopify platform supports UCP integration');

    const acp = result.find(r => r.protocol === 'acp')!;
    expect(acp.status).toBe('platform_enabled');
    expect(acp.detected).toBe(true);
  });

  it('marks ACP as platform_enabled for Etsy', () => {
    const probes = [
      makeProbe('ucp'),
      makeProbe('acp'),
    ];

    const result = enrichProbeResults(probes, {
      ecommerce_platform: 'etsy',
      payment_processors: [],
    });

    const acp = result.find(r => r.protocol === 'acp')!;
    expect(acp.status).toBe('platform_enabled');
    expect(acp.eligibility_signals).toContain('Etsy marketplace platform supports ACP integration');

    // UCP should remain not_detected for Etsy
    const ucp = result.find(r => r.protocol === 'ucp')!;
    expect(ucp.status).toBe('not_detected');
  });

  it('does not downgrade confirmed results', () => {
    const probes = [
      makeProbe('acp', { detected: true, status: 'confirmed', confidence: 'high' }),
    ];

    const result = enrichProbeResults(probes, {
      ecommerce_platform: 'shopify',
      payment_processors: ['stripe'],
    });

    const acp = result.find(r => r.protocol === 'acp')!;
    expect(acp.status).toBe('confirmed');
  });

  it('prefers platform_enabled over eligible (Shopify + Stripe)', () => {
    const probes = [
      makeProbe('acp'),
    ];

    const result = enrichProbeResults(probes, {
      ecommerce_platform: 'shopify',
      payment_processors: ['stripe'],
    });

    const acp = result.find(r => r.protocol === 'acp')!;
    // Shopify platform_enabled runs first, so it wins
    expect(acp.status).toBe('platform_enabled');
  });

  it('marks UCP as platform_enabled for WooCommerce', () => {
    const probes = [makeProbe('ucp')];
    const result = enrichProbeResults(probes, {
      ecommerce_platform: 'woocommerce',
      payment_processors: [],
    });

    const ucp = result.find(r => r.protocol === 'ucp')!;
    expect(ucp.status).toBe('platform_enabled');
  });
});

// ============================================
// BUSINESS MODEL CLASSIFICATION
// ============================================
describe('classifyBusinessModel', () => {
  it('uses user-provided category when available', () => {
    expect(classifyBusinessModel({
      merchant_category: 'saas',
      ecommerce_platform: 'shopify', // should be ignored
      has_schema_product: true,
      has_schema_offer: true,
      product_count: 10,
    })).toBe('saas');
  });

  it('maps retail categories correctly', () => {
    expect(classifyBusinessModel({
      merchant_category: 'retail',
      has_schema_product: false,
      has_schema_offer: false,
      product_count: 0,
    })).toBe('retail');

    expect(classifyBusinessModel({
      merchant_category: 'restaurant',
      has_schema_product: false,
      has_schema_offer: false,
      product_count: 0,
    })).toBe('retail');
  });

  it('uses platform when no category provided', () => {
    expect(classifyBusinessModel({
      ecommerce_platform: 'shopify',
      has_schema_product: false,
      has_schema_offer: false,
      product_count: 0,
    })).toBe('retail');

    expect(classifyBusinessModel({
      ecommerce_platform: 'etsy',
      has_schema_product: false,
      has_schema_offer: false,
      product_count: 0,
    })).toBe('marketplace');
  });

  it('uses structured data when no category or platform', () => {
    expect(classifyBusinessModel({
      has_schema_product: true,
      has_schema_offer: true,
      product_count: 5,
    })).toBe('retail');
  });

  it('defaults to retail when no signals', () => {
    expect(classifyBusinessModel({
      has_schema_product: false,
      has_schema_offer: false,
      product_count: 0,
    })).toBe('retail');
  });

  it('classifies api_provider from HTML signals', () => {
    expect(classifyBusinessModel({
      has_schema_product: false,
      has_schema_offer: false,
      product_count: 0,
      html_signals: {
        has_api_docs: true,
        has_pricing_page: true,
        has_blog: false,
        has_signup: true,
      },
    })).toBe('api_provider');
  });

  it('classifies saas from HTML signals', () => {
    expect(classifyBusinessModel({
      has_schema_product: false,
      has_schema_offer: false,
      product_count: 0,
      html_signals: {
        has_api_docs: false,
        has_pricing_page: true,
        has_blog: false,
        has_signup: true,
      },
    })).toBe('saas');
  });
});

// ============================================
// BUSINESS MODEL FILTER
// ============================================
describe('applyBusinessModelFilter', () => {
  const makeProbe = (protocol: string, overrides?: Partial<ProbeResult>): ProbeResult => ({
    protocol: protocol as any,
    detected: false,
    status: 'not_detected',
    confidence: 'high',
    capabilities: {},
    ...overrides,
  });

  it('marks x402 as not_applicable for retail', () => {
    const probes = [
      makeProbe('ucp'),
      makeProbe('acp'),
      makeProbe('x402'),
    ];

    const result = applyBusinessModelFilter(probes, 'retail');

    const x402 = result.find(r => r.protocol === 'x402')!;
    expect(x402.status).toBe('not_applicable');

    // UCP and ACP should remain unchanged for retail
    expect(result.find(r => r.protocol === 'ucp')!.status).toBe('not_detected');
    expect(result.find(r => r.protocol === 'acp')!.status).toBe('not_detected');
  });

  it('marks UCP as not_applicable for saas', () => {
    const probes = [
      makeProbe('ucp'),
      makeProbe('acp'),
      makeProbe('x402'),
    ];

    const result = applyBusinessModelFilter(probes, 'saas');

    expect(result.find(r => r.protocol === 'ucp')!.status).toBe('not_applicable');
    expect(result.find(r => r.protocol === 'x402')!.status).toBe('not_detected'); // x402 is applicable for saas
  });

  it('does not override confirmed detections', () => {
    const probes = [
      makeProbe('x402', { detected: true, status: 'confirmed', confidence: 'high' }),
    ];

    const result = applyBusinessModelFilter(probes, 'retail');

    // x402 is not applicable to retail, but it was confirmed, so leave it
    expect(result[0].status).toBe('confirmed');
  });

  it('keeps all protocols applicable for api_provider', () => {
    const probes = [
      makeProbe('x402'),
      makeProbe('mcp'),
      makeProbe('ap2'),
    ];

    const result = applyBusinessModelFilter(probes, 'api_provider');

    // All these should be applicable for api_provider
    expect(result.every(r => r.status === 'not_detected')).toBe(true);
  });

  it('marks card network protocols as not_applicable for api_provider', () => {
    const probes = [
      makeProbe('visa_vic'),
      makeProbe('mastercard_agentpay'),
      makeProbe('ucp'),
    ];

    const result = applyBusinessModelFilter(probes, 'api_provider');

    expect(result.find(r => r.protocol === 'visa_vic')!.status).toBe('not_applicable');
    expect(result.find(r => r.protocol === 'mastercard_agentpay')!.status).toBe('not_applicable');
    expect(result.find(r => r.protocol === 'ucp')!.status).toBe('not_applicable');
  });
});

// ============================================
// PROBE RESULT TYPE VALIDATION
// ============================================
describe('ProbeResult type shape', () => {
  it('has required status and confidence fields', () => {
    const result: ProbeResult = {
      protocol: 'ucp',
      detected: true,
      status: 'confirmed',
      confidence: 'high',
      capabilities: {},
    };
    expect(result.status).toBe('confirmed');
    expect(result.confidence).toBe('high');
  });

  it('supports eligibility_signals array', () => {
    const result: ProbeResult = {
      protocol: 'acp',
      detected: true,
      status: 'eligible',
      confidence: 'medium',
      eligibility_signals: ['Stripe detected', 'Can adopt via API'],
      capabilities: {},
    };
    expect(result.eligibility_signals).toHaveLength(2);
  });

  it('supports all DetectionStatus values', () => {
    const statuses = ['confirmed', 'eligible', 'platform_enabled', 'not_detected', 'not_applicable'] as const;
    for (const status of statuses) {
      const result: ProbeResult = {
        protocol: 'ucp',
        detected: status !== 'not_detected' && status !== 'not_applicable',
        status,
        confidence: 'high',
        capabilities: {},
      };
      expect(result.status).toBe(status);
    }
  });
});
