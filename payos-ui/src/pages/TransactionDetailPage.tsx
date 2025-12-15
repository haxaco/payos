import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Copy, AlertTriangle, CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react';
import { useTransfer } from '../hooks/api';

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Fetch transfer from API
  const { data: transfer, loading, error } = useTransfer(id);

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <button 
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Transactions</span>
        </button>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <button 
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Transactions</span>
        </button>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          <p className="text-gray-500 dark:text-gray-400">Failed to load transfer</p>
          <p className="text-sm text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <button 
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Transactions</span>
        </button>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Transaction not found</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <button 
        onClick={() => navigate('/transactions')}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Transactions / {id}</span>
      </button>

      {/* Status Banner */}
      {transfer.status === 'pending' && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg px-6 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">⏳ PENDING — Awaiting Processing</span>
          </div>
        </div>
      )}
      {transfer.status === 'failed' && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-6 py-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-sm font-semibold text-red-900 dark:text-red-200">✗ FAILED — Transfer did not complete</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - AI Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transaction Flow */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              ${transfer.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">{transfer.from_account_name || 'Unknown'}</div>
              <div className="text-2xl">↓</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{transfer.to_account_name || 'Unknown'}</div>
              <div className="text-lg mt-3 capitalize">{transfer.type.replace('_', ' ')}</div>
              <div className="text-xs text-gray-500">
                {new Date(transfer.created_at).toLocaleString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          {/* THE WOW - AI Analysis */}
          <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-blue-50 dark:from-violet-950/30 dark:via-purple-950/30 dark:to-blue-950/30 border-2 border-violet-300 dark:border-violet-900 rounded-2xl p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">✨ AI Analysis</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Powered by PayOS Compliance Copilot</p>
              </div>
            </div>

            {/* Why Flagged */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-xl p-6 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                WHY THIS WAS FLAGGED:
              </h3>
              <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex gap-3">
                  <span className="text-red-500 font-bold">•</span>
                  <span>First transaction between these accounts</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Recipient (Juan Perez) has Tier 1 KYC only</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Sender velocity unusual: 5 new recipients in 48 hours</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-500 font-bold">•</span>
                  <span>Amount just below $2,500 monitoring threshold</span>
                </li>
              </ul>
            </div>

            {/* Risk Score */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-xl p-6 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">RISK ASSESSMENT</h3>
                <span className="text-3xl font-bold text-red-600 dark:text-red-400">62%</span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: '62%' }}></div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>This pattern matches:</strong> 45% legitimate first-time contractor payments, 12% structuring attempts in similar corridors
              </p>
            </div>

            {/* Suggested Actions */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">SUGGESTED ACTIONS:</h3>
              
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-lg p-4 flex gap-3">
                <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">1</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">✓ Verify sender-recipient relationship (contract/invoice)</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Recommended first step</p>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-lg p-4 flex gap-3">
                <div className="w-7 h-7 bg-amber-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">2</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">Request recipient KYC upgrade to Tier 2</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Increases trust level</p>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded-lg p-4 flex gap-3">
                <div className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">3</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">Review sender's recent recipient additions</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Check for patterns</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Details */}
        <div className="space-y-6">
          {/* Transaction Details */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Transaction Details</h3>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">From</div>
                <div className="font-semibold text-gray-900 dark:text-white">{transfer.from_account_name || 'Unknown'}</div>
                <div className="text-xs text-gray-500">{transfer.currency}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">To</div>
                <div className="font-semibold text-gray-900 dark:text-white">{transfer.to_account_name || 'Unknown'}</div>
                <div className="text-xs text-gray-500">{transfer.currency}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
                <div className="font-semibold text-gray-900 dark:text-white capitalize">
                  {transfer.status === 'completed' && <span className="text-green-600 dark:text-green-400">✓ Completed</span>}
                  {transfer.status === 'pending' && <span className="text-amber-600 dark:text-amber-400">⏳ Pending</span>}
                  {transfer.status === 'processing' && <span className="text-blue-600 dark:text-blue-400">⚡ Processing</span>}
                  {transfer.status === 'failed' && <span className="text-red-600 dark:text-red-400">✗ Failed</span>}
                  {transfer.status === 'cancelled' && <span className="text-gray-600 dark:text-gray-400">⊘ Cancelled</span>}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reference ID</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-gray-900 dark:text-white break-all">{transfer.id}</code>
                  <button className="p-1"><Copy className="w-3 h-3 text-gray-400" /></button>
                </div>
              </div>
              {transfer.description && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</div>
                  <div className="text-sm text-gray-900 dark:text-white">{transfer.description}</div>
                </div>
              )}
            </div>
          </div>

          {/* Resolution */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resolution</h3>
            <textarea
              placeholder="Add notes..."
              rows={4}
              className="w-full px-3 py-2 mb-3 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="space-y-2">
              <button className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
              <button className="w-full px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 rounded-lg transition-colors flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                Request Docs
              </button>
              <button className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" />
                Block
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
