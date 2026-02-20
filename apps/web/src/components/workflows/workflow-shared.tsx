'use client';

import { Input } from '@sly/ui';

// --- Types ---
export type StepType = 'approval' | 'condition' | 'action' | 'wait' | 'notification' | 'external';
export type TriggerType = 'manual' | 'on_record_change';
export type TriggerEntity = 'transfer' | 'account' | 'agent' | 'wallet';

export interface TriggerConditionDef {
  field: string;
  operator: string;
  value: string;
}

export interface StepDef {
  id: string;
  type: StepType;
  name: string;
  config: Record<string, string>;
}

// --- Constants ---
export const STEP_TYPES: { value: StepType; label: string }[] = [
  { value: 'approval', label: 'Approval' },
  { value: 'condition', label: 'Condition' },
  { value: 'action', label: 'Action' },
  { value: 'wait', label: 'Wait' },
  { value: 'notification', label: 'Notification' },
  { value: 'external', label: 'External Call' },
];

export const ENTITY_FIELDS: Record<string, string[]> = {
  transfer: ['amount', 'currency', 'from_account_id', 'to_account_id', 'transfer_type', 'status', 'description'],
  account: ['name', 'account_type', 'kyc_tier', 'status', 'currency'],
  agent: ['name', 'kya_tier', 'status', 'account_id'],
  wallet: ['name', 'network', 'address'],
};

export const CONDITION_OPERATORS = [
  { value: '>', label: '>', description: 'greater than' },
  { value: '<', label: '<', description: 'less than' },
  { value: '>=', label: '>=', description: 'greater than or equal' },
  { value: '<=', label: '<=', description: 'less than or equal' },
  { value: '==', label: '==', description: 'equals' },
  { value: '!=', label: '!=', description: 'not equal' },
  { value: 'contains', label: 'contains', description: 'text contains' },
  { value: 'starts_with', label: 'starts with', description: 'text starts with' },
];

export const TRIGGER_FIELD_OPTIONS: Record<string, string[]> = {
  manual: ['trigger.amount', 'trigger.type', 'trigger.id'],
  on_record_change: ['trigger.id', 'trigger.amount', 'trigger.status', 'trigger.currency', 'trigger.type'],
};

// --- Helpers ---
let stepIdCounter = 0;
export function nextStepId() {
  return `step_${++stepIdCounter}`;
}

