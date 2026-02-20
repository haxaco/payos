'use client';

import { useState, useMemo } from 'react';
import { useApiClient } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { X, Plus, Loader2, AlertCircle, Play, Trash2, Zap } from 'lucide-react';
import { Button, Input, Label } from '@sly/ui';
import { toast } from 'sonner';

interface RunWorkflowDialogProps {
  onClose: () => void;
  onSuccess: () => void;
  templates: any[];
  preselectedTemplateId?: string | null;
}

interface KVEntry {
  id: string;
  key: string;
  value: string;
}

interface SuggestedField {
  key: string;
  label: string;
  placeholder: string;
  source: 'template' | 'trigger_type';
}

let kvId = 0;
function nextKvId() {
  return `kv_${++kvId}`;
}

// Entity fields for on_record_change triggers
const ENTITY_FIELDS: Record<string, string[]> = {
  transfer: ['amount', 'currency', 'from_account_id', 'to_account_id', 'transfer_type', 'status', 'description'],
  account: ['name', 'account_type', 'kyc_tier', 'status', 'currency'],
  agent: ['name', 'kya_tier', 'status', 'account_id'],
  wallet: ['name', 'network', 'address'],
};

// Preset fields by trigger type — common domain objects
const TRIGGER_TYPE_FIELDS: Record<string, SuggestedField[]> = {
  manual: [],
};

// Scan template steps for trigger.* references (conditions + interpolations)
function extractTriggerFields(template: any): SuggestedField[] {
  const fields = new Set<string>();
  const steps = template?.steps || [];

  for (const step of steps) {
    const config = step.config || {};
    const configStr = JSON.stringify(config);

    // Match {{trigger.fieldName}} interpolation patterns
    const interpolations = configStr.matchAll(/\{\{trigger\.(\w+(?:\.\w+)*)\}\}/g);
    for (const match of interpolations) {
      fields.add(match[1].split('.')[0]); // top-level key only
    }

    // Match trigger.fieldName in condition expressions
    if (config.expression) {
      const expr = String(config.expression);
      const refs = expr.matchAll(/trigger[._](\w+)/g);
      for (const match of refs) {
        fields.add(match[1]);
      }
    }

    // Check trigger_config conditions on the template itself
    const triggerConfig = template.trigger_config || {};
    if (triggerConfig.conditions) {
      for (const cond of triggerConfig.conditions) {
        if (cond.field) {
          fields.add(String(cond.field).split('.')[0]);
        }
      }
    }
  }

  return Array.from(fields).map((key) => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    placeholder: `Required by template steps`,
    source: 'template' as const,
  }));
}

