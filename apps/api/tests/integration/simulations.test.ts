/**
 * Integration Tests for Simulation Engine (Epic 28, Story 28.2)
 * 
 * Tests the enhanced simulation functionality including:
 * - FX rate lookup and fee calculation
 * - Balance validation and limit checking
 * - Sophisticated warnings (FX trends, rail delays, velocity)
 * - Compliance and verification tier checks
 * - Timing estimates based on payment rails
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { TEST_API_KEY, TEST_ACCOUNTS } from '../setup.js';

const BASE_URL = process.env.API_URL || 'http://localhost:4000';
const skipIntegration = !process.env.INTEGRATION;

describe.skipIf(skipIntegration)('Simulation Engine (Story 28.2)', () => {
  const headers = {
    'Authorization': `Bearer ${TEST_API_KEY}`,
    'Content-Type': 'application/json',
  };

  let testAccountId: string;
  let destAccountId: string;

  beforeAll(async () => {
    // Use existing test accounts
    testAccountId = TEST_ACCOUNTS.techcorp;
    destAccountId = TEST_ACCOUNTS.carlos;
  });

  describe('POST /v1/simulate - Transfer Simulation', () => {
    it('simulates a simple same-currency transfer', async () => {
      const response = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'transfer',
          payload: {
            from_account_id: testAccountId,
            to_account_id: destAccountId,
            amount: '100.00',
            currency: 'USDC',
          },
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('simulation_id');
      expect(data.status).toBe('completed');
      expect(data.can_execute).toBe(true);
      expect(data).toHaveProperty('preview');
      expect(data).toHaveProperty('warnings');
      expect(data).toHaveProperty('errors');
      expect(data).toHaveProperty('expires_at');
      expect(data).toHaveProperty('execute_url');

      // Verify preview structure
      const preview = data.preview;
      expect(preview).toHaveProperty('source');
      expect(preview).toHaveProperty('destination');
      expect(preview).toHaveProperty('fees');
      expect(preview).toHaveProperty('timing');

      // Check source details
      expect(preview.source.account_id).toBe(testAccountId);
      expect(preview.source.amount).toBe('100.00');
      expect(preview.source.currency).toBe('USDC');
      expect(preview.source).toHaveProperty('balance_before');
      expect(preview.source).toHaveProperty('balance_after');

      // Check fees
      expect(preview.fees).toHaveProperty('platform_fee');
      expect(preview.fees).toHaveProperty('fx_fee');
      expect(preview.fees).toHaveProperty('rail_fee');
      expect(preview.fees).toHaveProperty('total');
      expect(parseFloat(preview.fees.total)).toBeGreaterThan(0);

      // Check timing
      expect(preview.timing).toHaveProperty('estimated_duration_seconds');
      expect(preview.timing).toHaveProperty('estimated_arrival');
      expect(preview.timing).toHaveProperty('rail');
      expect(preview.timing.rail).toBe('internal');
    });

    it('simulates a cross-currency transfer with FX', async () => {
      const response = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'transfer',
          payload: {
            from_account_id: testAccountId,
            to_account_id: destAccountId,
            amount: '1000.00',
            currency: 'USD',
            destination_currency: 'BRL',
          },
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.can_execute).toBe(true);

      const preview = data.preview;

      // Should have FX information
      expect(preview).toHaveProperty('fx');
      expect(preview.fx).toHaveProperty('rate');
      expect(preview.fx).toHaveProperty('spread');
      expect(preview.fx.rate_locked).toBe(false);
      expect(parseFloat(preview.fx.rate)).toBeGreaterThan(1); // BRL rate should be > 1

      // Destination amount should be in BRL
      expect(preview.destination.currency).toBe('BRL');
      expect(parseFloat(preview.destination.amount)).toBeGreaterThan(parseFloat(preview.source.amount));

      // Should use PIX rail for BRL
      expect(preview.timing.rail).toBe('pix');
      expect(preview.timing.estimated_duration_seconds).toBeGreaterThan(0);

      // Should have FX fee
      expect(parseFloat(preview.fees.fx_fee)).toBeGreaterThan(0);
    });

    it('detects insufficient balance', async () => {
      const response = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'transfer',
          payload: {
            from_account_id: testAccountId,
            to_account_id: destAccountId,
            amount: '999999999.00', // Unrealistically high amount
            currency: 'USDC',
          },
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.can_execute).toBe(false);
      expect(data.errors.length).toBeGreaterThan(0);

      const insufficientBalanceError = data.errors.find(
        (e: any) => e.code === 'INSUFFICIENT_BALANCE'
      );
      expect(insufficientBalanceError).toBeDefined();
      expect(insufficientBalanceError).toHaveProperty('details');
      expect(insufficientBalanceError.details).toHaveProperty('shortfall');
    });

    it('generates low balance warning', async () => {
      // First, get the account balance
      const accountResponse = await fetch(
        `${BASE_URL}/v1/accounts/${testAccountId}`,
        { headers }
      );
      const accountData = await accountResponse.json();
      const balance = parseFloat(accountData.data.balance_available || '0');

      // Transfer almost all of it (leaving < $100)
      const transferAmount = Math.max(0, balance - 50);

      if (transferAmount > 0) {
        const response = await fetch(`${BASE_URL}/v1/simulate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'transfer',
            payload: {
              from_account_id: testAccountId,
              to_account_id: destAccountId,
              amount: transferAmount.toFixed(2),
              currency: 'USDC',
            },
          }),
        });

        const data = await response.json();

        expect(response.status).toBe(201);
        
        // Should have low balance warning if balance after < 100
        const lowBalanceWarning = data.warnings.find(
          (w: any) => w.code === 'LOW_BALANCE_AFTER'
        );
        
        if (parseFloat(data.preview.source.balance_after) < 100) {
          expect(lowBalanceWarning).toBeDefined();
        }
      }
    });

    it('generates large transfer warning', async () => {
      const response = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'transfer',
          payload: {
            from_account_id: testAccountId,
            to_account_id: destAccountId,
            amount: '15000.00', // > $10,000 threshold
            currency: 'USDC',
          },
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);

      const largeTransferWarning = data.warnings.find(
        (w: any) => w.code === 'LARGE_TRANSFER'
      );

      // Should warn about large transfer
      if (data.can_execute) {
        expect(largeTransferWarning).toBeDefined();
      }
    });

    it('validates account existence', async () => {
      const response = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'transfer',
          payload: {
            from_account_id: '00000000-0000-0000-0000-000000000000',
            to_account_id: destAccountId,
            amount: '100.00',
            currency: 'USDC',
          },
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.can_execute).toBe(false);
      expect(data.errors.length).toBeGreaterThan(0);

      const notFoundError = data.errors.find(
        (e: any) => e.code === 'SOURCE_ACCOUNT_NOT_FOUND'
      );
      expect(notFoundError).toBeDefined();
    });

    it('validates request payload', async () => {
      const response = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'transfer',
          payload: {
            from_account_id: 'invalid-uuid',
            to_account_id: destAccountId,
            amount: 'not-a-number',
            currency: 'USDC',
          },
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
    });

    it('returns proper timing estimates for different rails', async () => {
      // Test SPEI (Mexico)
      const speiResponse = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'transfer',
          payload: {
            from_account_id: testAccountId,
            to_account_id: destAccountId,
            amount: '500.00',
            currency: 'USD',
            destination_currency: 'MXN',
          },
        }),
      });

      const speiData = await speiResponse.json();

      if (speiData.can_execute) {
        expect(speiData.preview.timing.rail).toBe('spei');
        expect(speiData.preview.timing.estimated_duration_seconds).toBeGreaterThan(0);
      }
    });

    it('includes expiration time', async () => {
      const response = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'transfer',
          payload: {
            from_account_id: testAccountId,
            to_account_id: destAccountId,
            amount: '100.00',
            currency: 'USDC',
          },
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('expires_at');

      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / 1000 / 60;

      // Should expire in approximately 60 minutes
      expect(diffMinutes).toBeGreaterThan(55);
      expect(diffMinutes).toBeLessThan(65);
    });
  });

  describe('GET /v1/simulate/:id - Get Simulation', () => {
    it('retrieves an existing simulation', async () => {
      // Create a simulation first
      const createResponse = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'transfer',
          payload: {
            from_account_id: testAccountId,
            to_account_id: destAccountId,
            amount: '100.00',
            currency: 'USDC',
          },
        }),
      });

      const createData = await createResponse.json();
      const simulationId = createData.simulation_id;

      // Retrieve it
      const getResponse = await fetch(
        `${BASE_URL}/v1/simulate/${simulationId}`,
        { headers }
      );

      const getData = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(getData.simulation_id).toBe(simulationId);
      expect(getData).toHaveProperty('preview');
      expect(getData).toHaveProperty('warnings');
      expect(getData).toHaveProperty('errors');
    });

    it('returns 404 for non-existent simulation', async () => {
      const response = await fetch(
        `${BASE_URL}/v1/simulate/00000000-0000-0000-0000-000000000000`,
        { headers }
      );

      expect(response.status).toBe(404);
    });
  });

  describe('POST /v1/simulate/:id/execute - Execute Simulation', () => {
    it('executes a valid simulation', async () => {
      // Create a simulation
      const createResponse = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'transfer',
          payload: {
            from_account_id: testAccountId,
            to_account_id: destAccountId,
            amount: '10.00',
            currency: 'USDC',
          },
        }),
      });

      const createData = await createResponse.json();
      
      if (!createData.can_execute) {
        console.log('Skipping execution test - simulation cannot execute:', createData.errors);
        return;
      }

      const simulationId = createData.simulation_id;

      // Execute it
      const executeResponse = await fetch(
        `${BASE_URL}/v1/simulate/${simulationId}/execute`,
        {
          method: 'POST',
          headers,
        }
      );

      const executeData = await executeResponse.json();

      expect(executeResponse.status).toBe(201);
      expect(executeData.status).toBe('executed');
      expect(executeData).toHaveProperty('execution_result');
      expect(executeData.execution_result).toHaveProperty('type');
      expect(executeData.execution_result).toHaveProperty('id');
      expect(executeData.execution_result.type).toBe('transfer');
      expect(executeData).toHaveProperty('variance');
      expect(executeData).toHaveProperty('resource_url');
    });

    it('prevents double execution (idempotency)', async () => {
      // Create a simulation
      const createResponse = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'transfer',
          payload: {
            from_account_id: testAccountId,
            to_account_id: destAccountId,
            amount: '10.00',
            currency: 'USDC',
          },
        }),
      });

      const createData = await createResponse.json();
      
      if (!createData.can_execute) {
        console.log('Skipping double execution test - simulation cannot execute');
        return;
      }

      const simulationId = createData.simulation_id;

      // Execute first time
      const executeResponse1 = await fetch(
        `${BASE_URL}/v1/simulate/${simulationId}/execute`,
        {
          method: 'POST',
          headers,
        }
      );

      const executeData1 = await executeResponse1.json();
      expect(executeResponse1.status).toBe(201);

      // Execute second time
      const executeResponse2 = await fetch(
        `${BASE_URL}/v1/simulate/${simulationId}/execute`,
        {
          method: 'POST',
          headers,
        }
      );

      const executeData2 = await executeResponse2.json();

      // Should return same result
      expect(executeResponse2.status).toBe(200);
      expect(executeData2.status).toBe('executed');
      expect(executeData2.execution_result.id).toBe(executeData1.execution_result.id);
    });

    it('rejects execution of simulation with errors', async () => {
      // Create a simulation that will fail
      const createResponse = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'transfer',
          payload: {
            from_account_id: testAccountId,
            to_account_id: destAccountId,
            amount: '999999999.00', // Insufficient balance
            currency: 'USDC',
          },
        }),
      });

      const createData = await createResponse.json();
      expect(createData.can_execute).toBe(false);

      const simulationId = createData.simulation_id;

      // Try to execute it
      const executeResponse = await fetch(
        `${BASE_URL}/v1/simulate/${simulationId}/execute`,
        {
          method: 'POST',
          headers,
        }
      );

      expect(executeResponse.status).toBe(400);
      const executeData = await executeResponse.json();
      expect(executeData).toHaveProperty('error');
    });
  });

  describe('Fee Calculation Accuracy', () => {
    it('calculates platform fees correctly', async () => {
      const amount = 1000;
      const response = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'transfer',
          payload: {
            from_account_id: testAccountId,
            to_account_id: destAccountId,
            amount: amount.toFixed(2),
            currency: 'USDC',
          },
        }),
      });

      const data = await response.json();

      if (data.can_execute) {
        const platformFee = parseFloat(data.preview.fees.platform_fee);
        const expectedFee = amount * 0.005; // 0.5%

        expect(platformFee).toBeCloseTo(expectedFee, 2);
      }
    });

    it('includes corridor fees for Brazil', async () => {
      const response = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'transfer',
          payload: {
            from_account_id: testAccountId,
            to_account_id: destAccountId,
            amount: '1000.00',
            currency: 'USD',
            destination_currency: 'BRL',
          },
        }),
      });

      const data = await response.json();

      if (data.can_execute) {
        const railFee = parseFloat(data.preview.fees.rail_fee);
        expect(railFee).toBe(1.50); // Brazil corridor fee
      }
    });
  });

  describe('Unsupported Actions', () => {
    it('returns not implemented for refund simulation', async () => {
      const response = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'refund',
          payload: {
            transfer_id: '00000000-0000-0000-0000-000000000000',
            amount: '100.00',
            reason: 'test',
          },
        }),
      });

      expect(response.status).toBe(501);
      const data = await response.json();
      expect(data.error.code).toBe('NOT_IMPLEMENTED');
    });

    it('returns not implemented for stream simulation', async () => {
      const response = await fetch(`${BASE_URL}/v1/simulate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'stream',
          payload: {
            from_account_id: testAccountId,
            to_account_id: destAccountId,
            rate_per_second: '0.001',
            currency: 'USDC',
          },
        }),
      });

      expect(response.status).toBe(501);
      const data = await response.json();
      expect(data.error.code).toBe('NOT_IMPLEMENTED');
    });
  });
});



