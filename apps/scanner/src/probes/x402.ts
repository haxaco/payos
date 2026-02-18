import { fetch } from 'undici';
import type { ProbeResult, ScanConfig } from './types.js';
import { buildUrl } from './types.js';

const X402_PATHS = ['/api/paid', '/.well-known/x402', '/x402'];

export async function probeX402(domain: string, config: ScanConfig): Promise<ProbeResult> {
  const start = Date.now();

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
