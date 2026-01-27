#!/usr/bin/env tsx
/**
 * UCP → PayOS → Pix Demo Script
 *
 * Demonstrates the complete UCP checkout flow with PayOS LATAM settlement.
 *
 * Usage:
 *   pnpm --filter @sly/api tsx scripts/demos/ucp-pix-demo.ts
 *
 * @see Story 43.14: UCP Demo Script
 */

// =============================================================================
// Configuration
// =============================================================================

const API_URL = process.env.PAYOS_API_URL || 'http://localhost:4000';
const API_KEY = process.env.PAYOS_API_KEY || 'pk_test_demo123456789012345678901234';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(title: string) {
  console.log('');
  log('═'.repeat(60), colors.cyan);
  log(`  ${title}`, colors.cyan + colors.bright);
  log('═'.repeat(60), colors.cyan);
}

function step(num: number, title: string) {
  console.log('');
  log(`▸ Step ${num}: ${title}`, colors.yellow + colors.bright);
  log('─'.repeat(40), colors.dim);
}

function success(message: string) {
  log(`  ✓ ${message}`, colors.green);
}

function info(label: string, value: string) {
  log(`  ${label}: ${colors.bright}${value}${colors.reset}`, colors.dim);
}

function json(obj: any) {
  console.log(JSON.stringify(obj, null, 2));
}

// =============================================================================
// API Client
// =============================================================================

