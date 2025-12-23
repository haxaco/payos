'use client';

import Link from 'next/link';
import { Bot, User } from 'lucide-react';

interface InitiatedByBadgeProps {
  initiatedBy: {
    type: 'user' | 'agent' | 'system' | 'api_key';
    id: string;
    name?: string | null;
  };
}

export function InitiatedByBadge({ initiatedBy }: InitiatedByBadgeProps) {
  if (initiatedBy.type === 'agent') {
    return (
      <Link 
        href={`/dashboard/agents/${initiatedBy.id}`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors"
      >
        <Bot className="w-3 h-3" />
        <span>{initiatedBy.name || 'Agent'}</span>
      </Link>
    );
  }

  if (initiatedBy.type === 'api_key') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-medium">
        <span>🔑</span>
        <span>API Key</span>
      </span>
    );
  }

  if (initiatedBy.type === 'system') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium">
        <span>⚙️</span>
        <span>System</span>
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium">
      <User className="w-3 h-3" />
      <span>Manual</span>
    </span>
  );
}

// Compact version for tables
export function InitiatedByBadgeCompact({ initiatedBy }: InitiatedByBadgeProps) {
  if (initiatedBy.type === 'agent') {
    return (
      <Link 
        href={`/dashboard/agents/${initiatedBy.id}`}
        className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-400 text-xs font-medium hover:underline"
        title={initiatedBy.name || 'Agent'}
      >
        <span>🤖</span>
        <span className="truncate max-w-[100px]">{initiatedBy.name || 'Agent'}</span>
      </Link>
    );
  }

  if (initiatedBy.type === 'api_key') {
    return (
      <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs font-medium">
        <span>🔑</span>
        <span>API Key</span>
      </span>
    );
  }

  if (initiatedBy.type === 'system') {
    return (
      <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
        <span>⚙️</span>
        <span>System</span>
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
      <span>👤</span>
      <span>Manual</span>
    </span>
  );
}

