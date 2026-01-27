'use client';

import { useState } from 'react';
import { DollarSign, Info, Calculator } from 'lucide-react';
import { cn } from '@sly/ui';

interface ConfigurePricingStepProps {
  onPricingConfigured: (pricing: { pricePerRequest: number; freeTier?: number }) => void;
  helpText?: string;
}

const PRESET_PRICES = [
  { value: 0.001, label: '$0.001', desc: 'Simple lookups' },
  { value: 0.01, label: '$0.01', desc: 'Standard APIs' },
  { value: 0.05, label: '$0.05', desc: 'AI/Compute' },
  { value: 0.10, label: '$0.10', desc: 'Premium' },
];

export function ConfigurePricingStep({
  onPricingConfigured,
  helpText = 'Set price per request. Common ranges: $0.001 for simple calls, $0.01-$0.10 for AI/compute.',
}: ConfigurePricingStepProps) {
  const [pricePerRequest, setPricePerRequest] = useState<number>(0.01);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [freeTierEnabled, setFreeTierEnabled] = useState(false);
  const [freeTierCalls, setFreeTierCalls] = useState<string>('100');

  const effectivePrice = customPrice ? parseFloat(customPrice) : pricePerRequest;

  const handlePresetSelect = (value: number) => {
    setPricePerRequest(value);
    setCustomPrice('');
  };

  const handleSubmit = () => {
    onPricingConfigured({
      pricePerRequest: effectivePrice,
      freeTier: freeTierEnabled ? parseInt(freeTierCalls) : undefined,
    });
  };

  // Price preview calculations
  const projections = [
    { calls: 1000, revenue: effectivePrice * 1000 },
    { calls: 10000, revenue: effectivePrice * 10000 },
    { calls: 100000, revenue: effectivePrice * 100000 },
  ];

  return (
    <div className="max-w-xl mx-auto">
      {/* Help tip */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-6">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-200">{helpText}</p>
      </div>

      <div className="space-y-6">
        {/* Preset prices */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Price per Request
          </label>
          <div className="grid grid-cols-4 gap-3">
            {PRESET_PRICES.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePresetSelect(preset.value)}
                className={cn(
                  'p-3 rounded-xl border-2 text-center transition-all',
                  pricePerRequest === preset.value && !customPrice
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <div className="font-bold text-gray-900 dark:text-white">{preset.label}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Or enter custom price
          </label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              step="0.001"
              min="0.001"
              max="10"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder="0.01"
              className="w-full pl-12 pr-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              USD
            </span>
          </div>
        </div>

        {/* Free tier */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={freeTierEnabled}
              onChange={(e) => setFreeTierEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable free tier for new agents
            </span>
          </label>

          {freeTierEnabled && (
            <div className="pl-8">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">First</span>
                <input
                  type="number"
                  value={freeTierCalls}
                  onChange={(e) => setFreeTierCalls(e.target.value)}
                  className="w-24 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">calls free per agent</span>
              </div>
            </div>
          )}
        </div>

        {/* Revenue projection */}
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              Revenue Projection
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {projections.map((proj) => (
              <div key={proj.calls} className="text-center">
                <div className="text-lg font-bold text-green-700 dark:text-green-400">
                  ${proj.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-green-600 dark:text-green-500">
                  {proj.calls.toLocaleString()} calls
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={effectivePrice <= 0}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <DollarSign className="w-5 h-5" />
          Save Pricing
        </button>
      </div>
    </div>
  );
}
