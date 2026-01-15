/**
 * Story 40.28: API Key Validation Script
 * 
 * Validates connectivity to all configured external services.
 * Run with: npx tsx scripts/validate-api-keys.ts
 */

import 'dotenv/config';

interface ValidationResult {
  service: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  details?: unknown;
}

const results: ValidationResult[] = [];

// ============================================
// Helper Functions
// ============================================

function maskKey(key: string | undefined): string {
  if (!key) return '(not set)';
  if (key.length <= 8) return '***';
  return key.substring(0, 4) + '...' + key.substring(key.length - 4);
}

async function testEndpoint(
  url: string, 
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; body?: unknown }> {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
    
    const text = await response.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    
    return { ok: response.ok, status: response.status, body };
  } catch (error) {
    return { ok: false, status: 0, body: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// Service Validators
// ============================================

async function validateCircle(): Promise<ValidationResult> {
  const apiKey = process.env.CIRCLE_API_KEY || process.env.PAYOS_CIRCLE_API_KEY;
  
  if (!apiKey) {
    return {
      service: 'Circle',
      status: 'skipped',
      message: 'No API key configured (CIRCLE_API_KEY)',
    };
  }

  console.log(`  Testing Circle with key: ${maskKey(apiKey)}`);
  
  // Test the Circle API health endpoint
  const result = await testEndpoint('https://api-sandbox.circle.com/v1/configuration', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (result.ok) {
    return {
      service: 'Circle',
      status: 'success',
      message: 'Connected to Circle Sandbox API',
      details: result.body,
    };
  } else {
    return {
      service: 'Circle',
      status: 'error',
      message: `Circle API returned ${result.status}`,
      details: result.body,
    };
  }
}

async function validateCoinbaseCDP(): Promise<ValidationResult> {
  // Support both old format (CDP_API_KEY_NAME) and new format (CDP_API_KEY_ID)
  const apiKeyId = process.env.CDP_API_KEY_ID || 
                   process.env.CDP_API_KEY_NAME || 
                   process.env.PAYOS_COINBASE_API_KEY;
  const privateKey = process.env.CDP_API_KEY_PRIVATE_KEY || 
                     process.env.CDP_PRIVATE_KEY;
  
  if (!apiKeyId) {
    return {
      service: 'Coinbase CDP',
      status: 'skipped',
      message: 'No API key configured (CDP_API_KEY_ID or CDP_API_KEY_NAME)',
    };
  }

  console.log(`  Testing Coinbase CDP with key ID: ${maskKey(apiKeyId)}`);
  
  // Check for new UUID format (e.g., 7ccc78ac-512d-4bbd-bf20-14bf27badf11)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuidFormat = uuidRegex.test(apiKeyId);
  
  // Check for old format (organizations/.../apiKeys/...)
  const isOldFormat = apiKeyId.includes('organizations/') && apiKeyId.includes('/apiKeys/');
  
  if (isUuidFormat) {
    // New CDP format with UUID key ID
    if (privateKey && privateKey.length > 20) {
      // Check if it's base64 encoded (new format) or PEM format (old format)
      const isBase64 = /^[A-Za-z0-9+/=]+$/.test(privateKey.replace(/\s/g, ''));
      const isPEM = privateKey.includes('BEGIN');
      
      if (isBase64 || isPEM) {
        return {
          service: 'Coinbase CDP',
          status: 'success',
          message: 'CDP API key format valid (UUID + private key)',
          details: { 
            keyFormat: 'uuid', 
            keyId: maskKey(apiKeyId),
            privateKeyFormat: isPEM ? 'PEM' : 'base64',
          },
        };
      }
    }
    return {
      service: 'Coinbase CDP',
      status: 'error',
      message: 'CDP_API_KEY_PRIVATE_KEY or CDP_PRIVATE_KEY is missing',
      details: { keyFormat: 'uuid', hasPrivateKey: !!privateKey },
    };
  } else if (isOldFormat) {
    // Old CDP format
    if (privateKey && privateKey.includes('BEGIN EC PRIVATE KEY')) {
      return {
        service: 'Coinbase CDP',
        status: 'success',
        message: 'CDP API key format is valid (legacy format)',
        details: { keyFormat: 'legacy', hasPrivateKey: true },
      };
    } else {
      return {
        service: 'Coinbase CDP',
        status: 'error',
        message: 'CDP_API_KEY_PRIVATE_KEY is missing or invalid',
        details: { keyFormat: 'legacy', hasPrivateKey: false },
      };
    }
  } else {
    return {
      service: 'Coinbase CDP',
      status: 'error',
      message: 'CDP key format not recognized (expected UUID or organizations/.../apiKeys/...)',
      details: { receivedFormat: apiKeyId.substring(0, 20) + '...' },
    };
  }
}

async function validateStripe(): Promise<ValidationResult> {
  const apiKey = process.env.STRIPE_SECRET_KEY || process.env.PAYOS_STRIPE_API_KEY;
  
  if (!apiKey) {
    return {
      service: 'Stripe',
      status: 'skipped',
      message: 'No API key configured (STRIPE_SECRET_KEY)',
    };
  }

  console.log(`  Testing Stripe with key: ${maskKey(apiKey)}`);
  
  // Check if it's a test key
  const isTestKey = apiKey.startsWith('sk_test_');
  if (!isTestKey && !apiKey.startsWith('sk_live_')) {
    return {
      service: 'Stripe',
      status: 'error',
      message: 'Invalid Stripe key format (should start with sk_test_ or sk_live_)',
    };
  }

  // Test the Stripe API
  const result = await testEndpoint('https://api.stripe.com/v1/balance', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (result.ok) {
    return {
      service: 'Stripe',
      status: 'success',
      message: `Connected to Stripe API (${isTestKey ? 'TEST MODE' : 'LIVE MODE'})`,
      details: result.body,
    };
  } else {
    return {
      service: 'Stripe',
      status: 'error',
      message: `Stripe API returned ${result.status}`,
      details: result.body,
    };
  }
}

async function validateElliptic(): Promise<ValidationResult> {
  const apiKey = process.env.ELLIPTIC_API_KEY || process.env.PAYOS_COMPLIANCE_API_KEY;
  
  if (!apiKey) {
    return {
      service: 'Elliptic',
      status: 'skipped',
      message: 'No API key configured (ELLIPTIC_API_KEY)',
    };
  }

  console.log(`  Testing Elliptic with key: ${maskKey(apiKey)}`);
  
  // Elliptic requires specific authentication, just validate format
  if (apiKey.length > 10) {
    return {
      service: 'Elliptic',
      status: 'success',
      message: 'Elliptic API key format appears valid (full validation requires test request)',
      details: { keyLength: apiKey.length },
    };
  } else {
    return {
      service: 'Elliptic',
      status: 'error',
      message: 'Elliptic API key appears too short',
    };
  }
}

async function validateBlockchain(): Promise<ValidationResult> {
  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 
                 process.env.PAYOS_BLOCKCHAIN_URL || 
                 'https://sepolia.base.org';
  const privateKey = process.env.EVM_PRIVATE_KEY;

  console.log(`  Testing blockchain RPC: ${rpcUrl}`);
  
  // Test RPC connectivity with eth_chainId
  const result = await testEndpoint(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_chainId',
      params: [],
      id: 1,
    }),
  });

  if (result.ok && typeof result.body === 'object' && result.body !== null) {
    const body = result.body as { result?: string };
    const chainId = body.result;
    const chainName = chainId === '0x14a34' ? 'Base Sepolia' : 
                      chainId === '0x2105' ? 'Base Mainnet' : 
                      `Unknown (${chainId})`;
    
    return {
      service: 'Blockchain (Base)',
      status: 'success',
      message: `Connected to ${chainName}`,
      details: { 
        chainId, 
        chainName,
        hasPrivateKey: !!privateKey,
        privateKeyHint: privateKey ? maskKey(privateKey) : '(not set)',
      },
    };
  } else {
    return {
      service: 'Blockchain (Base)',
      status: 'error',
      message: `RPC endpoint not responding`,
      details: result.body,
    };
  }
}

async function validateX402Facilitator(): Promise<ValidationResult> {
  const facilitatorUrl = process.env.PAYOS_X402_URL || 'https://x402.org/facilitator';
  
  console.log(`  Testing x402 facilitator: ${facilitatorUrl}`);
  
  // Test facilitator endpoint
  const result = await testEndpoint(`${facilitatorUrl}/supported-networks`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (result.ok) {
    return {
      service: 'x402 Facilitator',
      status: 'success',
      message: 'Connected to x402 facilitator',
      details: result.body,
    };
  } else {
    // x402.org might return different status codes, check if reachable
    if (result.status === 404 || result.status === 405) {
      return {
        service: 'x402 Facilitator',
        status: 'success',
        message: 'x402 facilitator is reachable (endpoint may not support GET)',
        details: { status: result.status },
      };
    }
    return {
      service: 'x402 Facilitator',
      status: 'error',
      message: `x402 facilitator returned ${result.status}`,
      details: result.body,
    };
  }
}

async function validateSupabase(): Promise<ValidationResult> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!url || !serviceKey) {
    return {
      service: 'Supabase',
      status: 'error',
      message: 'SUPABASE_URL or SUPABASE_SERVICE_KEY not configured',
    };
  }

  console.log(`  Testing Supabase: ${url}`);
  
  // Test Supabase REST API
  const result = await testEndpoint(`${url}/rest/v1/`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
  });

  // Supabase returns 200 even for empty result
  if (result.status === 200 || result.status === 404) {
    return {
      service: 'Supabase',
      status: 'success',
      message: 'Connected to Supabase',
      details: { url },
    };
  } else {
    return {
      service: 'Supabase',
      status: 'error',
      message: `Supabase returned ${result.status}`,
      details: result.body,
    };
  }
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              PayOS API Key Validation                        ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Environment: ${(process.env.PAYOS_ENVIRONMENT || 'mock').toUpperCase().padEnd(46)}║`);
  console.log(`║  NODE_ENV: ${(process.env.NODE_ENV || 'development').padEnd(49)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');

  console.log('🔍 Validating configured services...\n');

  // Run all validations
  results.push(await validateSupabase());
  results.push(await validateCircle());
  results.push(await validateCoinbaseCDP());
  results.push(await validateStripe());
  results.push(await validateBlockchain());
  results.push(await validateX402Facilitator());
  results.push(await validateElliptic());

  // Print results
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                      VALIDATION RESULTS                       ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  
  for (const result of results) {
    const icon = result.status === 'success' ? '✅' : 
                 result.status === 'error' ? '❌' : 
                 '⏭️ ';
    const status = result.status.toUpperCase().padEnd(7);
    console.log(`║  ${icon} ${result.service.padEnd(20)} ${status}                       ║`);
    console.log(`║     ${result.message.substring(0, 55).padEnd(55)}║`);
    if (result.details && result.status !== 'skipped') {
      const detailStr = JSON.stringify(result.details).substring(0, 55);
      console.log(`║     ${detailStr.padEnd(55)}║`);
    }
  }
  
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Summary
  const success = results.filter(r => r.status === 'success').length;
  const errors = results.filter(r => r.status === 'error').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  
  console.log('\n');
  console.log(`📊 Summary: ${success} success, ${errors} errors, ${skipped} skipped`);
  
  if (errors > 0) {
    console.log('\n⚠️  Some services failed validation. Check your API keys.');
    process.exit(1);
  } else {
    console.log('\n✅ All configured services validated successfully!');
    process.exit(0);
  }
}

main().catch(console.error);

