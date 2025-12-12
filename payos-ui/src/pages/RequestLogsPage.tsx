import { useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { mockAPIRequests } from '../data/mockDeveloper';
import React from 'react';

export function RequestLogsPage() {
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  
  const filteredRequests = mockAPIRequests.filter(req => {
    return methodFilter === 'all' || req.method === methodFilter;
  });
  
  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300';
      case 'POST': return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300';
      case 'PUT': return 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300';
      case 'PATCH': return 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300';
      case 'DELETE': return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };
  
  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'text-green-600 dark:text-green-400';
    if (code >= 400 && code < 500) return 'text-amber-600 dark:text-amber-400';
    if (code >= 500) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };
  
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };
  
  const totalRequests = mockAPIRequests.length;
  const successfulRequests = mockAPIRequests.filter(r => r.statusCode >= 200 && r.statusCode < 300).length;
  const avgLatency = Math.round(mockAPIRequests.reduce((sum, r) => sum + r.latency, 0) / mockAPIRequests.length);
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Request Logs</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitor API requests and debug integrations
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests (24h)</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{totalRequests}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
          <p className="text-2xl font-semibold text-green-600 dark:text-green-400 mt-1">
            {((successfulRequests / totalRequests) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg Latency</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{avgLatency}ms</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Errors (24h)</p>
          <p className="text-2xl font-semibold text-red-600 dark:text-red-400 mt-1">
            {totalRequests - successfulRequests}
          </p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by endpoint..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {['all', 'GET', 'POST', 'PUT', 'DELETE'].map(method => (
            <button
              key={method}
              onClick={() => setMethodFilter(method)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                methodFilter === method
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {method === 'all' ? 'All' : method}
            </button>
          ))}
        </div>
      </div>
      
      {/* Request Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50">
              <th className="w-8"></th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Time</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Method</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Endpoint</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Latency</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">API Key</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredRequests.map(req => (
              <React.Fragment key={req.id}>
                <tr 
                  onClick={() => setExpandedRequest(expandedRequest === req.id ? null : req.id)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer"
                >
                  <td className="pl-4">
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${
                      expandedRequest === req.id ? 'rotate-90' : ''
                    }`} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {formatTime(req.timestamp)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium font-mono ${getMethodColor(req.method)}`}>
                      {req.method}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-sm text-gray-900 dark:text-white font-mono">{req.endpoint}</code>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${getStatusColor(req.statusCode)}`}>
                      {req.statusCode}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {req.latency}ms
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {req.apiKeyName}
                  </td>
                </tr>
                
                {expandedRequest === req.id && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
                      <div className="grid grid-cols-3 gap-6 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">Request ID</p>
                          <code className="text-gray-900 dark:text-white">{req.id}</code>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">IP Address</p>
                          <code className="text-gray-900 dark:text-white">{req.ip}</code>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">API Key ID</p>
                          <code className="text-gray-900 dark:text-white">{req.apiKeyId}</code>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}