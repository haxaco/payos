import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, Search, CheckCircle, XCircle, AlertTriangle, Loader2, 
  RefreshCw, Filter, ChevronDown, Wallet, Bot, Zap, Shield,
  ExternalLink, FileText, ChevronRight, ArrowUpRight,
  ShoppingCart, Globe, DollarSign
} from 'lucide-react';
import { 
  useApprovals, 
  usePendingApprovalsSummary, 
  useApprovalActions,
  type Approval,
  type ApprovalStatus,
  type PaymentProtocol
} from '../hooks/api';

// Protocol configurations
const protocolConfig: Record<PaymentProtocol, { icon: typeof Zap; label: string; color: string; bg: string }> = {
  x402: { icon: Zap, label: 'x402', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/50' },
  ap2: { icon: Bot, label: 'AP2', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/50' },
  acp: { icon: ShoppingCart, label: 'ACP', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/50' },
  ucp: { icon: Globe, label: 'UCP', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/50' },
};

// Status configurations
const statusConfig: Record<ApprovalStatus, { icon: typeof Clock; label: string; color: string; bg: string }> = {
  pending: { icon: Clock, label: 'Pending', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/50' },
  approved: { icon: CheckCircle, label: 'Approved', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/50' },
  rejected: { icon: XCircle, label: 'Rejected', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/50' },
  expired: { icon: AlertTriangle, label: 'Expired', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' },
  executed: { icon: CheckCircle, label: 'Executed', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/50' },
};

// Currency formatting
const formatCurrency = (amount: number, currency: string = 'USDC') => {
  if (currency === 'USDC' || currency === 'EURC') {
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

// Time formatting
const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const formatExpiresIn = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  
  if (diffMs < 0) return 'Expired';
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffMins < 60) return `${diffMins}m left`;
  if (diffHours < 24) return `${diffHours}h left`;
  return `${Math.floor(diffHours / 24)}d left`;
};

// Approval Card Component
function ApprovalCard({ 
  approval, 
  onApprove, 
  onReject,
  isActioning 
}: { 
  approval: Approval; 
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isActioning: boolean;
}) {
  const protocol = protocolConfig[approval.protocol];
  const status = statusConfig[approval.status];
  const ProtocolIcon = protocol.icon;
  const StatusIcon = status.icon;
  const isPending = approval.status === 'pending';
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border ${
      isPending 
        ? 'border-amber-200 dark:border-amber-800 shadow-amber-50 dark:shadow-none' 
        : 'border-gray-200 dark:border-gray-700'
    } p-5 transition-all`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${protocol.bg} flex items-center justify-center`}>
            <ProtocolIcon className={`w-5 h-5 ${protocol.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(approval.amount, approval.currency)}
              </h3>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${protocol.bg} ${protocol.color}`}>
                {protocol.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {approval.recipient?.vendor || approval.recipient?.merchant || approval.recipient?.name || 'Unknown recipient'}
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${status.bg}`}>
          <StatusIcon className={`w-3 h-3 ${status.color}`} />
          <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
        </div>
      </div>
      
      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Requested</span>
          <span className="text-gray-700 dark:text-gray-300">{formatTimeAgo(approval.createdAt)}</span>
        </div>
        {approval.requestedBy?.name && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">By</span>
            <span className="text-gray-700 dark:text-gray-300">{approval.requestedBy.name}</span>
          </div>
        )}
        {isPending && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Expires</span>
            <span className={`font-medium ${
              new Date(approval.expiresAt).getTime() - Date.now() < 3600000 
                ? 'text-amber-600' 
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {formatExpiresIn(approval.expiresAt)}
            </span>
          </div>
        )}
        {approval.decidedBy && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Decided by</span>
            <span className="text-gray-700 dark:text-gray-300">{approval.decidedBy}</span>
          </div>
        )}
        {approval.decisionReason && (
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Reason</span>
            <span className="text-gray-700 dark:text-gray-300 text-right max-w-[200px] truncate">
              {approval.decisionReason}
            </span>
          </div>
        )}
      </div>
      
      {/* Actions */}
      {isPending && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onApprove(approval.id)}
            disabled={isActioning}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {isActioning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Approve
              </>
            )}
          </button>
          <button
            onClick={() => onReject(approval.id)}
            disabled={isActioning}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
          >
            {isActioning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Reject
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Executed link */}
      {approval.executedTransferId && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <a 
            href={`/transactions/${approval.executedTransferId}`}
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
          >
            View transfer
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}

export function ApprovalsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('pending');
  const [protocolFilter, setProtocolFilter] = useState<PaymentProtocol | 'all'>('all');
  const [actioningId, setActioningId] = useState<string | null>(null);
  
  // Fetch approvals
  const filters = useMemo(() => ({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    protocol: protocolFilter !== 'all' ? protocolFilter : undefined,
    limit: 50,
  }), [statusFilter, protocolFilter]);
  
  const { data, loading, error, refetch } = useApprovals(filters);
  const { data: summaryData } = usePendingApprovalsSummary();
  const { approve, reject } = useApprovalActions();
  
  const approvals = data?.data || [];
  const summary = summaryData?.data;
  
  // Handle approve/reject
  const handleApprove = useCallback(async (id: string) => {
    setActioningId(id);
    try {
      await approve(id);
      refetch();
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setActioningId(null);
    }
  }, [approve, refetch]);
  
  const handleReject = useCallback(async (id: string) => {
    setActioningId(id);
    try {
      await reject(id);
      refetch();
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setActioningId(null);
    }
  }, [reject, refetch]);
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-7 h-7 text-amber-500" />
            Payment Approvals
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Review and approve agent payment requests that exceed spending thresholds
          </p>
        </div>
        <button 
          onClick={() => navigate('/agent-wallets')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Wallet className="w-4 h-4" />
          Manage Wallets
        </button>
      </div>
      
      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Failed to load approvals</h3>
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
      
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-5 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-10 h-10 text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full font-medium">
                Pending Review
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {summary.count}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total pending: {formatCurrency(summary.totalAmount)}
            </div>
          </div>
          
          {Object.entries(summary.byProtocol || {}).slice(0, 3).map(([protocol, data]) => {
            const config = protocolConfig[protocol as PaymentProtocol];
            const Icon = config?.icon || Zap;
            return (
              <div 
                key={protocol}
                className={`bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700`}
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`w-6 h-6 ${config?.color || 'text-gray-500'}`} />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config?.bg || 'bg-gray-100'} ${config?.color || 'text-gray-500'}`}>
                    {protocol.toUpperCase()}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(data as { count: number; totalAmount: number }).count}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formatCurrency((data as { count: number; totalAmount: number }).totalAmount)}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
          {(['all', 'pending', 'approved', 'rejected', 'expired'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
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
        
        <select
          value={protocolFilter}
          onChange={(e) => setProtocolFilter(e.target.value as typeof protocolFilter)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">All Protocols</option>
          <option value="x402">x402</option>
          <option value="ap2">AP2</option>
          <option value="acp">ACP</option>
          <option value="ucp">UCP</option>
        </select>
        
        <div className="flex-1" />
        
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
      {!loading && approvals.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {statusFilter === 'pending' ? 'No pending approvals' : 'No approvals found'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {statusFilter === 'pending' 
              ? 'All caught up! No payments require your approval right now.'
              : 'Try adjusting your filters'}
          </p>
        </div>
      )}
      
      {/* Approvals Grid */}
      {!loading && approvals.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={handleApprove}
              onReject={handleReject}
              isActioning={actioningId === approval.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ApprovalsPage;