export function tryParseJson(str: string) {
  if (!str.trim()) return undefined;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

export function parseExpression(expr: string): { field: string; operator: string; value: string } | null {
  if (!expr) return null;
  for (const op of ['>=', '<=', '!=', '==', '>', '<', 'starts_with', 'contains']) {
    const parts = expr.split(` ${op} `);
    if (parts.length === 2) {
      return { field: parts[0].trim(), operator: op, value: parts[1].trim() };
    }
  }
  return null;
}

export function buildExpression(field: string, operator: string, value: string): string {
  if (!field) return '';
  if (!operator || !value) return field;
  return `${field} ${operator} ${value}`;
}

// --- Shared Component ---
export function StepConfigFields({
  step,
  index,
  allSteps,
  triggerType,
  onUpdate,
  teamMembers,
}: {
  step: StepDef;
  index: number;
  allSteps: StepDef[];
  triggerType: TriggerType;
  onUpdate: (index: number, field: string, value: string) => void;
  teamMembers: { id: string; name: string; role: string }[];
}) {
  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm";
  const labelClass = "text-xs text-gray-500 mb-1 block";

  switch (step.type) {
    case 'approval': {
      const approverMode = step.config.approver_mode || 'any';
      const selectedApprovers = step.config.required_approvers ? step.config.required_approvers.split(',').filter(Boolean) : [];
      return (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Timeout (hours)</label>
            <Input
              type="number"
              min="1"
              value={step.config.timeout_hours || ''}
              onChange={(e) => onUpdate(index, 'timeout_hours', e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <label className={labelClass}>Approver Mode</label>
            <select
              value={approverMode}
              onChange={(e) => {
                onUpdate(index, 'approver_mode', e.target.value);
                if (e.target.value === 'any') {
                  onUpdate(index, 'required_approvers', '');
                }
              }}
              className={inputClass}
            >
              <option value="any">Any team member</option>
              <option value="specific">Specific user(s)</option>
            </select>
          </div>
          {approverMode === 'specific' && (
            <div>
              <label className={labelClass}>Required Approvers</label>
              {teamMembers.length > 0 ? (
                <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                  {teamMembers.map(member => (
                    <label key={member.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 py-0.5">
                      <input
                        type="checkbox"
                        checked={selectedApprovers.includes(member.id)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...selectedApprovers, member.id]
                            : selectedApprovers.filter(id => id !== member.id);
                          onUpdate(index, 'required_approvers', next.join(','));
                        }}
                        className="rounded"
                      />
                      <span>{member.name}</span>
                      <span className="text-xs text-gray-400">({member.role})</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No team members found. Enter user IDs manually:</p>
              )}
              {teamMembers.length === 0 && (
                <Input
                  value={step.config.required_approvers || ''}
                  onChange={(e) => onUpdate(index, 'required_approvers', e.target.value)}
                  placeholder="user-id-1, user-id-2"
                  className="mt-1"
                />
              )}
            </div>
          )}
        </div>
      );
    }

    case 'condition': {
      const parsed = parseExpression(step.config.expression || '');
      const condField = parsed?.field || step.config._cond_field || '';
      const condOp = parsed?.operator || step.config._cond_op || '>';
      const condVal = parsed?.value || step.config._cond_value || '';
      const fieldOptions = TRIGGER_FIELD_OPTIONS[triggerType] || TRIGGER_FIELD_OPTIONS.manual;

      const stepTargets = allSteps
        .map((s, i) => ({ index: i, label: `Step ${i + 1}: ${s.name || s.type}` }))
        .filter((_, i) => i !== index);

      const updateExpression = (field: string, op: string, value: string) => {
        onUpdate(index, '_cond_field', field);
        onUpdate(index, '_cond_op', op);
        onUpdate(index, '_cond_value', value);
        onUpdate(index, 'expression', buildExpression(field, op, value));
      };

      return (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>
              Condition <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <select
                  value={fieldOptions.includes(condField) ? condField : '_custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== '_custom') {
                      updateExpression(val, condOp, condVal);
                    }
                  }}
                  className={`${inputClass} text-xs`}
                >
                  <option value="">Select field...</option>
                  {fieldOptions.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                  <option value="_custom">Custom...</option>
                </select>
              </div>
              <div className="w-28 flex-shrink-0">
                <select
                  value={condOp}
                  onChange={(e) => updateExpression(condField, e.target.value, condVal)}
                  className={`${inputClass} text-xs`}
                >
                  {CONDITION_OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <Input
                  value={condVal}
                  onChange={(e) => updateExpression(condField, condOp, e.target.value)}
                  placeholder='e.g., 1000 or "usd"'
                  className="text-xs"
                />
              </div>
            </div>
            {condField && !fieldOptions.includes(condField) && (
              <div className="mt-2">
                <Input
                  value={condField}
                  onChange={(e) => updateExpression(e.target.value, condOp, condVal)}
                  placeholder="e.g., trigger.custom_field or context.step_0.result"
                  className="text-xs"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Use trigger.* for trigger data, context.* for previous step outputs
                </p>
              </div>
            )}
          </div>
          {step.config.expression && (
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded px-3 py-1.5">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">Expression</span>
              <code className="block text-xs font-mono text-gray-700 dark:text-gray-300">
                {step.config.expression}
              </code>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                If True
                <span className="ml-1 text-green-600 dark:text-green-400 font-normal">&#x2713;</span>
              </label>
              <select
                value={step.config.if_true || 'continue'}
                onChange={(e) => onUpdate(index, 'if_true', e.target.value)}
                className={inputClass}
              >
                <option value="continue">Continue to next step</option>
                {stepTargets.map((t) => (
                  <option key={t.index} value={`skip_to:${t.index}`}>
                    Skip to {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                If False
                <span className="ml-1 text-red-500 font-normal">&#x2717;</span>
              </label>
              <select
                value={step.config.if_false || 'continue'}
                onChange={(e) => onUpdate(index, 'if_false', e.target.value)}
                className={inputClass}
              >
                <option value="continue">Continue to next step</option>
                {stepTargets.map((t) => (
                  <option key={t.index} value={`skip_to:${t.index}`}>
                    Skip to {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      );
    }

    case 'action': {
      const BUILT_IN_ACTIONS = [
        { value: 'execute_transfer', label: 'Execute Transfer', params: ['transfer_id'] },
        { value: 'create_transfer', label: 'Create Transfer', params: ['from_account_id', 'to_account_id', 'amount', 'currency', 'description'] },
        { value: 'update_metadata', label: 'Update Metadata', params: ['entity_type', 'entity_id', 'metadata'] },
        { value: '_custom', label: 'Custom Action', params: [] },
      ];
      const selectedAction = step.config.action || '';
      const actionDef = BUILT_IN_ACTIONS.find(a => a.value === selectedAction);
      const isCustom = selectedAction === '_custom' || (!actionDef && selectedAction);
      const isBuiltIn = actionDef && actionDef.value !== '_custom';

      return (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Action <span className="text-red-500">*</span></label>
            <select
              value={isCustom ? '_custom' : selectedAction}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '_custom') {
                  onUpdate(index, 'action', '_custom');
                } else {
                  onUpdate(index, 'action', val);
                  onUpdate(index, 'params', '');
                }
              }}
              className={inputClass}
            >
              <option value="">Select action...</option>
              {BUILT_IN_ACTIONS.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          {isCustom && (
            <div>
              <label className={labelClass}>Action Name</label>
              <Input
                value={selectedAction === '_custom' ? '' : selectedAction}
                onChange={(e) => onUpdate(index, 'action', e.target.value || '_custom')}
                placeholder="e.g., my_custom_action"
              />
            </div>
          )}
          {isBuiltIn && actionDef.params.length > 0 && (
            <div className="space-y-2">
              <label className={labelClass}>Parameters</label>
              {actionDef.params.map(param => {
                let parsedParams: Record<string, string> = {};
                try { parsedParams = JSON.parse(step.config.params || '{}'); } catch {}
                return (
                  <div key={param}>
                    <label className="text-[10px] text-gray-400 block mb-0.5">{param}</label>
                    {param === 'metadata' ? (
                      <textarea
                        value={parsedParams[param] || ''}
                        onChange={(e) => {
                          parsedParams[param] = e.target.value;
                          onUpdate(index, 'params', JSON.stringify(parsedParams));
                        }}
                        placeholder='{"key": "value"}'
                        rows={2}
                        className={`${inputClass} resize-none font-mono`}
                      />
                    ) : (
                      <Input
                        value={parsedParams[param] || ''}
                        onChange={(e) => {
                          parsedParams[param] = e.target.value;
                          onUpdate(index, 'params', JSON.stringify(parsedParams));
                        }}
                        placeholder={param === 'amount' ? 'e.g., 1000' : param === 'currency' ? 'e.g., USDC' : 'UUID or value'}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {(isCustom || (!isBuiltIn && !isCustom)) && (
            <div>
              <label className={labelClass}>Params (JSON)</label>
              <textarea
                value={step.config.params || ''}
                onChange={(e) => onUpdate(index, 'params', e.target.value)}
                placeholder='{"key": "value"}'
                rows={2}
                className={`${inputClass} resize-none font-mono`}
              />
            </div>
          )}
        </div>
      );
    }

    case 'wait':
      return (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Wait Type</label>
            <select
              value={step.config.wait_type || 'duration'}
              onChange={(e) => onUpdate(index, 'wait_type', e.target.value)}
              className={inputClass}
            >
              <option value="duration">Duration</option>
              <option value="until">Until</option>
            </select>
          </div>
          {(step.config.wait_type || 'duration') === 'duration' ? (
            <div>
              <label className={labelClass}>Duration (minutes)</label>
              <Input
                type="number"
                min="1"
                value={step.config.duration_minutes || ''}
                onChange={(e) => onUpdate(index, 'duration_minutes', e.target.value)}
                placeholder="e.g., 60"
              />
            </div>
          ) : (
            <div>
              <label className={labelClass}>Until (expression or timestamp)</label>
              <Input
                value={step.config.until || ''}
                onChange={(e) => onUpdate(index, 'until', e.target.value)}
                placeholder="e.g., 2026-03-01T00:00:00Z"
              />
            </div>
          )}
        </div>
      );

    case 'notification':
      return (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Notification Type</label>
            <select
              value={step.config.notification_type || 'internal'}
              onChange={(e) => onUpdate(index, 'notification_type', e.target.value)}
              className={inputClass}
            >
              <option value="internal">Internal</option>
              <option value="webhook">Webhook</option>
              <option value="email">Email</option>
            </select>
          </div>
          {step.config.notification_type === 'webhook' && (
            <div>
              <label className={labelClass}>Webhook URL</label>
              <Input
                value={step.config.url || ''}
                onChange={(e) => onUpdate(index, 'url', e.target.value)}
                placeholder="https://example.com/webhook"
              />
            </div>
          )}
          {step.config.notification_type === 'email' && (
            <>
              <div>
                <label className={labelClass}>Recipients (comma-separated emails)</label>
                <Input
                  value={step.config.recipients || ''}
                  onChange={(e) => onUpdate(index, 'recipients', e.target.value)}
                  placeholder="alice@example.com, bob@example.com"
                />
              </div>
              <div>
                <label className={labelClass}>Subject</label>
                <Input
                  value={step.config.subject || ''}
                  onChange={(e) => onUpdate(index, 'subject', e.target.value)}
                  placeholder="Workflow notification"
                />
              </div>
            </>
          )}
          <div>
            <label className={labelClass}>Message</label>
            <textarea
              value={step.config.message || ''}
              onChange={(e) => onUpdate(index, 'message', e.target.value)}
              placeholder="Notification message..."
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      );

    case 'external':
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Mode</label>
              <select
                value={step.config.mode || 'sync'}
                onChange={(e) => onUpdate(index, 'mode', e.target.value)}
                className={inputClass}
              >
                <option value="sync">Sync</option>
                <option value="async">Async</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Method</label>
              <select
                value={step.config.method || 'POST'}
                onChange={(e) => onUpdate(index, 'method', e.target.value)}
                className={inputClass}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>URL <span className="text-red-500">*</span></label>
            <Input
              value={step.config.url || ''}
              onChange={(e) => onUpdate(index, 'url', e.target.value)}
              placeholder="https://api.example.com/callback"
            />
          </div>
          <div>
            <label className={labelClass}>Headers (JSON)</label>
            <textarea
              value={step.config.headers || ''}
              onChange={(e) => onUpdate(index, 'headers', e.target.value)}
              placeholder='{"Authorization": "Bearer ..."}'
              rows={2}
              className={`${inputClass} resize-none font-mono`}
            />
          </div>
          <div>
            <label className={labelClass}>Body (JSON)</label>
            <textarea
              value={step.config.body || ''}
              onChange={(e) => onUpdate(index, 'body', e.target.value)}
              placeholder='{"key": "value"}'
              rows={2}
              className={`${inputClass} resize-none font-mono`}
            />
          </div>
          <div>
            <label className={labelClass}>Timeout (seconds)</label>
            <Input
              type="number"
              min="1"
              value={step.config.timeout_seconds || ''}
              onChange={(e) => onUpdate(index, 'timeout_seconds', e.target.value)}
              placeholder="30"
            />
          </div>
        </div>
      );

    default:
      return null;
  }
}
