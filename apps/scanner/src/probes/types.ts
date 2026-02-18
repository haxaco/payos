import type { AgenticProtocol } from '@sly/types';

export interface ProbeResult {
  protocol: AgenticProtocol;
  detected: boolean;
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
  timeout_ms: parseInt(process.env.SCANNER_PROBE_TIMEOUT_MS || '10000'),
  user_agent: process.env.SCANNER_USER_AGENT || 'SlyScanner/1.0 (+https://sly.dev/scanner)',
  rate_limit_delay_ms: parseInt(process.env.SCANNER_RATE_LIMIT_DELAY_MS || '200'),
  max_requests_per_domain: parseInt(process.env.SCANNER_RATE_LIMIT_PER_DOMAIN || '5'),
};

export function buildUrl(domain: string, path: string): string {
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return `https://${clean}${path}`;
}
