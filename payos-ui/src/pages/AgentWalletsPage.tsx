import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, Search, MoreHorizontal, Bot,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  PauseCircle, XCircle, Loader2, Clock, ArrowUpRight,
  DollarSign, Shield, Zap, RefreshCw
} from 'lucide-react';
import { useWallets, type Wallet as WalletType, type SpendingPolicy } from '../hooks/api';

// Status configurations
const statusConfig = {
  active: { 
    icon: CheckCircle, 
    color: 'text-emerald-600 dark:text-emerald-400', 
    bg: 'bg-emerald-100 dark:bg-emerald-900/50', 
    label: 'Active' 
  },
  frozen: { 
    icon: PauseCircle, 
    color: 'text-amber-600 dark:text-amber-400', 
    bg: 'bg-amber-100 dark:bg-amber-900/50', 
    label: 'Frozen' 
  },
  depleted: { 
    icon: XCircle, 
    color: 'text-red-600 dark:text-red-400', 
    bg: 'bg-red-100 dark:bg-red-900/50', 
    label: 'Depleted' 
  }
};

// Currency formatting
const formatCurrency = (amount: number, currency: string = 'USDC') => {
  if (currency === 'USDC' || currency === 'EURC') {
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

// Calculate spending progress
const getSpendingProgress = (policy: SpendingPolicy | undefined) => {
  if (!policy) return null;
  
  const dailyProgress = policy.dailySpendLimit 
    ? Math.min(((policy.dailySpent || 0) / policy.dailySpendLimit) * 100, 100)
    : null;
  
  const monthlyProgress = policy.monthlySpendLimit
    ? Math.min(((policy.monthlySpent || 0) / policy.monthlySpendLimit) * 100, 100)
    : null;
  
  return { dailyProgress, monthlyProgress };
};

// Progress bar component
function SpendingProgressBar({ 
  label, 
  current, 
  limit, 
  progress 
}: { 
  label: string; 
  current: number; 
  limit: number; 
  progress: number 
}) {
  const isWarning = progress > 80;
  const isDanger = progress > 95;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`font-medium ${isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-700 dark:text-gray-300'}`}>
          {formatCurrency(current)} / {formatCurrency(limit)}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${
            isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function AgentWalletsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'frozen' | 'depleted'>('all');
  
  // Fetch wallets (filtering to agent-managed)
  const filters = useMemo(() => ({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    limit: 100,
  }), [statusFilter]);
  
  const { data, loading, error, refetch } = useWallets(filters);
  const allWallets = data?.data || [];
  
  // Filter to only agent-managed wallets
  const agentWallets = useMemo(() => 
    allWallets.filter(w => w.managed_by_agent_id),
    [allWallets]
  );
  
  // Client-side search filtering
  const filteredWallets = useMemo(() => {
    if (!search.trim()) return agentWallets;
    
    const query = search.toLowerCase();
    return agentWallets.filter(wallet => 
      wallet.name?.toLowerCase().includes(query) ||
      wallet.purpose?.toLowerCase().includes(query) ||
      wallet.id.toLowerCase().includes(query) ||
      wallet.agent_name?.toLowerCase().includes(query)
    );
  }, [agentWallets, search]);
  
  // Calculate stats
  const totalBalance = agentWallets.reduce((sum, w) => sum + w.balance, 0);
  const activeWallets = agentWallets.filter(w => w.status === 'active').length;
  const walletsWithPolicies = agentWallets.filter(w => w.spending_policy).length;
  const walletsNearLimit = agentWallets.filter(w => {
    const progress = getSpendingProgress(w.spending_policy);
    return (progress?.dailyProgress && progress.dailyProgress > 80) || 
           (progress?.monthlyProgress && progress.monthlyProgress > 80);
  }).length;
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-7 h-7 text-violet-600" />
            Agent Wallets
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage spending policies and balances for autonomous AI agents
          </p>
        </div>
        <button 
          onClick={() => navigate('/approvals')}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Clock className="w-4 h-4" />
          View Pending Approvals
        </button>
      </div>
      
      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Failed to load wallets</h3>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error.message}</p>
            <button 
              onClick={() => refetch()}
              className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Try again
            </button>
          </div>
        </div>
      )}
      
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <DollarSign className="w-8 h-8 text-emerald-500" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
              Total Balance
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalBalance)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              across {agentWallets.length} wallets
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <Bot className="w-8 h-8 text-violet-500" />
            <span className="text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">
              Active Agents
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {activeWallets}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              of {agentWallets.length} total
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <Shield className="w-8 h-8 text-blue-500" />
            <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
              With Policies
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {walletsWithPolicies}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              spending controls active
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
              Near Limit
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {walletsNearLimit}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              &gt;80% of limit used
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, agent, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
          {['all', 'active', 'frozen', 'depleted'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as typeof statusFilter)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                statusFilter === status
                  ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        
        <button 
          onClick={() => refetch()}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      )}
      
      {/* Empty State */}
      {!loading && filteredWallets.length === 0 && (
        <div className="text-center py-12">
          <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No agent wallets found</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {search ? 'Try adjusting your search' : 'Register an agent to create a wallet'}
          </p>
        </div>
      )}
      
      {/* Wallets Grid */}
      {!loading && filteredWallets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredWallets.map((wallet) => {
            const status = statusConfig[wallet.status as keyof typeof statusConfig] || statusConfig.active;
            const StatusIcon = status.icon;
            const progress = getSpendingProgress(wallet.spending_policy);
            
            return (
              <div
                key={wallet.id}
                onClick={() => navigate(`/agent-wallets/${wallet.id}`)}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-700 transition-all cursor-pointer group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {wallet.name || 'Unnamed Wallet'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {wallet.agent_name || 'Agent'}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${status.bg}`}>
                    <StatusIcon className={`w-3 h-3 ${status.color}`} />
                    <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                  </div>
                </div>
                
                {/* Balance */}
                <div className="mb-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Balance</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(wallet.balance, wallet.currency)}
                  </div>
                </div>
                
                {/* Spending Progress */}
                {wallet.spending_policy && progress && (
                  <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    {progress.dailyProgress !== null && wallet.spending_policy.dailySpendLimit && (
                      <SpendingProgressBar
                        label="Daily Limit"
                        current={wallet.spending_policy.dailySpent || 0}
                        limit={wallet.spending_policy.dailySpendLimit}
                        progress={progress.dailyProgress}
                      />
                    )}
                    {progress.monthlyProgress !== null && wallet.spending_policy.monthlySpendLimit && (
                      <SpendingProgressBar
                        label="Monthly Limit"
                        current={wallet.spending_policy.monthlySpent || 0}
                        limit={wallet.spending_policy.monthlySpendLimit}
                        progress={progress.monthlyProgress}
                      />
                    )}
                    
                    {/* Approval Threshold */}
                    {(wallet.spending_policy.approvalThreshold || wallet.spending_policy.requiresApprovalAbove) && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Shield className="w-3 h-3" />
                        <span>
                          Approval required above {formatCurrency(wallet.spending_policy.approvalThreshold || wallet.spending_policy.requiresApprovalAbove || 0)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* No Policy Warning */}
                {!wallet.spending_policy && (
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-3 h-3" />
                      <span>No spending policy configured</span>
                    </div>
                  </div>
                )}
                
                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-400 font-mono">
                    {wallet.id.slice(0, 8)}...
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-violet-500 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AgentWalletsPage;
