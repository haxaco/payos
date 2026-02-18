import { fetch } from 'undici';
import type { ProbeResult, ScanConfig } from './types.js';
import { buildUrl } from './types.js';

const NLWEB_PATHS = ['/.well-known/nlweb', '/ask', '/nlweb'];

export async function probeNLWeb(domain: string, config: ScanConfig): Promise<ProbeResult> {
  const start = Date.now();

  for (const path of NLWEB_PATHS) {
    const url = buildUrl(domain, path);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': config.user_agent, Accept: 'application/json' },
        signal: AbortSignal.timeout(config.timeout_ms),
      });

      const responseTime = Date.now() - start;

      if (!res.ok) continue;

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('json')) continue;

      const text = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(text);
      } catch {
        continue;
      }

      return {
        protocol: 'nlweb',
        detected: true,
        detection_method: `GET ${path}`,
        endpoint_url: url,
        capabilities: data,
        response_time_ms: responseTime,
        is_functional: true,
      };
    } catch {
      // Try next path
    }
  }

  return {
    protocol: 'nlweb',
    detected: false,
    response_time_ms: Date.now() - start,
    capabilities: {},
  };
}
