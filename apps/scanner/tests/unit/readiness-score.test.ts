import { describe, it, expect } from 'vitest';
import { computeReadinessScore, getReadinessGrade } from '@sly/utils';

describe('computeReadinessScore', () => {
  it('returns zeros for a site with no detections', () => {
    const result = computeReadinessScore({
      protocol: [],
      structured: {
        has_schema_product: false,
        has_schema_offer: false,
        has_schema_organization: false,
        has_json_ld: false,
        has_open_graph: false,
        has_microdata: false,
        product_count: 0,
        products_with_price: 0,
        products_with_availability: 0,
        products_with_sku: 0,
        products_with_image: 0,
      },
      accessibility: {
        robots_txt_exists: false,
        robots_blocks_gptbot: false,
        robots_blocks_claudebot: false,
        robots_blocks_all_bots: false,
        robots_allows_agents: false,
        has_captcha: false,
        requires_javascript: false,
        guest_checkout_available: false,
        requires_account: false,
        checkout_steps_count: undefined,
        payment_processors: [],
        supports_digital_wallets: false,
        supports_crypto: false,
        supports_pix: false,
        supports_spei: false,
      },
    });

    expect(result.protocol_score).toBe(0);
    expect(result.data_score).toBe(0);
    // Accessibility starts at 100 then gets penalized
    expect(result.accessibility_score).toBe(95); // -5 for missing robots.txt
    expect(result.checkout_score).toBe(20); // +20 for !requires_account
    expect(result.readiness_score).toBeGreaterThanOrEqual(0);
    expect(result.readiness_score).toBeLessThanOrEqual(100);
  });

  it('gives max protocol score for functional UCP + ACP + MCP', () => {
    const result = computeReadinessScore({
      protocol: [
        { protocol: 'ucp', detected: true, is_functional: true },
        { protocol: 'acp', detected: true, is_functional: true },
        { protocol: 'mcp', detected: true, is_functional: true },
      ],
      structured: {
        has_schema_product: false, has_schema_offer: false, has_schema_organization: false,
        has_json_ld: false, has_open_graph: false, has_microdata: false,
        product_count: 0, products_with_price: 0, products_with_availability: 0,
        products_with_sku: 0, products_with_image: 0,
      },
      accessibility: {
        robots_txt_exists: true, robots_blocks_gptbot: false, robots_blocks_claudebot: false,
        robots_blocks_all_bots: false, robots_allows_agents: false,
        has_captcha: false, requires_javascript: false,
        guest_checkout_available: false, requires_account: false,
        checkout_steps_count: undefined, payment_processors: [],
        supports_digital_wallets: false, supports_crypto: false,
        supports_pix: false, supports_spei: false,
      },
    });

    // 30 (UCP) + 20 (ACP) + 15 (MCP) = 65
    expect(result.protocol_score).toBe(65);
  });

  it('caps protocol score at 100', () => {
    const result = computeReadinessScore({
      protocol: [
        { protocol: 'ucp', detected: true, is_functional: true },
        { protocol: 'acp', detected: true, is_functional: true },
        { protocol: 'mcp', detected: true, is_functional: true },
        { protocol: 'x402', detected: true, is_functional: true },
        { protocol: 'ap2', detected: true, is_functional: true },
        { protocol: 'visa_vic', detected: true, is_functional: true },
        { protocol: 'mastercard_agentpay', detected: true, is_functional: true },
        { protocol: 'nlweb', detected: true, is_functional: true },
      ],
      structured: {
        has_schema_product: false, has_schema_offer: false, has_schema_organization: false,
        has_json_ld: false, has_open_graph: false, has_microdata: false,
        product_count: 0, products_with_price: 0, products_with_availability: 0,
        products_with_sku: 0, products_with_image: 0,
      },
      accessibility: {
        robots_txt_exists: true, robots_blocks_gptbot: false, robots_blocks_claudebot: false,
        robots_blocks_all_bots: false, robots_allows_agents: false,
        has_captcha: false, requires_javascript: false,
        guest_checkout_available: false, requires_account: false,
        checkout_steps_count: undefined, payment_processors: [],
        supports_digital_wallets: false, supports_crypto: false,
        supports_pix: false, supports_spei: false,
      },
    });

    expect(result.protocol_score).toBe(100);
  });

  it('penalizes blocking all bots heavily', () => {
    const result = computeReadinessScore({
      protocol: [],
      structured: {
        has_schema_product: false, has_schema_offer: false, has_schema_organization: false,
        has_json_ld: false, has_open_graph: false, has_microdata: false,
        product_count: 0, products_with_price: 0, products_with_availability: 0,
        products_with_sku: 0, products_with_image: 0,
      },
      accessibility: {
        robots_txt_exists: true, robots_blocks_gptbot: false, robots_blocks_claudebot: false,
        robots_blocks_all_bots: true, robots_allows_agents: false,
        has_captcha: true, requires_javascript: true,
        guest_checkout_available: false, requires_account: true,
        checkout_steps_count: undefined, payment_processors: [],
        supports_digital_wallets: false, supports_crypto: false,
        supports_pix: false, supports_spei: false,
      },
    });

    // -40 (blocks all) -25 (captcha) -15 (js required) = 20
    expect(result.accessibility_score).toBe(20);
  });

  it('correctly weights composite score', () => {
    const result = computeReadinessScore({
      protocol: [
        { protocol: 'ucp', detected: true, is_functional: true },
      ],
      structured: {
        has_schema_product: true, has_schema_offer: true, has_schema_organization: false,
        has_json_ld: true, has_open_graph: true, has_microdata: false,
        product_count: 5, products_with_price: 5, products_with_availability: 3,
        products_with_sku: 2, products_with_image: 5,
      },
      accessibility: {
        robots_txt_exists: true, robots_blocks_gptbot: false, robots_blocks_claudebot: false,
        robots_blocks_all_bots: false, robots_allows_agents: true,
        has_captcha: false, requires_javascript: false,
        guest_checkout_available: true, requires_account: false,
        checkout_steps_count: 2, payment_processors: ['stripe', 'paypal'],
        supports_digital_wallets: true, supports_crypto: false,
        supports_pix: false, supports_spei: false,
      },
    });

    expect(result.protocol_score).toBe(30); // UCP functional
    // JSON-LD (25) + Product (20) + Offer (15) + OG (10) + price 10 + avail ~5 + sku ~2 + img 6 = ~93 => capped 93
    expect(result.data_score).toBeGreaterThan(70);
    // 100 base + 10 (allows_agents) = 110, capped at 100
    expect(result.accessibility_score).toBe(100);
    // Composite: 30*0.4 + data*0.25 + 100*0.2 + checkout*0.15
    expect(result.readiness_score).toBeGreaterThan(40);
    expect(result.readiness_score).toBeLessThanOrEqual(100);
  });
});

describe('getReadinessGrade', () => {
  it('returns A for scores >= 80', () => {
    expect(getReadinessGrade(80)).toBe('A');
    expect(getReadinessGrade(100)).toBe('A');
    expect(getReadinessGrade(95)).toBe('A');
  });

  it('returns B for scores 60-79', () => {
    expect(getReadinessGrade(60)).toBe('B');
    expect(getReadinessGrade(79)).toBe('B');
  });

  it('returns C for scores 40-59', () => {
    expect(getReadinessGrade(40)).toBe('C');
    expect(getReadinessGrade(59)).toBe('C');
  });

  it('returns D for scores 20-39', () => {
    expect(getReadinessGrade(20)).toBe('D');
    expect(getReadinessGrade(39)).toBe('D');
  });

  it('returns F for scores < 20', () => {
    expect(getReadinessGrade(0)).toBe('F');
    expect(getReadinessGrade(19)).toBe('F');
  });
});
