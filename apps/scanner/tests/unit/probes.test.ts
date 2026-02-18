import { describe, it, expect } from 'vitest';
import { buildUrl, DEFAULT_SCAN_CONFIG } from '../../src/probes/types.js';

describe('buildUrl', () => {
  it('builds URL from domain and path', () => {
    expect(buildUrl('example.com', '/.well-known/ucp')).toBe('https://example.com/.well-known/ucp');
  });

  it('strips existing protocol', () => {
    expect(buildUrl('https://example.com', '/robots.txt')).toBe('https://example.com/robots.txt');
  });

  it('strips trailing slashes from domain', () => {
    expect(buildUrl('example.com/', '/path')).toBe('https://example.com/path');
  });
});

describe('DEFAULT_SCAN_CONFIG', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_SCAN_CONFIG.timeout_ms).toBeGreaterThan(0);
    expect(DEFAULT_SCAN_CONFIG.user_agent).toContain('SlyScanner');
    expect(DEFAULT_SCAN_CONFIG.rate_limit_delay_ms).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_SCAN_CONFIG.max_requests_per_domain).toBeGreaterThan(0);
  });
});
