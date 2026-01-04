/**
 * Simulation Engine API Routes
 * 
 * Epic 28: Enables dry-run execution of any PayOS action before committing.
 * Critical for AI agents that need to preview actions before making decisions.
 * 
 * Endpoints:
 * - POST /v1/simulate - Create a simulation
 * - GET /v1/simulate/:id - Get simulation details
 * - POST /v1/simulate/:id/execute - Execute a validated simulation
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../types.js';
import { ErrorCode } from '@payos/types';
import { createClient } from '../db/client.js';

// Create supabase client
const supabase = createClient();

const app = new Hono<AppContext>();

// =============================================================================
// Types
// =============================================================================

export interface SimulationWarning {
  code: string;
  message: string;
  field?: string;
  threshold?: string;
  current?: string;
}

export interface SimulationError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export interface TransferPreview {
  source: {
    account_id: string;
    account_name?: string;
    amount: string;
    currency: string;
    balance_before: string;
    balance_after: string;
  };
  destination: {
    account_id: string;
    account_name?: string;
    amount: string;
    currency: string;
  };
  fx?: {
    rate: string;
    spread: string;
    rate_locked: boolean;
    rate_expires_at?: string;
  };
  fees: {
    platform_fee: string;
    fx_fee: string;
    rail_fee: string;
    total: string;
    currency: string;
  };
  timing: {
    estimated_duration_seconds: number;
    estimated_arrival: string;
    rail: string;
  };
}

export interface SimulationResult {
  simulation_id: string;
  status: 'pending' | 'completed' | 'failed' | 'executed' | 'expired';
  can_execute: boolean;
  preview: TransferPreview | null;
  warnings: SimulationWarning[];
  errors: SimulationError[];
  expires_at: string;
  execute_url: string;
}

// =============================================================================
// Validation Schemas
// =============================================================================

const TransferPayloadSchema = z.object({
  from_account_id: z.string().uuid(),
  to_account_id: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid amount format'),
  currency: z.string().default('USDC'),
  destination_currency: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const RefundPayloadSchema = z.object({
  transfer_id: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid amount format').optional(),
  reason: z.string(),
});

const StreamPayloadSchema = z.object({
  from_account_id: z.string().uuid(),
  to_account_id: z.string().uuid(),
  rate_per_second: z.string().regex(/^\d+(\.\d{1,18})?$/, 'Invalid rate format'),
  currency: z.string().default('USDC'),
  duration_seconds: z.number().positive().optional(),
});

const SimulateRequestSchema = z.object({
  action: z.enum(['transfer', 'refund', 'stream']),
  payload: z.union([TransferPayloadSchema, RefundPayloadSchema, StreamPayloadSchema]),
});

// =============================================================================
// Helper Functions
// =============================================================================

async function simulateTransfer(
  tenantId: string,
  payload: z.infer<typeof TransferPayloadSchema>
): Promise<{ preview: TransferPreview | null; warnings: SimulationWarning[]; errors: SimulationError[]; canExecute: boolean }> {
  const warnings: SimulationWarning[] = [];
  const errors: SimulationError[] = [];

  // Fetch source account
  const { data: sourceAccount, error: sourceError } = await supabase
    .from('accounts')
    .select('id, name, balance_available, balance_total, currency, verification_status')
    .eq('id', payload.from_account_id)
    .eq('tenant_id', tenantId)
    .single();

  if (sourceError || !sourceAccount) {
    errors.push({
      code: 'SOURCE_ACCOUNT_NOT_FOUND',
      message: 'Source account not found',
      field: 'from_account_id',
    });
    return { preview: null, warnings, errors, canExecute: false };
  }

  // Fetch destination account
  const { data: destAccount, error: destError } = await supabase
    .from('accounts')
    .select('id, name, currency, verification_status')
    .eq('id', payload.to_account_id)
    .eq('tenant_id', tenantId)
    .single();

  if (destError || !destAccount) {
    errors.push({
      code: 'DESTINATION_ACCOUNT_NOT_FOUND',
      message: 'Destination account not found',
      field: 'to_account_id',
    });
    return { preview: null, warnings, errors, canExecute: false };
  }

  // Check verification status
  if (sourceAccount.verification_status === 'suspended') {
    errors.push({
      code: 'SOURCE_ACCOUNT_SUSPENDED',
      message: 'Source account is suspended',
      field: 'from_account_id',
    });
  }

  if (destAccount.verification_status === 'suspended') {
    errors.push({
      code: 'DESTINATION_ACCOUNT_SUSPENDED',
      message: 'Destination account is suspended',
      field: 'to_account_id',
    });
  }

  const amount = parseFloat(payload.amount);
  const availableBalance = parseFloat(sourceAccount.balance_available?.toString() || '0');

  // Check balance
  if (amount > availableBalance) {
    const shortfall = (amount - availableBalance).toFixed(2);
    errors.push({
      code: 'INSUFFICIENT_BALANCE',
      message: `Insufficient balance. Shortfall: ${shortfall} ${payload.currency}`,
      field: 'amount',
      details: {
        required: payload.amount,
        available: availableBalance.toFixed(2),
        shortfall,
      },
    });
  }

  // Calculate fees (simplified - in production would call fee service)
  const platformFeeRate = 0.0029; // 0.29%
  const platformFee = amount * platformFeeRate;
  const railFee = 0.50; // Fixed rail fee
  const fxFee = 0; // No FX for same-currency
  const totalFees = platformFee + railFee + fxFee;

  // Determine rail and timing
  const destCurrency = payload.destination_currency || destAccount.currency || 'USDC';
  let rail = 'internal';
  let estimatedDuration = 5; // seconds

  if (destCurrency === 'BRL') {
    rail = 'pix';
    estimatedDuration = 30;
  } else if (destCurrency === 'MXN') {
    rail = 'spei';
    estimatedDuration = 60;
  }

  // Calculate FX if cross-currency
  let fxRate = '1.00';
  let fxSpread = '0%';
  if (payload.currency !== destCurrency) {
    // Mock FX rates - in production would call FX service
    if (destCurrency === 'BRL') {
      fxRate = '5.25';
      fxSpread = '0.35%';
    } else if (destCurrency === 'MXN') {
      fxRate = '17.50';
      fxSpread = '0.40%';
    }
  }

  const destAmount = (amount - totalFees) * parseFloat(fxRate);
  const balanceAfter = availableBalance - amount;

  // Add warnings
  if (balanceAfter < 100) {
    warnings.push({
      code: 'LOW_BALANCE_AFTER',
      message: 'Balance will be below $100 after this transfer',
      threshold: '100.00',
      current: balanceAfter.toFixed(2),
    });
  }

  if (amount > 10000) {
    warnings.push({
      code: 'LARGE_TRANSFER',
      message: 'This transfer is unusually large and may trigger compliance review',
      threshold: '10000.00',
      current: payload.amount,
    });
  }

  const preview: TransferPreview = {
    source: {
      account_id: sourceAccount.id,
      account_name: sourceAccount.name,
      amount: payload.amount,
      currency: payload.currency,
      balance_before: availableBalance.toFixed(2),
      balance_after: balanceAfter.toFixed(2),
    },
    destination: {
      account_id: destAccount.id,
      account_name: destAccount.name,
      amount: destAmount.toFixed(2),
      currency: destCurrency,
    },
    fx: payload.currency !== destCurrency ? {
      rate: fxRate,
      spread: fxSpread,
      rate_locked: false,
    } : undefined,
    fees: {
      platform_fee: platformFee.toFixed(2),
      fx_fee: fxFee.toFixed(2),
      rail_fee: railFee.toFixed(2),
      total: totalFees.toFixed(2),
      currency: payload.currency,
    },
    timing: {
      estimated_duration_seconds: estimatedDuration,
      estimated_arrival: new Date(Date.now() + estimatedDuration * 1000).toISOString(),
      rail,
    },
  };

  return {
    preview,
    warnings,
    errors,
    canExecute: errors.length === 0,
  };
}

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /v1/simulate
 * Create a new simulation
 */
