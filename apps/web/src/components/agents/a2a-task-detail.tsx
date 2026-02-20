'use client';

import { useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  MessageSquare,
  FileText,
  Copy,
} from 'lucide-react';
import { Badge } from '@sly/ui';
import { format } from 'date-fns';

interface A2ATaskDetailProps {
  task: {
    id: string;
    contextId?: string;
    status: {
      state: string;
      message?: string;
      timestamp: string;
    };
    messages: Array<{
      id: string;
      role: 'user' | 'agent';
      parts: Array<{
        kind: string;
        text?: string;
        data?: Record<string, any>;
        mimeType?: string;
      }>;
      metadata?: Record<string, any>;
    }>;
    artifacts: Array<{
      id: string;
      label?: string;
      mimeType: string;
      parts: Array<{
        kind: string;
        text?: string;
        data?: Record<string, any>;
      }>;
    }>;
    metadata?: Record<string, any>;
  };
  direction?: 'inbound' | 'outbound';
}

function getStateInfo(state: string) {
  switch (state) {
    case 'submitted':
      return { icon: Clock, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', label: 'Submitted' };
    case 'working':
      return { icon: Clock, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', label: 'Working' };
    case 'input-required':
      return { icon: AlertTriangle, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300', label: 'Input Required' };
    case 'completed':
      return { icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300', label: 'Completed' };
    case 'failed':
      return { icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', label: 'Failed' };
    case 'canceled':
      return { icon: XCircle, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Canceled' };
    case 'rejected':
      return { icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', label: 'Rejected' };
    default:
      return { icon: Clock, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: state };
  }
}

export function A2ATaskDetail({ task, direction }: A2ATaskDetailProps) {
  const [showRawJson, setShowRawJson] = useState(false);
  const stateInfo = getStateInfo(task.status.state);
  const StateIcon = stateInfo.icon;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <StateIcon className="h-5 w-5" />
            <span className={`px-2.5 py-1 text-sm font-medium rounded-full ${stateInfo.color}`}>
              {stateInfo.label}
            </span>
            {direction && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                {direction === 'inbound' ? <ArrowLeft className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                {direction}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {showRawJson ? 'Hide JSON' : 'View JSON'}
          </button>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Task ID</dt>
            <dd className="font-mono text-xs text-gray-900 dark:text-white flex items-center gap-1">
              {task.id}
              <button onClick={() => copyToClipboard(task.id)} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <Copy className="h-3 w-3 text-gray-400" />
              </button>
            </dd>
          </div>
          {task.contextId && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Context ID</dt>
              <dd className="font-mono text-xs text-gray-900 dark:text-white">{task.contextId}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Last Updated</dt>
            <dd className="text-gray-900 dark:text-white">
              {format(new Date(task.status.timestamp), 'MMM d, yyyy h:mm a')}
            </dd>
          </div>
          {task.status.message && (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Status Message</dt>
              <dd className="text-gray-900 dark:text-white">{task.status.message}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Raw JSON */}
      {showRawJson && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Agent Card / Task JSON</h4>
            <button
              onClick={() => copyToClipboard(JSON.stringify(task, null, 2))}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
          <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto max-h-96 overflow-y-auto">
            {JSON.stringify(task, null, 2)}
          </pre>
        </div>
      )}

      {/* Messages */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          Messages ({task.messages.length})
        </h3>
        <div className="space-y-4">
          {task.messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-xl ${
                msg.role === 'user'
                  ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 ml-0 mr-12'
                  : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 ml-12 mr-0'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {msg.role}
                </span>
              </div>
              {msg.parts.map((part, i) => (
                <div key={i}>
                  {part.kind === 'text' && (
                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{part.text}</p>
                  )}
                  {part.kind === 'data' && (
                    <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-950 p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(part.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ))}
          {task.messages.length === 0 && (
            <p className="text-sm text-gray-500">No messages yet</p>
          )}
        </div>
      </div>

      {/* Artifacts */}
      {task.artifacts.length > 0 && (
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-500" />
            Artifacts ({task.artifacts.length})
          </h3>
          <div className="space-y-3">
            {task.artifacts.map((artifact) => (
              <div key={artifact.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {artifact.label || 'Untitled'}
                  </span>
                  <span className="text-xs text-gray-500">{artifact.mimeType}</span>
                </div>
                {artifact.parts.map((part, i) => (
                  <div key={i}>
                    {part.kind === 'text' && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">{part.text}</p>
                    )}
                    {part.kind === 'data' && (
                      <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 overflow-x-auto">
                        {JSON.stringify(part.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Info */}
      {task.metadata && (task.metadata['x402.payment.required'] || task.metadata['x402.payment.amount']) && (
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Info</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {task.metadata['x402.payment.amount'] && (
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Amount</dt>
                <dd className="text-gray-900 dark:text-white font-medium">
                  {String(task.metadata['x402.payment.amount'])} {String(task.metadata['x402.payment.currency'] || 'USDC')}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Payment Status</dt>
              <dd>
                <Badge variant={task.metadata['x402.payment.required'] ? 'destructive' : 'default'}>
                  {task.metadata['x402.payment.required'] ? 'Required' : 'Paid'}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
