'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { 
  FileText, 
  Plus, 
  Download, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Table2,
  Braces,
  FileDown,
  X,
  Loader2,
  BarChart3,
  Users,
  Bot,
  ArrowLeftRight,
  Activity,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@payos/ui';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface Report {
  id: string;
  name: string;
  type: string;
  format?: string;
  status: string;
  rowCount?: number;
  summary?: Record<string, any>;
  dateRange?: { from: string; to: string };
  generatedAt?: string;
  expiresAt?: string;
  downloadUrl?: string;
  createdAt: string;
}

const reportTypes = [
  { value: 'transactions', label: 'Transactions', icon: ArrowLeftRight, description: 'All transfers and payments' },
  { value: 'streams', label: 'Streams', icon: Activity, description: 'Money streaming data' },
  { value: 'accounts', label: 'Accounts', icon: Users, description: 'Account balances and status' },
  { value: 'agents', label: 'Agents', icon: Bot, description: 'Agent activity and limits' },
  { value: 'financial_summary', label: 'Financial Summary', icon: BarChart3, description: 'Overview of all financials' },
];

const formatOptions = [
  { value: 'csv', label: 'CSV', icon: Table2, description: 'Spreadsheet format' },
  { value: 'json', label: 'JSON', icon: Braces, description: 'Machine-readable' },
  { value: 'pdf', label: 'PDF', icon: FileDown, description: 'Print-ready document' },
];

export default function ReportsPage() {
  const api = useApiClient();
  const { isConfigured } = useApiConfig();
  const queryClient = useQueryClient();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Form state
  const [reportType, setReportType] = useState('transactions');
  const [reportFormat, setReportFormat] = useState('csv');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch total count
  const { data: countData } = useQuery({
    queryKey: ['reports', 'count'],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.reports.list({ limit: 1 });
    },
    enabled: !!api && isConfigured,
    staleTime: 60 * 1000,
  });

  // Initialize pagination
  const pagination = usePagination({
    totalItems: countData?.pagination?.total || 0,
    initialPageSize: 50,
  });

  // Fetch reports for current page
  const { data: reportsData, isLoading: loading } = useQuery({
    queryKey: ['reports', 'page', pagination.page, pagination.pageSize],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.reports.list({
        page: pagination.page,
        limit: pagination.pageSize,
      });
    },
    enabled: !!api && isConfigured && pagination.totalItems > 0,
    staleTime: 30 * 1000,
  });

  const reports = reportsData?.data || [];

  async function handleGenerateReport() {
    if (!api) return;
    
    setGenerating(true);
    try {
      const input: any = {
        type: reportType,
        format: reportFormat,
      };
      
      if (dateFrom && dateTo) {
        input.dateRange = { from: dateFrom, to: dateTo };
      }
      
      const result = await api.reports.create(input);
      toast.success(`Report generated successfully!`);
      setShowGenerateModal(false);
      // Invalidate reports queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      toast.error(error.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(report: Report) {
    if (!api || !report.downloadUrl) return;
    
    try {
      const data = await api.reports.download(report.id);
      
      let content: string;
      let mimeType: string;
      
      if (report.format === 'csv') {
        // For CSV, the API returns raw CSV text or we need to convert
        if (typeof data === 'string') {
          content = data;
        } else if (Array.isArray(data)) {
          // Convert array to CSV
          const rows = data as any[];
          if (rows.length === 0) {
            content = '';
          } else {
            const headers = Object.keys(rows[0]);
            const csvLines = [
              headers.join(','),
              ...rows.map(row => 
                headers.map(h => {
                  const val = row[h];
                  if (val === null || val === undefined) return '';
                  if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                    return `"${val.replace(/"/g, '""')}"`;
                  }
                  return String(val);
                }).join(',')
              ),
            ];
            content = csvLines.join('\n');
          }
        } else {
          content = JSON.stringify(data, null, 2);
        }
        mimeType = 'text/csv';
      } else {
        // JSON format
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
      }
      
      // Create download link
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name}.${report.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Report downloaded!');
    } catch (error: any) {
      console.error('Failed to download report:', error);
      toast.error(error.message || 'Failed to download report');
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'generating': return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    const reportType = reportTypes.find(t => t.value === type);
    const Icon = reportType?.icon || FileText;
    return <Icon className="h-5 w-5" />;
  };

  const formatSummary = (summary: Record<string, any> | undefined) => {
    if (!summary) return null;
    
    const highlights = [];
    if (summary.totalTransactions !== undefined) highlights.push(`${summary.totalTransactions} transactions`);
    if (summary.totalStreams !== undefined) highlights.push(`${summary.totalStreams} streams`);
    if (summary.totalAccounts !== undefined) highlights.push(`${summary.totalAccounts} accounts`);
    if (summary.totalAgents !== undefined) highlights.push(`${summary.totalAgents} agents`);
    if (summary.totalBalance !== undefined) highlights.push(`$${summary.totalBalance.toLocaleString()} total`);
    if (summary.totalAmount !== undefined) highlights.push(`$${summary.totalAmount.toLocaleString()} volume`);
    
    return highlights.slice(0, 2).join(' • ');
  };

  if (!isConfigured) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configure API Key</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Please configure your API key to view reports.
          </p>
          <Link
            href="/dashboard/api-keys"
            className="inline-flex mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Configure API Key
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reports</h1>
          <p className="text-gray-600 dark:text-gray-400">Generate and download reports</p>
        </div>
        <button 
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Generate Report
        </button>
      </div>

      {/* Quick Export Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Export</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => {
                  setReportType(type.value);
                  setShowGenerateModal(true);
                }}
                className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-lg transition-all hover:border-blue-500 dark:hover:border-blue-500 text-left"
              >
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white">{type.label}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{type.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generated Reports */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generated Reports</h2>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-pulse">
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded-xl mb-4"></div>
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
                <div className="h-3 w-48 bg-gray-200 dark:bg-gray-800 rounded"></div>
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No reports found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">
              Generate your first report to get started
            </p>
            <button 
              onClick={() => setShowGenerateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Generate Report
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                    {getTypeIcon(report.type)}
                  </div>
                  {getStatusIcon(report.status)}
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate" title={report.name}>
                  {report.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 capitalize">
                  {report.type?.replace('_', ' ')} • {report.format?.toUpperCase()}
                </p>
                
                {report.summary && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    {formatSummary(report.summary)}
                  </p>
                )}
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : new Date(report.createdAt).toLocaleDateString()}
                  </span>
                  {report.status === 'ready' && (
                    <button 
                      onClick={() => handleDownload(report)}
                      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm hover:underline"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && reports.length > 0 && (
          <PaginationControls
            pagination={pagination}
            className="mt-6"
          />
        )}
      </div>

      {/* Generate Report Modal */}
      <Dialog open={showGenerateModal} onOpenChange={setShowGenerateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
            <DialogDescription>
              Choose the type of report and format you want to generate.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Report Type */}
            <div className="grid gap-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Format */}
            <div className="grid gap-2">
              <Label>Format</Label>
              <div className="grid grid-cols-3 gap-3">
                {formatOptions.map((format) => {
                  const Icon = format.icon;
                  return (
                    <button
                      key={format.value}
                      onClick={() => setReportFormat(format.value)}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        reportFormat === format.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mx-auto mb-1 ${
                        reportFormat === format.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
                      }`} />
                      <div className={`text-xs font-medium ${
                        reportFormat === format.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {format.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range (optional)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="From"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="To"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateReport} disabled={generating}>
              {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
