'use client';

import { useState, useEffect, useRef } from 'react';
import { useApiClient } from '@/lib/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Plus, Loader2, AlertCircle, ChevronUp, ChevronDown, Trash2, Pencil } from 'lucide-react';
import { Button, Input, Label } from '@sly/ui';
import { toast } from 'sonner';
import {
  type StepType,
  type TriggerType,
  type TriggerEntity,
  type TriggerConditionDef,
  type StepDef,
  STEP_TYPES,
  ENTITY_FIELDS,
  CONDITION_OPERATORS,
  nextStepId,
  tryParseJson,
  StepConfigFields,
} from './workflow-shared';

interface EditTemplateDialogProps {
  templateId: string;
  onClose: () => void;
}

function mapStepsFromApi(apiSteps: any[]): StepDef[] {
  return apiSteps.map((s: any) => {
    const config: Record<string, string> = {};
    if (s.config && typeof s.config === 'object' && !Array.isArray(s.config)) {
      for (const [k, v] of Object.entries(s.config)) {
        if (k === 'required_approvers' && Array.isArray(v)) {
          config[k] = (v as string[]).join(',');
          config['approver_mode'] = 'specific';
        } else if (v !== null && typeof v === 'object') {
          config[k] = JSON.stringify(v);
        } else {
          config[k] = String(v ?? '');
        }
      }
    }
    return {
      id: nextStepId(),
      type: (s.type || 'action') as StepType,
      name: s.name || '',
      config,
    };
  });
}

