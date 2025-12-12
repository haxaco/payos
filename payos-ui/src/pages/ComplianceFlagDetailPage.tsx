import { useState } from 'react';
import { 
  ChevronRight, AlertTriangle, ArrowRight, Sparkles, Copy, 
  CheckCircle, XCircle, User, Building2
} from 'lucide-react';
import { mockFlags, getCountryFlag } from '../data/mockFlags';
import { Page } from '../App';

interface Props {
  flagId: string;
  onNavigate: (page: Page) => void;
}

export function ComplianceFlagDetailPage({ flagId, onNavigate }: Props) {
  const flag = mockFlags.find(f => f.id === flagId);
  const [notes, setNotes] = useState('');
  const [flagStatus, setFlagStatus] = useState(flag?.status || 'pending_review');
  const [toast, setToast] = useState<string | null>(null);
  
  if (!flag) {
    return (
      <div className="p-8">
        <p className="text-gray-500 dark:text-gray-400">Flag not found</p>
      </div>
    );
  }
  
  const handleAction = (action: string) => {
    switch (action) {
      case 'approve':
        setFlagStatus('approved');
        setToast('Transaction approved');
        break;
      case 'request_docs':
        setFlagStatus('pending_documentation');
        setToast('Documentation requested from account holder');
        break;
      case 'escalate':
        setFlagStatus('escalated');
        setToast('Flag escalated to senior compliance');
        break;
      case 'block':
        setFlagStatus('blocked');
        setToast('Transaction blocked');
        break;
    }
    
    // Auto-dismiss toast
    setTimeout(() => setToast(null), 3000);
  };
  
  const riskColors = {
    high: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      bar: 'bg-red-500'
    },
    medium: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      bar: 'bg-amber-500'
    },
    low: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-700 dark:text-green-300',
      bar: 'bg-green-500'
    }
  };
  
  const colors = riskColors[flag.riskLevel];
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button 
          onClick={() => onNavigate('compliance')}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          Compliance
        </button>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 dark:text-white font-medium">{flag.id}</span>
      </div>
      
      {/* Status Banner */}
      <div className={`${colors.bg} ${colors.border} border rounded-xl p-4`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className={`w-6 h-6 ${colors.text}`} />
          <div>
            <p className={`font-semibold ${colors.text}`}>
              {flag.riskLevel.toUpperCase()} RISK — {flagStatus === 'pending' || flagStatus === 'pending_review' ? 'Pending Review' : flagStatus.replace('_', ' ').toUpperCase()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Flagged {new Date(flag.createdAt).toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
              })}
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column: Transaction/Account Info */}
        <div className="space-y-6">
          {/* Amount Display */}
          {flag.type === 'transaction' && flag.transaction && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-4xl font-bold text-gray-900 dark:text-white">
                ${flag.transaction.amount.toLocaleString()}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 flex-wrap">
                <span className="flex items-center gap-1">
                  {flag.transaction.fromAccountType === 'business' ? (
                    <Building2 className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span className="text-sm">{flag.transaction.fromAccount}</span>
                </span>
                <ArrowRight className="w-4 h-4" />
                <span className="flex items-center gap-1">
                  {flag.transaction.toAccountType === 'business' ? (
                    <Building2 className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span className="text-sm">{flag.transaction.toAccount}</span>
                </span>
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="text-xl">{getCountryFlag(flag.transaction.fromCountry)}</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <span className="text-xl">{getCountryFlag(flag.transaction.toCountry)}</span>
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {new Date(flag.transaction.createdAt).toLocaleString()}
              </p>
            </div>
          )}
          
          {/* Account Display for account flags */}
          {flag.type === 'account' && flag.account && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{flag.account.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {flag.account.type === 'business' ? 'Business' : 'Person'} · {flag.account.country}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Transaction Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              {flag.type === 'transaction' ? 'Transfer Details' : 'Account Details'}
            </h3>
            <dl className="space-y-3 text-sm">
              {flag.type === 'transaction' && flag.transaction && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">From</dt>
                    <dd className="text-gray-900 dark:text-white font-medium">{flag.transaction.fromAccount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Type</dt>
                    <dd className="text-gray-900 dark:text-white">
                      {flag.transaction.fromAccountType === 'business' ? 'Business' : 'Person'} · {flag.transaction.fromCountry}
                    </dd>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">To</dt>
                    <dd className="text-gray-900 dark:text-white font-medium">{flag.transaction.toAccount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Type</dt>
                    <dd className="text-gray-900 dark:text-white">
                      {flag.transaction.toAccountType === 'business' ? 'Business' : 'Person'} · {flag.transaction.toCountry}
                    </dd>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Amount</dt>
                    <dd className="text-gray-900 dark:text-white font-medium">${flag.transaction.amount.toLocaleString()} USDC</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Fee</dt>
                    <dd className="text-gray-900 dark:text-white">${(flag.transaction.amount * 0.001).toFixed(2)} (0.1%)</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Reference</dt>
                    <dd className="font-mono text-xs text-gray-900 dark:text-white">{flag.transactionId}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>
        
        {/* Right Column: AI Analysis (spans 2 columns) */}
        <div className="col-span-2 space-y-6">
          {/* AI Analysis Panel - THE KEY COMPONENT */}
          <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 dark:from-violet-900/20 dark:via-purple-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-violet-200 dark:border-violet-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Analysis</h3>
              </div>
              <button className="text-sm text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1">
                <Copy className="w-4 h-4" />
                Copy
              </button>
            </div>
            
            {/* Why Flagged */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                Why This Was Flagged
              </h4>
              <ul className="space-y-2">
                {flag.aiAnalysis.reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="text-violet-500 mt-0.5">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Risk Assessment */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                Risk Assessment
              </h4>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Risk Score</span>
                  <span className={`font-semibold ${colors.text}`}>
                    {flag.riskLevel.charAt(0).toUpperCase() + flag.riskLevel.slice(1)} Risk ({flag.aiAnalysis.riskScore}%)
                  </span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${colors.bar}`}
                    style={{ width: `${flag.aiAnalysis.riskScore}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  {flag.aiAnalysis.riskExplanation}
                </p>
              </div>
            </div>
            
            {/* Pattern Matches */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                This Pattern Matches
              </h4>
              <div className="space-y-2">
                {flag.aiAnalysis.patternMatches.map((pattern, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-white/50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                    <span className="text-gray-700 dark:text-gray-300">{pattern.description}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{pattern.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Suggested Actions */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                Suggested Actions
              </h4>
              <div className="space-y-2">
                {flag.aiAnalysis.suggestedActions.map((item, i) => (
                  <label key={i} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={item.completed}
                      onChange={() => {}}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500"
                    />
                    <span className={`text-sm ${
                      item.completed 
                        ? 'text-gray-400 dark:text-gray-500 line-through' 
                        : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
                    }`}>
                      {item.action}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          {/* Resolution Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Resolution</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about your decision..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
            <div className="mt-4 flex gap-3">
              <button 
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2 transition-colors"
                onClick={() => handleAction('approve')}
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
              <button 
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
                onClick={() => handleAction('request_docs')}
              >
                Request Docs
              </button>
              <button 
                className="flex-1 px-4 py-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 font-medium transition-colors"
                onClick={() => handleAction('escalate')}
              >
                Escalate
              </button>
              <button 
                className="flex-1 px-4 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 font-medium flex items-center justify-center gap-2 transition-colors"
                onClick={() => handleAction('block')}
              >
                <XCircle className="w-4 h-4" />
                Block
              </button>
            </div>
            {toast && (
              <div className="mt-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium">
                {toast}
              </div>
            )}
          </div>
          
          {/* Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Timeline</h3>
            <div className="space-y-4">
              {flag.timeline.map((event, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                    event.status === 'completed' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">{event.event}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{event.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}