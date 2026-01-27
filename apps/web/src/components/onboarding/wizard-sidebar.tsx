'use client';

import { CheckCircle, Circle, SkipForward, Clock } from 'lucide-react';
import { cn } from '@sly/ui';
import type { WizardStepDefinition } from '@/types/wizard';

interface WizardSidebarProps {
  steps: WizardStepDefinition[];
  currentStep: number;
  completedSteps: Set<string>;
  skippedSteps: Set<string>;
  estimatedTimeRemaining: string;
  onStepClick?: (stepIndex: number) => void;
}

export function WizardSidebar({
  steps,
  currentStep,
  completedSteps,
  skippedSteps,
  estimatedTimeRemaining,
  onStepClick,
}: WizardSidebarProps) {
  return (
    <aside className="w-72 flex-shrink-0 bg-gray-50 dark:bg-gray-900/50 border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col">
      {/* Steps list */}
      <div className="flex-1 space-y-1">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.id);
          const isSkipped = skippedSteps.has(step.id);
          const isCurrent = index === currentStep;
          const isPast = index < currentStep;
          const canClick = onStepClick && (isPast || isCompleted || isSkipped);

          return (
            <button
              key={step.id}
              onClick={() => canClick && onStepClick(index)}
              disabled={!canClick}
              className={cn(
                'w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all',
                isCurrent && 'bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700',
                !isCurrent && canClick && 'hover:bg-white/50 dark:hover:bg-gray-800/50 cursor-pointer',
                !isCurrent && !canClick && 'opacity-60'
              )}
            >
              {/* Step indicator */}
              <div className="flex-shrink-0 mt-0.5">
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                ) : isSkipped ? (
                  <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <SkipForward className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{index + 1}</span>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <Circle className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isCurrent
                        ? 'text-blue-600 dark:text-blue-400'
                        : isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : isSkipped
                        ? 'text-gray-400'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    Step {index + 1}
                  </span>
                  {step.isRequired && !isCompleted && !isSkipped && (
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      Required
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    'text-sm font-medium mt-0.5',
                    isCurrent
                      ? 'text-gray-900 dark:text-white'
                      : isCompleted || isSkipped
                      ? 'text-gray-500 dark:text-gray-400'
                      : 'text-gray-600 dark:text-gray-300'
                  )}
                >
                  {step.shortLabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Time estimate */}
      <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Est. time: {estimatedTimeRemaining}</span>
        </div>
      </div>
    </aside>
  );
}
