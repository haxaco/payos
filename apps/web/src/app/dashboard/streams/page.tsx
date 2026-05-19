'use client';

import { useState, useEffect } from 'react';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { Activity, Plus, Search, Filter, Play, Pause, X } from 'lucide-react';
import Link from 'next/link';
import type { Stream } from '@sly/api-client';
import { CardListSkeleton } from '@/components/ui/skeletons';
import { StreamsEmptyState, SearchEmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';

export default function StreamsPage() {
  const api = useApiClient();
  const { isConfigured, isLoading: isAuthLoading } = useApiConfig();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Create-stream modal state
  const [showCreate, setShowCreate] = useState(false);
  const [acctOptions, setAcctOptions] = useState<{ id: string; name: string }[]>([]);
  const [senderId, setSenderId] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [flowRate, setFlowRate] = useState('');
  const [funding, setFunding] = useState('');
  const [streamDesc, setStreamDesc] = useState('');
  const [creatingStream, setCreatingStream] = useState(false);

  useEffect(() => {
    if (!showCreate || !api || !isConfigured) return;
    (async () => {
      try {
        const res: any = await api.accounts.list({ limit: 100 });
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        const list = Array.isArray(raw) ? raw : [];
        setAcctOptions(list.map((a: any) => ({ id: a.id, name: a.name })));
      } catch {
        setAcctOptions([]);
      }
    })();
  }, [showCreate, api, isConfigured]);

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
  }, [api, refreshKey]);

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
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
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

      {/* Create Stream modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-950 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create Stream</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Continuous per-month money flow between two accounts.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!senderId || !receiverId) { toast.error('Select sender and receiver accounts'); return; }
                if (senderId === receiverId) { toast.error('Sender and receiver must differ'); return; }
                const rate = Number(flowRate);
                if (!Number.isFinite(rate) || rate <= 0) { toast.error('Enter a positive monthly flow rate'); return; }
                if (!api) { toast.error('API client not ready'); return; }
                setCreatingStream(true);
                try {
                  await api.streams.create({
                    senderAccountId: senderId,
                    receiverAccountId: receiverId,
                    flowRatePerMonth: rate,
                    fundingAmount: funding ? Number(funding) : undefined,
                    description: streamDesc.trim() || undefined,
                  });
                  toast.success('Stream created');
                  setShowCreate(false);
                  setSenderId(''); setReceiverId(''); setFlowRate(''); setFunding(''); setStreamDesc('');
                  setRefreshKey((k) => k + 1);
                } catch (err) {
                  toast.error(getApiErrorMessage(err, 'Failed to create stream'));
                } finally {
                  setCreatingStream(false);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From <span className="text-red-500">*</span></label>
                  <select value={senderId} onChange={(e) => setSenderId(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white">
                    <option value="">Select…</option>
                    {acctOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To <span className="text-red-500">*</span></label>
                  <select value={receiverId} onChange={(e) => setReceiverId(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white">
                    <option value="">Select…</option>
                    {acctOptions.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flow / month (USDC) <span className="text-red-500">*</span></label>
                  <input type="number" min={0} step="0.01" value={flowRate} onChange={(e) => setFlowRate(e.target.value)} placeholder="5000" className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Funding <span className="text-gray-400">(opt)</span></label>
                  <input type="number" min={0} step="0.01" value={funding} onChange={(e) => setFunding(e.target.value)} placeholder="10000" className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span className="text-gray-400">(opt)</span></label>
                <input value={streamDesc} onChange={(e) => setStreamDesc(e.target.value)} placeholder="e.g. Monthly salary" className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Cancel</button>
                <button type="submit" disabled={creatingStream} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {creatingStream ? 'Creating…' : 'Create Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

