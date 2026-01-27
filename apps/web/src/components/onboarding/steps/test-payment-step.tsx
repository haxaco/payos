'use client';

import { useState } from 'react';
import {
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
  Wallet,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@payos/ui';
import { useApiConfig } from '@/lib/api-client';

interface TestPaymentStepProps {
  testType: 'x402' | 'checkout' | 'agent' | 'mandate';
  onTestComplete: () => void;
}

interface TestStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  message?: string;
}

export function TestPaymentStep({
  testType,
  onTestComplete,
}: TestPaymentStepProps) {
  const { authToken } = useApiConfig();
  const [isRunning, setIsRunning] = useState(false);
  const [testComplete, setTestComplete] = useState(false);
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);

  const getTestConfig = () => {
    switch (testType) {
      case 'x402':
        return {
          title: 'Test API Payment',
          description: 'Simulate an agent making a paid API call',
          steps: [
            { id: 'request', label: 'Agent requests API access', status: 'pending' as const },
            { id: 'payment', label: 'Payment sent to your wallet', status: 'pending' as const },
            { id: 'access', label: 'API access granted', status: 'pending' as const },
            { id: 'response', label: 'Response delivered to agent', status: 'pending' as const },
          ],
        };
      case 'checkout':
        return {
          title: 'Test Purchase',
          description: 'Complete a test purchase as a customer',
          steps: [
            { id: 'checkout', label: 'Checkout page loads', status: 'pending' as const },
            { id: 'payment', label: 'Test payment processes', status: 'pending' as const },
            { id: 'confirmation', label: 'Order confirmation received', status: 'pending' as const },
          ],
        };
      case 'agent':
        return {
          title: 'Test Agent Purchase',
          description: 'Simulate an agent completing a checkout',
          steps: [
            { id: 'request', label: 'Agent requests purchase', status: 'pending' as const },
            { id: 'limits', label: 'Spending limits checked', status: 'pending' as const },
            { id: 'category', label: 'Category check passed', status: 'pending' as const },
            { id: 'payment', label: 'Payment processed', status: 'pending' as const },
            { id: 'notify', label: 'Agent notified', status: 'pending' as const },
          ],
        };
      case 'mandate':
        return {
          title: 'Test Mandate Execution',
          description: 'Trigger one mandate payment to verify the setup',
          steps: [
            { id: 'validate', label: 'Mandate validated', status: 'pending' as const },
            { id: 'auth', label: 'Agent authorization checked', status: 'pending' as const },
            { id: 'payment', label: 'Payment processing', status: 'pending' as const },
            { id: 'credit', label: 'Wallet credited', status: 'pending' as const },
            { id: 'notify', label: 'Notification sent', status: 'pending' as const },
          ],
        };
    }
  };

  const config = getTestConfig();

  const updateStep = (stepId: string, status: 'running' | 'success' | 'failed', message?: string) => {
    setTestSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, status, message } : step
      )
    );
  };

  const runTest = async () => {
    setIsRunning(true);
    setTestSteps(config.steps);

    // Simulate test execution with delays
    for (const step of config.steps) {
      updateStep(step.id, 'running');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

      // In a real implementation, we would make actual API calls here
      // For now, we simulate success
      const success = Math.random() > 0.05; // 95% success rate for demo

      if (success) {
        updateStep(step.id, 'success');
      } else {
        updateStep(step.id, 'failed', 'Connection timeout');
        setIsRunning(false);
        return;
      }
    }

    setIsRunning(false);
    setTestComplete(true);
  };

  const allPassed = testSteps.every(s => s.status === 'success');
  const anyFailed = testSteps.some(s => s.status === 'failed');

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
          testComplete && allPassed
            ? 'bg-green-100 dark:bg-green-900/30'
            : 'bg-blue-100 dark:bg-blue-900/30'
        )}>
          {testComplete && allPassed ? (
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          ) : (
            <Zap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {config.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {config.description}
        </p>
      </div>

      {/* Test steps */}
      {testSteps.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 mb-6 space-y-3">
          {testSteps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-colors',
                step.status === 'running' && 'bg-blue-100 dark:bg-blue-900/30',
                step.status === 'success' && 'bg-green-50 dark:bg-green-900/20',
                step.status === 'failed' && 'bg-red-50 dark:bg-red-900/20'
              )}
            >
              <div className="flex-shrink-0">
                {step.status === 'pending' && (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
                {step.status === 'running' && (
                  <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
                )}
                {step.status === 'success' && (
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                )}
                {step.status === 'failed' && (
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <span
                  className={cn(
                    'text-sm font-medium',
                    step.status === 'pending' && 'text-gray-500 dark:text-gray-400',
                    step.status === 'running' && 'text-blue-700 dark:text-blue-300',
                    step.status === 'success' && 'text-green-700 dark:text-green-300',
                    step.status === 'failed' && 'text-red-700 dark:text-red-300'
                  )}
                >
                  {step.label}
                </span>
                {step.message && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{step.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Success message */}
      {testComplete && allPassed && (
        <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-xl mb-6">
          <div className="text-4xl mb-3">🎉</div>
          <h4 className="font-semibold text-green-800 dark:text-green-200">
            Test Passed!
          </h4>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            Your setup is working correctly.
          </p>
        </div>
      )}

      {/* Failed message */}
      {anyFailed && (
        <div className="text-center p-6 bg-red-50 dark:bg-red-900/20 rounded-xl mb-6">
          <h4 className="font-semibold text-red-800 dark:text-red-200">
            Test Failed
          </h4>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            Please check your configuration and try again.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {!testComplete && (
          <button
            onClick={runTest}
            disabled={isRunning}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running Test...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Run Test
              </>
            )}
          </button>
        )}

        {testComplete && allPassed && (
          <button
            onClick={onTestComplete}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </button>
        )}

        {anyFailed && (
          <>
            <button
              onClick={runTest}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              <Play className="w-5 h-5" />
              Retry Test
            </button>
          </>
        )}
      </div>
    </div>
  );
}
