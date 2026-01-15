/**
 * Integration Tests: Simulation Execution Flow
 * Story 28.4: Simulation-to-Execution with Variance Tracking
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
      name: 'Test Key for Simulation Execution',
      environment: 'test',
      key_prefix: keyPrefix,
      key_hash: keyHash,
      status: 'active',
    }, {
      onConflict: 'tenant_id,key_prefix',
    });
});

describe('POST /v1/simulate/:id/execute', () => {
  it('should execute a valid simulation and create a transfer', async () => {
    // Step 1: Create simulation
    const simulateResponse = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'transfer',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          amount: '100.00',
          currency: 'USDC',
          description: 'Test execution',
        },
      }),
    });

    expect(simulateResponse.status).toBe(201);
    const simulateData = await simulateResponse.json();
    const simulationId = simulateData.data.simulation_id;

    expect(simulateData.data.can_execute).toBe(true);
    expect(simulateData.data.status).toBe('completed');

    // Step 2: Execute simulation
    const executeResponse = await fetch(`${API_URL}/v1/simulate/${simulationId}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    expect(executeResponse.status).toBe(201);
    const executeData = await executeResponse.json();

    expect(executeData.data.simulation_id).toBe(simulationId);
    expect(executeData.data.status).toBe('executed');
    expect(executeData.data.execution_result.type).toBe('transfer');
    expect(executeData.data.execution_result.id).toBeDefined();
    expect(executeData.data.variance).toBeDefined();
    expect(executeData.data.variance.fx_rate_change).toBeDefined();
    expect(executeData.data.variance.fee_change).toBeDefined();

    // Verify transfer was created
    const transferId = executeData.data.execution_result.id;
    const { data: transfer } = await supabase
      .from('transfers')
      .select('*')
      .eq('id', transferId)
      .single();

    expect(transfer).toBeDefined();
    expect(transfer.from_account_id).toBe(ACCOUNT_MARIA);
    expect(transfer.to_account_id).toBe(ACCOUNT_ANA);
    expect(parseFloat(transfer.amount)).toBe(100.00);
  });

  it('should return existing result when executing same simulation twice (idempotency)', async () => {
    // Step 1: Create and execute simulation
    const simulateResponse = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'transfer',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          amount: '50.00',
          currency: 'USDC',
        },
      }),
    });

    const simulateData = await simulateResponse.json();
    const simulationId = simulateData.data.simulation_id;

    const firstExecute = await fetch(`${API_URL}/v1/simulate/${simulationId}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const firstData = await firstExecute.json();
    const firstTransferId = firstData.data.execution_result.id;

    // Step 2: Try to execute again
    const secondExecute = await fetch(`${API_URL}/v1/simulate/${simulationId}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    expect(secondExecute.status).toBe(200);
    const secondData = await secondExecute.json();

    // Should return same transfer ID
    expect(secondData.data.execution_result.id).toBe(firstTransferId);
    expect(secondData.data.message).toContain('already executed');

    // Verify only one transfer was created
    const { data: transfers } = await supabase
      .from('transfers')
      .select('id')
      .eq('id', firstTransferId);

    expect(transfers).toHaveLength(1);
  });

  it('should reject execution of expired simulation', async () => {
    // Create simulation
    const simulateResponse = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'transfer',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          amount: '75.00',
          currency: 'USDC',
        },
      }),
    });

    const simulateData = await simulateResponse.json();
    const simulationId = simulateData.data.simulation_id;

    // Manually expire the simulation
    await supabase
      .from('simulations')
      .update({
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
      })
      .eq('id', simulationId);

    // Try to execute
    const executeResponse = await fetch(`${API_URL}/v1/simulate/${simulationId}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    expect(executeResponse.status).toBe(410); // Gone
    const executeData = await executeResponse.json();

    expect(executeData.success).toBe(false);
    expect(executeData.error.code).toBe('SIMULATION_EXPIRED');
  });

  it('should reject execution if balance has become insufficient', async () => {
    // Create simulation
    const simulateResponse = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'transfer',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          amount: '100.00',
          currency: 'USDC',
        },
      }),
    });

    const simulateData = await simulateResponse.json();
    const simulationId = simulateData.data.simulation_id;

    // Reduce account balance to make it insufficient
    await supabase
      .from('accounts')
      .update({
        balance_available: '50.00', // Less than transfer amount
      })
      .eq('id', ACCOUNT_MARIA);

    // Try to execute
    const executeResponse = await fetch(`${API_URL}/v1/simulate/${simulationId}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    expect(executeResponse.status).toBe(409); // Conflict
    const executeData = await executeResponse.json();

    expect(executeData.success).toBe(false);
    expect(executeData.error.code).toBe('SIMULATION_STALE');
    expect(executeData.error.details.errors).toBeDefined();

    // Restore balance for other tests
    await supabase
      .from('accounts')
      .update({
        balance_available: '27997.00',
      })
      .eq('id', ACCOUNT_MARIA);
  });

  it('should calculate variance correctly for same-currency transfer', async () => {
    // Create and execute simulation
    const simulateResponse = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'transfer',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          amount: '200.00',
          currency: 'USDC',
        },
      }),
    });

    const simulateData = await simulateResponse.json();
    const simulationId = simulateData.data.simulation_id;

    const executeResponse = await fetch(`${API_URL}/v1/simulate/${simulationId}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const executeData = await executeResponse.json();
    const variance = executeData.data.variance;

    // For same-currency, no FX variance expected
    expect(variance.fx_rate_change).toBe('0%');
    
    // Fee change should be minimal (or zero if conditions unchanged)
    expect(variance.fee_change).toBeDefined();
    expect(variance.fee_original).toBeDefined();
    expect(variance.fee_actual).toBeDefined();

    // Timing variance should be present
    expect(variance.timing_change).toBeDefined();
    expect(variance.timing_estimated).toBeDefined();
    expect(variance.timing_actual).toBeDefined();

    // Variance level assessment
    expect(variance.variance_level).toBeDefined();
    expect(variance.variance_level).toMatch(/low|medium|high/);
  });

  it('should reject execution with simulation that has errors', async () => {
    // Create simulation with insufficient balance
    const simulateResponse = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'transfer',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          amount: '999999999.00', // Way more than available
          currency: 'USDC',
        },
      }),
    });

    const simulateData = await simulateResponse.json();
    const simulationId = simulateData.data.simulation_id;

    expect(simulateData.data.can_execute).toBe(false);
    expect(simulateData.data.errors.length).toBeGreaterThan(0);

    // Try to execute
    const executeResponse = await fetch(`${API_URL}/v1/simulate/${simulationId}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    expect(executeResponse.status).toBe(400);
    const executeData = await executeResponse.json();

    expect(executeData.success).toBe(false);
    expect(executeData.error.code).toBe('SIMULATION_CANNOT_EXECUTE');
  });

  it('should handle concurrent execution attempts (race condition)', async () => {
    // Create simulation
    const simulateResponse = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'transfer',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          amount: '25.00',
          currency: 'USDC',
        },
      }),
    });

    const simulateData = await simulateResponse.json();
    const simulationId = simulateData.data.simulation_id;

    // Execute concurrently
    const [response1, response2, response3] = await Promise.all([
      fetch(`${API_URL}/v1/simulate/${simulationId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch(`${API_URL}/v1/simulate/${simulationId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch(`${API_URL}/v1/simulate/${simulationId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }),
    ]);

    const data1 = await response1.json();
    const data2 = await response2.json();
    const data3 = await response3.json();

    // All should return same transfer ID (some may be 200 OK for already-executed)
    const transferIds = [
      data1.data?.execution_result?.id,
      data2.data?.execution_result?.id,
      data3.data?.execution_result?.id,
    ].filter(Boolean);

    expect(transferIds.length).toBeGreaterThan(0);
    expect(new Set(transferIds).size).toBe(1); // All IDs should be identical

    // Verify only one transfer was created
    const { data: transfers } = await supabase
      .from('transfers')
      .select('id')
      .eq('id', transferIds[0]);

    expect(transfers).toHaveLength(1);
  });

  it('should provide execution resource URL', async () => {
    // Create and execute simulation
    const simulateResponse = await fetch(`${API_URL}/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'transfer',
        payload: {
          from_account_id: ACCOUNT_MARIA,
          to_account_id: ACCOUNT_ANA,
          amount: '150.00',
          currency: 'USDC',
        },
      }),
    });

    const simulateData = await simulateResponse.json();
    const simulationId = simulateData.data.simulation_id;

    const executeResponse = await fetch(`${API_URL}/v1/simulate/${simulationId}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const executeData = await executeResponse.json();

    expect(executeData.data.resource_url).toBeDefined();
    expect(executeData.data.resource_url).toMatch(/^\/v1\/transfers\/.+$/);
    
    const transferId = executeData.data.execution_result.id;
    expect(executeData.data.resource_url).toBe(`/v1/transfers/${transferId}`);
  });
});

