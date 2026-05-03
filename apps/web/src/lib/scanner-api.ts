'use client';

import { useMemo } from 'react';

/**
 * Thin wrapper that calls the scanner backend through the dashboard's
 * same-origin proxy at `/api/scanner/*` (Next.js Route Handler in
 * apps/web/src/app/api/scanner/[...path]/route.ts).
 *
 * Why same-origin: the user's Supabase session lives in HttpOnly cookies that
 * are server-readable but not browser-readable. The proxy reads the session
 * server-side, extracts the JWT, and forwards it to scanner.getsly.ai with a
 * proper Authorization header. The browser never has to handle the token.
 *
 * This means:
 *   - No more cross-origin 401s from a stale or missing JWT
 *   - No CORS preflight overhead
 *   - The proxy can transparently swap the upstream URL for staging/dev
 *     via the SCANNER_URL env var without rebuilding the dashboard
 */
const PROXY_BASE = '/api/scanner';

// Strip the canonical `/v1/scanner/` prefix used by the backend so the proxy
// path stays clean — `/v1/scanner/credits/balance` → `/api/scanner/credits/balance`.
function rewrite(path: string): string {
  return path.replace(/^\/v1\/scanner/, PROXY_BASE);
}

export interface ScannerApi {
  get: (path: string, init?: RequestInit) => Promise<Response>;
  post: (path: string, body?: unknown, init?: RequestInit) => Promise<Response>;
  del: (path: string, init?: RequestInit) => Promise<Response>;
  url: (path: string) => string;
}

export function useScannerApi(): ScannerApi {
  return useMemo<ScannerApi>(
    () => ({
      url: (path: string) => rewrite(path),
      get: (path, init) =>
        fetch(rewrite(path), { ...init, method: 'GET', credentials: 'same-origin' }),
      post: (path, body, init) =>
        fetch(rewrite(path), {
          ...init,
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        }),
      del: (path, init) =>
        fetch(rewrite(path), { ...init, method: 'DELETE', credentials: 'same-origin' }),
    }),
    [],
  );
}
