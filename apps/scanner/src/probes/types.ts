import type { AgenticProtocol } from '@sly/types';

export type DetectionStatus = 'confirmed' | 'eligible' | 'platform_enabled' | 'not_detected' | 'not_applicable';
export type DetectionConfidence = 'high' | 'medium' | 'low';

export interface ProbeResult {
  protocol: AgenticProtocol;
  detected: boolean;
  status: DetectionStatus;
  confidence: DetectionConfidence;
  eligibility_signals?: string[];
  detection_method?: string;
  endpoint_url?: string;
  capabilities: Record<string, unknown>;
  response_time_ms?: number;
  is_functional?: boolean;
  error?: string;
}

export interface ScanConfig {
  timeout_ms: number;
  user_agent: string;
  rate_limit_delay_ms: number;
  max_requests_per_domain: number;
}

export const DEFAULT_SCAN_CONFIG: ScanConfig = {
  timeout_ms: parseInt(process.env.SCANNER_PROBE_TIMEOUT_MS || '5000'),
  user_agent: process.env.SCANNER_USER_AGENT || 'SlyScanner/1.0 (+https://sly.dev/scanner)',
  rate_limit_delay_ms: parseInt(process.env.SCANNER_RATE_LIMIT_DELAY_MS || '200'),
  max_requests_per_domain: parseInt(process.env.SCANNER_RATE_LIMIT_PER_DOMAIN || '5'),
};

/**
 * Wraps a probe function with an overall timeout.
 * Prevents multi-path probes from taking N * timeout_ms.
 */
export function withProbeTimeout<T>(
  fn: () => Promise<T>,
  fallback: T,
  timeoutMs: number,
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

export function buildUrl(domain: string, path: string): string {
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return `https://${clean}${path}`;
}
