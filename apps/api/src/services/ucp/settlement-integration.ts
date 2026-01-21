/**
 * UCP Settlement Integration with Settlement Rules Engine
 *
 * Epic 50, Story 50.3: Connects UCP settlements to the centralized settlement rules engine.
 *
 * This module bridges UCP protocol settlements with the configurable settlement rules,
 * allowing settlement rail selection to be driven by tenant-configured rules rather than
 * hardcoded in the protocol.
 *
 * Future Architecture (Epic 50 complete):
 * - Protocols (UCP, ACP, AP2, x402) create Transfers only
 * - Settlement Rules Engine monitors transfers and triggers settlements based on rules
 * - Settlement rails are selected at execution time based on rules configuration
 *
 * Current Integration:
 * - UCP settlement can optionally use settlement rules to determine rail
 * - Falls back to specified corridor if no rules match
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  evaluateTriggers,
  getSettlementRules,
  TriggerEvaluationContext,
  SettlementRule,
} from '../settlement-triggers/index.js';

export interface SettlementRailDecision {
  rail: 'pix' | 'spei' | 'auto';
  source: 'rule' | 'request' | 'default';
  rule_id?: string;
  rule_name?: string;
}

/**
 * Determine the settlement rail based on tenant rules or request
 */
export async function determineSettlementRail(
  supabase: SupabaseClient,
  tenantId: string,
  options: {
    requested_corridor?: 'pix' | 'spei';
    amount: number;
    currency: string;
    transfer_type?: string;
  }
): Promise<SettlementRailDecision> {
  const { requested_corridor, amount, currency, transfer_type } = options;

  // Check tenant settlement rules
  const { data: rules } = await getSettlementRules(supabase, tenantId, {
    enabled_only: true,
  });

  if (rules && rules.length > 0) {
    // Check for immediate trigger rules (for specific transfer types)
    if (transfer_type) {
      const immediateRule = rules.find(
        (r) =>
          r.trigger_type === 'immediate' &&
          r.settlement_rail !== 'auto' &&
          (r.trigger_config as { transfer_types?: string[] }).transfer_types?.includes(transfer_type)
      );

      if (immediateRule) {
        const rail = immediateRule.settlement_rail as 'pix' | 'spei';
        return {
          rail,
          source: 'rule',
          rule_id: immediateRule.id,
          rule_name: immediateRule.name,
        };
      }
    }

    // Check for manual rules with specific rail
    const manualRule = rules.find(
      (r) => r.trigger_type === 'manual' && r.settlement_rail !== 'auto'
    );

    if (manualRule) {
      const rail = manualRule.settlement_rail as 'pix' | 'spei';
      return {
        rail,
        source: 'rule',
        rule_id: manualRule.id,
        rule_name: manualRule.name,
      };
    }
  }

  // Fall back to requested corridor
  if (requested_corridor) {
    return {
      rail: requested_corridor,
      source: 'request',
    };
  }

  // Default to auto (system will determine based on recipient)
  return {
    rail: 'auto',
    source: 'default',
  };
}

/**
 * Check if settlement should proceed based on tenant rules
 */
export async function shouldProceedWithSettlement(
  supabase: SupabaseClient,
  tenantId: string,
  options: {
    amount: number;
    currency: string;
    wallet_id?: string;
  }
): Promise<{ proceed: boolean; reason?: string }> {
  const { amount, currency, wallet_id } = options;

  // Get applicable rules
  const { data: rules } = await getSettlementRules(supabase, tenantId, {
    enabled_only: true,
  });

  if (!rules || rules.length === 0) {
    // No rules configured - allow settlement by default
    return { proceed: true };
  }

  // Check for manual withdrawal rule (required for UCP settlements)
  const hasManualRule = rules.some((r) => r.trigger_type === 'manual');
  if (!hasManualRule) {
    return {
      proceed: false,
      reason: 'No manual withdrawal rule configured for this tenant',
    };
  }

  // Check minimum amount constraints
  const manualRule = rules.find((r) => r.trigger_type === 'manual');
  if (manualRule?.minimum_amount && amount < manualRule.minimum_amount) {
    return {
      proceed: false,
      reason: `Amount ${amount} is below minimum ${manualRule.minimum_amount} ${manualRule.minimum_currency || currency}`,
    };
  }

  // Check maximum amount constraints
  if (manualRule?.maximum_amount && amount > manualRule.maximum_amount) {
    return {
      proceed: false,
      reason: `Amount ${amount} exceeds maximum ${manualRule.maximum_amount} ${manualRule.maximum_currency || currency}`,
    };
  }

  return { proceed: true };
}

/**
 * Log settlement execution for audit trail
 *
 * In the full Epic 50 implementation, this would create a rule execution record.
 * For now, it just logs the settlement action.
 */
export function logSettlementExecution(
  settlementId: string,
  tenantId: string,
  decision: SettlementRailDecision,
  amount: number,
  currency: string
): void {
  console.log(`[Settlement Integration] Settlement ${settlementId}:`, {
    tenant_id: tenantId,
    rail: decision.rail,
    rail_source: decision.source,
    rule_id: decision.rule_id,
    rule_name: decision.rule_name,
    amount,
    currency,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Future: Create a Transfer record instead of direct settlement
 *
 * This is a placeholder for the full Epic 50 implementation where
 * protocols create Transfers and settlement is triggered by rules.
 */
export interface CreateTransferForSettlementParams {
  tenant_id: string;
  amount: number;
  currency: string;
  source_wallet_id?: string;
  recipient: {
    name: string;
    document?: string;
    account?: string;
    bank_code?: string;
    pix_key?: string;
    clabe?: string;
  };
  metadata?: Record<string, unknown>;
}

export async function createTransferForSettlement(
  _supabase: SupabaseClient,
  _params: CreateTransferForSettlementParams
): Promise<{ transfer_id: string }> {
  // TODO: Epic 50 full implementation
  // 1. Create transfer record in transfers table
  // 2. Return transfer ID
  // 3. Settlement rules engine will monitor and trigger settlement

  // For now, return a mock transfer ID
  const transferId = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  console.log('[Settlement Integration] Transfer created (mock):', transferId);

  return { transfer_id: transferId };
}
