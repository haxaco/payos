'use client';

import { ScrollText, Search, Filter, Download, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const mockLogs = [
  { id: 1, timestamp: '2025-12-12T14:32:15Z', level: 'info', service: 'api', message: 'POST /v1/transfers - 201 Created', duration: '45ms' },
  { id: 2, timestamp: '2025-12-12T14:32:10Z', level: 'info', service: 'api', message: 'GET /v1/accounts - 200 OK', duration: '12ms' },
  { id: 3, timestamp: '2025-12-12T14:31:58Z', level: 'warning', service: 'auth', message: 'Rate limit approaching for tenant_123', duration: '-' },
  { id: 4, timestamp: '2025-12-12T14:31:45Z', level: 'error', service: 'webhook', message: 'Failed to deliver webhook to https://example.com/hook', duration: '5000ms' },
  { id: 5, timestamp: '2025-12-12T14:31:30Z', level: 'info', service: 'api', message: 'POST /v1/streams - 201 Created', duration: '89ms' },
  { id: 6, timestamp: '2025-12-12T14:31:15Z', level: 'info', service: 'api', message: 'GET /v1/agents - 200 OK', duration: '23ms' },
  { id: 7, timestamp: '2025-12-12T14:31:00Z', level: 'warning', service: 'stream', message: 'Stream str_123 health degraded to warning', duration: '-' },
  { id: 8, timestamp: '2025-12-12T14:30:45Z', level: 'info', service: 'api', message: 'PUT /v1/accounts/acc_123 - 200 OK', duration: '34ms' },
];

export default function LogsPage() {
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filteredLogs = mockLogs.filter(log => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    if (serviceFilter !== 'all' && log.service !== serviceFilter) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400';
      case 'warning': return 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400';
      case 'info': return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Logs</h1>
          <p className="text-gray-600 dark:text-gray-400">View system and API logs</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Download className="h-4 w-4" />
          Export Logs
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="px-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Services</option>
          <option value="api">API</option>
          <option value="auth">Auth</option>
          <option value="webhook">Webhook</option>
          <option value="stream">Stream</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Timestamp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Message</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800 font-mono text-sm">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors">
                <td className="px-6 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${getLevelColor(log.level)}`}>
                    {log.level}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-600 dark:text-gray-400">
                  {log.service}
                </td>
                <td className="px-6 py-3 text-gray-900 dark:text-white">
                  {log.message}
                </td>
                <td className="px-6 py-3 text-gray-600 dark:text-gray-400">
                  {log.duration}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

