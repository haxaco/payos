import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Download, ChevronDown, FileText, Loader2, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';
import { useTransfers } from '../hooks/api';

export function TransactionsPage() {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  
  // Fetch transfers from API
  const { data, loading, error, refetch } = useTransfers({ 
    limit: 100,
  });
  
  const transfers = data?.transfers || [];

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">Transactions</h1>
          <p className="text-gray-600 dark:text-gray-400">View all money movement</p>
        </div>
        
        {/* Export Dropdown */}
        <div className="relative inline-block text-left">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
            <ChevronDown className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 border border-gray-200 dark:border-gray-700 focus:outline-none">
              <div className="py-1" role="menu">
                <button
                  onClick={() => {setShowMenu(false); alert('Exporting as PDF...');}}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export as PDF
                </button>
                <button
                  onClick={() => {setShowMenu(false); alert('Exporting as CSV...');}}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export as CSV
                </button>
                <button
                  onClick={() => {setShowMenu(false); alert('Exporting as JSON...');}}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export as JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Failed to load transfers</h3>
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

      {/* AI-Powered Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder='Search transactions... Try "Show me all transfers over $5k to Argentina this week"'
          className="w-full pl-12 pr-4 py-3.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">From → To</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Amount / Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-4">
                    <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </td>
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                  <td className="px-4 py-4">
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                    <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded ml-auto mb-2"></div>
                    <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded ml-auto"></div>
                  </td>
                </tr>
              ))
            ) : transfers.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <ArrowLeftRight className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium">No transfers found</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Transfers will appear here once they are created.
                  </p>
                </td>
              </tr>
            ) : (
              transfers.map((transfer) => (
                <tr
                  key={transfer.id}
                  onClick={() => navigate(`/transactions/${transfer.id}`)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="px-4 py-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-mono">
                      {transfer.id.substring(0, 8)}...
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(transfer.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-white capitalize">
                    {transfer.type.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {transfer.from_account_name || 'Unknown'} → {transfer.to_account_name || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {transfer.currency}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white font-mono mb-1">
                      ${transfer.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div>
                      {transfer.status === 'completed' && (
                        <span className="text-xs text-green-600 dark:text-green-400">✓ Done</span>
                      )}
                      {transfer.status === 'pending' && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">⏳ Pending</span>
                      )}
                      {transfer.status === 'processing' && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">⚡ Processing</span>
                      )}
                      {transfer.status === 'failed' && (
                        <span className="text-xs text-red-600 dark:text-red-400">✗ Failed</span>
                      )}
                      {transfer.status === 'cancelled' && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">⊘ Cancelled</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* AI Insight */}
      {!loading && transfers.length > 0 && (
        <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <strong>AI:</strong> Found {transfers.length} transaction{transfers.length !== 1 ? 's' : ''}. 
              {' '}{transfers.filter(t => t.status === 'pending').length} pending.
              {' '}{transfers.filter(t => t.amount > 5000).length} high-value (&gt;$5K).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}