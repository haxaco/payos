'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApiClient } from '@/lib/api-client';
import Link from 'next/link';
import {
  ArrowLeft,
  Activity,
  Play,
  Pause,
  XCircle,
  Plus,
  Minus,
  Clock,
  DollarSign,
  Zap,
  History,
  AlertTriangle,
} from 'lucide-react';
import type { Stream, StreamEvent } from '@payos/api-client';

export default function StreamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const api = useApiClient();
  const streamId = params.id as string;

  const [stream, setStream] = useState<Stream | null>(null);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showTopUp, setShowTopUp] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!api) return;

      try {
        const [streamData, eventsData] = await Promise.all([
          api.streams.get(streamId),
          api.streams.getEvents(streamId, { limit: 50 }),
        ]);

        setStream(streamData);
        setEvents(eventsData.data || []);
      } catch (error) {
        console.error('Failed to fetch stream:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [api, streamId]);

  const handlePause = async () => {
    if (!api || !stream) return;
    setActionLoading(true);
    try {
      const updated = await api.streams.pause(streamId);
      setStream(updated);
    } catch (error) {
      console.error('Failed to pause stream:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!api || !stream) return;
    setActionLoading(true);
    try {
      const updated = await api.streams.resume(streamId);
      setStream(updated);
    } catch (error) {
      console.error('Failed to resume stream:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!api || !stream) return;
    if (!confirm('Are you sure you want to cancel this stream? This action cannot be undone.')) return;
    
    setActionLoading(true);
    try {
      await api.streams.cancel(streamId);
      router.push('/dashboard/streams');
    } catch (error) {
      console.error('Failed to cancel stream:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTopUp = async () => {
    if (!api || !stream || !topUpAmount) return;
    setActionLoading(true);
    try {
      const updated = await api.streams.topUp(streamId, parseFloat(topUpAmount));
      setStream(updated);
      setTopUpAmount('');
      setShowTopUp(false);
    } catch (error) {
      console.error('Failed to top up stream:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!api || !stream || !withdrawAmount) return;
    setActionLoading(true);
    try {
      const updated = await api.streams.withdraw(streamId, parseFloat(withdrawAmount));
      setStream(updated);
      setWithdrawAmount('');
      setShowWithdraw(false);
    } catch (error) {
      console.error('Failed to withdraw from stream:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      case 'critical': return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
          <div className="h-4 w-96 bg-gray-200 dark:bg-gray-800 rounded mb-8"></div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Stream not found</h2>
        <Link href="/dashboard/streams" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to streams
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Back button */}
      <Link
        href="/dashboard/streams"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to streams
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            stream.status === 'active' 
              ? 'bg-emerald-100 dark:bg-emerald-950' 
              : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            {stream.status === 'active' ? (
              <Activity className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            ) : (
              <Pause className="h-8 w-8 text-gray-600 dark:text-gray-400" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {stream.sender.accountName} → {stream.receiver.accountName}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                ${stream.flowRate.perMonth.toLocaleString()}/month
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                ${stream.flowRate.perSecond.toFixed(6)}/sec
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <span className={`px-4 py-2 text-sm font-medium rounded-full border ${getHealthColor(stream.health)}`}>
            {stream.health}
          </span>

          {stream.status === 'active' && (
            <button
              onClick={handlePause}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg transition-colors"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>
          )}
          {stream.status === 'paused' && (
            <button
              onClick={handleResume}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors"
            >
              <Play className="h-4 w-4" />
              Resume
            </button>
          )}
          <button
            onClick={handleCancel}
            disabled={actionLoading || stream.status === 'cancelled'}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </div>

      {/* Health Warning */}
      {stream.health === 'critical' && (
        <div className="mb-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-200">
                Critical: Stream needs funding
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                This stream will run out of funds in {stream.funding.runway.display}. Top up now to prevent interruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Streamed</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            ${stream.streamed.total.toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Buffer Balance</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ${stream.funding.buffer.toLocaleString()}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Runway</div>
          <div className={`text-2xl font-bold ${
            stream.health === 'critical' ? 'text-red-600' : 
            stream.health === 'warning' ? 'text-yellow-600' : 'text-emerald-600'
          }`}>
            <Clock className="h-5 w-5 inline mr-1" />
            {stream.funding.runway.display}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
            {stream.status}
          </div>
        </div>
      </div>

      {/* Funding Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Up Stream</h3>
            <button
              onClick={() => setShowTopUp(!showTopUp)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <Plus className="h-5 w-5 text-blue-600" />
            </button>
          </div>
          {showTopUp && (
            <div className="flex gap-2">
              <input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="Amount (USDC)"
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900"
              />
              <button
                onClick={handleTopUp}
                disabled={actionLoading || !topUpAmount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Top Up
              </button>
            </div>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Add funds to extend the stream's runway.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Withdraw Funds</h3>
            <button
              onClick={() => setShowWithdraw(!showWithdraw)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <Minus className="h-5 w-5 text-orange-600" />
            </button>
          </div>
          {showWithdraw && (
            <div className="flex gap-2">
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount (USDC)"
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900"
              />
              <button
                onClick={handleWithdraw}
                disabled={actionLoading || !withdrawAmount}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                Withdraw
              </button>
            </div>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Withdraw unused funds from the stream buffer.
          </p>
        </div>
      </div>

      {/* Stream Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stream Details</h3>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Stream ID</dt>
              <dd className="font-mono text-sm text-gray-900 dark:text-white">{stream.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Sender</dt>
              <dd>
                <Link href={`/dashboard/accounts/${stream.sender.accountId}`} className="text-blue-600 hover:underline">
                  {stream.sender.accountName}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Receiver</dt>
              <dd>
                <Link href={`/dashboard/accounts/${stream.receiver.accountId}`} className="text-blue-600 hover:underline">
                  {stream.receiver.accountName}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Started</dt>
              <dd className="text-gray-900 dark:text-white">
                {new Date(stream.startedAt).toLocaleString()}
              </dd>
            </div>
            {stream.cancelledAt && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Cancelled</dt>
                <dd className="text-gray-900 dark:text-white">
                  {new Date(stream.cancelledAt).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Flow Rates</h3>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Per Second</dt>
              <dd className="font-mono text-gray-900 dark:text-white">${stream.flowRate.perSecond.toFixed(8)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Per Minute</dt>
              <dd className="font-mono text-gray-900 dark:text-white">${(stream.flowRate.perSecond * 60).toFixed(6)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Per Hour</dt>
              <dd className="font-mono text-gray-900 dark:text-white">${(stream.flowRate.perSecond * 3600).toFixed(4)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Per Day</dt>
              <dd className="font-mono text-gray-900 dark:text-white">${(stream.flowRate.perSecond * 86400).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Per Month</dt>
              <dd className="font-bold text-gray-900 dark:text-white">${stream.flowRate.perMonth.toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Event History */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <History className="h-5 w-5" />
          Event History
        </h3>
        {events.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No events recorded yet.
          </p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  event.eventType === 'created' ? 'bg-blue-500' :
                  event.eventType === 'started' ? 'bg-emerald-500' :
                  event.eventType === 'paused' ? 'bg-yellow-500' :
                  event.eventType === 'resumed' ? 'bg-emerald-500' :
                  event.eventType === 'cancelled' ? 'bg-red-500' :
                  event.eventType === 'topped_up' ? 'bg-blue-500' :
                  event.eventType === 'withdrawn' ? 'bg-orange-500' :
                  'bg-gray-500'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {event.eventType.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(event.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {event.data && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {JSON.stringify(event.data)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

