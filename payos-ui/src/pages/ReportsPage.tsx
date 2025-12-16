import React, { useState } from 'react';
import { 
  FileText, Download, Calendar, Filter, 
  ChevronRight, Clock, CheckCircle, Zap,
  Receipt, Activity, CreditCard, AlertCircle, Loader2, Trash2, X
} from 'lucide-react';
import { useReports, generateReport, downloadReport, deleteReport } from '../hooks/api';

type ReportType = 'transactions' | 'streams' | 'accounts' | 'agents' | 'financial_summary';
type ReportFormat = 'csv' | 'json' | 'pdf';

export function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedType, setSelectedType] = useState<ReportType>('transactions');
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>('csv');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const { data: reportsData, loading, error, refetch } = useReports({ limit: 50 });
  const reports = reportsData?.data || [];

  const reportTypes = [
    {
      id: 'transactions' as ReportType,
      name: 'Transaction History',
      description: 'All transactions with full details',
      icon: CreditCard,
      frequency: 'On-demand',
    },
    {
      id: 'streams' as ReportType,
      name: 'Stream Activity',
      description: 'Streaming payments summary and details',
      icon: Zap,
      frequency: 'On-demand',
    },
    {
      id: 'accounts' as ReportType,
      name: 'Accounts Report',
      description: 'All accounts with balances and statuses',
      icon: FileText,
      frequency: 'On-demand',
    },
    {
      id: 'agents' as ReportType,
      name: 'Agents Report',
      description: 'AI agents activity and limits',
      icon: Activity,
      frequency: 'On-demand',
    },
    {
      id: 'financial_summary' as ReportType,
      name: 'Financial Summary',
      description: 'Comprehensive financial overview',
      icon: Receipt,
      frequency: 'On-demand',
    },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      await generateReport({
        type: selectedType,
        format: selectedFormat,
        dateRange: {
          from: dateRange.start,
          to: dateRange.end,
        },
      });
      setShowGenerateModal(false);
      await refetch();
    } catch (error: any) {
      setGenerationError(error.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      await deleteReport(id);
      await refetch();
    } catch (error: any) {
      alert(`Failed to delete report: ${error.message}`);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Generate and export financial reports, statements, and activity logs
          </p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      {/* Report Types Grid */}
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Report Types</h2>
        <div className="grid grid-cols-3 gap-4">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const recentCount = reports.filter(r => r.type === report.id).length;
            return (
              <button
                key={report.id}
                onClick={() => {
                  setSelectedType(report.id);
                  setShowGenerateModal(true);
                }}
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
                  <span className="text-gray-500">{recentCount} generated</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Recent Reports</h2>
          {loading && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Failed to load reports</h3>
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

        {!loading && !error && reports.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">No reports generated yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Generate your first report to get started
            </p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Generate Report
            </button>
          </div>
        )}

        {!loading && !error && reports.length > 0 && (
          <div className="space-y-3">
            {reports.map((report) => {
              const reportType = reportTypes.find(rt => rt.id === report.type);
              const Icon = reportType?.icon || FileText;
              const isReady = report.status === 'ready';
              const isExpired = report.expiresAt && new Date(report.expiresAt) < new Date();

              return (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isReady && !isExpired
                        ? 'bg-green-100 dark:bg-green-900/50'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {isReady && !isExpired ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{report.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {reportType?.name} • {report.format.toUpperCase()} • {report.rowCount || 0} rows
                        {report.dateRange && ` • ${report.dateRange.from} to ${report.dateRange.to}`}
                      </p>
                      {isExpired && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">Expired</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isReady && !isExpired && (
                      <button
                        onClick={() => downloadReport(report.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                      title="Delete report"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Generate Report</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generationError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{generationError}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Report Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as ReportType)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                >
                  {reportTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Format
                </label>
                <div className="flex gap-2">
                  {(['csv', 'json', 'pdf'] as ReportFormat[]).map((format) => (
                    <button
                      key={format}
                      onClick={() => setSelectedFormat(format)}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedFormat === format
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  disabled={isGenerating}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
