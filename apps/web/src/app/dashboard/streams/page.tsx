'use client';

import { useState, useEffect } from 'react';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { Activity, Plus, Search, Filter, Play, Pause } from 'lucide-react';
import Link from 'next/link';
import type { Stream } from '@sly/api-client';
import { CardListSkeleton } from '@/components/ui/skeletons';
import { StreamsEmptyState, SearchEmptyState } from '@/components/ui/empty-state';

export default function StreamsPage() {
  const api = useApiClient();
  const { isConfigured, isLoading: isAuthLoading } = useApiConfig();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchStreams() {
      if (!api) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.streams.list({ limit: 50 });
        const rawData = (response as any).data;
        const streamsList = Array.isArray(rawData)
          ? rawData
          : (Array.isArray((rawData as any)?.data)
            ? (rawData as any).data
            : []);
        setStreams(streamsList);
      } catch (error) {
        console.error('Failed to fetch streams:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStreams();
  }, [api]);

  const filteredStreams = streams.filter((stream: any) =>
    stream.sender.accountName.toLowerCase().includes(search.toLowerCase()) ||
    stream.receiver.accountName.toLowerCase().includes(search.toLowerCase())
  );

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400';
      case 'critical': return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
    }
  };

  if (isAuthLoading) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Streams</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage money streaming payments</p>
          </div>
        </div>
        <CardListSkeleton count={5} />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configure API Key</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Please configure your API key to view streams.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Streams</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage money streaming payments</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" />
          Create Stream
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search streams..."
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

      {/* Streams List */}
      <div className="space-y-4">
        {loading ? (
          <CardListSkeleton count={5} />
        ) : filteredStreams.length === 0 ? (
          search ? (
            <SearchEmptyState query={search} />
          ) : (
            <StreamsEmptyState />
          )
        ) : (
          filteredStreams.map((stream: any) => (
            <div
              key={stream.id}
              onClick={() => window.location.href = `/dashboard/streams/${stream.id}`}
              className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${stream.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                    {stream.status === 'active' ? (
                      <Play className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Pause className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {stream.sender.accountName} → {stream.receiver.accountName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      ${stream.flowRate.perMonth.toLocaleString()}/month
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      ${stream.streamed.total.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      streamed
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getHealthColor(stream.health)}`}>
                    {stream.health}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Runway: {stream.funding.runway.display}</span>
                <span>Buffer: ${stream.funding.buffer.toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

