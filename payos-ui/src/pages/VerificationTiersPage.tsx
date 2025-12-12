import { useState } from 'react';
import { User, Building2, Plus, Edit2, CheckCircle, X } from 'lucide-react';
import { Page } from '../App';

interface Tier {
  id: string;
  level: number;
  name: string;
  requirements: string[];
  capabilities: string[];
  limits: { monthly: string; perTransaction: string };
}

const personTiers: Tier[] = [
  {
    id: 'person_t0',
    level: 0,
    name: 'Unverified',
    requirements: ['Email verification'],
    capabilities: ['View balance only'],
    limits: { monthly: '$0', perTransaction: '$0' }
  },
  {
    id: 'person_t1',
    level: 1,
    name: 'Basic KYC',
    requirements: ['Email verification', 'Phone verification', 'Name, DOB, Address'],
    capabilities: ['Hold balance', 'Receive funds'],
    limits: { monthly: '$5,000', perTransaction: '$1,000' }
  },
  {
    id: 'person_t2',
    level: 2,
    name: 'Standard KYC',
    requirements: ['All Basic requirements', 'ID document upload', 'Selfie verification'],
    capabilities: ['All Basic capabilities', 'Send funds', 'Bank withdrawals', 'Virtual card'],
    limits: { monthly: '$50,000', perTransaction: '$10,000' }
  },
  {
    id: 'person_t3',
    level: 3,
    name: 'Enhanced KYC',
    requirements: ['All Standard requirements', 'Proof of address', 'Source of funds declaration'],
    capabilities: ['All capabilities', 'Physical card', 'Multiple wallets'],
    limits: { monthly: 'Unlimited', perTransaction: '$50,000' }
  }
];

const businessTiers: Tier[] = [
  {
    id: 'business_t1',
    level: 1,
    name: 'Basic KYB',
    requirements: ['Business name & registration', 'EIN/Tax ID', 'Registration document'],
    capabilities: ['Receive funds only'],
    limits: { monthly: '$10,000', perTransaction: '$5,000' }
  },
  {
    id: 'business_t2',
    level: 2,
    name: 'Standard KYB',
    requirements: ['All Basic requirements', 'Beneficial owners identified', 'Bank statement (90 days)'],
    capabilities: ['Receive funds', 'Send funds', 'Corporate card'],
    limits: { monthly: '$500,000', perTransaction: '$50,000' }
  },
  {
    id: 'business_t3',
    level: 3,
    name: 'Enhanced KYB',
    requirements: ['All Standard requirements', 'Audited financials', 'Site verification'],
    capabilities: ['All capabilities', 'Unlimited transactions', 'API access'],
    limits: { monthly: 'Unlimited', perTransaction: '$500,000' }
  }
];

interface Props {
  onNavigate: (page: Page) => void;
}

export function VerificationTiersPage({ onNavigate }: Props) {
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-gray-900 dark:text-white">Verification Tiers</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Configure KYC and KYB requirements for different account tiers
        </p>
      </div>
      
      {/* Person Tiers (KYC) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Person Tiers (KYC)</h2>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Add Tier
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tier</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Requirements</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Capabilities</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Limits</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {personTiers.map(tier => (
                <tr key={tier.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-mono text-sm text-gray-500 dark:text-gray-400">T{tier.level}</span>
                      <p className="font-medium text-gray-900 dark:text-white">{tier.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      {tier.requirements.slice(0, 2).map((req, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                      {tier.requirements.length > 2 && (
                        <li className="text-gray-400 dark:text-gray-500">
                          +{tier.requirements.length - 2} more
                        </li>
                      )}
                    </ul>
                  </td>
                  <td className="px-6 py-4">
                    <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      {tier.capabilities.slice(0, 2).map((cap, i) => (
                        <li key={i}>{cap}</li>
                      ))}
                      {tier.capabilities.length > 2 && (
                        <li className="text-gray-400 dark:text-gray-500">
                          +{tier.capabilities.length - 2} more
                        </li>
                      )}
                    </ul>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="text-gray-900 dark:text-white">{tier.limits.monthly}/mo</p>
                      <p className="text-gray-500 dark:text-gray-400">{tier.limits.perTransaction}/txn</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setEditingTier(tier)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Business Tiers (KYB) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Business Tiers (KYB)</h2>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors">
            <Plus className="w-4 h-4" />
            Add Tier
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tier</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Requirements</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Capabilities</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Limits</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {businessTiers.map(tier => (
                <tr key={tier.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-mono text-sm text-gray-500 dark:text-gray-400">T{tier.level}</span>
                      <p className="font-medium text-gray-900 dark:text-white">{tier.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      {tier.requirements.slice(0, 2).map((req, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                      {tier.requirements.length > 2 && (
                        <li className="text-gray-400 dark:text-gray-500">
                          +{tier.requirements.length - 2} more
                        </li>
                      )}
                    </ul>
                  </td>
                  <td className="px-6 py-4">
                    <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      {tier.capabilities.map((cap, i) => (
                        <li key={i}>{cap}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p className="text-gray-900 dark:text-white">{tier.limits.monthly}/mo</p>
                      <p className="text-gray-500 dark:text-gray-400">{tier.limits.perTransaction}/txn</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setEditingTier(tier)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Edit Modal */}
      {editingTier && (
        <TierEditModal tier={editingTier} onClose={() => setEditingTier(null)} />
      )}
    </div>
  );
}

function TierEditModal({ tier, onClose }: { tier: Tier; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit: {tier.name} (T{tier.level})
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Requirements */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Requirements</h4>
            <div className="space-y-2">
              {[
                'Email verification',
                'Phone verification',
                'Name, DOB, Address',
                'ID document upload',
                'Selfie verification',
                'Proof of address',
                'Source of funds declaration'
              ].map((req, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={tier.requirements.includes(req)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    readOnly
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{req}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Capabilities */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Capabilities</h4>
            <div className="space-y-2">
              {[
                'Hold balance',
                'Receive funds',
                'Send funds',
                'Bank withdrawals',
                'Virtual card',
                'Physical card',
                'Multiple wallets'
              ].map((cap, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={tier.capabilities.some(c => c.toLowerCase().includes(cap.toLowerCase()))}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    readOnly
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{cap}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Limits */}
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Limits</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Monthly Limit
                </label>
                <input 
                  type="text" 
                  defaultValue={tier.limits.monthly}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Per-Transaction Limit
                </label>
                <input 
                  type="text" 
                  defaultValue={tier.limits.perTransaction}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
