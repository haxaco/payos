'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import Link from 'next/link';
import {
  GitBranch,
  Plus,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  LayoutList,
  Settings2,
  Pencil,
} from 'lucide-react';
import { CreateTemplateDialog } from '@/components/workflows/create-template-dialog';
import { EditTemplateDialog } from '@/components/workflows/edit-template-dialog';
import { RunWorkflowDialog } from '@/components/workflows/run-workflow-dialog';

type Tab = 'instances' | 'templates' | 'pending';

export default function WorkflowsPage() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('instances');
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showRunWorkflow, setShowRunWorkflow] = useState(false);
  const [runWorkflowTemplateId, setRunWorkflowTemplateId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Fetch workflow instances
  const { data: instancesData, isLoading: instancesLoading } = useQuery({
    queryKey: ['workflows', 'instances'],
    queryFn: async () => {
      if (!api) throw new Error('API not initialized');
      const res = await fetch(`${api.baseUrl}/v1/workflows/instances`, {
        headers: { Authorization: `Bearer ${api.apiKey}` },
      });
      return res.json();
    },
    enabled: !!api,
    staleTime: 10_000,
  });

  // Fetch workflow templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['workflows', 'templates'],
    queryFn: async () => {
      if (!api) throw new Error('API not initialized');
      const res = await fetch(`${api.baseUrl}/v1/workflows/templates`, {
        headers: { Authorization: `Bearer ${api.apiKey}` },
      });
      return res.json();
    },
    enabled: !!api,
    staleTime: 10_000,
  });

  // Fetch pending approvals
  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['workflows', 'pending'],
    queryFn: async () => {
      if (!api) throw new Error('API not initialized');
      const res = await fetch(`${api.baseUrl}/v1/workflows/pending`, {
        headers: { Authorization: `Bearer ${api.apiKey}` },
      });
      return res.json();
    },
    enabled: !!api,
    staleTime: 10_000,
  });

  const instances = instancesData?.data || [];
  const templates = templatesData?.data || [];
  const pending = pendingData?.data || [];

  // Lookup map: template_id → template name
  const templateNameMap: Record<string, string> = {};
  templates.forEach((t: any) => { templateNameMap[t.id] = t.name; });

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Play className="h-4 w-4 text-blue-500" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-500" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'timed_out': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
      timed_out: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      pending: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
      waiting_approval: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.pending}`}>
        {statusIcon(status)}
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <GitBranch className="h-8 w-8" />
              Workflows
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Configure and monitor multi-step workflow processes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateTemplate(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <Plus className="h-4 w-4" />
              New Template
            </button>
            <button
              onClick={() => { setRunWorkflowTemplateId(null); setShowRunWorkflow(true); }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <Play className="h-4 w-4" />
              Run Workflow
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
            <div className="text-sm text-gray-500">Templates</div>
            <div className="text-2xl font-bold">{templates.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
            <div className="text-sm text-gray-500">Active Instances</div>
            <div className="text-2xl font-bold">
              {instances.filter((i: any) => ['running', 'paused'].includes(i.status)).length}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
            <div className="text-sm text-gray-500">Pending Approvals</div>
            <div className="text-2xl font-bold text-amber-600">{pending.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
            <div className="text-sm text-gray-500">Completed</div>
            <div className="text-2xl font-bold text-green-600">
              {instances.filter((i: any) => i.status === 'completed').length}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-4">
          <div className="flex gap-4">
            {(['instances', 'templates', 'pending'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'instances' && <LayoutList className="h-4 w-4 inline mr-1" />}
                {tab === 'templates' && <Settings2 className="h-4 w-4 inline mr-1" />}
                {tab === 'pending' && <Clock className="h-4 w-4 inline mr-1" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'pending' && pending.length > 0 && (
                  <span className="ml-1 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-xs">
                    {pending.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Instances Tab */}
        {activeTab === 'instances' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border">
            {instancesLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : instances.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <GitBranch className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No workflow instances yet</p>
                <p className="text-sm mt-1">Create a template and trigger a workflow to get started</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Workflow</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Step</th>
                    <th className="px-4 py-3">Initiated By</th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {instances.map((instance: any) => (
                    <tr key={instance.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">{templateNameMap[instance.template_id] || 'Unknown Template'}</div>
                        <div className="font-mono text-xs text-gray-400">{instance.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3">{statusBadge(instance.status)}</td>
                      <td className="px-4 py-3 text-sm">Step {instance.current_step_index}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {instance.initiated_by_type || 'api_key'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {instance.started_at ? new Date(instance.started_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/workflows/${instance.id}`}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border">
            {templatesLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : templates.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Settings2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No workflow templates</p>
                <p className="text-sm mt-1">Create a template to define reusable workflows</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Trigger</th>
                    <th className="px-4 py-3">Steps</th>
                    <th className="px-4 py-3">Version</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template: any) => (
                    <tr key={template.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium">{template.name}</td>
                      <td className="px-4 py-3 text-sm">{template.trigger_type}</td>
                      <td className="px-4 py-3 text-sm">{template.steps?.length || 0} steps</td>
                      <td className="px-4 py-3 text-sm">v{template.version}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block w-2 h-2 rounded-full ${template.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(template.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingTemplateId(template.id)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition"
                            title="Edit template"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setRunWorkflowTemplateId(template.id); setShowRunWorkflow(true); }}
                            className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition"
                            title="Run this workflow"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Pending Approvals Tab */}
        {activeTab === 'pending' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border">
            {pendingLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : pending.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No pending approvals</p>
                <p className="text-sm mt-1">All workflow approvals are up to date</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Step</th>
                    <th className="px-4 py-3">Instance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((step: any) => (
                    <tr key={step.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium">{step.step_name || `Step ${step.step_index}`}</td>
                      <td className="px-4 py-3 font-mono text-sm">{step.instance_id?.slice(0, 8)}...</td>
                      <td className="px-4 py-3">{statusBadge(step.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {step.expires_at ? new Date(step.expires_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/workflows/${step.instance_id}`}
                          className="text-blue-500 hover:text-blue-700 text-sm"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {/* Dialogs */}
        {showCreateTemplate && (
          <CreateTemplateDialog onClose={() => setShowCreateTemplate(false)} />
        )}
        {showRunWorkflow && (
          <RunWorkflowDialog
            onClose={() => setShowRunWorkflow(false)}
            onSuccess={() => { setShowRunWorkflow(false); setActiveTab('instances'); }}
            templates={templates}
            preselectedTemplateId={runWorkflowTemplateId}
          />
        )}
        {editingTemplateId && (
          <EditTemplateDialog
            templateId={editingTemplateId}
            onClose={() => setEditingTemplateId(null)}
          />
        )}
      </div>
    </div>
  );
}
