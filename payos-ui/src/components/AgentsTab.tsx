import { Bot, Plus, AlertTriangle, Loader2, Shield, Zap, Wallet, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAgents } from '../hooks/api';
import type { Account } from '../types/api';

const agentTypeConfig = {
  payment: { icon: Zap, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/50', label: 'Payment' },
  treasury: { icon: Wallet, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/50', label: 'Treasury' },
  compliance: { icon: Shield, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/50', label: 'Compliance' },
  custom: { icon: Settings, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', label: 'Custom' }
};

interface Props {
  account: Account;
}

export function AgentsTab({ account }: Props) {
  const navigate = useNavigate();
  
  // Fetch agents for this account from API
  const { data, loading, error } = useAgents({ 
    parent_account_id: account.id,
    limit: 50 
  });
  const accountAgents = data?.data || [];

  // Get parent account limits based on verification tier
  const getParentLimits = (tier: number) => {
    if (tier === 3) return { perTransaction: 100000, daily: 500000, monthly: 2000000 };
    if (tier === 2) return { perTransaction: 50000, daily: 200000, monthly: 500000 };
    if (tier === 1) return { perTransaction: 10000, daily: 50000, monthly: 100000 };
    return { perTransaction: 0, daily: 0, monthly: 0 };
  };

  const parentLimits = getParentLimits(account.verification?.tier || 0);

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
          {account.type === 'business' ? 'KYB' : 'KYC'} T{account.verification?.tier || 0}).
        </p>
        
        {/* Account Limits Reference */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Account Limits ({account.type === 'business' ? 'KYB' : 'KYC'} T{account.verification?.tier || 0})
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
      
      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Failed to load agents</h3>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error.message}</p>
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-gray-500 dark:text-gray-400 mt-2">Loading agents...</p>
        </div>
      )}
      
      {/* Agents List */}
      {!loading && !error && accountAgents.length > 0 ? (
        <div className="space-y-4">
          {accountAgents.map((agent) => {
            const typeConf = agentTypeConfig[agent.type];
            const TypeIcon = typeConf.icon;
            
            return (
              <div 
                key={agent.id}
                onClick={() => navigate(`/agents/${agent.id}`)}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-violet-300 dark:hover:border-violet-700 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl ${typeConf.bg} flex items-center justify-center flex-shrink-0`}>
                      <TypeIcon className={`w-6 h-6 ${typeConf.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{agent.name}</h4>
                        {/* Type Badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeConf.bg} ${typeConf.color}`}>
                          {typeConf.label}
                        </span>
                        {/* KYA Tier Badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          agent.kya_tier === 3 ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300' :
                          agent.kya_tier === 2 ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                          agent.kya_tier === 1 ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          <Shield className="w-3 h-3 inline mr-1" />
                          KYA T{agent.kya_tier}
                        </span>
                        {/* X-402 Badge */}
                        {agent.x402_enabled && (
                          <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded text-xs font-medium">
                            <Zap className="w-3 h-3 inline mr-1" />
                            X-402
                          </span>
                        )}
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
                      {agent.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {agent.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              
              {/* Limits Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Per Transaction</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ${agent.effective_limit_per_tx.toLocaleString()}
                  </p>
                  {agent.effective_limits_capped && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Capped</p>
                  )}
                </div>
                
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Daily Limit</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ${agent.effective_limit_daily.toLocaleString()}
                  </p>
                </div>
                
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Active Streams</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {agent.active_streams_count}/{agent.max_active_streams}
                  </p>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      ) : !loading && !error ? (
        /* Empty State */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Bot className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">No agents registered</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Register an AI agent to enable autonomous payments
          </p>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Register First Agent
          </button>
        </div>
      ) : null}
    </div>
  );
}
