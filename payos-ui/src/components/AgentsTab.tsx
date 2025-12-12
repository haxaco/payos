import { Bot, Plus, AlertTriangle, Clock, Activity, DollarSign } from 'lucide-react';
import { mockAgents } from '../data/mockAgents';
import { Account } from '../types/account';

interface Props {
  account: Account;
  onNavigate?: (page: string, id?: string) => void;
}

export function AgentsTab({ account, onNavigate }: Props) {
  // Get agents registered to this account
  const accountAgents = mockAgents.filter(agent => 
    agent.parentAccount.id === account.id
  );

  // Get parent account limits based on verification tier
  const getParentLimits = (tier: number) => {
    if (tier === 3) return { perTransaction: 100000, daily: 500000, monthly: 2000000 };
    if (tier === 2) return { perTransaction: 50000, daily: 200000, monthly: 500000 };
    if (tier === 1) return { perTransaction: 10000, daily: 50000, monthly: 100000 };
    return { perTransaction: 0, daily: 0, monthly: 0 };
  };

  const parentLimits = getParentLimits(account.verificationTier);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-violet-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Registered Agents</h3>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Register Agent
          </button>
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Agents registered to this account can act on its behalf. Agent limits are capped by account verification level (
          {account.type === 'business' ? 'KYB' : 'KYC'} T{account.verificationTier}).
        </p>
        
        {/* Account Limits Reference */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Account Limits ({account.type === 'business' ? 'KYB' : 'KYC'} T{account.verificationTier})
          </p>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-500">Per Transaction:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">${parentLimits.perTransaction.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Daily:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">${parentLimits.daily.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Monthly:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">${parentLimits.monthly.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Agents List */}
      {accountAgents.length > 0 ? (
        <div className="space-y-4">
          {accountAgents.map((agent) => (
            <div 
              key={agent.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{agent.name}</h4>
                      {/* KYA Tier Badge */}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        agent.kya.tier === 3 ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300' :
                        agent.kya.tier === 2 ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                        agent.kya.tier === 1 ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        KYA T{agent.kya.tier}
                      </span>
                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        agent.status === 'active' 
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                          : agent.status === 'paused'
                            ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                            : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          agent.status === 'active' ? 'bg-green-500' :
                          agent.status === 'paused' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                        {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {agent.description}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Limits Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Transaction Limits */}
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Transaction Limits</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Per Transaction:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${agent.kya.effectiveLimits.perTransaction.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Monthly:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${agent.kya.effectiveLimits.monthly.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Stream Limits */}
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Stream Limits</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Active Streams:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {agent.streamStats.activeStreams} / {agent.limits.maxActiveStreams}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Outflow:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${agent.streamStats.totalOutflow.toLocaleString()} / ${agent.limits.maxTotalStreamOutflow.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Capped Warning Banner */}
              {agent.kya.effectiveLimits.cappedByParent && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      This agent's KYA T{agent.kya.tier} limits are capped by the account's {account.type === 'business' ? 'KYB' : 'KYC'} T{account.verificationTier} verification.
                      {' '}<button className="underline hover:no-underline">Upgrade account verification</button>
                    </p>
                  </div>
                </div>
              )}
              
              {/* Stats Row */}
              <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Last active: {new Date(agent.stats.lastActive).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  {agent.stats.totalTransactions.toLocaleString()} transactions
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  ${agent.stats.totalVolume.toLocaleString()} volume
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button 
                  onClick={() => onNavigate?.('agent-detail', agent.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  View Details
                </button>
                <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600">
                  Manage
                </button>
                {agent.status === 'active' ? (
                  <button className="px-4 py-2 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/70">
                    Suspend
                  </button>
                ) : (
                  <button className="px-4 py-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/70">
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No Agents Registered</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Register an AI agent to automate payments, treasury management, or compliance monitoring.
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Register First Agent
          </button>
        </div>
      )}
    </div>
  );
}