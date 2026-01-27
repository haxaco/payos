'use client';

import { useState } from 'react';
import { Shield, Info, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@sly/ui';

interface ConfigureLimitsStepProps {
  onLimitsConfigured: (limits: SpendingLimits) => void;
  helpText?: string;
}

interface SpendingLimits {
  maxPerTransaction: number;
  dailyLimit: number;
  approvalThreshold: number;
  approvalMode: 'auto' | 'manual' | 'smart';
  categories: string[];
}

const CATEGORIES = [
  { id: 'software', label: 'Software & SaaS', icon: '💻' },
  { id: 'cloud', label: 'Cloud Services', icon: '☁️' },
  { id: 'marketing', label: 'Marketing Tools', icon: '📣' },
  { id: 'data', label: 'Data & APIs', icon: '📊' },
  { id: 'physical', label: 'Physical Goods', icon: '📦', warning: 'Requires shipping' },
];

export function ConfigureLimitsStep({
  onLimitsConfigured,
  helpText = 'Set per-transaction limits, daily spending limits, and approval thresholds.',
}: ConfigureLimitsStepProps) {
  const [maxPerTransaction, setMaxPerTransaction] = useState<string>('100');
  const [dailyLimit, setDailyLimit] = useState<string>('1000');
  const [approvalThreshold, setApprovalThreshold] = useState<string>('50');
  const [approvalMode, setApprovalMode] = useState<'auto' | 'manual' | 'smart'>('auto');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['software', 'cloud', 'marketing', 'data']);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = () => {
    onLimitsConfigured({
      maxPerTransaction: parseFloat(maxPerTransaction),
      dailyLimit: parseFloat(dailyLimit),
      approvalThreshold: parseFloat(approvalThreshold),
      approvalMode,
      categories: selectedCategories,
    });
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Help tip */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-6">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-200">{helpText}</p>
      </div>

      <div className="space-y-6">
        {/* Transaction limits */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Max per Transaction
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                min="1"
                value={maxPerTransaction}
                onChange={(e) => setMaxPerTransaction(e.target.value)}
                className="w-full pl-9 pr-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Daily Spending Limit
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                min="1"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="w-full pl-9 pr-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Approval threshold */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Require Approval Above
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              min="0"
              value={approvalThreshold}
              onChange={(e) => setApprovalThreshold(e.target.value)}
              className="w-full pl-9 pr-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Transactions above this amount will require human approval
          </p>
        </div>

        {/* Approval mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Approval Mode
          </label>
          <div className="space-y-2">
            {[
              {
                value: 'auto',
                label: 'Auto-approve under limit',
                desc: 'Automatically approve transactions within limits',
              },
              {
                value: 'manual',
                label: 'Manual approval for all',
                desc: 'Require human approval for every transaction',
              },
              {
                value: 'smart',
                label: 'Smart approval (AI risk scoring)',
                desc: 'Use AI to assess risk and auto-approve low-risk transactions',
              },
            ].map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setApprovalMode(mode.value as any)}
                className={cn(
                  'w-full p-4 rounded-xl border-2 text-left transition-all',
                  approvalMode === mode.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <div className="font-medium text-gray-900 dark:text-white">{mode.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Allowed Categories
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.id)}
                className={cn(
                  'p-3 rounded-lg border-2 text-left transition-all flex items-center gap-2',
                  selectedCategories.includes(category.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <span className="text-lg">{category.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{category.label}</div>
                  {category.warning && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                      <AlertTriangle className="w-3 h-3" />
                      {category.warning}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Policy Summary
            </span>
          </div>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5">
            <li>• Max ${maxPerTransaction} per transaction</li>
            <li>• Daily limit: ${dailyLimit}</li>
            <li>• Approval required above ${approvalThreshold}</li>
            <li>• {selectedCategories.length} categories enabled</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Shield className="w-5 h-5" />
          Save Spending Controls
        </button>
      </div>
    </div>
  );
}