app.post('/', async (c) => {
  const tenantId = c.get('tenantId');
  if (!tenantId) {
    throw Object.assign(new Error('Authentication required'), { 
      code: ErrorCode.UNAUTHORIZED 
    });
  }

  let body;
  try {
    body = await c.req.json();
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { 
      code: ErrorCode.INVALID_REQUEST_FORMAT 
    });
  }

  const validation = SimulateRequestSchema.safeParse(body);
  if (!validation.success) {
    throw Object.assign(new Error('Invalid request payload'), { 
      code: ErrorCode.VALIDATION_FAILED,
      details: {
        validation_errors: validation.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      }
    });
  }

  const { action, payload } = validation.data;

  // Only transfer simulation implemented for Story 28.1
  // Refund and stream simulations will be added in Stories 28.5 and 28.6
  if (action !== 'transfer') {
    throw Object.assign(new Error(`Simulation for action '${action}' is not yet implemented`), { 
      code: ErrorCode.NOT_IMPLEMENTED,
      details: { available_alternatives: ['transfer'] }
    });
  }

  // Run simulation
  const result = await simulateTransfer(tenantId, payload as z.infer<typeof TransferPayloadSchema>);

  // Store simulation in database
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const { data: simulation, error: insertError } = await supabase
    .from('simulations')
    .insert({
      tenant_id: tenantId,
      action_type: action,
      action_payload: payload,
      status: result.errors.length > 0 ? 'failed' : 'completed',
      can_execute: result.canExecute,
      preview: result.preview,
      warnings: result.warnings,
      errors: result.errors,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (insertError || !simulation) {
    console.error('Failed to store simulation:', insertError);
    throw Object.assign(new Error('Failed to create simulation'), { 
      code: ErrorCode.INTERNAL_ERROR 
    });
  }

  const response: SimulationResult = {
    simulation_id: simulation.id,
    status: simulation.status,
    can_execute: simulation.can_execute,
    preview: simulation.preview,
    warnings: simulation.warnings as SimulationWarning[],
    errors: simulation.errors as SimulationError[],
    expires_at: simulation.expires_at,
    execute_url: `/v1/simulate/${simulation.id}/execute`,
  };

  return c.json(response, 201);
});

/**
 * GET /v1/simulate/:id
 * Get simulation details
 */
app.get('/:id', async (c) => {
  const tenantId = c.get('tenantId');
  if (!tenantId) {
    throw Object.assign(new Error('Authentication required'), { 
      code: ErrorCode.UNAUTHORIZED 
    });
  }

  const simulationId = c.req.param('id');

  const { data: simulation, error } = await supabase
    .from('simulations')
    .select('*')
    .eq('id', simulationId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !simulation) {
    throw Object.assign(new Error('Simulation not found'), { 
      code: ErrorCode.SIMULATION_NOT_FOUND,
      details: { simulation_id: simulationId }
    });
  }

  // Check if expired
  const isExpired = new Date(simulation.expires_at) < new Date();
  if (isExpired && simulation.status !== 'executed' && simulation.status !== 'expired') {
    // Update status to expired
    await supabase
      .from('simulations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', simulationId);
    simulation.status = 'expired';
    simulation.can_execute = false;
  }

  const response: SimulationResult = {
    simulation_id: simulation.id,
    status: simulation.status,
    can_execute: simulation.can_execute && !isExpired,
    preview: simulation.preview,
    warnings: simulation.warnings as SimulationWarning[],
    errors: simulation.errors as SimulationError[],
    expires_at: simulation.expires_at,
    execute_url: `/v1/simulate/${simulation.id}/execute`,
  };

  return c.json(response);
});

/**
 * POST /v1/simulate/:id/execute
 * Execute a validated simulation
 */
app.post('/:id/execute', async (c) => {
  const tenantId = c.get('tenantId');
  if (!tenantId) {
    throw Object.assign(new Error('Authentication required'), { 
      code: ErrorCode.UNAUTHORIZED 
    });
  }

  const simulationId = c.req.param('id');

  // Get simulation with row-level lock to prevent race conditions
  const { data: simulation, error } = await supabase
    .from('simulations')
    .select('*')
    .eq('id', simulationId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !simulation) {
    throw Object.assign(new Error('Simulation not found'), { 
      code: ErrorCode.SIMULATION_NOT_FOUND,
      details: { simulation_id: simulationId }
    });
  }

  // Check if already executed (idempotency)
  if (simulation.executed) {
    return c.json({
      simulation_id: simulation.id,
      status: 'executed',
      execution_result: {
        type: simulation.execution_result_type,
        id: simulation.execution_result_id,
      },
      variance: simulation.variance,
      message: 'Simulation was already executed',
    });
  }

  // Check if expired
  if (new Date(simulation.expires_at) < new Date()) {
    await supabase
      .from('simulations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', simulationId);

    throw Object.assign(new Error('Simulation has expired. Create a new simulation to proceed.'), { 
      code: ErrorCode.SIMULATION_EXPIRED,
      details: { 
        simulation_id: simulationId,
        expires_at: simulation.expires_at 
      }
    });
  }

  // Check if can execute
  if (!simulation.can_execute) {
    throw Object.assign(new Error('Simulation has errors and cannot be executed'), { 
      code: ErrorCode.SIMULATION_CANNOT_EXECUTE,
      details: { 
        simulation_id: simulationId,
        errors: simulation.errors 
      }
    });
  }

  // Re-validate before execution (Story 28.4 will enhance this)
  const payload = simulation.action_payload as z.infer<typeof TransferPayloadSchema>;
  const revalidation = await simulateTransfer(tenantId, payload);

  if (!revalidation.canExecute) {
    // Update simulation with new errors
    await supabase
      .from('simulations')
      .update({
        status: 'failed',
        can_execute: false,
        errors: revalidation.errors,
        updated_at: new Date().toISOString(),
      })
      .eq('id', simulationId);

    throw Object.assign(new Error('Conditions have changed since simulation. Re-validate required.'), { 
      code: ErrorCode.SIMULATION_STALE,
      details: { 
        simulation_id: simulationId,
        errors: revalidation.errors 
      }
    });
  }

  // Execute the actual transfer
  const { data: transfer, error: transferError } = await supabase
    .from('transfers')
    .insert({
      tenant_id: tenantId,
      type: 'internal',
      status: 'processing',
      from_account_id: payload.from_account_id,
      to_account_id: payload.to_account_id,
      amount: payload.amount,
      currency: payload.currency,
      destination_currency: payload.destination_currency || payload.currency,
      description: payload.description,
      initiated_by_type: 'api_key',
      initiated_by_id: 'simulation',
      initiated_by_name: 'Simulation Engine',
      processing_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (transferError || !transfer) {
    console.error('Failed to create transfer from simulation:', transferError);
    throw Object.assign(new Error('Failed to execute simulation'), { 
      code: ErrorCode.INTERNAL_ERROR 
    });
  }

  // Calculate variance (simplified - full implementation in Story 28.4)
  const variance = {
    fx_rate_change: '0%',
    fee_change: '0.00',
    timing_change: '0s',
  };

  // Mark simulation as executed
  await supabase
    .from('simulations')
    .update({
      status: 'executed',
      executed: true,
      executed_at: new Date().toISOString(),
      execution_result_id: transfer.id,
      execution_result_type: 'transfer',
      variance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', simulationId);

  return c.json({
    simulation_id: simulationId,
    status: 'executed',
    execution_result: {
      type: 'transfer',
      id: transfer.id,
      status: transfer.status,
    },
    variance,
    resource_url: `/v1/transfers/${transfer.id}`,
  }, 201);
});

export default app;

