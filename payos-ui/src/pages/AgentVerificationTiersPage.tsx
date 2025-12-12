import { useState } from 'react';
import { Bot, ShieldCheck, Edit2 } from 'lucide-react';
import { Page } from '../App';

interface Props {
  onNavigate: (page: Page) => void;
}

interface KYATierConfig {
  tier: number;
  name: string;
  description: string;
  requirements: string[];
  limits: {
    maxTransaction: number;
    dailyLimit: number;
    monthlyLimit: number;
  };
  authMethods: string[];
  humanApproval: 'all' | 'threshold' | 'none';
  approvalThreshold?: number;
}

const defaultTiers: KYATierConfig[] = [
  {
    tier: 0,
    name: 'Sandbox',
    description: 'Testing and development only',
    requirements: ['Linked to any account'],
    limits: { maxTransaction: 0, dailyLimit: 0, monthlyLimit: 0 },
    authMethods: ['API Key'],
    humanApproval: 'none'
  },
  {
    tier: 1,
    name: 'Basic',
    description: 'Low-risk, supervised operations',
    requirements: ['Linked to KYB T2+ business', 'Owner identified', 'OAuth configured'],
    limits: { maxTransaction: 1000, dailyLimit: 10000, monthlyLimit: 100000 },
    authMethods: ['OAuth Client Credentials'],
    humanApproval: 'all'
  },
  {
    tier: 2,
    name: 'Verified',
    description: 'Standard autonomous operations',
    requirements: ['Linked to KYB T3 business', 'PK-JWT configured', 'Code attestation', 'Anomaly detection enabled'],
    limits: { maxTransaction: 10000, dailyLimit: 100000, monthlyLimit: 1000000 },
    authMethods: ['OAuth', 'PK-JWT', 'X-402'],
    humanApproval: 'threshold',
    approvalThreshold: 5000
  },
  {
    tier: 3,
    name: 'Trusted',
    description: 'High-value autonomous operations',
    requirements: ['Security audit completed', 'Insurance/bonding in place', 'mTLS certificate', 'Incident runbook documented'],
    limits: { maxTransaction: 100000, dailyLimit: 500000, monthlyLimit: 5000000 },
    authMethods: ['OAuth', 'PK-JWT', 'X-402', 'mTLS'],
    humanApproval: 'none'
  }
];

export function AgentVerificationTiersPage({ onNavigate }: Props) {
  const [tiers] = useState(defaultTiers);
  
  const kyaTierColors = {
    0: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600',
    1: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    2: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    3: 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800'
  };
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Agent Verification Tiers (KYA)</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Configure Know Your Agent verification requirements and limits
          </p>
        </div>
      </div>
      
      {/* Info Banner */}
      <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Bot className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-violet-900 dark:text-violet-100">Know Your Agent (KYA)</p>
            <p className="text-sm text-violet-700 dark:text-violet-300 mt-1">
              KYA is a verification framework for AI agents, parallel to KYC (persons) and KYB (businesses). 
              Higher tiers unlock greater autonomy and higher transaction limits.
            </p>
          </div>
        </div>
      </div>
      
      {/* Tier Cards */}
      <div className="grid grid-cols-2 gap-6">
        {tiers.map(tier => (
          <div 
            key={tier.tier}
            className={`bg-white dark:bg-gray-800 rounded-xl border-2 p-6 ${kyaTierColors[tier.tier as keyof typeof kyaTierColors]}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  tier.tier === 0 ? 'bg-gray-200 dark:bg-gray-700' :
                  tier.tier === 1 ? 'bg-blue-200 dark:bg-blue-900' :
                  tier.tier === 2 ? 'bg-green-200 dark:bg-green-900' :
                  'bg-violet-200 dark:bg-violet-900'
                }`}>
                  <span className="text-2xl font-bold">T{tier.tier}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{tier.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{tier.description}</p>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Edit2 className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            
            {/* Limits */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Per Transaction</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {tier.limits.maxTransaction === 0 ? '$0' : `$${tier.limits.maxTransaction.toLocaleString()}`}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Daily</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {tier.limits.dailyLimit === 0 ? '$0' : `$${tier.limits.dailyLimit.toLocaleString()}`}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Monthly</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {tier.limits.monthlyLimit === 0 ? '$0' : `$${tier.limits.monthlyLimit.toLocaleString()}`}
                </p>
              </div>
            </div>
            
            {/* Requirements */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Requirements</p>
              <ul className="space-y-1">
                {tier.requirements.map((req, i) => (
                  <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Auth Methods */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Auth Methods</p>
              <div className="flex flex-wrap gap-1">
                {tier.authMethods.map(method => (
                  <span key={method} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
                    {method}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Human Approval */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Human Approval</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {tier.humanApproval === 'all' && 'Required for all transactions'}
                {tier.humanApproval === 'threshold' && `Required above $${tier.approvalThreshold?.toLocaleString()}`}
                {tier.humanApproval === 'none' && (tier.tier === 0 ? 'N/A (Sandbox)' : 'Not required (autonomous)')}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Comparison Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Tier Comparison</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Feature</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">T0 Sandbox</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">T1 Basic</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">T2 Verified</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">T3 Trusted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            <tr>
              <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">Production Access</td>
              <td className="px-6 py-3 text-center text-red-600">✕</td>
              <td className="px-6 py-3 text-center text-green-600">✓</td>
              <td className="px-6 py-3 text-center text-green-600">✓</td>
              <td className="px-6 py-3 text-center text-green-600">✓</td>
            </tr>
            <tr>
              <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">X-402 Payments</td>
              <td className="px-6 py-3 text-center text-red-600">✕</td>
              <td className="px-6 py-3 text-center text-green-600">✓</td>
              <td className="px-6 py-3 text-center text-green-600">✓</td>
              <td className="px-6 py-3 text-center text-green-600">✓</td>
            </tr>
            <tr>
              <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">Autonomous Operation</td>
              <td className="px-6 py-3 text-center text-red-600">✕</td>
              <td className="px-6 py-3 text-center text-red-600">✕</td>
              <td className="px-6 py-3 text-center text-amber-600">Partial</td>
              <td className="px-6 py-3 text-center text-green-600">✓</td>
            </tr>
            <tr>
              <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">mTLS Auth</td>
              <td className="px-6 py-3 text-center text-red-600">✕</td>
              <td className="px-6 py-3 text-center text-red-600">✕</td>
              <td className="px-6 py-3 text-center text-red-600">✕</td>
              <td className="px-6 py-3 text-center text-green-600">✓</td>
            </tr>
            <tr>
              <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300">Anomaly Detection</td>
              <td className="px-6 py-3 text-center text-red-600">✕</td>
              <td className="px-6 py-3 text-center text-red-600">✕</td>
              <td className="px-6 py-3 text-center text-green-600">✓</td>
              <td className="px-6 py-3 text-center text-green-600">✓</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
