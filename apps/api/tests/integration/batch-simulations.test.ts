/**
 * Integration Tests: Batch Simulation Endpoint
 * Story 28.3: Batch Simulation with Cumulative Balance Validation
 */

import 'dotenv/config';
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const API_URL = process.env.API_URL || 'http://localhost:4000';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Test accounts from setup.ts
const TEST_TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001'; // Demo Fintech
const TEST_API_KEY = 'pk_test_demo_fintech_key_12345';
const ACCOUNT_MARIA = 'cccccccc-0000-0000-0000-000000000001'; // $27,997 USDC
const ACCOUNT_ANA = 'cccccccc-0000-0000-0000-000000000003'; // $30,462 USDC
const ACCOUNT_SOFIA = 'cccccccc-0000-0000-0000-000000000005'; // $23,118 USDC

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

beforeAll(async () => {
  // Ensure test API key exists
  const keyPrefix = TEST_API_KEY.substring(0, TEST_API_KEY.indexOf('_', 3) + 1);
  const keyHash = hashApiKey(TEST_API_KEY);

  const { error } = await supabase
    .from('api_keys')
    .upsert({
      tenant_id: TEST_TENANT_ID,
      name: 'Test Key for Batch Simulations',
      environment: 'test',
      key_prefix: keyPrefix,
      key_hash: keyHash,
      status: 'active',
    }, {
      onConflict: 'tenant_id,key_prefix',
    });

  if (error) {
    console.error('Failed to setup test API key:', error);
  }
});

