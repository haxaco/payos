/**
 * Settlement Trigger Types
 * Epic 50, Story 50.2: Type definitions for settlement trigger engine
 */

export type TriggerType = 'schedule' | 'threshold' | 'manual' | 'immediate';

export type SettlementRail = 'auto' | 'ach' | 'pix' | 'spei' | 'wire' | 'usdc';

export type SettlementPriority = 'standard' | 'expedited';

export type RuleExecutionStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';

export interface ScheduleTriggerConfig {
  cron: string; // Cron expression e.g., "0 17 * * *" for 5pm daily
}

export interface ThresholdTriggerConfig {
  amount: number; // Amount in smallest unit (cents)
  currency: string; // e.g., "USD"
}

export interface ImmediateTriggerConfig {
  transfer_types: string[]; // e.g., ["payout", "withdrawal"]
}

export type TriggerConfig = ScheduleTriggerConfig | ThresholdTriggerConfig | ImmediateTriggerConfig | Record<string, never>;

export interface SettlementRule {
  id: string;
  tenant_id: string;
  wallet_id: string | null;
  name: string;
  description: string | null;
  trigger_type: TriggerType;
  trigger_config: TriggerConfig;
  settlement_rail: SettlementRail;
  settlement_priority: SettlementPriority;
  minimum_amount: number | null;
  minimum_currency: string | null;
  maximum_amount: number | null;
  maximum_currency: string | null;
  enabled: boolean;
  priority: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RuleExecution {
  id: string;
  tenant_id: string;
  rule_id: string;
  status: RuleExecutionStatus;
  trigger_reason: string;
  trigger_context: Record<string, unknown>;
  amount: number | null;
  currency: string | null;
  settlement_rail: string | null;
  settlement_id: string | null;
  error_message: string | null;
  error_code: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface TriggerEvaluationContext {
  tenant_id: string;
  wallet_id?: string;
  transfer_type?: string;
  current_balance?: number;
  currency?: string;
  transfer_id?: string;
}

export interface TriggerEvaluationResult {
  should_trigger: boolean;
  rules: SettlementRule[];
  reason: string;
  context: TriggerEvaluationContext;
}

export interface ExecuteSettlementRequest {
  tenant_id: string;
  rule_id: string;
  wallet_id?: string;
  amount?: number;
  currency?: string;
  trigger_reason: string;
  trigger_context: Record<string, unknown>;
}

export interface ExecuteSettlementResult {
  success: boolean;
  execution_id: string;
  settlement_id?: string;
  amount?: number;
  currency?: string;
  rail?: SettlementRail;
  error?: string;
}

export interface CreateRuleRequest {
  tenant_id: string;
  wallet_id?: string;
  name: string;
  description?: string;
  trigger_type: TriggerType;
  trigger_config: TriggerConfig;
  settlement_rail?: SettlementRail;
  settlement_priority?: SettlementPriority;
  minimum_amount?: number;
  minimum_currency?: string;
  maximum_amount?: number;
  maximum_currency?: string;
  enabled?: boolean;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateRuleRequest {
  name?: string;
  description?: string | null;
  trigger_config?: TriggerConfig;
  settlement_rail?: SettlementRail;
  settlement_priority?: SettlementPriority;
  minimum_amount?: number | null;
  minimum_currency?: string | null;
  maximum_amount?: number | null;
  maximum_currency?: string | null;
  enabled?: boolean;
  priority?: number;
  metadata?: Record<string, unknown>;
}
