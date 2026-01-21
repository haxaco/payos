/**
 * Settlement Trigger Engine
 * Epic 50, Story 50.2: Rule evaluation and settlement triggering
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  SettlementRule,
  RuleExecution,
  TriggerType,
  TriggerEvaluationContext,
  TriggerEvaluationResult,
  ExecuteSettlementRequest,
  ExecuteSettlementResult,
  CreateRuleRequest,
  UpdateRuleRequest,
  ThresholdTriggerConfig,
  ImmediateTriggerConfig,
} from './types';

export * from './types';

/**
 * Get all settlement rules for a tenant
 */
export async function getSettlementRules(
  supabase: SupabaseClient,
  tenantId: string,
  options?: {
    enabled_only?: boolean;
    wallet_id?: string;
    trigger_type?: TriggerType;
  }
): Promise<{ data: SettlementRule[]; error: string | null }> {
  let query = supabase
    .from('settlement_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('priority', { ascending: true });

  if (options?.enabled_only) {
    query = query.eq('enabled', true);
  }

  if (options?.wallet_id) {
    query = query.or(`wallet_id.is.null,wallet_id.eq.${options.wallet_id}`);
  }

  if (options?.trigger_type) {
    query = query.eq('trigger_type', options.trigger_type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get settlement rules:', error);
    return { data: [], error: error.message };
  }

  return { data: data as SettlementRule[], error: null };
}

/**
 * Get a single settlement rule by ID
 */
export async function getSettlementRule(
  supabase: SupabaseClient,
  tenantId: string,
  ruleId: string
): Promise<{ data: SettlementRule | null; error: string | null }> {
  const { data, error } = await supabase
    .from('settlement_rules')
    .select('*')
    .eq('id', ruleId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: 'Rule not found' };
    }
    console.error('Failed to get settlement rule:', error);
    return { data: null, error: error.message };
  }

  return { data: data as SettlementRule, error: null };
}

/**
 * Create a new settlement rule
 */
export async function createSettlementRule(
  supabase: SupabaseClient,
  request: CreateRuleRequest
): Promise<{ data: SettlementRule | null; error: string | null }> {
  // Validate trigger config based on type
  const validationError = validateTriggerConfig(request.trigger_type, request.trigger_config);
  if (validationError) {
    return { data: null, error: validationError };
  }

  const { data, error } = await supabase
    .from('settlement_rules')
    .insert({
      tenant_id: request.tenant_id,
      wallet_id: request.wallet_id || null,
      name: request.name,
      description: request.description || null,
      trigger_type: request.trigger_type,
      trigger_config: request.trigger_config,
      settlement_rail: request.settlement_rail || 'auto',
      settlement_priority: request.settlement_priority || 'standard',
      minimum_amount: request.minimum_amount || null,
      minimum_currency: request.minimum_currency || null,
      maximum_amount: request.maximum_amount || null,
      maximum_currency: request.maximum_currency || null,
      enabled: request.enabled ?? true,
      priority: request.priority || 100,
      metadata: request.metadata || {},
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: 'A rule with this name already exists' };
    }
    console.error('Failed to create settlement rule:', error);
    return { data: null, error: error.message };
  }

  return { data: data as SettlementRule, error: null };
}

/**
 * Update an existing settlement rule
 */
export async function updateSettlementRule(
  supabase: SupabaseClient,
  tenantId: string,
  ruleId: string,
  request: UpdateRuleRequest
): Promise<{ data: SettlementRule | null; error: string | null }> {
  // First get the existing rule to validate trigger config if being updated
  if (request.trigger_config) {
    const { data: existingRule, error: fetchError } = await getSettlementRule(supabase, tenantId, ruleId);
    if (fetchError || !existingRule) {
      return { data: null, error: fetchError || 'Rule not found' };
    }

    const validationError = validateTriggerConfig(existingRule.trigger_type, request.trigger_config);
    if (validationError) {
      return { data: null, error: validationError };
    }
  }

  const updateData: Record<string, unknown> = {};

  // Only include fields that are explicitly provided
  if (request.name !== undefined) updateData.name = request.name;
  if (request.description !== undefined) updateData.description = request.description;
  if (request.trigger_config !== undefined) updateData.trigger_config = request.trigger_config;
  if (request.settlement_rail !== undefined) updateData.settlement_rail = request.settlement_rail;
  if (request.settlement_priority !== undefined) updateData.settlement_priority = request.settlement_priority;
  if (request.minimum_amount !== undefined) updateData.minimum_amount = request.minimum_amount;
  if (request.minimum_currency !== undefined) updateData.minimum_currency = request.minimum_currency;
  if (request.maximum_amount !== undefined) updateData.maximum_amount = request.maximum_amount;
  if (request.maximum_currency !== undefined) updateData.maximum_currency = request.maximum_currency;
  if (request.enabled !== undefined) updateData.enabled = request.enabled;
  if (request.priority !== undefined) updateData.priority = request.priority;
  if (request.metadata !== undefined) updateData.metadata = request.metadata;

  const { data, error } = await supabase
    .from('settlement_rules')
    .update(updateData)
    .eq('id', ruleId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: 'Rule not found' };
    }
    console.error('Failed to update settlement rule:', error);
    return { data: null, error: error.message };
  }

  return { data: data as SettlementRule, error: null };
}

