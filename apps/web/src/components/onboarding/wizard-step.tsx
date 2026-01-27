'use client';

import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  SkipForward,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { cn } from '@sly/ui';
import type { WizardStepDefinition } from '@/types/wizard';

interface WizardStepProps {
  step: WizardStepDefinition;
  stepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
  onComplete: () => void;
  onSkip: () => void;
  onPrevious: () => void;
}

export function WizardStep({
  step,
  stepIndex,
  totalSteps,
  isFirstStep,
  isLastStep,
  isLoading = false,
  children,
  onComplete,
  onSkip,
  onPrevious,
}: WizardStepProps) {
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const canSkip = !step.isRequired;

  const handleSkipClick = () => {
    if (step.skipWarning) {
      setShowSkipWarning(true);
    } else {
      onSkip();
    }
  };

  const confirmSkip = () => {
    setShowSkipWarning(false);
    onSkip();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Step header */}
      <div className="flex-shrink-0 px-8 pt-8 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
                {stepIndex + 1}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Step {stepIndex + 1} of {totalSteps}
              </span>
              {step.isRequired && (
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-full">
                  Required
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {step.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {step.description}
            </p>
          </div>

          {/* Help button */}
          {step.helpText && (
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showHelp
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Help text */}
        {showHelp && step.helpText && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex gap-3">
              <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 dark:text-blue-200">{step.helpText}</p>
            </div>
          </div>
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {children}
      </div>

      {/* Skip warning modal */}
      {showSkipWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Skip this step?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {step.skipWarning}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSkipWarning(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Go back
              </button>
              <button
                onClick={confirmSkip}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
              >
                Skip anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation footer */}
      <div className="flex-shrink-0 px-8 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between">
          {/* Left side - Back button */}
          <div>
            {!isFirstStep && (
              <button
                onClick={onPrevious}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>

          {/* Right side - Skip and Continue */}
          <div className="flex items-center gap-3">
            {canSkip && (
              <button
                onClick={handleSkipClick}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm transition-colors disabled:opacity-50"
              >
                <SkipForward className="w-4 h-4" />
                Skip this step
              </button>
            )}
            <button
              onClick={onComplete}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : isLastStep ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Complete Setup
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
