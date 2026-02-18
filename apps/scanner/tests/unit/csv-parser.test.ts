import { describe, it, expect } from 'vitest';
import { parseCSV } from '../../src/queue/csv-parser.js';

describe('parseCSV', () => {
  it('parses standard CSV with known headers', () => {
    const csv = `domain,merchant_name,category,country_code,region
shopify.com,Shopify,saas,US,north_america
amazon.com,Amazon,marketplace,US,north_america`;

    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      domain: 'shopify.com',
      merchant_name: 'Shopify',
      merchant_category: 'saas',
      country_code: 'US',
      region: 'north_america',
    });
  });

  it('handles alternative header names', () => {
    const csv = `url,name,type,country
https://example.com,Example Co,retail,US`;

    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].domain).toBe('example.com');
    expect(result[0].merchant_name).toBe('Example Co');
    expect(result[0].merchant_category).toBe('retail');
    expect(result[0].country_code).toBe('US');
  });

  it('strips protocol and www from domains', () => {
    const csv = `domain
https://www.example.com/
http://another.com
www.third.com`;

    const result = parseCSV(csv);
    expect(result).toHaveLength(3);
    expect(result[0].domain).toBe('example.com');
    expect(result[1].domain).toBe('another.com');
    expect(result[2].domain).toBe('third.com');
  });

  it('deduplicates domains', () => {
    const csv = `domain
example.com
www.example.com
https://example.com`;

    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].domain).toBe('example.com');
  });

  it('handles empty CSV', () => {
    const result = parseCSV('');
    expect(result).toHaveLength(0);
  });

  it('skips rows with empty domains', () => {
    const csv = `domain,merchant_name
shopify.com,Shopify
,Empty
stripe.com,Stripe`;

    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0].domain).toBe('shopify.com');
    expect(result[1].domain).toBe('stripe.com');
  });

  it('trims whitespace', () => {
    const csv = `domain , merchant_name
  shopify.com  ,  Shopify  `;

    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].domain).toBe('shopify.com');
    expect(result[0].merchant_name).toBe('Shopify');
  });
});
