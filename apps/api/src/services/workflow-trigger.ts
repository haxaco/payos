/**
 * Workflow Auto-Trigger Service
 *
 * Matches entity changes (insert/update/delete) against active workflow templates
 * with trigger_type = 'on_record_change' and auto-creates workflow instances.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { evaluateExpression } from './workflow-engine.js';
import { createWorkflowEngine } from './workflow-engine.js';

export type TriggerEntity = 'transfer' | 'account' | 'agent' | 'wallet';
export type TriggerOperation = 'insert' | 'update' | 'delete';

interface TriggerCondition {
  field: string;
  operator: string;
  value: string;
}

interface TriggerConfig {
  entity: TriggerEntity;
  operations: TriggerOperation[];
  conditions?: TriggerCondition[];
}

/**
 * Check active workflow templates and create instances for matching triggers.
 * Fire-and-forget — failures are logged but never block the caller.
 */
export async function triggerWorkflows(
  supabase: SupabaseClient,
  tenantId: string,
  entity: TriggerEntity,
  operation: TriggerOperation,
  data: Record<string, unknown>,
): Promise<void> {
  // Find all active templates with on_record_change trigger
  const { data: templates, error } = await supabase
    .from('workflow_templates')
    .select('id, trigger_config, steps')
    .eq('tenant_id', tenantId)
    .eq('trigger_type', 'on_record_change')
    .eq('is_active', true);

  if (error || !templates || templates.length === 0) return;

  const engine = createWorkflowEngine(supabase);

  for (const template of templates) {
    try {
      const config = template.trigger_config as TriggerConfig | null;
      if (!config) continue;

      // Check entity matches
      if (config.entity !== entity) continue;

      // Check operation is in the allowed list
      if (!config.operations?.includes(operation)) continue;

      // Evaluate optional conditions
      if (config.conditions?.length) {
        const allMatch = config.conditions.every((cond) => {
          const expr = `trigger.${cond.field} ${cond.operator} ${cond.value}`;
          return evaluateExpression(expr, { trigger: data });
        });
        if (!allMatch) continue;
      }

      // Create workflow instance with entity data as trigger data
      await engine.createInstance(tenantId, {
        templateId: template.id,
        triggerData: { ...data, _entity: entity, _operation: operation },
        initiatedBy: 'system',
        initiatedByType: 'system',
      });
    } catch (err) {
      console.error(`[WorkflowTrigger] Failed to trigger template ${template.id}:`, err);
    }
  }
}
