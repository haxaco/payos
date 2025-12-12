import { Page } from '../App';
import { Search, Sparkles, Download, ChevronDown, FileText } from 'lucide-react';
import { useState } from 'react';

interface TransactionsPageProps {
  onNavigate: (page: Page) => void;
}

const transactions = [
  { id: 'txn_4a5b', time: 'Dec 5 14:32', type: 'Transfer', from: 'TechCorp', to: 'M. Garcia', corridor: '🇺🇸 → 🇦🇷', amount: '$4,800', status: 'completed' },
  { id: 'txn_3c4d', time: 'Dec 5 14:28', type: 'Card', from: 'C. Martinez', to: 'Amazon', corridor: '🇨🇴', amount: '$127.50', status: 'completed' },
  { id: 'txn_2e3f', time: 'Dec 5 14:15', type: 'Deposit', from: 'Acme Inc', to: '', corridor: '🇺🇸 ACH', amount: '$10,000', status: 'pending' },
  { id: 'txn_1a2b', time: 'Dec 5 13:58', type: 'Transfer', from: 'StartupXYZ', to: 'J. Perez', corridor: '🇺🇸 → 🇲🇽', amount: '$2,200', status: 'flagged' },
];

export function TransactionsPage({ onNavigate }: TransactionsPageProps) {
  const [showMenu, setShowMenu] = useState(false);

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
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                onClick={() => tx.status === 'flagged' && onNavigate('transaction-detail')}
                className={`${tx.status === 'flagged' ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''} transition-colors`}
              >
                <td className="px-4 py-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-mono">{tx.id}</div>
                  <div className="text-xs text-gray-400">{tx.time}</div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900 dark:text-white">{tx.type}</td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900 dark:text-white">{tx.from} {tx.to && `→ ${tx.to}`}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{tx.corridor}</div>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white font-mono mb-1">{tx.amount}</div>
                  <div>
                    {tx.status === 'completed' && <span className="text-xs text-green-600 dark:text-green-400">✓ Done</span>}
                    {tx.status === 'pending' && <span className="text-xs text-amber-600 dark:text-amber-400">⏳ Pending</span>}
                    {tx.status === 'flagged' && <span className="text-xs text-red-600 dark:text-red-400">🚩 Flagged</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI Insight */}
      <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <strong>AI:</strong> Found 847 transactions. 3 flagged for review. 23 high-value transfers (&gt;$5K) this week.
          </div>
        </div>
      </div>
    </div>
  );
}