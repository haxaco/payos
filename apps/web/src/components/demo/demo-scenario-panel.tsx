'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDemoMode } from './demo-mode-context';
import { DEMO_SCENARIOS } from './demo-scenarios';
import { X, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@sly/ui';

export function DemoScenarioPanel() {
  const { active, scenarioId, setScenarioId, setActive } = useDemoMode();
  const pathname = usePathname();

  if (!active || scenarioId === null) return null;

  const scenario = DEMO_SCENARIOS.find(s => s.id === scenarioId);
  if (!scenario) return null;

  // Find the current step index by matching pathname against step hrefs.
  // Steps with trailing "/" are prefix-match (detail pages), others are exact.
  const currentStepIndex = findCurrentStep(scenario.steps, pathname);

  return (
    <div className="fixed right-4 top-20 bottom-4 w-72 z-40 flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              {scenario.id}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{scenario.name}</span>
          </div>
          <button
            onClick={() => setScenarioId(null)}
            className="p-1 hover:bg-white/60 dark:hover:bg-gray-800 rounded transition-colors"
            title="Close scenario"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          {scenario.protocols.map(p => (
            <span
              key={p}
              className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-white/80 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Steps */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {scenario.steps.map((step, index) => {
          const isCurrent = index === currentStepIndex;
          const isVisited = index < currentStepIndex;

          return (
            <Link
              key={index}
              href={step.href}
              className={cn(
                'flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors group',
                isCurrent
                  ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              {/* Step indicator */}
              <div className="flex-shrink-0 mt-0.5">
                {isVisited ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : isCurrent ? (
                  <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span className={cn(
                  'text-sm font-medium block',
                  isCurrent
                    ? 'text-blue-700 dark:text-blue-400'
                    : isVisited
                      ? 'text-gray-500 dark:text-gray-400'
                      : 'text-gray-700 dark:text-gray-300'
                )}>
                  {step.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {step.description}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Step {Math.max(currentStepIndex + 1, 1)} of {scenario.steps.length}
          </span>
          <button
            onClick={() => setActive(false)}
            className="text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors"
          >
            Exit Demo
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Finds which step best matches the current pathname.
 * - Steps ending with "/" are prefix matches (detail pages where user navigates to a dynamic ID).
 * - Other steps require exact match or startsWith for nested routes.
 */
function findCurrentStep(steps: { href: string }[], pathname: string): number {
  // Try exact match first
  const exactIndex = steps.findIndex(s => s.href === pathname);
  if (exactIndex !== -1) return exactIndex;

  // Try prefix match (for detail pages and nested routes) — find best (longest) match
  let bestIndex = -1;
  let bestLength = 0;

  for (let i = 0; i < steps.length; i++) {
    const href = steps[i].href;
    if (pathname.startsWith(href) && href.length > bestLength) {
      bestLength = href.length;
      bestIndex = i;
    }
  }

  return bestIndex !== -1 ? bestIndex : 0;
}
