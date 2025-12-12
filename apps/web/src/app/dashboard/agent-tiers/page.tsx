'use client';

import { UserCheck, Edit2, ChevronRight, Bot } from 'lucide-react';

const kyaTiers = [
  {
    tier: 0,
    name: 'Unverified',
    description: 'Agent registered but not verified',
    limits: { perTx: 0, daily: 0, monthly: 0, maxStreams: 0 },
    permissions: ['View only access'],
    color: 'gray',
  },
  {
    tier: 1,
    name: 'Basic Agent',
    description: 'Basic verification completed',
    limits: { perTx: 500, daily: 2500, monthly: 10000, maxStreams: 2 },
    permissions: ['Initiate transfers', 'Create streams (up to 2)', 'View accounts'],
    color: 'blue',
  },
  {
    tier: 2,
    name: 'Verified Agent',
    description: 'Full agent verification',
    limits: { perTx: 5000, daily: 25000, monthly: 100000, maxStreams: 5 },
    permissions: ['All Tier 1 permissions', 'Modify streams', 'Create accounts', 'Higher limits'],
    color: 'emerald',
  },
  {
    tier: 3,
    name: 'Trusted Agent',
    description: 'Highest trust level',
    limits: { perTx: 50000, daily: 250000, monthly: 1000000, maxStreams: 20 },
    permissions: ['All Tier 2 permissions', 'Treasury view access', 'Approval workflows', 'Unlimited streams'],
    color: 'purple',
  },
];

export default function AgentTiersPage() {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'gray': return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' };
      case 'blue': return { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-600 dark:text-blue-400' };
      case 'emerald': return { bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-600 dark:text-emerald-400' };
      case 'purple': return { bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-600 dark:text-purple-400' };
      default: return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' };
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Agent Tiers (KYA)</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure Know Your Agent verification tiers</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-8">
        <div className="flex items-start gap-3">
          <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-purple-900 dark:text-purple-200">Know Your Agent (KYA)</h3>
            <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
              KYA tiers define what AI agents can do. Unlike accounts, agents have their own verification independent of their parent account. 
              Agent limits are capped by their parent account's verification tier.
            </p>
          </div>
        </div>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {kyaTiers.map((tier) => {
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
                <div className="grid grid-cols-4 gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Per Tx</div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                      ${tier.limits.perTx.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Daily</div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                      ${tier.limits.daily.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monthly</div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                      ${tier.limits.monthly.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Streams</div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                      {tier.limits.maxStreams === 20 ? '∞' : tier.limits.maxStreams}
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Permissions
                  </div>
                  <ul className="space-y-1">
                    {tier.permissions.map((perm, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                        {perm}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Note */}
      <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <strong>Note:</strong> Agent limits are always capped by their parent account's verification tier. 
          For example, a Tier 3 agent under a Tier 1 account will have Tier 1 limits applied.
        </p>
      </div>
    </div>
  );
}

