/**
 * Integration Tests: Stream Simulation
 * Story 28.6: Stream Simulation with Cost Projection
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

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

beforeAll(async () => {
  // Ensure test API key exists
  const keyPrefix = TEST_API_KEY.substring(0, TEST_API_KEY.indexOf('_', 3) + 1);
  const keyHash = hashApiKey(TEST_API_KEY);

  await supabase
    .from('api_keys')
    .upsert({
      tenant_id: TEST_TENANT_ID,
      name: 'Test Key for Stream Simulations',
      environment: 'test',
      key_prefix: keyPrefix,
      key_hash: keyHash,
      status: 'active',
    }, {
      onConflict: 'tenant_id,key_prefix',
    });
});

describe('POST /v1/simulate - Stream Simulation', () => {
  it('should simulate a stream with cost projections', async () => {
    const response = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'stream',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          rate_per_second: '0.001',
          currency: 'USDC',
          duration_seconds: 2592000, // 30 days
        },
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.can_execute).toBe(true);
    expect(data.data.preview.stream).toBeDefined();
    expect(data.data.preview.stream.total_cost).toBe('2592.00');
    expect(data.data.preview.stream.cost_per_day).toBe('86.40');
    expect(data.data.preview.stream.cost_per_month).toBe('2592.00');
  });

  it('should calculate accurate runway', async () => {
    const response = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'stream',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          rate_per_second: '0.1', // Higher rate
          currency: 'USDC',
          duration_seconds: 86400, // 1 day
        },
      }),
    });

    const data = await response.json();

    expect(data.data.preview.runway).toBeDefined();
    expect(data.data.preview.runway.current_balance).toBeDefined();
    expect(data.data.preview.runway.estimated_runway_days).toBeGreaterThan(0);
    expect(data.data.preview.runway.depletion_date).toBeDefined();
  });

  it('should show projections at different intervals', async () => {
    const response = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'stream',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          rate_per_second: '0.01',
          currency: 'USDC',
          duration_seconds: 2592000, // 30 days
        },
      }),
    });

    const data = await response.json();

    expect(data.data.preview.projections).toBeDefined();
    expect(data.data.preview.projections.one_day).toBeDefined();
    expect(data.data.preview.projections.seven_days).toBeDefined();
    expect(data.data.preview.projections.thirty_days).toBeDefined();
    expect(data.data.preview.projections.full_duration).toBeDefined();

    // Verify costs increase over time
    const oneDay = parseFloat(data.data.preview.projections.one_day.cost);
    const sevenDays = parseFloat(data.data.preview.projections.seven_days.cost);
    const thirtyDays = parseFloat(data.data.preview.projections.thirty_days.cost);

    expect(sevenDays).toBeGreaterThan(oneDay);
    expect(thirtyDays).toBeGreaterThan(sevenDays);
  });

  it('should error when balance insufficient for duration', async () => {
    const response = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'stream',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          rate_per_second: '100', // Very high rate
          currency: 'USDC',
          duration_seconds: 86400, // 1 day
        },
      }),
    });

    const data = await response.json();

    expect(data.data.can_execute).toBe(false);
    expect(data.data.errors.length).toBeGreaterThan(0);
    
    const insufficientError = data.data.errors.find((e: any) => 
      e.code === 'INSUFFICIENT_BALANCE_FOR_DURATION'
    );
    expect(insufficientError).toBeDefined();
    expect(insufficientError.details.required).toBeDefined();
    expect(insufficientError.details.available).toBeDefined();
    expect(insufficientError.details.shortfall).toBeDefined();
  });

  it('should warn about low runway', async () => {
    const response = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'stream',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          rate_per_second: '50', // Will deplete in < 7 days
          currency: 'USDC',
        },
      }),
    });

    const data = await response.json();

    const lowRunwayWarning = data.data.warnings.find((w: any) => w.code === 'LOW_RUNWAY');
    expect(lowRunwayWarning).toBeDefined();
    expect(lowRunwayWarning.details.runway_days).toBeDefined();
    expect(parseFloat(lowRunwayWarning.details.runway_days)).toBeLessThan(7);
  });

  it('should warn about high daily cost', async () => {
    const response = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'stream',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          rate_per_second: '0.5', // High daily cost
          currency: 'USDC',
          duration_seconds: 86400,
        },
      }),
    });

    const data = await response.json();

    const highCostWarning = data.data.warnings.find((w: any) => w.code === 'HIGH_DAILY_COST');
    expect(highCostWarning).toBeDefined();
    expect(highCostWarning.details.daily_cost).toBeDefined();
    expect(highCostWarning.details.percentage).toBeDefined();
  });

  it('should calculate will_complete correctly', async () => {
    // Test with sufficient balance
    const sufficientResponse = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'stream',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          rate_per_second: '0.001',
          currency: 'USDC',
          duration_seconds: 86400, // 1 day, costs $86.40
        },
      }),
    });

    const sufficientData = await sufficientResponse.json();
    expect(sufficientData.data.preview.runway.will_complete).toBe(true);

    // Test with insufficient balance
    const insufficientResponse = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'stream',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          rate_per_second: '100',
          currency: 'USDC',
          duration_seconds: 86400, // 1 day, costs $8,640,000
        },
      }),
    });

    const insufficientData = await insufficientResponse.json();
    expect(insufficientData.data.preview.runway.will_complete).toBe(false);
  });

  it('should handle stream without duration (infinite)', async () => {
    const response = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'stream',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          rate_per_second: '0.01',
          currency: 'USDC',
          // No duration_seconds
        },
      }),
    });

    const data = await response.json();

    expect(data.data.can_execute).toBe(true);
    expect(data.data.preview.stream.duration_seconds).toBe(0);
    expect(data.data.preview.stream.total_cost).toBe('0.00');
    expect(data.data.preview.runway.will_complete).toBe(true); // No fixed duration
  });

  it('should include timing information', async () => {
    const response = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'stream',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          rate_per_second: '0.001',
          currency: 'USDC',
          duration_seconds: 2592000,
        },
      }),
    });

    const data = await response.json();

    expect(data.data.preview.timing).toBeDefined();
    expect(data.data.preview.timing.start_time).toBeDefined();
    expect(data.data.preview.timing.end_time).toBeDefined();
    expect(data.data.preview.timing.duration_days).toBe(30);
  });

  it('should reject stream from non-existent account', async () => {
    const response = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'stream',
        payload: {
          from_account_id: '00000000-0000-0000-0000-000000000000',
          to_account_id: ACCOUNT_ANA,
          rate_per_second: '0.001',
          currency: 'USDC',
          duration_seconds: 86400,
        },
      }),
    });

    const data = await response.json();

    expect(data.data.can_execute).toBe(false);
    expect(data.data.errors[0].code).toBe('SOURCE_ACCOUNT_NOT_FOUND');
  });
});



