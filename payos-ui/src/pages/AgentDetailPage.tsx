import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Bot, Shield, CheckCircle, PauseCircle, XCircle, 
  Loader2, AlertCircle, Copy, Activity, TrendingUp, Zap, Wallet, Settings
} from 'lucide-react';
import { useAgent } from '../hooks/api';

const agentTypeConfig = {
  payment: { icon: Zap, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/50', label: 'Payment' },
  treasury: { icon: Wallet, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/50', label: 'Treasury' },
  compliance: { icon: Shield, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/50', label: 'Compliance' },
  custom: { icon: Settings, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', label: 'Custom' }
};

const kyaTierConfig = {
  0: { label: 'T0 Sandbox', color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' },
  1: { label: 'T1 Basic', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' },
  2: { label: 'T2 Verified', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' },
  3: { label: 'T3 Trusted', color: 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300' }
};

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'settings'>('overview');
  
  // Fetch agent from API
  const { data: agent, loading, error } = useAgent(id);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <button 
          onClick={() => navigate('/agents')}
          className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Agents
        </button>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <button 
          onClick={() => navigate('/agents')}
          className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Agents
        </button>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-gray-500 dark:text-gray-400">Failed to load agent</p>
          <p className="text-sm text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }
  
  // Not found state
  if (!agent) {
    return (
      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <button 
          onClick={() => navigate('/agents')}
          className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Agents
        </button>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Agent not found</p>
        </div>
      </div>
    );
  }
  
  const kyaConf = kyaTierConfig[agent.kya_tier as keyof typeof kyaTierConfig];
  const typeConf = agentTypeConfig[agent.type];
  const TypeIcon = typeConf.icon;
  
  const statusConfig = {
    active: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/50', label: 'Active' },
    paused: { icon: PauseCircle, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/50', label: 'Paused' },
    suspended: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/50', label: 'Suspended' }
  };
  
  const statusConf = statusConfig[agent.status as keyof typeof statusConfig];
  const StatusIcon = statusConf?.icon || CheckCircle;
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/agents')}
        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Agents
      </button>
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl ${typeConf.bg} flex items-center justify-center`}>
              <TypeIcon className={`w-7 h-7 ${typeConf.color}`} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {agent.name}
              </h1>
              {agent.description && (
                <p className="text-gray-500 dark:text-gray-400 mt-1">{agent.description}</p>
              )}
              
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${typeConf.bg} ${typeConf.color}`}>
                  <TypeIcon className="w-3 h-3" />
                  {typeConf.label}
                </span>
                
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConf?.bg || 'bg-gray-100'} ${statusConf?.color || 'text-gray-600'}`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConf?.label || agent.status}
                </span>
                
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${kyaConf?.color || 'bg-gray-100'}`}>
                  <Shield className="w-3 h-3" />
                  {kyaConf?.label || `Tier ${agent.kya_tier}`}
                </span>
                
                {agent.x402_enabled && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded-full text-xs font-medium">
                    <Zap className="w-3 h-3" />
                    X-402 Enabled
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              {agent.status === 'active' ? 'Pause' : 'Activate'}
            </button>
            <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              Settings
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            Per Transaction
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            ${agent.effective_limit_per_tx.toLocaleString()}
          </p>
          {agent.effective_limits_capped && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Capped by parent</p>
          )}
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Activity className="w-4 h-4" />
            Daily Limit
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            ${agent.effective_limit_daily.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Activity className="w-4 h-4" />
            Monthly Limit
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            ${agent.effective_limit_monthly.toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Activity className="w-4 h-4" />
            Active Streams
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {agent.active_streams_count}/{agent.max_active_streams}
          </p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-8">
          {[
            { key: 'overview' as const, label: 'Overview' },
            { key: 'activity' as const, label: 'Activity' },
            { key: 'settings' as const, label: 'Settings' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          {/* KYA Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              KYA Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">KYA Tier</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {kyaConf?.label || `Tier ${agent.kya_tier}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className={`font-medium ${
                  agent.kya_status === 'verified' 
                    ? 'text-green-600 dark:text-green-400'
                    : agent.kya_status === 'pending'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {agent.kya_status}
                </span>
              </div>
              {agent.kya_verified_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Verified At</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {new Date(agent.kya_verified_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Stream Limits */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Stream Limits
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Max Active Streams</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {agent.max_active_streams}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Max Flow Rate</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  ${agent.max_flow_rate_per_stream.toLocaleString()}/stream
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Max Total Outflow</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  ${agent.max_total_outflow.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Current Outflow</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  ${agent.total_stream_outflow.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          
          {/* Authentication Token */}
          <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Authentication Token
            </h3>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-3">
                <code className="text-sm font-mono text-gray-900 dark:text-white">
                  {agent.auth_token_prefix || 'No token'}•••••••••••••••••••••••••
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(agent.auth_token_prefix || '')}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                title="Copy token prefix"
              >
                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Full token is only shown once during creation for security.
            </p>
          </div>
        </div>
      )}
      
      {activeTab === 'activity' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Activity log coming soon</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Agent transactions and events will appear here
            </p>
          </div>
        </div>
      )}
      
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Agent Settings
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={agent.name}
                readOnly
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={agent.description || ''}
                readOnly
                rows={3}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Delete Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
