'use client';

import { Info, ArrowRight } from 'lucide-react';

interface InformationalStepProps {
  title: string;
  /** Short paragraphs explaining what this step is and where to do it later. */
  body: string[];
  /** Label for the advance button. Defaults to "Continue". */
  continueLabel?: string;
  onContinue: () => void;
}

/**
 * Honest informational step. Shown for wizard steps that don't yet have a
 * wired API-backed form. No fake fields, no "coming soon" — it explains what
 * the step would do, points the user to where they can do it in the
 * dashboard, and advances the wizard via the same completion path as other
 * steps.
 */
export function InformationalStep({
  title,
  body,
  continueLabel = 'Continue',
  onContinue,
}: InformationalStepProps) {
  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-6">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">{title}</h3>
          <div className="space-y-2">
            {body.map((paragraph, idx) => (
              <p key={idx} className="text-sm text-blue-800 dark:text-blue-200">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        {continueLabel}
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
