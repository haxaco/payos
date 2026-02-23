/**
 * Demo x402 Shim Server
 *
 * A self-contained Hono server that simulates a partner's x402-enabled agent endpoint.
 * When called without an X-Payment header, it returns a 402 with the x402 `accepts` spec.
 * When called with a valid X-Payment header (containing a JWT proof), it verifies and responds.
 *
 * Usage:
 *   pnpm --filter @sly/api tsx scripts/demo-x402-shim.ts
 *
 * Then register endpoint on an agent:
 *   PUT /v1/agents/:id/endpoint
 *   { "endpoint_type": "x402", "endpoint_url": "http://localhost:4300/agent" }
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createHmac } from 'crypto';

const app = new Hono();

const PORT = 4300;
const JWT_SECRET = process.env.X402_JWT_SECRET || 'payos-x402-jwt-secret-change-in-prod';

// Base Sepolia USDC contract address
const USDC_CONTRACT = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const NETWORK = 'eip155:84532';
const PRICE_USDC_UNITS = '500000'; // 0.50 USDC in base units

/**
 * Verify a JWT payment proof signed with HS256.
 */
function verifyJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    const expectedSignature = createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signatureB64 !== expectedSignature) {
      console.log('[Shim] JWT signature mismatch');
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(),
    );

    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.log('[Shim] JWT expired');
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// ============================================
// POST /agent — main x402 endpoint
// ============================================

app.post('/agent', async (c) => {
  const xPaymentHeader = c.req.header('X-Payment');

  if (!xPaymentHeader) {
    // No payment — return 402 with x402 spec-compliant accepts
    console.log('[Shim] No X-Payment header — returning 402');
    return c.json(
      {
        accepts: [
          {
            scheme: 'exact-evm',
            network: NETWORK,
            amount: PRICE_USDC_UNITS,
            token: USDC_CONTRACT,
            facilitator: 'http://localhost:4000/v1/x402/facilitator',
          },
        ],
      },
      402,
    );
  }

  // Has X-Payment header — verify the JWT
  console.log('[Shim] X-Payment header received, verifying...');

  let payment: Record<string, unknown>;
  try {
    payment = JSON.parse(xPaymentHeader);
  } catch {
    return c.json({ error: 'Invalid X-Payment JSON' }, 400);
  }

  const jwt = payment.signature as string;
  if (!jwt) {
    return c.json({ error: 'Missing signature in X-Payment' }, 400);
  }

  const verified = verifyJWT(jwt);
  if (!verified) {
    return c.json({ error: 'Invalid or expired payment proof' }, 401);
  }

  console.log('[Shim] Payment verified:', verified);

  // Parse the incoming task message
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const messageText =
    body.params?.message?.parts?.[0]?.text || 'No message provided';

  // Return a successful agent response
  return c.json({
    response: `CompanyIntelBot analysis for your query: "${messageText}". Payment of ${Number(PRICE_USDC_UNITS) / 1e6} USDC received. Transfer: ${verified.transferId}.`,
    artifacts: [
      {
        name: 'report',
        mediaType: 'application/json',
        parts: [
          {
            data: {
              type: 'company_intel_brief',
              query: messageText,
              paymentVerified: true,
              transferId: verified.transferId,
              generatedAt: new Date().toISOString(),
              insights: [
                'Market position analysis completed',
                'Competitive landscape mapped',
                'Financial health indicators positive',
              ],
            },
            metadata: { mimeType: 'application/json' },
          },
        ],
      },
    ],
  });
});

// ============================================
// GET /health — health check
// ============================================

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'demo-x402-shim',
    port: PORT,
    price: `${Number(PRICE_USDC_UNITS) / 1e6} USDC`,
    network: NETWORK,
  });
});

// ============================================
// Start server
// ============================================

console.log(`\n  x402 Shim Demo Server`);
console.log(`  =====================`);
console.log(`  Endpoint: http://localhost:${PORT}/agent`);
console.log(`  Health:   http://localhost:${PORT}/health`);
console.log(`  Price:    ${Number(PRICE_USDC_UNITS) / 1e6} USDC per request`);
console.log(`  Network:  ${NETWORK}`);
console.log(`  USDC:     ${USDC_CONTRACT}`);
console.log(`\n  Register on agent:`);
console.log(`  PUT /v1/agents/:id/endpoint`);
console.log(`  { "endpoint_type": "x402", "endpoint_url": "http://localhost:${PORT}/agent" }\n`);

serve({ fetch: app.fetch, port: PORT });
