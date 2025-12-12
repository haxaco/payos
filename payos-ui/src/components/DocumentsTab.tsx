import { Download, FileText, Receipt, Zap } from 'lucide-react';
import { Account } from '../types/account';

interface Props {
  account: Account;
}

export function DocumentsTab({ account }: Props) {
  return (
    <div className="space-y-6">
      {/* Export Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Generate Report</h3>
        
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Date Range</label>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                defaultValue="2025-12-01"
                className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
              />
              <span className="text-gray-400">to</span>
              <input 
                type="date" 
                defaultValue="2025-12-31"
                className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Report Type</label>
            <select className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
              <option>Full Statement</option>
              <option>Transactions Only</option>
              <option>Streams Only</option>
              <option>Activity Log</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Format</label>
            <select className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
              <option>PDF</option>
              <option>CSV</option>
              <option>JSON</option>
            </select>
          </div>
          
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Generate
          </button>
        </div>
      </div>
      
      {/* Monthly Statements */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Monthly Statements</h3>
        
        <div className="space-y-3">
          {[
            { period: 'November 2025', transactions: 23, streams: 1, total: '$4,847.52' },
            { period: 'October 2025', transactions: 19, streams: 1, total: '$3,200.00' },
            { period: 'September 2025', transactions: 21, streams: 1, total: '$3,450.00' },
          ].map((statement, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{statement.period}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {statement.transactions} transactions • {statement.streams} stream • {statement.total}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                  PDF
                </button>
                <button className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                  CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Stream Documents (if account has streams) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Stream Documents</h3>
          <Zap className="w-4 h-4 text-green-500" />
        </div>
        
        <div className="space-y-3">
          {[
            { type: 'Streaming Statement', period: 'Dec 1-10, 2025', stream: account.type === 'business' ? 'Outgoing Streams' : 'TechCorp Salary', amount: '$647.52' },
            { type: 'Withdrawal Receipt', date: 'Nov 30, 2025', stream: account.type === 'business' ? 'Stream Funding' : 'TechCorp Salary', amount: '$1,200.00' },
            { type: 'Stream Started', date: 'Dec 1, 2025', stream: account.type === 'business' ? 'To Contractors' : 'TechCorp Salary', amount: '$2,000/mo' },
          ].map((doc, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  {doc.type === 'Withdrawal Receipt' ? (
                    <Receipt className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{doc.type}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {'period' in doc ? doc.period : doc.date} • {doc.stream} • {doc.amount}
                  </p>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-400">
                <Download className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Activity Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Activity Logs</h3>
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            <Download className="w-4 h-4" />
            Export Logs
          </button>
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Raw event logs for audit and compliance purposes.
        </p>
        
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
            Last 7 Days
          </button>
          <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
            Last 30 Days
          </button>
          <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
            Custom Range
          </button>
        </div>
      </div>
    </div>
  );
}
