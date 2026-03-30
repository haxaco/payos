'use client';

import { motion } from 'framer-motion';
import { AnimatedCheck } from './shared/animated-check';

interface SetupProgressProps {
  currentStep: number;
  completedSteps: number[];
}

const steps = [
  { id: 1, label: 'API Keys' },
  { id: 2, label: 'Wallets' },
  { id: 3, label: 'Integration' },
];

export function SetupProgress({ currentStep, completedSteps }: SetupProgressProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Segment bars */}
      <div className="flex items-center gap-2">
        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isActive = step.id === currentStep;

          return (
            <motion.div
              key={step.id}
              className="relative h-1.5 flex-1 rounded-full overflow-hidden"
              layout
            >
              {/* Background track */}
              <div
                className={
                  isCompleted || isActive
                    ? 'absolute inset-0 rounded-full'
                    : 'absolute inset-0 rounded-full border border-gray-700/50 bg-gray-800/30'
                }
              />

              {/* Completed fill */}
              {isCompleted && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                  style={{
                    boxShadow: '0 0 12px rgba(59,130,246,0.4)',
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                  layout
                />
              )}

              {/* Active shimmer */}
              {isActive && !isCompleted && (
                <motion.div
                  className="absolute inset-0 rounded-full shimmer-bg"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                  layout
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex items-start gap-2 mt-2.5">
        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isActive = step.id === currentStep;

          return (
            <div key={step.id} className="flex-1 flex items-center justify-center gap-1">
              {isCompleted && (
                <AnimatedCheck size={13} className="text-emerald-400 shrink-0" />
              )}
              <span
                className={
                  isCompleted
                    ? 'text-xs text-emerald-400'
                    : isActive
                      ? 'text-xs font-medium text-blue-400'
                      : 'text-xs text-gray-500'
                }
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