export function EditTemplateDialog({ templateId, onClose }: EditTemplateDialogProps) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<TriggerType>('manual');
  const [triggerEntity, setTriggerEntity] = useState<TriggerEntity>('transfer');
  const [triggerOperations, setTriggerOperations] = useState<string[]>(['insert']);
  const [triggerConditions, setTriggerConditions] = useState<TriggerConditionDef[]>([]);
  const [timeoutHours, setTimeoutHours] = useState('');
  const [steps, setSteps] = useState<StepDef[]>([]);
  const [version, setVersion] = useState(1);

  // Team members for approval/email steps
  const [teamMembers, setTeamMembers] = useState<{id: string; name: string; role: string}[]>([]);
  useEffect(() => {
    if (!api) return;
    fetch(`${api.baseUrl}/v1/organization/team`, {
      headers: { Authorization: `Bearer ${api.apiKey}` },
    }).then(r => r.json()).then(d => setTeamMembers(d.members || [])).catch(() => {});
  }, [api]);

  // Fetch template using react-query
  const { data: templateResponse, isLoading, error: fetchError } = useQuery({
    queryKey: ['workflows', 'template', templateId],
    queryFn: async () => {
      if (!api) throw new Error('API not initialized');
      const res = await fetch(`${api.baseUrl}/v1/workflows/templates/${templateId}`, {
        headers: { Authorization: `Bearer ${api.apiKey}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to fetch template (${res.status})`);
      }
      const json = await res.json();
      // API wraps response in {success, data} — unwrap it
      return json.data || json;
    },
    enabled: !!api,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // Populate form state once template data is available
  useEffect(() => {
    if (!templateResponse || initialized.current) return;
    initialized.current = true;

    setName(templateResponse.name || '');
    setDescription(templateResponse.description || '');
    setTriggerType(templateResponse.trigger_type || 'manual');
    setVersion(templateResponse.version || 1);
    setTimeoutHours(templateResponse.timeout_hours ? String(templateResponse.timeout_hours) : '');

    // Populate trigger config
    const tc = templateResponse.trigger_config;
    if (tc && typeof tc === 'object' && Object.keys(tc).length > 0) {
      setTriggerEntity(tc.entity || 'transfer');
      setTriggerOperations(tc.operations || ['insert']);
      setTriggerConditions(
        (tc.conditions || []).map((c: any) => ({
          field: c.field || '',
          operator: c.operator || '>',
          value: String(c.value ?? ''),
        }))
      );
    }

    // Populate steps
    if (Array.isArray(templateResponse.steps) && templateResponse.steps.length > 0) {
      setSteps(mapStepsFromApi(templateResponse.steps));
    }
  }, [templateResponse]);

  const loading = isLoading;

  const addStep = () => {
    setSteps([...steps, { id: nextStepId(), type: 'approval', name: '', config: {} }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    setSteps(next);
  };

  const updateStep = (index: number, field: string, value: string) => {
    setSteps(prev => {
      const next = [...prev];
      if (field === 'type') {
        next[index] = { ...next[index], type: value as StepType, config: {} };
      } else if (field === 'name') {
        next[index] = { ...next[index], name: value };
      } else {
        next[index] = { ...next[index], config: { ...next[index].config, [field]: value } };
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) return;

    setSubmitting(true);
    setError(null);

    try {
      const triggerConfig = triggerType === 'on_record_change' ? {
        entity: triggerEntity,
        operations: triggerOperations,
        conditions: triggerConditions.filter(c => c.field && c.operator && c.value),
      } : undefined;

      const payload = {
        name,
        description: description || undefined,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        timeout_hours: timeoutHours ? Number(timeoutHours) : undefined,
        steps: steps.map((s, i) => {
          const config: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(s.config)) {
            if (!v) continue;
            if (k.startsWith('_cond_')) continue;
            if (['params', 'headers', 'body'].includes(k)) {
              config[k] = tryParseJson(v);
            } else if (['timeout_hours', 'duration_minutes', 'timeout_seconds'].includes(k)) {
              config[k] = Number(v) || v;
            } else if (k === 'required_approvers' && v) {
              config[k] = v.split(',').map((id: string) => id.trim()).filter(Boolean);
            } else if (k === 'approver_mode') {
              continue;
            } else {
              config[k] = v;
            }
          }
          return {
            type: s.type,
            name: s.name || `${s.type} step ${i + 1}`,
            config,
          };
        }),
      };

      const res = await fetch(`${api.baseUrl}/v1/workflows/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${api.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to update template (${res.status})`);
      }

      toast.success('Workflow template updated');
      queryClient.invalidateQueries({ queryKey: ['workflows', 'templates'] });
      queryClient.invalidateQueries({ queryKey: ['workflows', 'template', templateId] });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update template');
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = name.trim().length > 0 && steps.length > 0;
  const displayError = error || (fetchError ? (fetchError as Error).message : null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950 rounded-xl flex items-center justify-center">
              <Pencil className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Workflow Template</h2>
                {!loading && (
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-mono">
                    v{version}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Version will increment if steps change</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading template...</span>
          </div>
        ) : (
          /* Content */
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {displayError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {displayError}
              </div>
            )}

            {/* Name */}
            <div>
              <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Cross-border payout approval"
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                Description
              </Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this workflow does..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
              />
            </div>

            {/* Trigger & Timeout */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                  Trigger Type
                </Label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value as TriggerType)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="manual">Manual</option>
                  <option value="on_record_change">On Record Change</option>
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                  Timeout (hours)
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={timeoutHours}
                  onChange={(e) => setTimeoutHours(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* On Record Change config */}
            {triggerType === 'on_record_change' && (
              <div className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Entity</label>
                    <select
                      value={triggerEntity}
                      onChange={(e) => {
                        setTriggerEntity(e.target.value as TriggerEntity);
                        setTriggerConditions([]);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="transfer">Transfer</option>
                      <option value="account">Account</option>
                      <option value="agent">Agent</option>
                      <option value="wallet">Wallet</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Operations</label>
                    <div className="flex items-center gap-3 pt-1">
                      {['insert', 'update', 'delete'].map(op => (
                        <label key={op} className="flex items-center gap-1 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={triggerOperations.includes(op)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTriggerOperations([...triggerOperations, op]);
                              } else {
                                setTriggerOperations(triggerOperations.filter(o => o !== op));
                              }
                            }}
                            className="rounded"
                          />
                          <span className="capitalize">{op === 'insert' ? 'Created' : op === 'update' ? 'Updated' : 'Deleted'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Optional conditions */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Conditions <span className="text-gray-400">(optional)</span>
                  </label>
                  <div className="space-y-2">
                    {triggerConditions.map((cond, ci) => (
                      <div key={ci} className="flex items-center gap-2">
                        <select
                          value={cond.field}
                          onChange={(e) => {
                            const next = [...triggerConditions];
                            next[ci] = { ...next[ci], field: e.target.value };
                            setTriggerConditions(next);
                          }}
                          className="flex-1 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                        >
                          <option value="">Select field...</option>
                          {(ENTITY_FIELDS[triggerEntity] || []).map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                        <select
                          value={cond.operator}
                          onChange={(e) => {
                            const next = [...triggerConditions];
                            next[ci] = { ...next[ci], operator: e.target.value };
                            setTriggerConditions(next);
                          }}
                          className="w-20 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                        >
                          {CONDITION_OPERATORS.map(op => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                        <Input
                          value={cond.value}
                          onChange={(e) => {
                            const next = [...triggerConditions];
                            next[ci] = { ...next[ci], value: e.target.value };
                            setTriggerConditions(next);
                          }}
                          placeholder="Value"
                          className="flex-1 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setTriggerConditions(triggerConditions.filter((_, i) => i !== ci))}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setTriggerConditions([...triggerConditions, { field: '', operator: '>', value: '' }])}
                    className="mt-1 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add condition
                  </button>
                </div>
              </div>
            )}

            {/* Steps */}
            <div>
              <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                Steps
              </Label>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Step {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveStep(index, -1)}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(index, 1)}
                          disabled={index === steps.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          disabled={steps.length <= 1}
                          className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30 ml-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Type</label>
                        <select
                          value={step.type}
                          onChange={(e) => updateStep(index, 'type', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        >
                          {STEP_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Name</label>
                        <Input
                          value={step.name}
                          onChange={(e) => updateStep(index, 'name', e.target.value)}
                          placeholder={`${step.type} step`}
                        />
                      </div>
                    </div>

                    {/* Type-specific config */}
                    <StepConfigFields step={step} index={index} allSteps={steps} triggerType={triggerType} onUpdate={updateStep} teamMembers={teamMembers} />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addStep}
                className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <Plus className="h-4 w-4" />
                Add Step
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !isValid}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
