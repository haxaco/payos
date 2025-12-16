import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, Plus, Play, Pause, X as XIcon, DollarSign, 
  AlertCircle, Clock, TrendingUp, Loader2, Search
} from 'lucide-react';
import { useStreams } from '../hooks/api';

const healthConfig = {
  healthy: { icon: Zap, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/50', label: 'Healthy' },
  warning: { icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/50', label: 'Warning' },
  critical: { icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/50', label: 'Critical' },
};

const statusConfig = {
  active: { icon: Play, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/50', label: 'Active' },
  paused: { icon: Pause, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/50', label: 'Paused' },
  cancelled: { icon: XIcon, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', label: 'Cancelled' },
};

export function StreamsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<string>('all');

  const { data, loading, error, refetch } = useStreams({
    status: statusFilter === 'all' ? undefined : statusFilter,
    health: healthFilter === 'all' ? undefined : healthFilter,
    search,
  });

  const streams = data?.data || [];

  const activeStreams = streams.filter(s => s.status === 'active');
  const totalFlowPerMonth = activeStreams.reduce((sum, s) => sum + (s.flowRatePerMonth || 0), 0);
  const totalFunded = streams.reduce((sum, s) => sum + (s.fundedAmount || 0), 0);
  const totalStreamed = streams.reduce((sum, s) => sum + (s.totalStreamed || 0), 0);

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Money Streams</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Continuous per-second payment flows
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
          <Plus className="w-4 h-4" />
          Create Stream
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Failed to load streams</h3>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error.message}</p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Streams</p>
                <Zap className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                {streams.length}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {activeStreams.length} active
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Outflow</p>
                <TrendingUp className="w-5 h-5 text-violet-500" />
              </div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                ${totalFlowPerMonth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Per month
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Funded</p>
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                ${totalFunded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Across all streams
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Streamed</p>
                <Clock className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
                ${totalStreamed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Lifetime total
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search streams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>

            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {['all', 'active', 'paused', 'cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {status === 'all' ? 'All Status' : statusConfig[status as keyof typeof statusConfig].label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {['all', 'healthy', 'warning', 'critical'].map(health => (
                <button
                  key={health}
                  onClick={() => setHealthFilter(health)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    healthFilter === health
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {health === 'all' ? 'All Health' : healthConfig[health as keyof typeof healthConfig].label}
                </button>
              ))}
            </div>
          </div>

          {/* Streams Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Stream</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Flow Rate</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Balance</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Health</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {streams.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Zap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400 font-medium">
                        {search || statusFilter !== 'all' || healthFilter !== 'all' ? 'No streams match your filters' : 'No streams created yet'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        {search || statusFilter !== 'all' || healthFilter !== 'all' ? 'Try adjusting your search or filters' : 'Create your first money stream to get started'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  streams.map(stream => {
                    const statusConf = statusConfig[stream.status];
                    const StatusIcon = statusConf.icon;
                    const healthConf = healthConfig[stream.health || 'healthy'];
                    const HealthIcon = healthConf.icon;

                    const remainingBalance = stream.fundedAmount - stream.totalStreamed;
                    const percentStreamed = stream.fundedAmount > 0 ? (stream.totalStreamed / stream.fundedAmount) * 100 : 0;

                    return (
                      <tr
                        key={stream.id}
                        onClick={() => navigate(`/streams/${stream.id}`)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {stream.senderAccount} → {stream.receiverAccount}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {stream.category || 'General'}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            ${stream.flowRatePerMonth?.toLocaleString() || 0}/mo
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ${((stream.flowRatePerMonth || 0) / 30).toFixed(2)}/day
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-900 dark:text-white font-medium">
                            ${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <div className="mt-1 w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className="bg-violet-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(percentStreamed, 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 ${healthConf.bg} ${healthConf.color} rounded-full text-xs font-medium`}>
                            <HealthIcon className="w-3 h-3" />
                            {healthConf.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 ${statusConf.bg} ${statusConf.color} rounded-full text-xs font-medium`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConf.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400">{stream.category || 'General'}</p>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

