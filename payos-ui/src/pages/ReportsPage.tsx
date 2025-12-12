import { useState } from 'react';
import { 
  FileText, Download, Calendar, Filter, 
  ChevronRight, Clock, CheckCircle, Zap,
  Receipt, Activity, CreditCard
} from 'lucide-react';

export function ReportsPage() {
  const [dateRange, setDateRange] = useState({ start: '2025-12-01', end: '2025-12-31' });
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const reportTypes = [
    {
      id: 'monthly_statement',
      name: 'Monthly Statements',
      description: 'Account summaries with all activity',
      icon: FileText,
      frequency: 'Monthly',
      lastGenerated: 'Dec 1, 2025'
    },
    {
      id: 'transaction_history',
      name: 'Transaction History',
      description: 'All transactions with full details',
      icon: CreditCard,
      frequency: 'On-demand',
      lastGenerated: 'Dec 10, 2025'
    },
    {
      id: 'stream_activity',
      name: 'Stream Activity',
      description: 'Streaming payments summary and details',
      icon: Zap,
      frequency: 'On-demand',
      lastGenerated: 'Dec 10, 2025'
    },
    {
      id: 'withdrawal_history',
      name: 'Withdrawal History',
      description: 'All withdrawals from streams',
      icon: Download,
      frequency: 'On-demand',
      lastGenerated: 'Dec 8, 2025'
    },
    {
      id: 'x402_usage',
      name: 'X-402 Usage Report',
      description: 'API micropayment breakdown by endpoint',
      icon: Activity,
      frequency: 'Daily',
      lastGenerated: 'Dec 10, 2025'
    },
    {
      id: 'activity_logs',
      name: 'Activity Logs',
      description: 'Raw event logs for audit and compliance',
      icon: Clock,
      frequency: 'On-demand',
      lastGenerated: 'Dec 10, 2025'
    }
  ];

  const recentStatements = [
    { period: 'November 2025', accounts: 156, generated: 'Dec 1, 2025', status: 'ready' },
    { period: 'October 2025', accounts: 152, generated: 'Nov 1, 2025', status: 'ready' },
    { period: 'September 2025', accounts: 148, generated: 'Oct 1, 2025', status: 'ready' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Generate and export financial reports, statements, and activity logs
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export All
        </button>
      </div>

      {/* Quick Export */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Export</h2>
        
        <div className="flex items-end gap-4">
          {/* Date Range */}
          <div className="flex-1">
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Date Range</label>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              />
              <span className="text-gray-400">to</span>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          {/* Report Type */}
          <div className="flex-1">
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Report Type</label>
            <select className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white">
              <option>All Activity</option>
              <option>Transactions Only</option>
              <option>Streams Only</option>
              <option>X-402 Only</option>
            </select>
          </div>
          
          {/* Format */}
          <div>
            <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Format</label>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg font-medium">
                PDF
              </button>
              <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium">
                CSV
              </button>
              <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium">
                JSON
              </button>
            </div>
          </div>
          
          {/* Export Button */}
          <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
            Generate
          </button>
        </div>
      </div>

      {/* Report Types Grid */}
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Report Types</h2>
        <div className="grid grid-cols-3 gap-4">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-left hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">{report.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{report.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{report.frequency}</span>
                  <span className="text-gray-500">Last: {report.lastGenerated}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Monthly Statements */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Monthly Statements</h2>
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View All
          </button>
        </div>
        
        <div className="space-y-3">
          {recentStatements.map((statement, i) => (
            <div 
              key={i}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{statement.period}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {statement.accounts} accounts • Generated {statement.generated}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200">
                  PDF
                </button>
                <button className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200">
                  CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
