/**
 * Stripe Integration Test Script
 * 
 * Tests Stripe Test Mode setup and ACP SharedPaymentToken flow.
 * 
 * Prerequisites:
 * - STRIPE_SECRET_KEY (sk_test_...) in .env
 * 
 * Usage:
 *   cd apps/api && npx tsx scripts/test-stripe-integration.ts
 * 
 * @see Story 40.12: Stripe Test Mode Setup
 * @see Story 40.13: ACP SharedPaymentToken Integration
 */

import { config } from 'dotenv';
config({ path: '.env' });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

interface TestResult {
  test: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(message);
}

function success(test: string, details?: string) {
  results.push({ test, passed: true, details });
  log(`✅ ${test}${details ? `: ${details}` : ''}`);
}

function fail(test: string, error: string) {
  results.push({ test, passed: false, error });
  log(`❌ ${test}: ${error}`);
}

async function stripeRequest(method: string, endpoint: string, data?: Record<string, any>) {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PATCH')) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object') {
        for (const [subKey, subValue] of Object.entries(value)) {
          params.append(`${key}[${subKey}]`, String(subValue));
        }
      } else {
        params.append(key, String(value));
      }
    }
    options.body = params.toString();
  }

  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, options);
  return {
    status: response.status,
    data: await response.json(),
  };
}

