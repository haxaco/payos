'use client';

import { useState } from 'react';
import { useApiClient } from '@/lib/api-client';
import { X, Download, Loader2, AlertCircle, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { Button, Input, Label, cn } from '@payos/ui';
import type { ExportFormat, DateFormatType } from '@payos/api-client';

interface ExportModalProps {
  onClose: () => void;
}

const EXPORT_FORMATS: { value: ExportFormat; label: string; description: string }[] = [
  { value: 'payos', label: 'PayOS Full', description: 'All fields, ideal for analysis' },
  { value: 'quickbooks', label: 'QuickBooks', description: 'Compatible with QuickBooks Online' },
  { value: 'quickbooks4', label: 'QuickBooks (4 col)', description: 'Simplified 4-column format' },
  { value: 'xero', label: 'Xero', description: 'Compatible with Xero accounting' },
  { value: 'netsuite', label: 'NetSuite', description: 'Oracle NetSuite format' },
];

const DATE_FORMATS: { value: DateFormatType; label: string; example: string }[] = [
  { value: 'US', label: 'US Format', example: 'MM/DD/YYYY' },
  { value: 'UK', label: 'UK/EU Format', example: 'DD/MM/YYYY' },
];

export function ExportModal({ onClose }: ExportModalProps) {
  const api = useApiClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [format, setFormat] = useState<ExportFormat>('payos');
  const [dateFormat, setDateFormat] = useState<DateFormatType>('US');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [includeRefunds, setIncludeRefunds] = useState(true);
  const [includeStreams, setIncludeStreams] = useState(true);
  const [includeFees, setIncludeFees] = useState(true);

  const handleExport = async () => {
    if (!api) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await api.exports.generate({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        format,
        dateFormat,
        includeRefunds,
        includeStreams,
        includeFees,
      });

      if (result.status === 'ready' && result.downloadUrl) {
        // Download the file
        const blob = await api.exports.download(result.exportId);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payos-export-${format}-${startDate}-${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccess(true);
      } else {
        setError('Export is still processing. Please try again in a moment.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate export');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Export Transactions</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Download for accounting software</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              Export downloaded successfully!
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>

          {/* Format */}
          <div>
            <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
              Export Format
            </Label>
            <div className="space-y-2">
              {EXPORT_FORMATS.map((f) => (
                <label
                  key={f.value}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    format === f.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  <input
                    type="radio"
                    name="format"
                    value={f.value}
                    checked={format === f.value}
                    onChange={() => setFormat(f.value)}
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{f.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{f.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date Format */}
          <div>
            <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
              Date Format
            </Label>
            <div className="flex gap-3">
              {DATE_FORMATS.map((df) => (
                <button
                  key={df.value}
                  type="button"
                  onClick={() => setDateFormat(df.value)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors",
                    dateFormat === df.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                  )}
                >
                  <div>{df.label}</div>
                  <div className="text-xs opacity-70">{df.example}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Include Options */}
          <div>
            <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
              Include
            </Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={includeRefunds}
                  onChange={(e) => setIncludeRefunds(e.target.checked)}
                  className="rounded"
                />
                Refunds
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={includeStreams}
                  onChange={(e) => setIncludeStreams(e.target.checked)}
                  className="rounded"
                />
                Stream transactions
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={includeFees}
                  onChange={(e) => setIncludeFees(e.target.checked)}
                  className="rounded"
                />
                Fee breakdown
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleExport}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

