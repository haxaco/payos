/**
 * Server-side proxy: dashboard `/api/scanner/*` → scanner backend
 * `https://sly-scanner.vercel.app/v1/scanner/*`.
 *
 * Why this exists: the Supabase auth session is stored in HttpOnly cookies
 * (server-managed). The browser-side `useApiFetch` couldn't reliably extract
 * the access_token to forward to the scanner backend, so cross-origin calls
 * to scanner.getsly.ai were 401-ing for any logged-in dashboard user. This
 * proxy reads the session server-side (where the cookies are accessible),
 * grabs the JWT, and forwards the request — the client just calls
 * `/api/scanner/credits/balance` same-origin and never has to see the token.
 *
 * Catch-all route handles any HTTP method on any sub-path of /api/scanner.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const SCANNER_BASE_URL = process.env.SCANNER_URL ?? 'https://sly-scanner.vercel.app';

// Headers we never forward upstream — auth is replaced, host/length recomputed
// by undici, and cookie/origin are dashboard-internal.
const STRIP_REQUEST_HEADERS = new Set([
  'host',
  'cookie',
  'authorization',
  'content-length',
  'connection',
  'transfer-encoding',
  'upgrade',
  'origin',
  'referer',
]);

// Headers we drop from the upstream response before sending back to the client
// (let Next.js set its own; CORS isn't needed since we're same-origin now).
const STRIP_RESPONSE_HEADERS = new Set([
  'transfer-encoding',
  'connection',
  'keep-alive',
  'access-control-allow-origin',
  'access-control-allow-credentials',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-expose-headers',
]);

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const subpath = (path ?? []).map(encodeURIComponent).join('/');
  const search = req.nextUrl.search ?? '';
  const upstreamUrl = `${SCANNER_BASE_URL}/v1/scanner/${subpath}${search}`;

  // Pull the JWT from the server-side Supabase session (HttpOnly cookie).
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'No active session — log in to use the scanner' },
      { status: 401 },
    );
  }

  // Build the upstream request with the same method/headers/body, but with
  // a fresh Authorization header carrying the user's JWT.
  const upstreamHeaders = new Headers();
  for (const [name, value] of req.headers.entries()) {
    if (!STRIP_REQUEST_HEADERS.has(name.toLowerCase())) {
      upstreamHeaders.set(name, value);
    }
  }
  upstreamHeaders.set('Authorization', `Bearer ${session.access_token}`);
  // Stamp a request id so support tickets cross-reference correctly.
  if (!upstreamHeaders.has('x-request-id')) {
    upstreamHeaders.set('x-request-id', crypto.randomUUID());
  }

  const method = req.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';

  let body: BodyInit | undefined;
  if (hasBody) {
    // Pass the raw body through; works for JSON, multipart, anything.
    body = await req.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method,
      headers: upstreamHeaders,
      body,
      // Don't follow redirects automatically — let the client see them.
      redirect: 'manual',
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'upstream_fetch_failed', message: (err as Error).message },
      { status: 502 },
    );
  }

  // Pipe the response back. Stream the body to support large payloads
  // (full scan results can be tens of KB).
  const responseHeaders = new Headers();
  for (const [name, value] of upstream.headers.entries()) {
    if (!STRIP_RESPONSE_HEADERS.has(name.toLowerCase())) {
      responseHeaders.set(name, value);
    }
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