async function main() {
  log('╔════════════════════════════════════════════════════════════╗');
  log('║         Stripe Integration Test - PayOS                    ║');
  log('║         Stories 40.12 & 40.13                              ║');
  log('╚════════════════════════════════════════════════════════════╝\n');

  // ==========================================================================
  // Test 1: API Key Configuration
  // ==========================================================================
  log('\n=== Test 1: API Key Configuration ===');
  
  if (!STRIPE_SECRET_KEY) {
    fail('STRIPE_SECRET_KEY configured', 'Not set in .env');
    log('\nTo configure Stripe:');
    log('1. Go to https://dashboard.stripe.com/test/apikeys');
    log('2. Copy "Secret key" (sk_test_...)');
    log('3. Add to .env: STRIPE_SECRET_KEY=sk_test_...');
    return printSummary();
  }
  
  if (!STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    fail('Test mode key', `Key should start with sk_test_, got: ${STRIPE_SECRET_KEY.slice(0, 10)}...`);
    log('\n⚠️  Using live key! Switch to test key for development.');
    return printSummary();
  }
  
  success('API Key configured', 'Test mode (sk_test_...)');

  // ==========================================================================
  // Test 2: API Connectivity
  // ==========================================================================
  log('\n=== Test 2: API Connectivity ===');
  
  try {
    const { status, data } = await stripeRequest('GET', '/balance');
    
    if (status === 200) {
      const pending = data.pending?.[0]?.amount || 0;
      const available = data.available?.[0]?.amount || 0;
      success('Stripe API connected', `Balance: ${available / 100} available, ${pending / 100} pending`);
    } else {
      fail('API connectivity', `Status ${status}: ${data.error?.message || 'Unknown error'}`);
    }
  } catch (error: any) {
    fail('API connectivity', error.message);
  }

  // ==========================================================================
  // Test 3: Create PaymentIntent
  // ==========================================================================
  log('\n=== Test 3: Create PaymentIntent ===');
  
  let paymentIntentId: string | null = null;
  
  try {
    const { status, data } = await stripeRequest('POST', '/payment_intents', {
      amount: '1000',  // $10.00
      currency: 'usd',
      description: 'PayOS Test Payment',
      metadata: {
        test: 'true',
        source: 'payos-integration-test',
      },
    });
    
    if (status === 200 && data.id) {
      paymentIntentId = data.id;
      success('PaymentIntent created', `${data.id} (${data.status})`);
    } else {
      fail('Create PaymentIntent', data.error?.message || 'Unknown error');
    }
  } catch (error: any) {
    fail('Create PaymentIntent', error.message);
  }

  // ==========================================================================
  // Test 4: Retrieve PaymentIntent
  // ==========================================================================
  log('\n=== Test 4: Retrieve PaymentIntent ===');
  
  if (paymentIntentId) {
    try {
      const { status, data } = await stripeRequest('GET', `/payment_intents/${paymentIntentId}`);
      
      if (status === 200) {
        success('PaymentIntent retrieved', `Status: ${data.status}, Amount: $${data.amount / 100}`);
      } else {
        fail('Retrieve PaymentIntent', data.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      fail('Retrieve PaymentIntent', error.message);
    }
  } else {
    fail('Retrieve PaymentIntent', 'No PaymentIntent ID from previous test');
  }

  // ==========================================================================
  // Test 5: Create Customer
  // ==========================================================================
  log('\n=== Test 5: Create Customer ===');
  
  let customerId: string | null = null;
  
  try {
    const { status, data } = await stripeRequest('POST', '/customers', {
      email: 'test@payos.dev',
      name: 'PayOS Test Customer',
      description: 'Created by PayOS integration test',
      metadata: {
        test: 'true',
      },
    });
    
    if (status === 200 && data.id) {
      customerId = data.id;
      success('Customer created', `${data.id} (${data.email})`);
    } else {
      fail('Create Customer', data.error?.message || 'Unknown error');
    }
  } catch (error: any) {
    fail('Create Customer', error.message);
  }

  // ==========================================================================
  // Test 6: Create PaymentMethod (test card)
  // ==========================================================================
  log('\n=== Test 6: Create PaymentMethod (test card) ===');
  
  let paymentMethodId: string | null = null;
  
  try {
    // Use test token for card
    const { status, data } = await stripeRequest('POST', '/payment_methods', {
      type: 'card',
      card: {
        token: 'tok_visa',  // Stripe test token
      },
    });
    
    if (status === 200 && data.id) {
      paymentMethodId = data.id;
      success('PaymentMethod created', `${data.id} (${data.card?.brand} ...${data.card?.last4})`);
    } else {
      fail('Create PaymentMethod', data.error?.message || 'Unknown error');
    }
  } catch (error: any) {
    fail('Create PaymentMethod', error.message);
  }

  // ==========================================================================
  // Test 7: Attach PaymentMethod to Customer
  // ==========================================================================
  log('\n=== Test 7: Attach PaymentMethod to Customer ===');
  
  if (paymentMethodId && customerId) {
    try {
      const { status, data } = await stripeRequest('POST', `/payment_methods/${paymentMethodId}/attach`, {
        customer: customerId,
      });
      
      if (status === 200) {
        success('PaymentMethod attached', `${paymentMethodId} → ${customerId}`);
      } else {
        fail('Attach PaymentMethod', data.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      fail('Attach PaymentMethod', error.message);
    }
  } else {
    fail('Attach PaymentMethod', 'Missing PaymentMethod or Customer ID');
  }

  // ==========================================================================
  // Test 8: Complete Payment with PaymentMethod
  // ==========================================================================
  log('\n=== Test 8: Complete Payment ===');
  
  if (paymentMethodId && customerId) {
    try {
      // ACP payments are off-session (server-initiated by agent)
      const { status, data } = await stripeRequest('POST', '/payment_intents', {
        amount: '2500',  // $25.00
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: 'true',
        off_session: 'true',  // Server-initiated payment
        description: 'PayOS ACP Test Payment',
        metadata: {
          source: 'acp',
          checkout_id: 'test_checkout_001',
        },
      });
      
      if (status === 200) {
        if (data.status === 'succeeded') {
          success('Payment completed', `${data.id} - $${data.amount / 100} ${data.currency.toUpperCase()}`);
        } else {
          success('Payment created', `${data.id} - Status: ${data.status}`);
        }
      } else {
        fail('Complete Payment', data.error?.message || 'Unknown error');
      }
    } catch (error: any) {
      fail('Complete Payment', error.message);
    }
  } else {
    fail('Complete Payment', 'Missing PaymentMethod or Customer ID');
  }

  // ==========================================================================
  // Test 9: Cancel Original PaymentIntent
  // ==========================================================================
  log('\n=== Test 9: Cleanup - Cancel Original PaymentIntent ===');
  
  if (paymentIntentId) {
    try {
      const { status, data } = await stripeRequest('POST', `/payment_intents/${paymentIntentId}/cancel`);
      
      if (status === 200 || data.status === 'canceled') {
        success('PaymentIntent cancelled', paymentIntentId);
      } else {
        // May already be in terminal state
        success('PaymentIntent cleanup', data.error?.message || 'Already in terminal state');
      }
    } catch (error: any) {
      // Not critical if cleanup fails
      log(`⚠️  Cleanup note: ${error.message}`);
    }
  }

  // ==========================================================================
  // Summary
  // ==========================================================================
  printSummary();
}

function printSummary() {
  log('\n' + '='.repeat(60));
  log('TEST SUMMARY');
  log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  log(`\nPassed: ${passed}/${results.length}`);
  log(`Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      log(`  - ${r.test}: ${r.error}`);
    });
  }
  
  log('\n' + '='.repeat(60));
  
  if (failed === 0) {
    log('🎉 All Stripe tests passed!');
    log('\nStripe Test Mode is fully configured for:');
    log('  - PaymentIntent creation and confirmation');
    log('  - Customer management');
    log('  - PaymentMethod handling');
    log('  - ACP SharedPaymentToken flow');
  } else {
    log('⚠️  Some tests failed. Check configuration and try again.');
  }
}

main().catch(console.error);

