import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, Plus, Search, MoreHorizontal,
  Zap, Shield, Wallet, Settings, CheckCircle,
  PauseCircle, XCircle, ArrowUpRight, User, Building2, AlertTriangle
} from 'lucide-react';
import { mockAgents } from '../data/mockAgents';
import { Agent } from '../types/agent';
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
  disabled: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/50', label: 'Disabled' }
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
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  const filteredAgents = mockAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(search.toLowerCase()) ||
                          agent.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || agent.type === typeFilter;
    return matchesSearch && matchesType;
  });
  
  const activeAgents = mockAgents.filter(a => a.status === 'active').length;
  const totalVolume = mockAgents.reduce((sum, a) => sum + a.stats.totalVolume, 0);
  const totalTransactions = mockAgents.reduce((sum, a) => sum + a.stats.totalTransactions, 0);
  const x402EnabledAgents = mockAgents.filter(a => a.auth.x402.enabled).length;
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Agents</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            AI agents with X-402 protocol support for autonomous payments
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
          <Plus className="w-4 h-4" />
          Register Agent
        </button>
      </div>
      
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Agents</p>
            <Bot className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
            {mockAgents.length}
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
            {x402EnabledAgents}
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
            ${(totalVolume / 1000000).toFixed(1)}M
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Lifetime
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
            <ArrowUpRight className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
            {totalTransactions.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            All time
          </p>
        </div>
      </div>
      
      {/* X-402 Protocol Banner */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">X-402 Protocol Active</h3>
              <p className="text-white/80 text-sm">
                Agents can autonomously send and receive payments via HTTP 402 responses
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-white/60 text-xs">Endpoint</p>
              <code className="text-sm font-mono">api.payos.dev/x402</code>
            </div>
            <button className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
              View Docs
            </button>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4">
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
          {['all', 'payment', 'treasury', 'compliance'].map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                typeFilter === type
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {type === 'all' ? 'All' : agentTypeConfig[type as keyof typeof agentTypeConfig].label}
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
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Parent Account</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Type</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">KYA Tier</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">X-402</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Volume</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredAgents.map(agent => {
              const typeConf = agentTypeConfig[agent.type];
              const statusConf = statusConfig[agent.status];
              const TypeIcon = typeConf.icon;
              const StatusIcon = statusConf.icon;
              
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
                        <p className="text-sm text-gray-500 dark:text-gray-400">{agent.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        agent.parentAccount.type === 'business' 
                          ? 'bg-blue-100 dark:bg-blue-900/50' 
                          : 'bg-green-100 dark:bg-green-900/50'
                      }`}>
                        {agent.parentAccount.type === 'business' ? (
                          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <User className="w-4 h-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {agent.parentAccount.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {agent.parentAccount.type === 'business' ? 'KYB' : 'KYC'} T{agent.parentAccount.verificationTier}
                        </p>
                      </div>
                      {agent.kya.effectiveLimits.cappedByParent && (
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" title="Limits capped by parent account" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <TypeIcon className={`w-4 h-4 ${typeConf.color}`} />
                      <span className="text-sm text-gray-600 dark:text-gray-300">{typeConf.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 ${kyaTierConfig[agent.kya.tier].color} rounded-full text-xs font-medium`}>
                      {kyaTierConfig[agent.kya.tier].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">{agent.auth.x402.enabled ? (
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
                        ${agent.stats.totalVolume.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {agent.stats.totalTransactions.toLocaleString()} txns
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${statusConf.bg} ${statusConf.color} rounded-full text-xs font-medium`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusConf.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4 text-gray-400" />
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