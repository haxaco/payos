import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, Plus, Search, MoreHorizontal,
  CheckCircle, PauseCircle, XCircle, Loader2, AlertTriangle, Shield,
  Zap, Wallet, Settings
} from 'lucide-react';
import { useAgents } from '../hooks/api';
import type { Agent } from '../types/api';
import { AISparkleButton } from '../components/ui/AISparkleButton';

const agentTypeConfig = {
  payment: { icon: Zap, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/50', label: 'Payment' },
  treasury: { icon: Wallet, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/50', label: 'Treasury' },
  compliance: { icon: Shield, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/50', label: 'Compliance' },
  custom: { icon: Settings, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', label: 'Custom' }
};

const statusConfig = {
  active: { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/50', label: 'Active' },
  paused: { icon: PauseCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/50', label: 'Paused' },
  suspended: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/50', label: 'Suspended' }
};

const kyaTierConfig = {
  0: { label: 'T0', fullLabel: 'T0 Sandbox', color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' },
  1: { label: 'T1', fullLabel: 'T1 Basic', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' },
  2: { label: 'T2', fullLabel: 'T2 Verified', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' },
  3: { label: 'T3', fullLabel: 'T3 Trusted', color: 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300' }
};

export function AgentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'payment' | 'treasury' | 'compliance' | 'custom'>('all');
  
  // Fetch agents from API with type filter
  const filters = useMemo(() => ({
    type: typeFilter !== 'all' ? typeFilter : undefined,
    limit: 100,
  }), [typeFilter]);
  
  const { data, loading, error, refetch } = useAgents(filters);
  const agents = data?.data || [];
  
  // Client-side search filtering
  const filteredAgents = useMemo(() => {
    if (!search.trim()) return agents;
    
    const query = search.toLowerCase();
    return agents.filter(agent => 
      agent.name?.toLowerCase().includes(query) ||
      agent.description?.toLowerCase().includes(query) ||
      agent.id.toLowerCase().includes(query)
    );
  }, [agents, search]);
  
  // Calculate stats from real data
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const x402EnabledAgents = agents.filter(a => a.x402_enabled).length;
  const totalVolume = agents.reduce((sum, a) => sum + (a.total_volume || 0), 0);
  const totalTransactions = agents.reduce((sum, a) => sum + (a.total_transactions || 0), 0);
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Agents</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            AI agents for autonomous payments and treasury management
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
          <Plus className="w-4 h-4" />
          Register Agent
        </button>
      </div>
      
      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Failed to load agents</h3>
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
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Agents</p>
            <Bot className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : agents.length}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            {activeAgents} active
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">X-402 Enabled</p>
            <Zap className="w-5 h-5 text-violet-500" />
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : x402EnabledAgents}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Protocol active
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Volume</p>
            <AISparkleButton context="agent transaction volume" />
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : `$${(totalVolume / 1000000).toFixed(1)}M`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            All-time processed
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Transactions</p>
            <Bot className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : totalTransactions.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Autonomous payments
          </p>
        </div>
      </div>
      
      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['all', 'payment', 'treasury', 'compliance'] as const).map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                typeFilter === type
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {type === 'all' ? 'All' : agentTypeConfig[type].label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Agents Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Agent</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Type</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">KYA Tier</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">X-402</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Volume</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {/* Loading State */}
            {loading && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                  <p className="text-gray-500 dark:text-gray-400 mt-2">Loading agents...</p>
                </td>
              </tr>
            )}
            
            {/* Empty State */}
            {!loading && filteredAgents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <Bot className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium">
                    {search ? 'No agents match your search' : 'No agents registered yet'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    {search ? 'Try adjusting your search query' : 'Register your first AI agent to get started'}
                  </p>
                </td>
              </tr>
            )}
            
            {/* Agent Rows */}
            {!loading && filteredAgents.map(agent => {
              const typeConf = agentTypeConfig[agent.type];
              const statusConf = statusConfig[agent.status as keyof typeof statusConfig];
              const TypeIcon = typeConf.icon;
              const StatusIcon = statusConf?.icon || XCircle;
              const kyaConf = kyaTierConfig[agent.kya_tier as keyof typeof kyaTierConfig];
              
              return (
                <tr 
                  key={agent.id}
                  onClick={() => navigate(`/agents/${agent.id}`)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${typeConf.bg} flex items-center justify-center`}>
                        <Bot className={`w-5 h-5 ${typeConf.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{agent.name}</p>
                        {agent.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {agent.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <TypeIcon className={`w-4 h-4 ${typeConf.color}`} />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{typeConf.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 ${kyaConf?.color || 'bg-gray-100 text-gray-600'} rounded-full text-xs font-medium`}>
                      {kyaConf?.label || `T${agent.kya_tier}`}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {agent.x402_enabled ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded-full text-xs font-medium">
                        <Zap className="w-3 h-3" />
                        Enabled
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">Disabled</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">
                        ${agent.total_volume.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {agent.total_transactions.toLocaleString()} txns
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 ${statusConf?.bg || 'bg-gray-100'} ${statusConf?.color || 'text-gray-600'} rounded-full text-xs font-medium`}>
                      {statusConf && <StatusIcon className="w-3 h-3" />}
                      {statusConf?.label || agent.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      <MoreHorizontal className="w-5 h-5 text-gray-400" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
