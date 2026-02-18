import pLimit from 'p-limit';
import type { AgenticProtocol } from '@sly/types';
import type { ProbeResult, ScanConfig } from './types.js';
import { DEFAULT_SCAN_CONFIG } from './types.js';
import { probeUCP } from './ucp.js';
import { probeACP } from './acp.js';
import { probeX402 } from './x402.js';
import { probeAP2 } from './ap2.js';
import { probeMCP } from './mcp.js';
import { probeNLWeb } from './nlweb.js';
import { probeVisaVIC } from './visa-vic.js';
import { probeMastercardAP } from './mastercard-ap.js';

const PROBE_ORDER: AgenticProtocol[] = [
  'ucp', 'acp', 'x402', 'ap2', 'mcp', 'nlweb', 'visa_vic', 'mastercard_agentpay',
];

const PROBE_FNS = [
  probeUCP, probeACP, probeX402, probeAP2, probeMCP, probeNLWeb, probeVisaVIC, probeMastercardAP,
];

export async function runProbes(
  domain: string,
  config: ScanConfig = DEFAULT_SCAN_CONFIG,
): Promise<ProbeResult[]> {
  const limit = pLimit(8);

  const results = await Promise.allSettled(
    PROBE_FNS.map((fn, i) =>
      limit(() => fn(domain, config))
    )
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      protocol: PROBE_ORDER[i],
      status: 'not_detected' as const,
      confidence: 'low' as const,
      capabilities: {},
      error: r.reason instanceof Error ? r.reason.message : 'Probe failed',
    };
  });
}

export { DEFAULT_SCAN_CONFIG } from './types.js';
export type { ProbeResult, ScanConfig, DetectionStatus, DetectionConfidence } from './types.js';
export { isDetected } from './types.js';