describe('POST /v1/simulate/batch', () => {
  it('should simulate a small batch of 3 transfers', async () => {
    const response = await fetch(`${API_URL}/v1/simulate/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        simulations: [
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_ANA,
              amount: '100.00',
              currency: 'USDC',
            },
          },
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_SOFIA,
              amount: '200.00',
              currency: 'USDC',
            },
          },
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_ANA,
              amount: '150.00',
              currency: 'USDC',
            },
          },
        ],
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.total_count).toBe(3);
    expect(data.data.successful).toBe(3);
    expect(data.data.failed).toBe(0);
    expect(data.data.can_execute_all).toBe(true);
    expect(data.data.totals.amount.USDC).toBe('450.00');
    expect(data.data.summary.by_currency.USDC.count).toBe(3);
  });

  it('should handle cross-currency batch with multiple rails', async () => {
    const response = await fetch(`${API_URL}/v1/simulate/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        simulations: [
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_ANA,
              amount: '500.00',
              currency: 'USD',
              destination_currency: 'BRL',
            },
          },
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_SOFIA,
              amount: '300.00',
              currency: 'USD',
              destination_currency: 'MXN',
            },
          },
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_ANA,
              amount: '200.00',
              currency: 'USDC',
            },
          },
        ],
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();

    expect(data.data.can_execute_all).toBe(true);
    expect(data.data.summary.by_rail.pix).toBeDefined();
    expect(data.data.summary.by_rail.spei).toBeDefined();
    expect(data.data.summary.by_rail.internal).toBeDefined();
    expect(data.data.simulations[0].preview.timing.rail).toBe('pix');
    expect(data.data.simulations[1].preview.timing.rail).toBe('spei');
  });

  it('should validate cumulative balance across multiple transfers', async () => {
    const response = await fetch(`${API_URL}/v1/simulate/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        simulations: [
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_ANA,
              amount: '10000.00',
              currency: 'USDC',
            },
          },
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_SOFIA,
              amount: '10000.00',
              currency: 'USDC',
            },
          },
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_ANA,
              amount: '10000.00',
              currency: 'USDC',
            },
          },
        ],
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();

    // First two should succeed, third should fail due to insufficient balance
    expect(data.data.successful).toBe(2);
    expect(data.data.failed).toBe(1);
    expect(data.data.can_execute_all).toBe(false);
    expect(data.data.simulations[0].can_execute).toBe(true);
    expect(data.data.simulations[1].can_execute).toBe(true);
    expect(data.data.simulations[2].can_execute).toBe(false);
    expect(data.data.simulations[2].errors[0].code).toBe('INSUFFICIENT_BALANCE');
  });

  it('should stop on first error when flag is set', async () => {
    const response = await fetch(`${API_URL}/v1/simulate/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        simulations: [
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_ANA,
              amount: '100.00',
              currency: 'USDC',
            },
          },
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_ANA,
              amount: '999999999.00', // Will fail
              currency: 'USDC',
            },
          },
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_ANA,
              amount: '100.00',
              currency: 'USDC',
            },
          },
        ],
        stop_on_first_error: true,
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();

    expect(data.data.successful).toBe(1);
    expect(data.data.failed).toBe(2);
    expect(data.data.simulations[0].can_execute).toBe(true);
    expect(data.data.simulations[1].can_execute).toBe(false);
    expect(data.data.simulations[1].errors[0].code).toBe('INSUFFICIENT_BALANCE');
    expect(data.data.simulations[2].can_execute).toBe(false);
    expect(data.data.simulations[2].errors[0].code).toBe('BATCH_STOPPED');
  });

  it('should handle large batch of 100 transfers efficiently', async () => {
    const simulations = Array.from({ length: 100 }, () => ({
      action: 'transfer' as const,
      payload: {
        from_account_id: ACCOUNT_MARIA,
        to_account_id: ACCOUNT_ANA,
        amount: '25.00',
        currency: 'USDC',
      },
    }));

    const startTime = Date.now();
    const response = await fetch(`${API_URL}/v1/simulate/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ simulations }),
    });
    const endTime = Date.now();

    expect(response.status).toBe(201);
    const data = await response.json();

    expect(data.data.total_count).toBe(100);
    expect(data.data.successful).toBe(100);
    expect(data.data.can_execute_all).toBe(true);
    expect(data.data.totals.amount.USDC).toBe('2500.00');

    // Performance check: should complete in < 2 seconds
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(2000);
  });

  it('should handle maximum batch of 1000 transfers', async () => {
    const simulations = Array.from({ length: 1000 }, () => ({
      action: 'transfer' as const,
      payload: {
        from_account_id: ACCOUNT_MARIA,
        to_account_id: ACCOUNT_ANA,
        amount: '5.00',
        currency: 'USDC',
      },
    }));

    const startTime = Date.now();
    const response = await fetch(`${API_URL}/v1/simulate/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ simulations }),
    });
    const endTime = Date.now();

    expect(response.status).toBe(201);
    const data = await response.json();

    expect(data.data.total_count).toBe(1000);
    expect(data.data.can_execute_all).toBe(true);
    expect(data.data.totals.amount.USDC).toBe('5000.00');

    // Performance check: should complete in < 5 seconds (target met!)
    const duration = endTime - startTime;
    expect(duration).toBeLessThan(5000);
  });

  it('should reject batch with > 1000 simulations', async () => {
    const simulations = Array.from({ length: 1001 }, () => ({
      action: 'transfer' as const,
      payload: {
        from_account_id: ACCOUNT_MARIA,
        to_account_id: ACCOUNT_ANA,
        amount: '10.00',
        currency: 'USDC',
      },
    }));

    const response = await fetch(`${API_URL}/v1/simulate/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ simulations }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_FAILED');
  });

  it('should reject empty batch', async () => {
    const response = await fetch(`${API_URL}/v1/simulate/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        simulations: [],
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.code).toBe('VALIDATION_FAILED');
  });

  it('should handle mixed success and failure in batch', async () => {
    const response = await fetch(`${API_URL}/v1/simulate/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        simulations: [
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_ANA,
              amount: '100.00',
              currency: 'USDC',
            },
          },
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', // Non-existent
              amount: '200.00',
              currency: 'USDC',
            },
          },
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_SOFIA,
              amount: '150.00',
              currency: 'USDC',
            },
          },
        ],
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();

    expect(data.data.successful).toBe(2);
    expect(data.data.failed).toBe(1);
    expect(data.data.can_execute_all).toBe(false);
    expect(data.data.simulations[1].errors[0].code).toBe('DESTINATION_ACCOUNT_NOT_FOUND');
  });

  it('should provide accurate summary statistics', async () => {
    const response = await fetch(`${API_URL}/v1/simulate/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        simulations: [
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_ANA,
              amount: '1000.00',
              currency: 'USD',
              destination_currency: 'BRL',
            },
          },
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_SOFIA,
              amount: '500.00',
              currency: 'USD',
              destination_currency: 'BRL',
            },
          },
          {
            action: 'transfer',
            payload: {
              from_account_id: ACCOUNT_MARIA,
              to_account_id: ACCOUNT_ANA,
              amount: '750.00',
              currency: 'USD',
              destination_currency: 'MXN',
            },
          },
        ],
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();

    // Check totals
    expect(data.data.totals.amount.USD).toBe('2250.00');
    expect(parseFloat(data.data.totals.fees.USD)).toBeGreaterThan(0);

    // Check summary by currency
    expect(data.data.summary.by_currency.USD.count).toBe(3);
    expect(data.data.summary.by_currency.USD.total).toBe('2250.00');

    // Check summary by rail
    expect(data.data.summary.by_rail.pix.count).toBe(2);
    expect(data.data.summary.by_rail.pix.total).toBe('1500.00');
    expect(data.data.summary.by_rail.spei.count).toBe(1);
    expect(data.data.summary.by_rail.spei.total).toBe('750.00');
  });
});

