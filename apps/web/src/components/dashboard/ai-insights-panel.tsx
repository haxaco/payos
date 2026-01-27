'use client';

import Link from 'next/link';
import { cn } from '@sly/ui';
import { formatRelativeTime } from '@sly/ui';
import type { AiInsight } from '@/lib/mock-data/ai-insights';

interface AiInsightsPanelProps {
  insights: AiInsight[];
  maxItems?: number;
}

export function AiInsightsPanel({ insights, maxItems = 4 }: AiInsightsPanelProps) {
  const displayInsights = insights.slice(0, maxItems);

  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
        <span className="text-lg">🤖</span>
        <h3 className="font-semibold text-gray-900 dark:text-white">AI Insights</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
          Updated {displayInsights[0] ? formatRelativeTime(displayInsights[0].generatedAt) : 'just now'}
        </span>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {displayInsights.map((insight) => (
          <div 
            key={insight.id} 
            className={cn(
              "px-6 py-4 transition-colors",
              insight.severity === 'warning' && "bg-amber-50 dark:bg-amber-950/20",
              insight.severity === 'success' && "bg-emerald-50 dark:bg-emerald-950/20",
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{insight.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white">{insight.title}</h4>
                  <SeverityBadge severity={insight.severity} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {insight.message}
                </p>
                {insight.action && (
                  <Link 
                    href={insight.action.href}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-flex items-center gap-1"
                  >
                    {insight.action.label} 
                    <span className="text-xs">→</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <Link 
          href="/dashboard/compliance"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1"
        >
          View All Insights
          <span className="text-xs">→</span>
        </Link>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: 'info' | 'warning' | 'success' }) {
  const styles = {
    info: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
    warning: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
    success: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  };

  const labels = {
    info: 'Info',
    warning: 'Warning',
    success: 'Success',
  };

  return (
    <span className={cn('px-1.5 py-0.5 text-[10px] font-semibold rounded-full uppercase', styles[severity])}>
      {labels[severity]}
    </span>
  );
}

