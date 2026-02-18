import { describe, it, expect } from 'vitest';
import { normalizeDomain } from '../../src/scanner.js';

describe('normalizeDomain', () => {
  it('strips https protocol', () => {
    expect(normalizeDomain('https://example.com')).toBe('example.com');
  });

  it('strips http protocol', () => {
    expect(normalizeDomain('http://example.com')).toBe('example.com');
  });

  it('strips www prefix', () => {
    expect(normalizeDomain('www.example.com')).toBe('example.com');
  });

  it('strips both protocol and www', () => {
    expect(normalizeDomain('https://www.example.com')).toBe('example.com');
  });

  it('strips trailing slashes', () => {
    expect(normalizeDomain('example.com/')).toBe('example.com');
    expect(normalizeDomain('example.com///')).toBe('example.com');
  });

  it('lowercases domains', () => {
    expect(normalizeDomain('Example.COM')).toBe('example.com');
  });

  it('trims whitespace', () => {
    expect(normalizeDomain('  example.com  ')).toBe('example.com');
  });

  it('handles subdomains correctly', () => {
    expect(normalizeDomain('shop.example.com')).toBe('shop.example.com');
  });

  it('handles complex domains', () => {
    expect(normalizeDomain('https://www.shop.example.co.uk/')).toBe('shop.example.co.uk');
  });
});