export function RunWorkflowDialog({
  onClose,
  onSuccess,
  templates,
  preselectedTemplateId,
}: RunWorkflowDialogProps) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTemplates = templates.filter((t: any) => t.is_active !== false);
  const [templateId, setTemplateId] = useState(preselectedTemplateId || '');
  const [entries, setEntries] = useState<KVEntry[]>([]);

  const selectedTemplate = activeTemplates.find((t: any) => t.id === templateId);

  // Compute suggested fields from template steps + trigger type
  const suggestedFields = useMemo(() => {
    if (!selectedTemplate) return [];
    const templateFields = extractTriggerFields(selectedTemplate);

    // For on_record_change, derive fields from the trigger_config entity
    let typeFields: SuggestedField[];
    if (selectedTemplate.trigger_type === 'on_record_change') {
      const entity = selectedTemplate.trigger_config?.entity as string;
      const entityFields = entity ? (ENTITY_FIELDS[entity] || []) : [];
      typeFields = entityFields.map((key: string) => ({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        placeholder: `${entity} ${key}`,
        source: 'trigger_type' as const,
      }));
    } else {
      typeFields = TRIGGER_TYPE_FIELDS[selectedTemplate.trigger_type] || [];
    }

    // Merge: template-extracted fields first (higher priority), then type presets
    const seen = new Set(templateFields.map((f) => f.key));
    const merged = [...templateFields];
    for (const tf of typeFields) {
      if (!seen.has(tf.key)) {
        merged.push(tf);
        seen.add(tf.key);
      }
    }
    return merged;
  }, [selectedTemplate]);

  // Fields already added by the user
  const addedKeys = new Set(entries.map((e) => e.key));

  const addEntry = (key = '', placeholder = '') => {
    setEntries([...entries, { id: nextKvId(), key, value: '' }]);
  };

  const addSuggestedField = (field: SuggestedField) => {
    if (addedKeys.has(field.key)) return;
    setEntries([...entries, { id: nextKvId(), key: field.key, value: '' }]);
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
  };

  const updateEntry = (id: string, field: 'key' | 'value', val: string) => {
    setEntries(entries.map((e) => (e.id === id ? { ...e, [field]: val } : e)));
  };

  const parseSmart = (val: string): unknown => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    if (val === 'null') return null;
    const num = Number(val);
    if (!isNaN(num) && val.trim() !== '') return num;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api || !templateId) return;

    setSubmitting(true);
    setError(null);

    try {
      const triggerData: Record<string, unknown> = {};
      for (const entry of entries) {
        if (entry.key.trim()) {
          triggerData[entry.key.trim()] = parseSmart(entry.value);
        }
      }

      const res = await fetch(`${api.baseUrl}/v1/workflows/instances`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${api.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: templateId,
          trigger_data: Object.keys(triggerData).length > 0 ? triggerData : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Failed to run workflow (${res.status})`);
      }

      toast.success('Workflow instance created');
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create instance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-950 rounded-xl flex items-center justify-center">
              <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Run Workflow</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Create a new workflow instance</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Template Selector */}
          <div>
            <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
              Template <span className="text-red-500">*</span>
            </Label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Select a template...</option>
              {activeTemplates.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} (v{t.version})
                </option>
              ))}
            </select>
          </div>

          {/* Template Summary */}
          {selectedTemplate && (
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {selectedTemplate.name}
              </div>
              {selectedTemplate.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {selectedTemplate.description}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                  {selectedTemplate.trigger_type}
                </span>
                <span>{selectedTemplate.steps?.length || 0} steps</span>
              </div>
              {selectedTemplate.steps && selectedTemplate.steps.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedTemplate.steps.map((s: any, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs"
                    >
                      {i + 1}. {s.step_name || s.step_type}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Trigger Data */}
          <div>
            <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
              Trigger Data
            </Label>

            {/* Suggested fields */}
            {selectedTemplate && suggestedFields.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {suggestedFields.some((f) => f.source === 'template')
                    ? 'Fields referenced by this template'
                    : `Common fields for ${selectedTemplate.trigger_type} workflows`}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedFields.map((field) => {
                    const isAdded = addedKeys.has(field.key);
                    return (
                      <button
                        key={field.key}
                        type="button"
                        disabled={isAdded}
                        onClick={() => addSuggestedField(field)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border transition ${
                          isAdded
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 cursor-default'
                            : field.source === 'template'
                              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                        }`}
                        title={isAdded ? 'Already added' : `Add ${field.key} — ${field.placeholder}`}
                      >
                        {!isAdded && <Plus className="h-3 w-3" />}
                        {field.key}
                        {field.source === 'template' && !isAdded && (
                          <span className="text-[10px] opacity-60 ml-0.5">required</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {entries.map((entry) => {
                const suggestion = suggestedFields.find((f) => f.key === entry.key);
                return (
                  <div key={entry.id} className="flex items-center gap-2">
                    <Input
                      value={entry.key}
                      onChange={(e) => updateEntry(entry.id, 'key', e.target.value)}
                      placeholder="Key"
                      className="flex-1"
                    />
                    <Input
                      value={entry.value}
                      onChange={(e) => updateEntry(entry.id, 'value', e.target.value)}
                      placeholder={suggestion?.placeholder || 'Value'}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="p-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => addEntry()}
              className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <Plus className="h-4 w-4" />
              Add Custom Field
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !templateId}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Run Workflow
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
