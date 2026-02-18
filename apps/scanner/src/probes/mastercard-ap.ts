import { fetch } from 'undici';
import * as cheerio from 'cheerio';
import type { ProbeResult, ScanConfig } from './types.js';
import { buildUrl } from './types.js';

const MC_SIGNATURES = [
  'mastercard-agent-pay',
  'mastercard.com/agentpay',
  'mc-agentpay',
  'mastercardAgentPay',
  'data-mc-agent',
];

export async function probeMastercardAP(domain: string, config: ScanConfig): Promise<ProbeResult> {
  const url = buildUrl(domain, '/');
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': config.user_agent, Accept: 'text/html' },
      signal: AbortSignal.timeout(config.timeout_ms),
    });

    const responseTime = Date.now() - start;

    if (!res.ok) {
      return { protocol: 'mastercard_agentpay', detected: false, response_time_ms: responseTime, capabilities: {} };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Check meta tags
    const mcMeta = $('meta[name*="mastercard"], meta[property*="mastercard"]').length > 0;

    // Check scripts
    let mcScript = false;
    $('script[src]').each((_, el) => {
      const src = $(el).attr('src') || '';
      if (MC_SIGNATURES.some(sig => src.toLowerCase().includes(sig.toLowerCase()))) {
        mcScript = true;
      }
    });

    // Check inline
    if (!mcScript) {
      const bodyHtml = html.toLowerCase();
      mcScript = MC_SIGNATURES.some(sig => bodyHtml.includes(sig.toLowerCase()));
    }

    const detected = mcMeta || mcScript;

    return {
      protocol: 'mastercard_agentpay',
      detected,
      detection_method: detected ? 'HTML meta/script inspection' : undefined,
      endpoint_url: detected ? url : undefined,
      capabilities: detected ? { meta_tag: mcMeta, sdk_script: mcScript } : {},
      response_time_ms: responseTime,
      is_functional: detected,
    };
  } catch (err) {
    return {
      protocol: 'mastercard_agentpay',
      detected: false,
      response_time_ms: Date.now() - start,
      capabilities: {},
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
