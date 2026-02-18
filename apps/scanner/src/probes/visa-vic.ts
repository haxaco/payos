import { fetch } from 'undici';
import * as cheerio from 'cheerio';
import type { ProbeResult, ScanConfig } from './types.js';
import { buildUrl } from './types.js';

const VISA_VIC_SIGNATURES = [
  'visa-intelligent-commerce',
  'visa.com/vic',
  'vic-sdk',
  'visaIntelligentCommerce',
  'data-vic-',
];

export async function probeVisaVIC(domain: string, config: ScanConfig): Promise<ProbeResult> {
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
      return { protocol: 'visa_vic', detected: false, response_time_ms: responseTime, capabilities: {} };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // Check for Visa VIC meta tags
    const vicMeta = $('meta[name*="visa"], meta[property*="visa"]').length > 0;

    // Check for VIC SDK scripts
    let vicScript = false;
    $('script[src]').each((_, el) => {
      const src = $(el).attr('src') || '';
      if (VISA_VIC_SIGNATURES.some(sig => src.toLowerCase().includes(sig.toLowerCase()))) {
        vicScript = true;
      }
    });

    // Check inline scripts
    if (!vicScript) {
      const bodyHtml = html.toLowerCase();
      vicScript = VISA_VIC_SIGNATURES.some(sig => bodyHtml.includes(sig.toLowerCase()));
    }

    const detected = vicMeta || vicScript;

    return {
      protocol: 'visa_vic',
      detected,
      detection_method: detected ? 'HTML meta/script inspection' : undefined,
      endpoint_url: detected ? url : undefined,
      capabilities: detected ? { meta_tag: vicMeta, sdk_script: vicScript } : {},
      response_time_ms: responseTime,
      is_functional: detected,
    };
  } catch (err) {
    return {
      protocol: 'visa_vic',
      detected: false,
      response_time_ms: Date.now() - start,
      capabilities: {},
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