async function fetchAPI(
  path: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${API_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
    'UCP-Agent': 'DemoAgent/2026-01-11 (https://demo.example.com/.well-known/ucp)',
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(error)}`);
  }

  return response.json();
}

// =============================================================================
// Demo Flow
// =============================================================================

async function main() {
  header('UCP → PayOS → Pix Settlement Demo');
  log('');
  log('This demo shows how a UCP shopping agent can complete checkout');
  log('with PayOS LATAM settlement, sending funds via Brazilian Pix.');
  console.log('');

  // -------------------------------------------------------------------------
  // Step 1: Discover PayOS UCP Profile
  // -------------------------------------------------------------------------
  step(1, 'Discover PayOS UCP Profile');

  try {
    const profile = await fetch(`${API_URL}/.well-known/ucp`).then((r) => r.json());
    success('Found PayOS UCP profile');
    info('UCP Version', profile.ucp.version);
    info('Settlement Service', profile.ucp.services['com.payos.settlement']?.version || 'N/A');
    info('Payment Handler', profile.payment?.handlers?.[0]?.name || 'N/A');

    const corridors = profile.payment?.handlers?.[0]?.supported_corridors || [];
    info('Supported Corridors', corridors.map((c: any) => c.rail).join(', '));
  } catch (error: any) {
    log(`  ⚠ Could not fetch profile (server may not be running): ${error.message}`, colors.yellow);
    log('  Continuing with mock demo...', colors.dim);
  }

  // -------------------------------------------------------------------------
  // Step 2: Get FX Quote
  // -------------------------------------------------------------------------
  step(2, 'Get FX Quote for USD → BRL');

  const quoteRequest = {
    corridor: 'pix',
    amount: 100.0,
    currency: 'USD',
  };

  info('Request', JSON.stringify(quoteRequest));

  let quote: any;
  try {
    quote = await fetchAPI('/v1/ucp/quote', {
      method: 'POST',
      body: JSON.stringify(quoteRequest),
    });
    success('Quote received');
    info('From', `${quote.from_amount} ${quote.from_currency}`);
    info('To', `${quote.to_amount} ${quote.to_currency}`);
    info('FX Rate', quote.fx_rate.toString());
    info('Fees', `${quote.fees} ${quote.from_currency}`);
    info('Expires', quote.expires_at);
  } catch (error: any) {
    log(`  ⚠ Could not get quote: ${error.message}`, colors.yellow);
    quote = {
      from_amount: 100,
      from_currency: 'USD',
      to_amount: 588.65,
      to_currency: 'BRL',
      fx_rate: 5.95,
      fees: 1.0,
    };
    log('  Using mock quote for demo...', colors.dim);
    info('From', `${quote.from_amount} ${quote.from_currency}`);
    info('To', `${quote.to_amount} ${quote.to_currency}`);
  }

  // -------------------------------------------------------------------------
  // Step 3: Acquire Settlement Token
  // -------------------------------------------------------------------------
  step(3, 'Acquire Settlement Token');

  const tokenRequest = {
    corridor: 'pix',
    amount: 100.0,
    currency: 'USD',
    recipient: {
      type: 'pix',
      pix_key: '12345678901',
      pix_key_type: 'cpf',
      name: 'Maria Silva',
      tax_id: '12345678901',
    },
    metadata: {
      checkout_id: 'demo-checkout-001',
      merchant: 'Demo Store',
      items: ['Widget Pro', 'Widget Mini'],
    },
  };

  info('Pix Key', tokenRequest.recipient.pix_key);
  info('Recipient', tokenRequest.recipient.name);

  let token: any;
  try {
    token = await fetchAPI('/v1/ucp/tokens', {
      method: 'POST',
      body: JSON.stringify(tokenRequest),
    });
    success('Settlement token acquired');
    info('Token', `${token.token.substring(0, 20)}...`);
    info('Settlement ID', token.settlement_id);
    info('Quote Amount', `${token.quote.from_amount} ${token.quote.from_currency} → ${token.quote.to_amount} ${token.quote.to_currency}`);
    info('Expires', token.expires_at);
  } catch (error: any) {
    log(`  ⚠ Could not acquire token: ${error.message}`, colors.yellow);
    token = {
      token: 'ucp_tok_demo123456789012345678901234',
      settlement_id: 'demo-settlement-001',
      quote,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    log('  Using mock token for demo...', colors.dim);
    info('Token', `${token.token.substring(0, 20)}...`);
  }

  // -------------------------------------------------------------------------
  // Step 4: Complete Settlement
  // -------------------------------------------------------------------------
  step(4, 'Complete Settlement');

  const settleRequest = {
    token: token.token,
    idempotency_key: `demo-${Date.now()}`,
  };

  let settlement: any;
  try {
    settlement = await fetchAPI('/v1/ucp/settle', {
      method: 'POST',
      body: JSON.stringify(settleRequest),
    });
    success('Settlement initiated');
    info('Status', settlement.status);
    info('Settlement ID', settlement.id);
    info('Corridor', settlement.corridor);
    info('Estimated Completion', settlement.estimated_completion);
  } catch (error: any) {
    log(`  ⚠ Could not complete settlement: ${error.message}`, colors.yellow);
    settlement = {
      id: token.settlement_id,
      status: 'pending',
      corridor: 'pix',
      estimated_completion: new Date(Date.now() + 60 * 1000).toISOString(),
    };
    log('  Using mock settlement for demo...', colors.dim);
    info('Status', settlement.status);
  }

  // -------------------------------------------------------------------------
  // Step 5: Check Settlement Status
  // -------------------------------------------------------------------------
  step(5, 'Check Settlement Status');

  try {
    const status = await fetchAPI(`/v1/ucp/settlements/${settlement.id}`);
    success('Settlement status retrieved');
    info('ID', status.id);
    info('Status', status.status);
    info('Amount', `${status.amount.source} ${status.amount.source_currency} → ${status.amount.destination} ${status.amount.destination_currency}`);

    if (status.completed_at) {
      info('Completed At', status.completed_at);
    }
  } catch (error: any) {
    log(`  ⚠ Could not check status: ${error.message}`, colors.yellow);
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  header('Demo Complete!');
  console.log('');
  log('This demo showed the complete UCP → PayOS → Pix flow:', colors.bright);
  console.log('');
  log('  1. Agent discovered PayOS as a UCP Payment Handler');
  log('  2. Agent got FX quote for USD → BRL via Pix');
  log('  3. Agent acquired settlement token (valid 15 min)');
  log('  4. Agent completed checkout with token');
  log('  5. PayOS initiated Pix settlement to recipient');
  console.log('');
  log('In production, Pix settlements complete in < 1 minute.', colors.green);
  log('SPEI (Mexico) settlements complete in < 30 minutes.', colors.green);
  console.log('');
  log('PayOS: The LATAM Settlement Layer for UCP', colors.magenta + colors.bright);
  console.log('');
}

// Run the demo
main().catch(console.error);
