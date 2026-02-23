'use client';

import Link from 'next/link';

interface MessageBubbleProps {
  role: string;
  parts: Array<{ text?: string; data?: Record<string, any> }>;
  createdAt?: string;
  taskId?: string;
}

export function MessageBubble({ role, parts, createdAt, taskId }: MessageBubbleProps) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[75%] p-4 rounded-2xl ${
          isUser
            ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
            : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800'
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {role}
          </span>
          {createdAt && (
            <span className="text-[10px] text-gray-400 dark:text-gray-600">
              {new Date(createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          {taskId && (
            <Link
              href={`/dashboard/agents/a2a/tasks/${taskId}`}
              className="text-[10px] font-mono text-gray-400 hover:text-blue-500"
            >
              {taskId.slice(0, 8)}
            </Link>
          )}
        </div>
        {parts.map((part, i) => (
          <div key={i}>
            {'text' in part && part.text && (
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{part.text}</p>
            )}
            {'data' in part && part.data && (
              <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-950 p-2 rounded mt-1 overflow-x-auto">
                {JSON.stringify(part.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
