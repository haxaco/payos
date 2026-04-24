'use client';

import { useMemo } from 'react';
import { useApiFetch } from './api-client';

/**
 * Thin wrapper around useApiFetch, pointed at the scanner service.
 *
 * Scanner lives at a separate Vercel deployment (sly-scanner.vercel.app) and
 * accepts the user's Supabase JWT directly — same auth as the main Sly API.
 * Keeping the base URL isolated means we can promote the scanner deployment
 * independently and never accidentally hit a main-API endpoint with a scanner
 * expectation.
 */
export const SCANNER_BASE_URL =
  process.env.NEXT_PUBLIC_SCANNER_URL || 'https://sly-scanner.vercel.app';

export interface ScannerApi {
  get: (path: string, init?: RequestInit) => Promise<Response>;
  post: (path: string, body?: unknown, init?: RequestInit) => Promise<Response>;
  del: (path: string, init?: RequestInit) => Promise<Response>;
  url: (path: string) => string;
}

export function useScannerApi(): ScannerApi {
  const fetchFn = useApiFetch();

  return useMemo<ScannerApi>(
    () => ({
      url: (path: string) => `${SCANNER_BASE_URL}${path}`,
      get: (path, init) => fetchFn(`${SCANNER_BASE_URL}${path}`, { ...init, method: 'GET' }),
      post: (path, body, init) =>
        fetchFn(`${SCANNER_BASE_URL}${path}`, {
          ...init,
          method: 'POST',
          body: body !== undefined ? JSON.stringify(body) : undefined,
        }),
      del: (path, init) => fetchFn(`${SCANNER_BASE_URL}${path}`, { ...init, method: 'DELETE' }),
    }),
    [fetchFn],
  );
}
