'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Pre-configured empty states for common pages
export function AccountsEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon="👤"
      title="No accounts yet"
      description="Create your first account to start managing balances, streams, and cross-border payments."
      action={onAction ? { label: 'Create Account', onClick: onAction } : undefined}
    />
  );
}

export function AgentsEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon="🤖"
      title="No agents yet"
      description="Register your first AI agent to automate payments, manage streams, and handle treasury operations."
      action={onAction ? { label: 'Register Agent', onClick: onAction } : undefined}
    />
  );
}

export function StreamsEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon="🌊"
      title="No streams yet"
      description="Create your first money stream to enable continuous, per-second payments for salaries, subscriptions, or services."
      action={onAction ? { label: 'Create Stream', onClick: onAction } : undefined}
    />
  );
}

export function TransactionsEmptyState() {
  return (
    <EmptyState
      icon="💸"
      title="No transactions yet"
      description="Transactions will appear here once you start making transfers, streams, or card payments."
    />
  );
}

export function ReportsEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon="📊"
      title="No reports yet"
      description="Generate your first report to get insights into your transactions, accounts, and financial activity."
      action={onAction ? { label: 'Generate Report', onClick: onAction } : undefined}
    />
  );
}

export function SearchEmptyState({ query }: { query: string }) {
  return (
    <EmptyState
      icon="🔍"
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try a different search term.`}
    />
  );
}

