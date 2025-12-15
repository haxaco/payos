import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Bot, Zap, Shield, Wallet, Settings,
  CheckCircle, PauseCircle, Copy, 
  Activity, Key, Clock, MoreHorizontal, Play, Pause, Sparkles,
  ShieldCheck, Eye, ExternalLink, Lock, XCircle, User, Building2, AlertTriangle, Plus
} from 'lucide-react';
import { mockAgents } from '../data/mockAgents';
import { AISparkleButton } from '../components/ui/AISparkleButton';

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const agent = mockAgents.find(a => a.id === id);
  const [activeTab, setActiveTab] = useState('overview');
  
  if (!agent) {
    return (
      <div className="p-8">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Agent not found</p>
          <button onClick={() => navigate('/agents')} className="mt-4 text-violet-600 hover:underline">
            ← Back to Agents
          </button>
        </div>
      </div>
    );
  }
  
  const typeConfig = {
    payment: { icon: Zap, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/50' },
    treasury: { icon: Wallet, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/50' },
    compliance: { icon: Shield, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/50' },
    custom: { icon: Settings, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' }
  };
  
  const config = typeConfig[agent.type];
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  const activityLog = [
    { id: 1, action: 'Payment sent', amount: 2000, to: 'Maria Garcia', time: '2 min ago', status: 'success' },
    { id: 2, action: 'Payment sent', amount: 1800, to: 'Carlos Martinez', time: '5 min ago', status: 'success' },
    { id: 3, action: 'Approval requested', amount: 8500, to: 'TechCorp Inc', time: '12 min ago', status: 'pending' },
    { id: 4, action: 'Payment sent', amount: 2500, to: 'Ana Souza', time: '1 hour ago', status: 'success' },
    { id: 5, action: 'Payment failed', amount: 1200, to: 'Juan Perez', time: '2 hours ago', status: 'failed' },
  ];
  
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
      <div className="flex gap-6">
        {/* Agent Info Card */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl ${config.bg} flex items-center justify-center`}>
                <Bot className={`w-7 h-7 ${config.color}`} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {agent.name}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{agent.description}</p>
                
                <div className="mt-3 flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    agent.status === 'active' 
                      ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                      : agent.status === 'paused'
                        ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                        : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                  }`}>
                    {agent.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <PauseCircle className="w-3 h-3" />}
                    {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                  </span>
                  
                  {agent.auth.x402.enabled && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded-full text-xs font-medium">
                      <Zap className="w-3 h-3" />
                      X-402 Enabled
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {agent.status === 'active' ? (
                <button className="flex items-center gap-2 px-3 py-2 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors">
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              ) : (
                <button className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900 transition-colors">
                  <Play className="w-4 h-4" />
                  Activate
                </button>
              )}
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <MoreHorizontal className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Balance Card */}
        <div className="w-64 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Agent Balance</span>
            <AISparkleButton context={`balance for agent ${agent.name}`} />
          </div>
          <p className="text-3xl font-semibold text-gray-900 dark:text-white">
            ${(agent.balance.usd + agent.balance.usdc).toLocaleString()}
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">USDC</span>
              <span className="text-gray-900 dark:text-white">${agent.balance.usdc.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">USD</span>
              <span className="text-gray-900 dark:text-white">${agent.balance.usd.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        {/* Stats Card */}
        <div className="w-64 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">Performance</span>
          <div className="mt-3 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Success Rate</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{agent.stats.successRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Total Volume</span>
              <span className="font-medium text-gray-900 dark:text-white">${(agent.stats.totalVolume / 1000).toFixed(0)}K</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Transactions</span>
              <span className="font-medium text-gray-900 dark:text-white">{agent.stats.totalTransactions.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* X-402 Protocol Section - Moved to Authentication Tab */}
      {false && (
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-violet-200 dark:border-violet-800">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">X-402 Protocol Configuration</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Endpoint</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg text-sm font-mono text-gray-900 dark:text-white border border-violet-200 dark:border-violet-800">
                  {agent.x402.endpoint}
                </code>
                <button 
                  onClick={() => copyToClipboard(agent.x402.endpoint)}
                  className="p-2 hover:bg-violet-100 dark:hover:bg-violet-900/50 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </button>
              </div>
            </div>
            
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Public Key</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg text-sm font-mono text-gray-900 dark:text-white border border-violet-200 dark:border-violet-800 truncate">
                  {agent.x402.publicKey}
                </code>
                <button 
                  onClick={() => copyToClipboard(agent.x402.publicKey)}
                  className="p-2 hover:bg-violet-100 dark:hover:bg-violet-900/50 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Capabilities</p>
            <div className="flex gap-2">
              {agent.x402.capabilities.map(cap => (
                <span key={cap} className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-sm font-medium text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  {cap}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'authentication', label: 'Authentication', icon: Key },
            { id: 'verification', label: 'KYA Verification', icon: ShieldCheck },
            { id: 'streams', label: 'Streams', icon: Zap },
            { id: 'permissions', label: 'Permissions', icon: Shield },
            { id: 'activity', label: 'Activity Log', icon: Clock },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Parent Account & Effective Limits Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Parent Account Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                Parent Account
              </h3>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    agent.parentAccount.type === 'business' 
                      ? 'bg-blue-100 dark:bg-blue-900/50' 
                      : 'bg-green-100 dark:bg-green-900/50'
                  }`}>
                    {agent.parentAccount.type === 'business' ? (
                      <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {agent.parentAccount.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {agent.parentAccount.type === 'business' ? 'Business' : 'Personal'} Account
                      </span>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        agent.parentAccount.verificationTier === 3 ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300' :
                        agent.parentAccount.verificationTier === 2 ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                        'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                      }`}>
                        {agent.parentAccount.type === 'business' ? 'KYB' : 'KYC'} T{agent.parentAccount.verificationTier}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600">
                  View Account
                </button>
              </div>
              
              {/* Parent Account Limits */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Account Limits
                </p>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Per Transaction:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      ${agent.parentAccount.verificationTier === 3 ? '100,000' : 
                        agent.parentAccount.verificationTier === 2 ? '50,000' : '10,000'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Daily:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      ${agent.parentAccount.verificationTier === 3 ? '500,000' : 
                        agent.parentAccount.verificationTier === 2 ? '200,000' : '50,000'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Monthly:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      ${agent.parentAccount.verificationTier === 3 ? '2,000,000' : 
                        agent.parentAccount.verificationTier === 2 ? '500,000' : '100,000'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Effective Limits Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Effective Limits
                </h3>
                {agent.kya.effectiveLimits.cappedByParent && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    Capped by parent account
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Per Transaction</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                    ${agent.kya.effectiveLimits.perTransaction.toLocaleString()}
                  </p>
                  {agent.kya.agentLimits.perTransaction > agent.kya.effectiveLimits.perTransaction && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Agent limit: ${agent.kya.agentLimits.perTransaction.toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Daily</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                    ${agent.kya.effectiveLimits.daily.toLocaleString()}
                  </p>
                  {agent.kya.agentLimits.daily > agent.kya.effectiveLimits.daily && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Agent limit: ${agent.kya.agentLimits.daily.toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Monthly</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                    ${agent.kya.effectiveLimits.monthly.toLocaleString()}
                  </p>
                  {agent.kya.agentLimits.monthly > agent.kya.effectiveLimits.monthly && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Agent limit: ${agent.kya.agentLimits.monthly.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              
              {agent.kya.effectiveLimits.cappedByParent && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    This agent&apos;s KYA T{agent.kya.tier} limits exceed the parent account&apos;s {agent.parentAccount.type === 'business' ? 'KYB' : 'KYC'} T{agent.parentAccount.verificationTier} limits. 
                    Effective limits are capped at the parent account level.
                    {' '}<button className="underline hover:no-underline">Upgrade account verification &rarr;</button>
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* AI Summary & Activity */}
          <div className="grid grid-cols-3 gap-6">
            {/* AI Summary */}
            <div className="col-span-2 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-violet-200 dark:border-violet-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">AI Summary</h3>
                </div>
                <AISparkleButton context={`full analysis of agent ${agent.name}`} label="Deep dive" />
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                This {agent.type} agent has processed {agent.stats.totalTransactions.toLocaleString()} transactions 
                with a {agent.stats.successRate}% success rate. Current balance is ${(agent.balance.usd + agent.balance.usdc).toLocaleString()}, 
                sufficient for approximately {Math.floor((agent.balance.usd + agent.balance.usdc) / 2000)} average payments. 
                {agent.permissions.requiresApproval 
                  ? ` Transactions over $${agent.permissions.approvalThreshold.toLocaleString()} require manual approval.`
                  : ' Operating fully autonomously within configured limits.'}
              </p>
            </div>
          
          {/* Recent Activity Mini */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {activityLog.slice(0, 3).map(log => (
                <div key={log.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">{log.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{log.time}</p>
                  </div>
                  <span className={`text-sm font-medium ${
                    log.status === 'success' ? 'text-green-600' :
                    log.status === 'pending' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    ${log.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setActiveTab('activity')}
              className="mt-4 w-full text-sm text-violet-600 dark:text-violet-400 hover:underline"
            >
              View all activity &rarr;
            </button>
          </div>
          </div>
        </div>
      )}
      
      {activeTab === 'authentication' && (
        <div className="space-y-6">
          {/* Auth Methods Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Authentication Methods</h3>
            <div className="flex gap-2 mb-6">
              {agent.auth.methods.map(method => (
                <span 
                  key={method}
                  className="px-3 py-1.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-sm font-medium"
                >
                  {method === 'oauth' && 'OAuth 2.0'}
                  {method === 'pk_jwt' && 'PK-JWT'}
                  {method === 'x402' && 'X-402'}
                  {method === 'mtls' && 'mTLS'}
                  {method === 'api_key' && 'API Key'}
                </span>
              ))}
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {agent.kya.tier === 0 && 'Sandbox agents use API keys for testing only.'}
              {agent.kya.tier === 1 && 'Basic agents authenticate via OAuth client credentials.'}
              {agent.kya.tier === 2 && 'Verified agents use PK-JWT for enhanced security.'}
              {agent.kya.tier === 3 && 'Trusted agents can use mTLS for strongest authentication.'}
            </p>
          </div>
          
          {/* OAuth Credentials */}
          {agent.auth.oauth && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">OAuth 2.0 Credentials</h3>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                  Active
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Client ID</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg font-mono text-sm text-gray-900 dark:text-white">
                      {agent.auth.oauth.clientId}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(agent.auth.oauth!.clientId)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Client Secret</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg font-mono text-sm text-gray-900 dark:text-white">
                      ••••••••••••••••{agent.auth.oauth.clientSecretHint}
                    </code>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                      <Eye className="w-4 h-4 text-gray-400" />
                    </button>
                    <button className="px-3 py-2 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900">
                      Rotate
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Created {new Date(agent.auth.oauth.clientSecretCreatedAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Scopes</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {agent.auth.oauth.scopes.map(scope => (
                      <span key={scope} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs font-mono">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-2">Token Endpoint</p>
                <code className="text-sm font-mono text-gray-900 dark:text-white">
                  POST https://api.payos.dev/oauth/token
                </code>
              </div>
            </div>
          )}
          
          {/* PK-JWT Configuration */}
          {agent.auth.pkJwt && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Public Key JWT</h3>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                  Configured
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Algorithm</label>
                    <p className="mt-1 font-mono text-gray-900 dark:text-white">{agent.auth.pkJwt.algorithm}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Registered</label>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {new Date(agent.auth.pkJwt.registeredAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Public Key Fingerprint</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg font-mono text-sm text-gray-900 dark:text-white">
                      {agent.auth.pkJwt.publicKeyFingerprint}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(agent.auth.pkJwt!.publicKeyFingerprint)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">JWKS URL</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg font-mono text-sm text-gray-900 dark:text-white truncate">
                      {agent.auth.pkJwt.jwksUrl}
                    </code>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <button className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600">
                  View Public Key
                </button>
                <button className="px-3 py-2 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900">
                  Rotate Key Pair
                </button>
              </div>
            </div>
          )}
          
          {/* X-402 Configuration */}
          {agent.auth.x402.enabled && (
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-violet-200 dark:border-violet-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">X-402 Payment Protocol</h3>
                </div>
                <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded text-xs font-medium">
                  Enabled
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Wallet Address</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg font-mono text-sm text-gray-900 dark:text-white truncate border border-violet-200 dark:border-violet-800">
                      {agent.auth.x402.walletAddress}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(agent.auth.x402.walletAddress)}
                      className="p-2 hover:bg-violet-100 dark:hover:bg-violet-900/50 rounded-lg"
                    >
                      <Copy className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Network</label>
                    <p className="mt-1 font-medium text-gray-900 dark:text-white capitalize">{agent.auth.x402.network}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Currency</label>
                    <p className="mt-1 font-medium text-gray-900 dark:text-white">USDC</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Public Key</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg font-mono text-sm text-gray-900 dark:text-white truncate border border-violet-200 dark:border-violet-800">
                      {agent.auth.x402.publicKey}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(agent.auth.x402.publicKey)}
                      className="p-2 hover:bg-violet-100 dark:hover:bg-violet-900/50 rounded-lg"
                    >
                      <Copy className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* mTLS Configuration */}
          {agent.auth.mtls?.enabled && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Mutual TLS (mTLS)</h3>
                </div>
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                  Active
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Certificate Fingerprint</label>
                  <code className="block mt-1 px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg font-mono text-sm text-gray-900 dark:text-white">
                    {agent.auth.mtls.certificateFingerprint}
                  </code>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Expires</label>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {new Date(agent.auth.mtls.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <button className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
                  Download Certificate
                </button>
                <button className="px-3 py-2 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium">
                  Renew Certificate
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'verification' && (
        <div className="space-y-6">
          {/* KYA Tier Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">KYA Verification Status</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Know Your Agent verification tier</p>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-lg font-semibold ${
                  agent.kya.tier === 0 ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' :
                  agent.kya.tier === 1 ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
                  agent.kya.tier === 2 ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                  'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                  Tier {agent.kya.tier}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {agent.kya.tier === 0 && 'Sandbox'}
                  {agent.kya.tier === 1 && 'Basic'}
                  {agent.kya.tier === 2 && 'Verified'}
                  {agent.kya.tier === 3 && 'Trusted'}
                </p>
              </div>
            </div>
            
            {/* Tier Benefits */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Transaction Limit</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  ${agent.permissions.maxTransactionAmount.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Daily Limit</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  ${agent.permissions.dailyLimit.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Human Approval</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {agent.permissions.requiresApproval 
                    ? agent.permissions.approvalThreshold > 0 
                      ? `Above $${agent.permissions.approvalThreshold.toLocaleString()}`
                      : 'All transactions'
                    : 'Not required'}
                </p>
              </div>
            </div>
            
            {agent.kya.tier < 3 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">Upgrade to Tier {agent.kya.tier + 1}</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {agent.kya.tier === 0 && 'Link to a verified business and configure OAuth to unlock production access.'}
                      {agent.kya.tier === 1 && 'Complete code attestation and enable anomaly detection for higher limits.'}
                      {agent.kya.tier === 2 && 'Complete security audit and insurance to unlock autonomous operation.'}
                    </p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    Start Upgrade
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Requirements Checklist */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Verification Requirements</h3>
            
            {/* Group by tier */}
            {[1, 2, 3].map(tier => {
              const tierReqs = agent.kya.requirements.filter((r: any) => r.requiredForTier === tier);
              if (tierReqs.length === 0) return null;
              
              return (
                <div key={tier} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      tier === 1 ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
                      tier === 2 ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                      'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
                    }`}>
                      Tier {tier}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {tier === 1 && 'Basic Requirements'}
                      {tier === 2 && 'Verified Requirements'}
                      {tier === 3 && 'Trusted Requirements'}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {tierReqs.map((req: any) => (
                      <div 
                        key={req.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          req.status === 'completed' 
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                            : req.status === 'pending'
                              ? 'bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700'
                              : req.status === 'not_required'
                                ? 'bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 opacity-50'
                                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {req.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
                          {req.status === 'pending' && <Clock className="w-5 h-5 text-gray-400" />}
                          {req.status === 'failed' && <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                          {req.status === 'not_required' && <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />}
                          <div>
                            <p className={`font-medium ${
                              req.status === 'not_required' ? 'text-gray-400' : 'text-gray-900 dark:text-white'
                            }`}>
                              {req.label}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{req.description}</p>
                          </div>
                        </div>
                        
                        {req.status === 'completed' && req.completedAt && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {new Date(req.completedAt).toLocaleDateString()}
                          </span>
                        )}
                        
                        {req.status === 'pending' && tier <= agent.kya.tier + 1 && (
                          <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                            Complete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Verification Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Verification History</h3>
            
            <div className="space-y-4">
              {agent.kya.verifiedAt && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Tier {agent.kya.tier} Verified
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(agent.kya.verifiedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Agent Created</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(agent.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            {agent.kya.expiresAt && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Re-verification required:</strong> {new Date(agent.kya.expiresAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'streams' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Managed Streams</h3>
                <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded text-xs font-medium">
                  Beta
                </span>
              </div>
              {agent.permissions.streams.initiate && (
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Stream
                </button>
              )}
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This agent manages {agent.streamStats.activeStreams} active stream(s) on behalf of {agent.parentAccount.name}.
            </p>
            
            {/* Stream Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-500">Active Streams</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {agent.streamStats.activeStreams}
                  <span className="text-sm font-normal text-gray-400"> / {agent.limits.maxActiveStreams}</span>
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-500">Total Outflow</p>
                <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                  ${agent.streamStats.totalOutflow.toLocaleString()}/mo
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-500">Max Per Stream</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  ${agent.limits.maxFlowRatePerStream.toLocaleString()}/mo
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-500">Outflow Limit</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  ${agent.limits.maxTotalStreamOutflow.toLocaleString()}/mo
                </p>
              </div>
            </div>
            
            {/* Stream Permissions */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Stream Permissions</p>
              <div className="flex flex-wrap gap-2">
                {agent.permissions.streams.initiate && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded text-xs">
                    Create
                  </span>
                )}
                {agent.permissions.streams.modify && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs">
                    Modify
                  </span>
                )}
                {agent.permissions.streams.pause && (
                  <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded text-xs">
                    Pause/Resume
                  </span>
                )}
                {agent.permissions.streams.terminate && (
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-xs">
                    Terminate
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Streams Table or Empty State */}
          {agent.streamStats.activeStreams > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white">Active Streams</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Recipient</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Flow Rate</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Streamed</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">MG</span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">Maria Garcia</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-mono text-gray-900 dark:text-white">$2,000/mo</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-900 dark:text-white">$1,847</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          Streaming
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No Active Streams</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                This agent hasn&apos;t created any streams yet.
              </p>
              {agent.permissions.streams.initiate && (
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                  Create First Stream
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'permissions' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-6">Agent Permissions & Limits</h3>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Transaction Limits */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Transaction Limits</h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-300">Max per Transaction</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${agent.permissions.maxTransactionAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-300">Daily Limit</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${agent.permissions.dailyLimit.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-300">Monthly Limit</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${agent.permissions.monthlyLimit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Approval Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Approval Settings</h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-300">Requires Approval</span>
                  <span className={`font-semibold ${agent.permissions.requiresApproval ? 'text-amber-600' : 'text-green-600'}`}>
                    {agent.permissions.requiresApproval ? 'Yes' : 'No'}
                  </span>
                </div>
                {agent.permissions.requiresApproval && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-300">Approval Threshold</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${agent.permissions.approvalThreshold.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Allowed Currencies */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Allowed Currencies</h4>
              <div className="flex flex-wrap gap-2">
                {agent.permissions.allowedCurrencies.length > 0 ? agent.permissions.allowedCurrencies.map(currency => (
                  <span key={currency} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                    {currency}
                  </span>
                )) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">No currency restrictions</span>
                )}
              </div>
            </div>
            
            {/* Allowed Countries */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Allowed Countries</h4>
              <div className="flex flex-wrap gap-2">
                {agent.permissions.allowedCountries.length > 0 ? agent.permissions.allowedCountries.map(country => (
                  <span key={country} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium">
                    {country}
                  </span>
                )) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">No country restrictions</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
            <button className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
              Edit Permissions
            </button>
          </div>
        </div>
      )}
      
      {activeTab === 'activity' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Recipient</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {activityLog.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                  <td className="px-6 py-4 text-gray-900 dark:text-white">{log.action}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{log.to}</td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">${log.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{log.time}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.status === 'success' 
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                        : log.status === 'pending'
                          ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                          : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {activeTab === 'api' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">API Authentication</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            This agent uses OAuth and other authentication methods configured above. See the Authentication tab for full details.
          </p>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Primary authentication: <span className="font-medium">{agent.auth.methods[0].toUpperCase()}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}