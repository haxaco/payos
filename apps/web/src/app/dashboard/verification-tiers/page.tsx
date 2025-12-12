'use client';

import { ShieldCheck, Edit2, ChevronRight } from 'lucide-react';

const tiers = [
  {
    tier: 0,
    name: 'Unverified',
    description: 'No verification completed',
    limits: { perTx: 0, daily: 0, monthly: 0 },
    requirements: ['No requirements'],
    color: 'gray',
  },
  {
    tier: 1,
    name: 'Basic',
    description: 'Email and phone verification',
    limits: { perTx: 1000, daily: 5000, monthly: 20000 },
    requirements: ['Email verification', 'Phone number', 'Basic identity info'],
    color: 'blue',
  },
  {
    tier: 2,
    name: 'Standard',
    description: 'ID document verification',
    limits: { perTx: 10000, daily: 50000, monthly: 200000 },
    requirements: ['Government ID', 'Proof of address', 'Selfie verification'],
    color: 'emerald',
  },
  {
    tier: 3,
    name: 'Enhanced',
    description: 'Full KYC/KYB verification',
    limits: { perTx: 100000, daily: 500000, monthly: 2000000 },
    requirements: ['Business registration', 'UBO disclosure', 'AML screening', 'Enhanced due diligence'],
    color: 'purple',
  },
];

export default function VerificationTiersPage() {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'gray': return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', badge: 'bg-gray-200 dark:bg-gray-700' };
      case 'blue': return { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-200 dark:bg-blue-800' };
      case 'emerald': return { bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-200 dark:bg-emerald-800' };
      case 'purple': return { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-600 dark:text-purple-400', badge: 'bg-purple-200 dark:bg-purple-800' };
      default: return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', badge: 'bg-gray-200 dark:bg-gray-700' };
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Verification Tiers</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure KYC/KYB verification tiers and limits</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-8">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-200">Verification Framework</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Verification tiers determine the transaction limits for accounts. Higher tiers require more verification but unlock larger limits.
            </p>
          </div>
        </div>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tiers.map((tier) => {
          const colors = getColorClasses(tier.color);
          return (
            <div key={tier.tier} className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                      <span className={`text-lg font-bold ${colors.text}`}>{tier.tier}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{tier.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{tier.description}</p>
                    </div>
                  </div>
                  <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Limits */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Per Transaction</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      ${tier.limits.perTx.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Daily</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      ${tier.limits.daily.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monthly</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      ${tier.limits.monthly.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Requirements
                  </div>
                  <ul className="space-y-1">
                    {tier.requirements.map((req, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

