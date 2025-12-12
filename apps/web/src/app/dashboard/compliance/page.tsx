'use client';

import { Shield, AlertTriangle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';

const mockFlags = [
  { id: 1, type: 'high', title: 'Unusual transaction velocity', account: 'TechCorp Inc', amount: '$45,000', time: '2 hours ago' },
  { id: 2, type: 'high', title: 'Large cross-border transfer', account: 'Maria Garcia', amount: '$25,000', time: '4 hours ago' },
  { id: 3, type: 'high', title: 'New device login', account: 'Carlos Rodriguez', amount: '-', time: '5 hours ago' },
  { id: 4, type: 'medium', title: 'Multiple failed verifications', account: 'StartupXYZ', amount: '-', time: '1 day ago' },
  { id: 5, type: 'medium', title: 'Exceeded daily limit', account: 'Juan Martinez', amount: '$10,500', time: '1 day ago' },
  { id: 6, type: 'low', title: 'Address change', account: 'Ana Lopez', amount: '-', time: '2 days ago' },
];

export default function CompliancePage() {
  const highRisk = mockFlags.filter(f => f.type === 'high').length;
  const mediumRisk = mockFlags.filter(f => f.type === 'medium').length;
  const lowRisk = mockFlags.filter(f => f.type === 'low').length;

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Compliance</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor and manage compliance flags</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Export Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Total</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{mockFlags.length}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending flags</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-950 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-xs font-medium text-red-600 dark:text-red-400">Urgent</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{highRisk}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">High risk</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Review</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{mediumRisk}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Medium risk</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Low</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{lowRisk}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Low risk</div>
        </div>
      </div>

      {/* Flags List */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Review</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {mockFlags.map((flag) => (
            <div key={flag.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${
                  flag.type === 'high' ? 'bg-red-500' :
                  flag.type === 'medium' ? 'bg-amber-500' :
                  'bg-emerald-500'
                }`} />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{flag.title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{flag.account}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {flag.amount !== '-' && (
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{flag.amount}</div>
                )}
                <div className="text-sm text-gray-500 dark:text-gray-400">{flag.time}</div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

