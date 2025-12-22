'use client';

import { useState, useEffect } from 'react';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { DollarSign, Plus, Search, Filter, TrendingUp, Activity, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import type { X402Endpoint } from '@payos/api-client';
import { CardListSkeleton } from '@/components/ui/skeletons';

export default function X402EndpointsPage() {
  const api = useApiClient();
  const { isConfigured } = useApiConfig();
  const [endpoints, setEndpoints] = useState<X402Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function fetchEndpoints() {
      if (!api) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.x402Endpoints.list({ limit: 50 });
        setEndpoints(response.data || []);
      } catch (error) {
        console.error('Failed to fetch endpoints:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchEndpoints();
  }, [api]);

  const filteredEndpoints = endpoints.filter(endpoint =>
    endpoint.name.toLowerCase().includes(search.toLowerCase()) ||
    endpoint.path.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate totals
  const totalRevenue = endpoints.reduce((sum, e) => sum + e.totalRevenue, 0);
  const totalCalls = endpoints.reduce((sum, e) => sum + e.totalCalls, 0);

  if (!isConfigured) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configure API Key</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Please configure your API key to manage x402 endpoints.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">x402 Endpoints</h1>
          <p className="text-gray-600 dark:text-gray-400">Monetize your APIs with HTTP 402 payments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Register Endpoint
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Endpoints</span>
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{endpoints.length}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {endpoints.filter(e => e.status === 'active').length} active
          </div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</span>
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">USDC</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total API Calls</span>
            <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalCalls.toLocaleString()}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Paid requests</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search endpoints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      {/* Endpoints List */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800">
        {loading ? (
          <div className="p-6">
            <CardListSkeleton count={5} />
          </div>
        ) : filteredEndpoints.length === 0 ? (
          <div className="p-12 text-center">
            {search ? (
              <>
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No results found</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Try a different search term</p>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">💰</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No endpoints yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 mb-4">
                  Start monetizing your APIs by registering your first endpoint
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Register Endpoint
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredEndpoints.map((endpoint) => (
              <div key={endpoint.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{endpoint.name}</h3>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        endpoint.status === 'active'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                          : endpoint.status === 'paused'
                          ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400'
                          : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'
                      }`}>
                        {endpoint.status}
                      </span>
                      <span className="px-2.5 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded-full">
                        {endpoint.method}
                      </span>
                    </div>
                    <p className="text-sm font-mono text-gray-600 dark:text-gray-400 mb-2">{endpoint.path}</p>
                    {endpoint.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{endpoint.description}</p>
                    )}
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Price: </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${endpoint.basePrice} {endpoint.currency}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Calls: </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {endpoint.totalCalls.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Revenue: </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          ${endpoint.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <MoreVertical className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal (placeholder) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Register x402 Endpoint</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Coming soon: UI for registering new endpoints. Use the API for now.
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

