'use client';

import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface TimelineStep {
  label: string;
  description?: string;
  timestamp?: string;
  status: 'completed' | 'active' | 'pending' | 'failed';
}

interface SettlementTimelineProps {
  transfer: {
    type: string;
    status: string;
    createdAt: string;
    completedAt?: string;
    failedAt?: string;
    failureReason?: string;
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function getStepLabels(type: string): { label: string; description: string }[] {
  switch (type) {
    case 'x402':
      return [
        { label: 'Transfer Initiated', description: 'x402 payment request received' },
        { label: 'Payment Verified', description: 'Cryptographic proof validated' },
        { label: 'Fee Deducted', description: 'Platform fee applied to transaction' },
        { label: 'Settled', description: 'Funds credited to endpoint owner' },
      ];
    case 'cross_border':
      return [
        { label: 'Transfer Initiated', description: 'Cross-border payout submitted' },
        { label: 'Compliance Check', description: 'KYC/AML screening passed' },
        { label: 'FX Applied', description: 'Exchange rate locked and converted' },
        { label: 'Processing', description: 'Sent to local payment rail' },
        { label: 'Settled', description: 'Funds delivered to beneficiary' },
      ];
    case 'ap2':
      return [
        { label: 'Transfer Initiated', description: 'AP2 mandate payment created' },
        { label: 'Mandate Validated', description: 'Agent authorization verified' },
        { label: 'Authorized', description: 'Funds reserved within mandate limit' },
        { label: 'Settled', description: 'Payment settled to recipient' },
      ];
    case 'acp':
      return [
        { label: 'Transfer Initiated', description: 'ACP checkout payment started' },
        { label: 'Cart Verified', description: 'Order items and totals confirmed' },
        { label: 'Payment Captured', description: 'Funds captured from buyer' },
        { label: 'Settled', description: 'Merchant payout completed' },
      ];
    default:
      return [
        { label: 'Transfer Initiated', description: 'Transfer request submitted' },
        { label: 'Processing', description: 'Validating and executing transfer' },
        { label: 'Settled', description: 'Funds delivered to recipient' },
      ];
  }
}

function buildTimelineSteps(transfer: SettlementTimelineProps['transfer']): TimelineStep[] {
  const stepTemplates = getStepLabels(transfer.type);
  const isFailed = transfer.status === 'failed';
  const isCompleted = transfer.status === 'completed';
  const isProcessing = transfer.status === 'processing';

  const createdAt = new Date(transfer.createdAt).getTime();
  const endTime = transfer.completedAt
    ? new Date(transfer.completedAt).getTime()
    : transfer.failedAt
      ? new Date(transfer.failedAt).getTime()
      : null;

  return stepTemplates.map((template, index) => {
    const isFirst = index === 0;
    const isLast = index === stepTemplates.length - 1;

    // First step is always completed if the transfer exists
    if (isFirst) {
      return {
        ...template,
        timestamp: transfer.createdAt,
        status: 'completed' as const,
      };
    }

    // Last step
    if (isLast) {
      if (isFailed) {
        return {
          label: 'Settlement Failed',
          description: transfer.failureReason || 'Transfer could not be completed',
          timestamp: transfer.failedAt,
          status: 'failed' as const,
        };
      }
      if (isCompleted) {
        return {
          ...template,
          timestamp: transfer.completedAt,
          status: 'completed' as const,
        };
      }
      return {
        ...template,
        status: 'pending' as const,
      };
    }

    // Intermediate steps: interpolate timestamps for completed transfers
    if (isCompleted) {
      if (endTime) {
        const fraction = index / (stepTemplates.length - 1);
        const interpolatedTime = createdAt + fraction * (endTime - createdAt);
        return {
          ...template,
          timestamp: new Date(interpolatedTime).toISOString(),
          status: 'completed' as const,
        };
      }
      // Completed but no completedAt — mark as completed without timestamp
      return {
        ...template,
        status: 'completed' as const,
      };
    }

    if (isFailed) {
      // For failed transfers, intermediate steps up to ~halfway are completed
      const failPoint = Math.max(1, Math.floor((stepTemplates.length - 1) * 0.5));
      if (index < failPoint) {
        const fraction = index / (stepTemplates.length - 1);
        const interpolatedTime = endTime
          ? createdAt + fraction * (endTime - createdAt)
          : undefined;
        return {
          ...template,
          timestamp: interpolatedTime ? new Date(interpolatedTime).toISOString() : undefined,
          status: 'completed' as const,
        };
      }
      return {
        ...template,
        status: 'pending' as const,
      };
    }

    if (isProcessing) {
      // First intermediate step is active, rest pending
      if (index === 1) {
        return {
          ...template,
          status: 'active' as const,
        };
      }
      return {
        ...template,
        status: 'pending' as const,
      };
    }

    // Pending transfer: all intermediate steps are pending
    return {
      ...template,
      status: 'pending' as const,
    };
  });
}

export function SettlementTimeline({ transfer }: SettlementTimelineProps) {
  const steps = buildTimelineSteps(transfer);

  return (
    <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200 dark:before:bg-gray-800">
      {steps.map((step, index) => {
        const prevStep = index > 0 ? steps[index - 1] : null;
        const showDuration = prevStep?.timestamp && step.timestamp && step.status === 'completed';
        const duration = showDuration
          ? new Date(step.timestamp!).getTime() - new Date(prevStep!.timestamp!).getTime()
          : null;

        return (
          <div key={index} className="relative">
            {/* Dot */}
            <div className={`absolute -left-[37px] flex items-center justify-center ${
              step.status === 'completed'
                ? 'text-emerald-500'
                : step.status === 'active'
                  ? 'text-blue-500'
                  : step.status === 'failed'
                    ? 'text-red-500'
                    : 'text-gray-300 dark:text-gray-700'
            }`}>
              {step.status === 'completed' ? (
                <CheckCircle className="h-[18px] w-[18px] -ml-[4.5px]" />
              ) : step.status === 'active' ? (
                <Loader2 className="h-[18px] w-[18px] -ml-[4.5px] animate-spin" />
              ) : step.status === 'failed' ? (
                <XCircle className="h-[18px] w-[18px] -ml-[4.5px]" />
              ) : (
                <div className="w-[9px] h-[9px] rounded-full border-2 border-current bg-white dark:bg-gray-950" />
              )}
            </div>

            {/* Duration badge between steps */}
            {duration !== null && duration > 0 && (
              <span className="absolute -left-[80px] -top-5 text-[10px] text-gray-400 dark:text-gray-500 font-mono whitespace-nowrap">
                {formatDuration(duration)}
              </span>
            )}

            {/* Content */}
            <div>
              <h4 className={`text-sm font-medium ${
                step.status === 'completed'
                  ? 'text-gray-900 dark:text-white'
                  : step.status === 'active'
                    ? 'text-blue-700 dark:text-blue-400'
                    : step.status === 'failed'
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-gray-400 dark:text-gray-600'
              }`}>
                {step.label}
              </h4>
              {step.description && (
                <p className={`text-xs mt-0.5 ${
                  step.status === 'failed'
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {step.description}
                </p>
              )}
              {step.timestamp && (
                <p className={`text-xs mt-1 ${
                  step.status === 'failed'
                    ? 'text-red-400 dark:text-red-500'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {new Date(step.timestamp).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
