import { fetch } from 'undici';
import type { ProbeResult, ScanConfig } from './types.js';
import { buildUrl, withProbeTimeout } from './types.js';

// Paths that return HTTP 402 Payment Required
const X402_PATHS = ['/api/paid', '/x402'];

const NOT_DETECTED: ProbeResult = {
  protocol: 'x402', status: 'not_detected', confidence: 'high', capabilities: {},
};

export async function probeX402(domain: string, config: ScanConfig): Promise<ProbeResult> {
  return withProbeTimeout(() => _probeX402(domain, config), NOT_DETECTED, config.timeout_ms + 1000);
}

async function _probeX402(domain: string, config: ScanConfig): Promise<ProbeResult> {
  const start = Date.now();

  // 1. Check .well-known/x402.json manifest (Bazaar discovery)
  const manifestResult = await checkBazaarManifest(domain, config, start);
  if (manifestResult) return manifestResult;

  // 2. Probe known paths for HTTP 402 responses
  for (const path of X402_PATHS) {
    const url = buildUrl(domain, path);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': config.user_agent },
        signal: AbortSignal.timeout(config.timeout_ms),
        redirect: 'manual',
      });

      const responseTime = Date.now() - start;

      if (res.status === 402) {
        const capabilities: Record<string, unknown> = {};
        const priceHeader = res.headers.get('x-payment-required');
        const x402Header = res.headers.get('x-402-version');

        if (priceHeader) capabilities.price = priceHeader;
        if (x402Header) capabilities.version = x402Header;

        return {
          protocol: 'x402',
          status: 'confirmed',
          confidence: 'high',
          detection_method: `402 response on ${path}`,
          endpoint_url: url,
          capabilities,
          response_time_ms: responseTime,
          is_functional: true,
        };
      }
    } catch {
      // Try next path
    }
  }

  return {
    protocol: 'x402',
    status: 'not_detected',
    confidence: 'high',
    response_time_ms: Date.now() - start,
    capabilities: {},
  };
}

/**
 * Check for .well-known/x402.json — the Bazaar discovery manifest.
 * Services advertise their paid endpoints, pricing, and accepted payment methods.
 * See: https://docs.cdp.coinbase.com/x402/bazaar
 */
async function checkBazaarManifest(
  domain: string,
  config: ScanConfig,
  start: number,
): Promise<ProbeResult | null> {
  const url = buildUrl(domain, '/.well-known/x402.json');

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': config.user_agent, Accept: 'application/json' },
      signal: AbortSignal.timeout(config.timeout_ms),
    });

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('json')) return null;

    const text = await res.text();
    const manifest = JSON.parse(text);

    // Validate it looks like an x402 manifest (has resources or endpoints)
    const resources = manifest.resources || manifest.endpoints || manifest.services;
    if (!resources && !manifest.x402Version && !manifest.accepts) return null;

    const capabilities: Record<string, unknown> = {};

    if (manifest.x402Version) capabilities.version = manifest.x402Version;
    if (Array.isArray(resources)) {
      capabilities.resource_count = resources.length;
      // Sample first few endpoints
      capabilities.sample_resources = resources.slice(0, 5).map((r: any) => ({
        path: r.resource || r.path || r.url,
        method: r.method,
        price: r.price || r.accepts?.[0]?.maxAmountRequired,
        currency: r.currency || r.accepts?.[0]?.asset,
      }));
    }
    if (manifest.accepts) capabilities.accepts = manifest.accepts;
    if (manifest.bazaar) capabilities.bazaar = true;

    return {
      protocol: 'x402',
      status: 'confirmed',
      confidence: 'high',
      detection_method: '.well-known/x402.json manifest',
      endpoint_url: url,
      capabilities,
      response_time_ms: Date.now() - start,
      is_functional: true,
    };
  } catch {
    return null;
  }
}
