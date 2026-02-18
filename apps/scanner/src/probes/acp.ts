import { fetch } from 'undici';
import type { ProbeResult, ScanConfig } from './types.js';
import { buildUrl, withProbeTimeout } from './types.js';

const ACP_PATHS = ['/acp/checkout', '/.well-known/acp', '/api/acp'];
const NOT_DETECTED: ProbeResult = {
  protocol: 'acp', detected: false, status: 'not_detected', confidence: 'high', capabilities: {},
};

export async function probeACP(domain: string, config: ScanConfig): Promise<ProbeResult> {
  return withProbeTimeout(() => _probeACP(domain, config), NOT_DETECTED, config.timeout_ms + 1000);
}

async function _probeACP(domain: string, config: ScanConfig): Promise<ProbeResult> {
  const start = Date.now();

  for (const path of ACP_PATHS) {
    const url = buildUrl(domain, path);

    try {
      const res = await fetch(url, {
        method: 'OPTIONS',
        headers: { 'User-Agent': config.user_agent },
        signal: AbortSignal.timeout(config.timeout_ms),
      });

      const responseTime = Date.now() - start;
      const acpVersion = res.headers.get('x-acp-version');

      if (acpVersion) {
        const capabilities: Record<string, unknown> = { version: acpVersion };

        const allowHeader = res.headers.get('allow');
        if (allowHeader) capabilities.methods = allowHeader.split(',').map(m => m.trim());

        return {
          protocol: 'acp',
          detected: true,
          status: 'confirmed',
          confidence: 'high',
          detection_method: `OPTIONS ${path}`,
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
    protocol: 'acp',
    detected: false,
    status: 'not_detected',
    confidence: 'high',
    response_time_ms: Date.now() - start,
    capabilities: {},
  };
}
