'use client';

import { useState, useEffect } from 'react';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { FileText, Plus, Search, Download, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import type { Report } from '@payos/api-client';

export default function ReportsPage() {
  const api = useApiClient();
  const { isConfigured } = useApiConfig();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      if (!api) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.reports.list({ limit: 50 });
        setReports(response.data || []);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, [api]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'generating': return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
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
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Generate Report
        </button>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 animate-pulse">
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded-xl mb-4"></div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
              <div className="h-3 w-48 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </div>
          ))
        ) : reports.length === 0 ? (
          <div className="col-span-full p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No reports found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Generate your first report to get started
            </p>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                {getStatusIcon(report.status)}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{report.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 capitalize">{report.type.replace('_', ' ')}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(report.createdAt).toLocaleDateString()}
                </span>
                {report.status === 'ready' && (
                  <button className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-sm hover:underline">
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

