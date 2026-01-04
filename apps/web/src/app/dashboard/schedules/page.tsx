'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  X as XIcon,
  Clock,
  RotateCw,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { Button, Input, cn } from '@payos/ui';
import { formatCurrency } from '@payos/ui';
import type { ScheduledTransfer, ScheduleStatus } from '@payos/api-client';
import { TableSkeleton } from '@/components/ui/skeletons';
import { CreateScheduleModal } from '@/components/schedules/create-schedule-modal';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';

export default function SchedulesPage() {
  const api = useApiClient();
  const { isConfigured, isLoading: isAuthLoading } = useApiConfig();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch total count
  const { data: countData } = useQuery({
    queryKey: ['schedules', 'count'],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.scheduledTransfers.list({ limit: 1 });
    },
    enabled: !!api && isConfigured,
    staleTime: 60 * 1000,
  });

  // Initialize pagination
  const pagination = usePagination({
    totalItems: (countData as any)?.data?.pagination?.total || (countData as any)?.pagination?.total || 0,
    initialPageSize: 50,
  });

  // Fetch schedules for current page
  const { data: schedulesData, isLoading: loading } = useQuery({
    queryKey: ['schedules', 'page', pagination.page, pagination.pageSize, statusFilter],
    queryFn: async () => {
      if (!api) throw new Error('API client not initialized');
      return api.scheduledTransfers.list({
        page: pagination.page,
        limit: pagination.pageSize,
        status: statusFilter !== 'all' ? (statusFilter as ScheduleStatus) : undefined,
      });
    },
    enabled: !!api && isConfigured,
    staleTime: 30 * 1000,
  });

  const rawData = (schedulesData as any)?.data;
  const schedules = Array.isArray(rawData)
    ? rawData
    : (Array.isArray((rawData as any)?.data)
      ? (rawData as any).data
      : []);

  const fetchSchedules = () => {
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
  };

  const handlePause = async (id: string) => {
    if (!api) return;
    setActionLoading(id);
    try {
      await api.scheduledTransfers.pause(id);
      await fetchSchedules();
    } catch (error) {
      console.error('Failed to pause schedule:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (id: string) => {
    if (!api) return;
    setActionLoading(id);
    try {
      await api.scheduledTransfers.resume(id);
      await fetchSchedules();
    } catch (error) {
      console.error('Failed to resume schedule:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!api || !confirm('Are you sure you want to cancel this scheduled transfer?')) return;
    setActionLoading(id);
    try {
      await api.scheduledTransfers.cancel(id);
      await fetchSchedules();
    } catch (error) {
      console.error('Failed to cancel schedule:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExecuteNow = async (id: string) => {
    if (!api) return;
    setActionLoading(id);
    try {
      await api.scheduledTransfers.executeNow(id);
      await fetchSchedules();
    } catch (error) {
      console.error('Failed to execute schedule:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400';
      case 'paused': return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400';
      case 'completed': return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400';
      case 'cancelled': return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
    }
  };

  const getFrequencyLabel = (frequency: string, intervalValue: number = 1, dayOfMonth?: number) => {
    switch (frequency) {
      case 'daily': return intervalValue === 1 ? 'Daily' : `Every ${intervalValue} days`;
      case 'weekly': return intervalValue === 1 ? 'Weekly' : `Every ${intervalValue} weeks`;
      case 'biweekly': return 'Bi-weekly';
      case 'monthly': return dayOfMonth ? `Monthly (Day ${dayOfMonth})` : 'Monthly';
      default: return frequency;
    }
  };

  const filteredSchedules = schedules.filter((schedule: any) => {
    const matchesSearch = schedule.description?.toLowerCase().includes(search.toLowerCase()) ||
      schedule.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || schedule.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isAuthLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scheduled Transfers</h1>
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scheduled Transfers</h1>
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scheduled Transfers</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage recurring payments</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Schedule
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search schedules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950 rounded-lg flex items-center justify-center">
              <Play className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {schedules.filter((s: any) => s.status === 'active').length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-950 rounded-lg flex items-center justify-center">
              <Pause className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {schedules.filter((s: any) => s.status === 'paused').length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Paused</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
              <RotateCw className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {schedules.reduce((acc: number, s: any) => acc + (s.occurrencesCompleted || 0), 0)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Executions</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {schedules.filter((s: any) => s.nextExecution && s.status === 'active').length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Schedules List */}
      {filteredSchedules.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Scheduled Transfers
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create recurring payments to automate your transfers
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Schedule
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Schedule</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Frequency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Next Run</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSchedules.map((schedule: any) => (
                <tr key={schedule.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <div>
                      <Link href={`/dashboard/schedules/${schedule.id}`} className="block group">
                        <p className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {schedule.description || `Schedule #${schedule.id.slice(0, 8)}`}
                        </p>
                      </Link>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {schedule.occurrencesCompleted} executions
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(schedule.amount, schedule.currency)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {getFrequencyLabel(schedule.frequency, schedule.intervalValue, schedule.dayOfMonth)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {schedule.nextExecution ? (
                      <span className="text-gray-700 dark:text-gray-300">
                        {new Date(schedule.nextExecution).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', getStatusColor(schedule.status))}>
                      {schedule.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {actionLoading === schedule.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : (
                        <>
                          {schedule.status === 'active' && (
                            <>
                              <button
                                onClick={() => handleExecuteNow(schedule.id)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg"
                                title="Execute Now"
                              >
                                <Play className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handlePause(schedule.id)}
                                className="p-1.5 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950 rounded-lg"
                                title="Pause"
                              >
                                <Pause className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {schedule.status === 'paused' && (
                            <button
                              onClick={() => handleResume(schedule.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-lg"
                              title="Resume"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          {(schedule.status === 'active' || schedule.status === 'paused') && (
                            <button
                              onClick={() => handleCancel(schedule.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg"
                              title="Cancel"
                            >
                              <XIcon className="h-4 w-4" />
                            </button>
                          )}
                          <Link
                            href={`/dashboard/schedules/${schedule.id}`}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                            title="View Details"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && schedules.length > 0 && (
        <PaginationControls
          pagination={pagination}
          className="mt-6"
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateScheduleModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchSchedules();
          }}
        />
      )}
    </div>
  );
}

