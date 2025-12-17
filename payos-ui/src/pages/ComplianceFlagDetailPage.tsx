import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, AlertTriangle, ArrowRight, Sparkles, Copy, 
  CheckCircle, XCircle, User, Building2, Loader2
} from 'lucide-react';
import { useComplianceFlag, useResolveComplianceFlag } from '../hooks/api';

export function ComplianceFlagDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Fetch flag from API
  const { data: flagData, isLoading, error } = useComplianceFlag(id);
  const resolveFlag = useResolveComplianceFlag();
  
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  
  // Loading state
  if (isLoading) {
    return (
      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <button 
          onClick={() => navigate('/compliance')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          <span className="text-sm font-medium">Back to Compliance</span>
        </button>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    const isAuthError = error.message.includes('Session expired') || error.message.includes('log in') || error.message.includes('401');
    const isNotFound = error.message.includes('not found') || error.message.includes('404');
    
    return (
      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <button 
          onClick={() => navigate('/compliance')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          <span className="text-sm font-medium">Back to Compliance</span>
        </button>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          {isAuthError ? (
            <>
              <p className="text-gray-900 dark:text-white font-semibold text-lg">Session Expired</p>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                Your session has expired. Please refresh the page and log in again to continue.
              </p>
              <button 
                onClick={() => window.location.href = '/login'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </button>
            </>
          ) : isNotFound ? (
            <>
              <p className="text-gray-900 dark:text-white font-semibold text-lg">Flag Not Found</p>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                This compliance flag doesn't exist or you don't have permission to view it.
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-900 dark:text-white font-semibold text-lg">Failed to Load</p>
              <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                {error.message}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }
  
  const flag = flagData?.data;
  
  if (!flag) {
    return (
      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <button 
          onClick={() => navigate('/compliance')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          <span className="text-sm font-medium">Back to Compliance</span>
        </button>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Flag not found</p>
        </div>
      </div>
    );
  }
  
  const handleAction = async (action: 'approved' | 'rejected' | 'escalated' | 'manual_review' | 'no_action') => {
    if (!id) return;
    
    try {
      await resolveFlag.mutateAsync({
        id,
        payload: { action, notes },
      });
      
      const actionLabels = {
        approved: 'Flag approved',
        rejected: 'Flag rejected',
        escalated: 'Flag escalated to senior compliance',
        manual_review: 'Sent for manual review',
        no_action: 'No action taken',
      };
      
      setToast(actionLabels[action]);
      setTimeout(() => setToast(null), 3000);
      
      // Optionally navigate back after a delay
      setTimeout(() => navigate('/compliance'), 1500);
    } catch (error: any) {
      setToast(`Error: ${error.message}`);
      setTimeout(() => setToast(null), 3000);
    }
  };
  
  const riskColors = {
    critical: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      bar: 'bg-red-500'
    },
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
  
  const colors = riskColors[flag.risk_level as keyof typeof riskColors] || riskColors.medium;
  
  // Extract AI analysis data
  const aiAnalysis = flag.ai_analysis || {};
  const riskScore = aiAnalysis.risk_score || 0;
  const riskExplanation = aiAnalysis.risk_explanation || '';
  const patternMatches = aiAnalysis.pattern_matches || [];
  const suggestedActions = aiAnalysis.suggested_actions || [];
  const confidenceLevel = aiAnalysis.confidence_level || 0;
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
      
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button 
          onClick={() => navigate('/compliance')}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          Compliance
        </button>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 dark:text-white font-medium">{flag.id.substring(0, 8)}</span>
      </div>
      
      {/* Status Banner */}
      <div className={`${colors.bg} ${colors.border} border rounded-xl p-4`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className={`w-6 h-6 ${colors.text}`} />
          <div>
            <p className={`font-semibold ${colors.text}`}>
              {flag.risk_level.toUpperCase()} RISK — {flag.status.replace('_', ' ').toUpperCase()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Flagged {new Date(flag.created_at).toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
              })}
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column: Transaction/Account Info */}
        <div className="space-y-6">
          {/* Amount Display for Transaction */}
          {flag.flag_type === 'transaction' && flag.transfer && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center space-y-4">
              <p className="text-4xl font-bold text-gray-900 dark:text-white">
                ${parseFloat(flag.transfer.amount || '0').toLocaleString()}
              </p>
              <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 flex-wrap">
                <button 
                  onClick={() => navigate(`/accounts/${flag.transfer.from_account_id}`)}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <User className="w-4 h-4" />
                  {flag.transfer.from_account_name || 'Unknown'}
                </button>
                <ArrowRight className="w-4 h-4" />
                <button 
                  onClick={() => navigate(`/accounts/${flag.transfer.to_account_id}`)}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <User className="w-4 h-4" />
                  {flag.transfer.to_account_name || 'Unknown'}
                </button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {flag.transfer.currency || 'USDC'} • {new Date(flag.transfer.created_at).toLocaleDateString()}
              </div>
              <button 
                onClick={() => navigate(`/transactions/${flag.transfer_id}`)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View Transaction →
              </button>
            </div>
          )}
          
          {/* Account Display */}
          {flag.flag_type === 'account' && flag.account && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex items-center gap-3">
                {flag.account.type === 'business' ? (
                  <Building2 className="w-8 h-8 text-gray-400" />
                ) : (
                  <User className="w-8 h-8 text-gray-400" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{flag.account.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{flag.account.type} Account</p>
                </div>
              </div>
              <button 
                onClick={() => navigate(`/accounts/${flag.account_id}`)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View Account →
              </button>
            </div>
          )}
          
          {/* Reason Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Flag Details</h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Type</p>
                <p className="text-sm text-gray-900 dark:text-white capitalize">{flag.flag_type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Reason Code</p>
                <p className="text-sm text-gray-900 dark:text-white">{flag.reason_code}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Reasons</p>
                <ul className="list-disc list-inside text-sm text-gray-900 dark:text-white space-y-1 mt-1">
                  {flag.reasons?.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
              {flag.due_date && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Due Date</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(flag.due_date).toLocaleDateString('en-US', { 
                      month: 'short', day: 'numeric', year: 'numeric' 
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Middle Column: AI Analysis */}
        <div className="space-y-6">
          {/* Risk Score */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">AI Risk Assessment</h3>
            </div>
            
            <div className="text-center mb-4">
              <p className="text-5xl font-bold text-gray-900 dark:text-white">{riskScore}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Risk Score</p>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`${colors.bar} h-2 rounded-full transition-all`}
                style={{ width: `${riskScore}%` }}
              />
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
              {riskExplanation}
            </p>
            
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Confidence:</span>
              <span className="font-medium text-gray-900 dark:text-white">{confidenceLevel}%</span>
            </div>
          </div>
          
          {/* Pattern Matches */}
          {patternMatches.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Pattern Matches</h3>
              <div className="space-y-3">
                {patternMatches.map((match: any, idx: number) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-900 dark:text-white">{match.description}</span>
                      <span className="font-medium text-gray-600 dark:text-gray-400">{match.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${match.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Right Column: Actions */}
        <div className="space-y-6">
          {/* Suggested Actions */}
          {suggestedActions.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Suggested Actions</h3>
              <div className="space-y-3">
                {suggestedActions.map((action: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    {action.completed ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${action.completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                      {action.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Description */}
          {flag.description && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{flag.description}</p>
            </div>
          )}
          
          {/* Notes & Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Resolution</h3>
            
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add resolution notes..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm mb-4"
              rows={4}
            />
            
            <div className="space-y-2">
              <button 
                onClick={() => handleAction('approved')}
                disabled={resolveFlag.isLoading}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                Approve
              </button>
              <button 
                onClick={() => handleAction('manual_review')}
                disabled={resolveFlag.isLoading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                Request Manual Review
              </button>
              <button 
                onClick={() => handleAction('escalated')}
                disabled={resolveFlag.isLoading}
                className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                Escalate
              </button>
              <button 
                onClick={() => handleAction('rejected')}
                disabled={resolveFlag.isLoading}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                Reject / Block
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