/**
 * Delete a settlement rule
 */
export async function deleteSettlementRule(
  supabase: SupabaseClient,
  tenantId: string,
  ruleId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('settlement_rules')
    .delete()
    .eq('id', ruleId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Failed to delete settlement rule:', error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Evaluate which rules should trigger for given context
 */
export async function evaluateTriggers(
  supabase: SupabaseClient,
  context: TriggerEvaluationContext
): Promise<TriggerEvaluationResult> {
  const result: TriggerEvaluationResult = {
    should_trigger: false,
    rules: [],
    reason: '',
    context,
  };

  // Get all enabled rules for this tenant
  const { data: rules, error } = await getSettlementRules(supabase, context.tenant_id, {
    enabled_only: true,
    wallet_id: context.wallet_id,
  });

  if (error || !rules || rules.length === 0) {
    result.reason = error || 'No applicable rules found';
    return result;
  }

  const triggeredRules: SettlementRule[] = [];

  for (const rule of rules) {
    let shouldTrigger = false;

    switch (rule.trigger_type) {
      case 'threshold':
        if (context.current_balance !== undefined && context.currency) {
          const config = rule.trigger_config as ThresholdTriggerConfig;
          if (config.currency === context.currency && context.current_balance >= config.amount) {
            shouldTrigger = true;
          }
        }
        break;

      case 'immediate':
        if (context.transfer_type) {
          const config = rule.trigger_config as ImmediateTriggerConfig;
          if (config.transfer_types?.includes(context.transfer_type)) {
            shouldTrigger = true;
          }
        }
        break;

      case 'manual':
        // Manual rules don't auto-trigger, they're user-initiated
        break;

      case 'schedule':
        // Schedule rules are evaluated by the cron worker, not here
        break;
    }

    if (shouldTrigger) {
      // Check minimum amount constraint
      if (rule.minimum_amount && context.current_balance !== undefined) {
        if (context.current_balance < rule.minimum_amount) {
          continue; // Skip this rule, balance below minimum
        }
      }

      triggeredRules.push(rule);
    }
  }

  if (triggeredRules.length > 0) {
    result.should_trigger = true;
    result.rules = triggeredRules;
    result.reason = `${triggeredRules.length} rule(s) triggered`;
  } else {
    result.reason = 'No rules triggered for current context';
  }

  return result;
}

/**
 * Execute settlement based on a rule
 */
export async function executeSettlement(
  supabase: SupabaseClient,
  request: ExecuteSettlementRequest
): Promise<ExecuteSettlementResult> {
  // Get the rule
  const { data: rule, error: ruleError } = await getSettlementRule(
    supabase,
    request.tenant_id,
    request.rule_id
  );

  if (ruleError || !rule) {
    return {
      success: false,
      execution_id: '',
      error: ruleError || 'Rule not found',
    };
  }

  // Create execution record
  const { data: execution, error: execError } = await supabase
    .from('settlement_rule_executions')
    .insert({
      tenant_id: request.tenant_id,
      rule_id: request.rule_id,
      status: 'pending',
      trigger_reason: request.trigger_reason,
      trigger_context: request.trigger_context,
      amount: request.amount || null,
      currency: request.currency || null,
      settlement_rail: rule.settlement_rail,
    })
    .select()
    .single();

  if (execError || !execution) {
    console.error('Failed to create execution record:', execError);
    return {
      success: false,
      execution_id: '',
      error: execError?.message || 'Failed to create execution record',
    };
  }

  // Update status to executing
  await supabase
    .from('settlement_rule_executions')
    .update({ status: 'executing' })
    .eq('id', execution.id);

  try {
    // In a real implementation, this would:
    // 1. Determine the settlement rail (or use 'auto' logic)
    // 2. Call the appropriate settlement service (ACH, Pix, SPEI, etc.)
    // 3. Create a settlement record
    // 4. Return the settlement ID

    // For now, we'll simulate a successful settlement
    const settlementId = crypto.randomUUID();

    // Update execution as completed
    await supabase
      .from('settlement_rule_executions')
      .update({
        status: 'completed',
        settlement_id: settlementId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', execution.id);

    console.log(`Settlement executed: rule=${rule.name}, amount=${request.amount}, rail=${rule.settlement_rail}`);

    return {
      success: true,
      execution_id: execution.id,
      settlement_id: settlementId,
      amount: request.amount,
      currency: request.currency,
      rail: rule.settlement_rail,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update execution as failed
    await supabase
      .from('settlement_rule_executions')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq('id', execution.id);

    return {
      success: false,
      execution_id: execution.id,
      error: errorMessage,
    };
  }
}

/**
 * Get rule executions history
 */
export async function getRuleExecutions(
  supabase: SupabaseClient,
  tenantId: string,
  options?: {
    rule_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: RuleExecution[]; total: number; error: string | null }> {
  let query = supabase
    .from('settlement_rule_executions')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('started_at', { ascending: false });

  if (options?.rule_id) {
    query = query.eq('rule_id', options.rule_id);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('Failed to get rule executions:', error);
    return { data: [], total: 0, error: error.message };
  }

  return { data: data as RuleExecution[], total: count || 0, error: null };
}

/**
 * Request manual settlement
 */
export async function requestManualSettlement(
  supabase: SupabaseClient,
  tenantId: string,
  walletId: string,
  amount: number,
  currency: string
): Promise<ExecuteSettlementResult> {
  // Find the manual withdrawal rule for this tenant
  const { data: rules, error } = await getSettlementRules(supabase, tenantId, {
    enabled_only: true,
    trigger_type: 'manual',
  });

  if (error || !rules || rules.length === 0) {
    return {
      success: false,
      execution_id: '',
      error: 'No manual withdrawal rule configured',
    };
  }

  // Use the highest priority manual rule
  const rule = rules[0];

  // Execute the settlement
  return executeSettlement(supabase, {
    tenant_id: tenantId,
    rule_id: rule.id,
    wallet_id: walletId,
    amount,
    currency,
    trigger_reason: 'manual_request',
    trigger_context: {
      requested_at: new Date().toISOString(),
      wallet_id: walletId,
      amount,
      currency,
    },
  });
}

/**
 * Validate trigger configuration based on type
 */
function validateTriggerConfig(triggerType: TriggerType, config: unknown): string | null {
  if (!config || typeof config !== 'object') {
    return 'Trigger config must be an object';
  }

  switch (triggerType) {
    case 'schedule': {
      const scheduleConfig = config as Record<string, unknown>;
      if (!scheduleConfig.cron || typeof scheduleConfig.cron !== 'string') {
        return 'Schedule trigger requires a valid cron expression';
      }
      // Basic cron validation (5 fields)
      const cronParts = (scheduleConfig.cron as string).split(' ');
      if (cronParts.length !== 5) {
        return 'Invalid cron expression: must have 5 fields (minute, hour, day, month, weekday)';
      }
      break;
    }

    case 'threshold': {
      const thresholdConfig = config as Record<string, unknown>;
      if (typeof thresholdConfig.amount !== 'number' || thresholdConfig.amount <= 0) {
        return 'Threshold trigger requires a positive amount';
      }
      if (!thresholdConfig.currency || typeof thresholdConfig.currency !== 'string') {
        return 'Threshold trigger requires a currency';
      }
      break;
    }

    case 'immediate': {
      const immediateConfig = config as Record<string, unknown>;
      if (!Array.isArray(immediateConfig.transfer_types) || immediateConfig.transfer_types.length === 0) {
        return 'Immediate trigger requires at least one transfer type';
      }
      break;
    }

    case 'manual':
      // Manual rules don't need configuration
      break;

    default:
      return `Unknown trigger type: ${triggerType}`;
  }

  return null;
}
