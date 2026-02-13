'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import Link from 'next/link';
import {
  GitBranch,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Pause,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  ChevronDown,
  Activity,
} from 'lucide-react';

export default function WorkflowInstancePage() {
  const { id } = useParams();
  const router = useRouter();
  const api = useApiClient();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['workflows', 'instances', id],
    queryFn: async () => {
      if (!api) throw new Error('API not initialized');
      const res = await fetch(`${api.baseUrl}/v1/workflows/instances/${id}`, {
        headers: { Authorization: `Bearer ${api.apiKey}` },
      });
      if (!res.ok) throw new Error('Failed to fetch workflow instance');
      return res.json();
    },
    enabled: !!api && !!id,
    refetchInterval: 5000, // Poll for updates
  });

  const approveMutation = useMutation({
    mutationFn: async ({ stepIndex, decision }: { stepIndex: number; decision: 'approve' | 'reject' }) => {
      if (!api) throw new Error('API not initialized');
      const res = await fetch(`${api.baseUrl}/v1/workflows/instances/${id}/steps/${stepIndex}/${decision}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${api.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: `${decision}d via dashboard` }),
      });
      if (!res.ok) throw new Error(`Failed to ${decision} step`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!api) throw new Error('API not initialized');
      const res = await fetch(`${api.baseUrl}/v1/workflows/instances/${id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${api.apiKey}` },
      });
      if (!res.ok) throw new Error('Failed to cancel workflow');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const instance = data;
  const steps = data?.steps || [];

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': case 'approved': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed': case 'rejected': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running': return <Play className="h-5 w-5 text-blue-500" />;
      case 'paused': case 'waiting_approval': case 'waiting_external': case 'waiting_schedule':
        return <Pause className="h-5 w-5 text-yellow-500" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-gray-500" />;
      case 'timed_out': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'skipped': return <ChevronDown className="h-5 w-5 text-gray-400" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': case 'approved': return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'failed': case 'rejected': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'running': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'paused': case 'waiting_approval': case 'waiting_external': case 'waiting_schedule':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'skipped': return 'border-gray-300 bg-gray-50 dark:bg-gray-800/50';
      default: return 'border-gray-200 bg-white dark:bg-gray-900';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-8">
        <div className="text-center text-gray-500 mt-20">Loading workflow...</div>
      </div>
    );
  }

  if (error || !instance) {
    return (
      <div className="flex-1 overflow-auto p-8">
        <div className="text-center text-red-500 mt-20">
          <XCircle className="h-12 w-12 mx-auto mb-3" />
          <p>Failed to load workflow instance</p>
          <Link href="/dashboard/workflows" className="text-blue-500 mt-2 inline-block">
            Back to Workflows
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/dashboard/workflows"
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GitBranch className="h-6 w-6" />
              Workflow Instance
            </h1>
            <p className="text-sm text-gray-500 font-mono">{instance.id}</p>
          </div>
          <div className="flex items-center gap-2">
            {statusIcon(instance.status)}
            <span className="text-sm font-medium capitalize">{instance.status?.replace(/_/g, ' ')}</span>
          </div>
          {['running', 'paused', 'pending'].includes(instance.status) && (
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Instance Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Template</div>
            <div className="font-mono text-sm">{instance.template_id?.slice(0, 12)}...</div>
            <div className="text-xs text-gray-400 mt-1">v{instance.template_version}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Initiated By</div>
            <div className="text-sm">{instance.initiated_by_type || 'api_key'}</div>
            {instance.initiated_by_agent_id && (
              <div className="text-xs text-gray-400 mt-1 font-mono">Agent: {instance.initiated_by_agent_id.slice(0, 8)}...</div>
            )}
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Timing</div>
            <div className="text-sm">
              {instance.started_at ? `Started: ${new Date(instance.started_at).toLocaleString()}` : 'Not started'}
            </div>
            {instance.completed_at && (
              <div className="text-xs text-gray-400 mt-1">
                Completed: {new Date(instance.completed_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Error display */}
        {instance.error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{instance.error}</p>
          </div>
        )}

        {/* Steps Timeline */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Workflow Steps
          </h2>

          <div className="space-y-3">
            {steps.map((step: any, index: number) => (
              <div
                key={step.id}
                className={`rounded-lg border-l-4 p-4 ${statusColor(step.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon(step.status)}
                    <div>
                      <div className="font-medium">
                        {step.step_name || `Step ${step.step_index}`}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                          {step.step_type}
                        </span>
                        <span>Step {step.step_index}</span>
                        {step.started_at && (
                          <span>Started: {new Date(step.started_at).toLocaleTimeString()}</span>
                        )}
                        {step.completed_at && (
                          <span>Completed: {new Date(step.completed_at).toLocaleTimeString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Approval Actions */}
                  {step.status === 'waiting_approval' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approveMutation.mutate({ stepIndex: step.step_index, decision: 'approve' })}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => approveMutation.mutate({ stepIndex: step.step_index, decision: 'reject' })}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {/* Step Details */}
                {step.approval_decision && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">{step.approval_decision}</span>
                    {step.approved_by && <span> by {step.approved_by}</span>}
                    {step.approval_reason && <span> - {step.approval_reason}</span>}
                  </div>
                )}
                {step.agent_reasoning && (
                  <div className="mt-1 text-xs text-gray-500 italic">
                    Agent reasoning: {step.agent_reasoning}
                  </div>
                )}
                {step.error && (
                  <div className="mt-2 text-sm text-red-600 dark:text-red-400">{step.error}</div>
                )}
                {step.output && Object.keys(step.output).length > 0 && step.status !== 'pending' && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      Output data
                    </summary>
                    <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(step.output, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trigger Data */}
        {instance.trigger_data && Object.keys(instance.trigger_data).length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
            <h3 className="text-sm font-medium mb-2">Trigger Data</h3>
            <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded overflow-auto max-h-40">
              {JSON.stringify(instance.trigger_data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
