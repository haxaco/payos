'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import { Card, Button, Badge as UIBadge, Progress } from '@sly/ui';
import {
    ArrowLeft,
    Calendar,
    Clock,
    Play,
    Pause,
    XCircle,
    AlertTriangle,
    CheckCircle,
    RotateCw,
    ArrowRight,
    ExternalLink,
    MoreVertical,
    Repeat
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useState } from 'react';
import { formatCurrency } from '@sly/ui';

export default function ScheduleDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const api = useApiClient();
    const queryClient = useQueryClient();

    // Fetch schedule details
    const { data: scheduleResponse, isLoading, error } = useQuery({
        queryKey: ['schedule', id],
        queryFn: async () => {
            if (!api) throw new Error('API client not initialized');
            return api.scheduledTransfers.get(id);
        },
        enabled: !!api && !!id,
    });

    const schedule = (scheduleResponse as any)?.data || scheduleResponse;

    // Fetch execution history (using transfers filtered by schedule_id)
    const { data: executionsResponse, isLoading: executionsLoading } = useQuery({
        queryKey: ['schedule-executions', id],
        queryFn: async () => {
            if (!api) throw new Error('API client not initialized');
            // Using transfers list filtered by schedule_id as a proxy for execution history
            // Note: 'schedule_id' might need to be supported by the backend or we filter client side if not
            return api.transfers.list({ schedule_id: id, limit: 10 } as any);
        },
        enabled: !!api && !!id,
    });

    const executions = (executionsResponse as any)?.data || [];

    // Mutations
    const pauseMutation = useMutation({
        mutationFn: async () => {
            if (!api) throw new Error('API client not initialized');
            return api.scheduledTransfers.pause(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule', id] });
            toast.success('Schedule paused');
        },
        onError: (err: any) => toast.error(err.message || 'Failed to pause schedule'),
    });

    const resumeMutation = useMutation({
        mutationFn: async () => {
            if (!api) throw new Error('API client not initialized');
            return api.scheduledTransfers.resume(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule', id] });
            toast.success('Schedule resumed');
        },
        onError: (err: any) => toast.error(err.message || 'Failed to resume schedule'),
    });

    const cancelMutation = useMutation({
        mutationFn: async () => {
            if (!api) throw new Error('API client not initialized');
            return api.scheduledTransfers.cancel(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule', id] });
            toast.success('Schedule cancelled');
        },
        onError: (err: any) => toast.error(err.message || 'Failed to cancel schedule'),
    });

    const executeNowMutation = useMutation({
        mutationFn: async () => {
            if (!api) throw new Error('API client not initialized');
            return api.scheduledTransfers.executeNow(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule', id] });
            queryClient.invalidateQueries({ queryKey: ['schedule-executions', id] });
            toast.success('Transfer executed successfully');
        },
        onError: (err: any) => toast.error(err.message || 'Failed to execute transfer'),
    });

    if (isLoading) {
        return (
            <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4 mb-8" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                    <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                </div>
            </div>
        );
    }

    if (error || !schedule) {
        return (
            <div className="p-8 max-w-[1600px] mx-auto flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Schedule not found</h2>
                <Button variant="outline" onClick={() => router.push('/dashboard/schedules')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Schedules
                </Button>
            </div>
        );
    }

    const getFrequencyLabel = (freq: string, interval: number, day?: number) => {
        switch (freq) {
            case 'daily': return interval === 1 ? 'Daily' : `Every ${interval} days`;
            case 'weekly': return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
            case 'monthly': return day ? `Monthly on day ${day}` : 'Monthly';
            default: return freq;
        }
    };

    const statusColors = {
        active: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
        paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
        completed: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
        cancelled: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" className="pl-0 gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" onClick={() => router.push('/dashboard/schedules')}>
                    <ArrowLeft className="w-4 h-4" />
                    Back to Schedules
                </Button>
                <div className="flex items-center gap-2">
                    {schedule.status === 'active' && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => executeNowMutation.mutate()} disabled={executeNowMutation.isPending}>
                                <Play className="w-4 h-4 mr-2" />
                                Execute Now
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => pauseMutation.mutate()} disabled={pauseMutation.isPending}>
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => {
                                if (confirm('Are you sure you want to cancel this schedule?')) cancelMutation.mutate();
                            }} disabled={cancelMutation.isPending}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancel
                            </Button>
                        </>
                    )}
                    {schedule.status === 'paused' && (
                        <Button variant="outline" size="sm" onClick={() => resumeMutation.mutate()} disabled={resumeMutation.isPending}>
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                        </Button>
                    )}
                </div>
            </div>

            {/* Header Info */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
                            <Calendar className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{schedule.description || 'Recurring Transfer'}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[schedule.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700'}`}>
                                    {schedule.status}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    {getFrequencyLabel(schedule.frequency, schedule.intervalValue, schedule.dayOfMonth)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Next Execution</div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-lg font-mono font-medium text-gray-900 dark:text-white">
                            {schedule.nextExecution ? new Date(schedule.nextExecution).toLocaleDateString() : 'N/A'}
                        </span>
                    </div>
                    {schedule.nextExecution && (
                        <span className="text-xs text-purple-600 dark:text-purple-400">
                            in {Math.ceil((new Date(schedule.nextExecution).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                        </span>
                    )}
                </div>
            </div>


            {/* Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Left Column (Overview & Config) */}
                <div className="xl:col-span-2 space-y-8">

                    {/* Overview Card */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Schedule Overview</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Amount</p>
                                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(schedule.amount, schedule.currency || 'USD')}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">per transfer</p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">From</p>
                                        <Link href={`/dashboard/accounts/${schedule.fromAccountId}`} className="flex items-center gap-2 group">
                                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition">
                                                <ArrowRight className="w-4 h-4 text-gray-500" />
                                            </div>
                                            <div className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">
                                                {schedule.fromAccountId}
                                            </div>
                                        </Link>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-300" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">To</p>
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                {schedule.toAccountId || schedule.toPaymentMethodId || 'Unknown Recipient'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-500 dark:text-gray-400">Progress</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {schedule.occurrencesCompleted} / {schedule.maxOccurrences || '∞'}
                                        </span>
                                    </div>
                                    {schedule.maxOccurrences && (
                                        <Progress value={(schedule.occurrencesCompleted / schedule.maxOccurrences) * 100} className="h-2" />
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Start Date</p>
                                        <p className="text-sm font-medium">{new Date(schedule.startDate).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">End Date</p>
                                        <p className="text-sm font-medium">{schedule.endDate ? new Date(schedule.endDate).toLocaleDateString() : 'Never'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Execution History */}
                    <Card className="overflow-hidden">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Execution History</h3>
                        </div>

                        {executionsLoading ? (
                            <div className="p-8 text-center text-gray-500">Loading history...</div>
                        ) : executions.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                                <RotateCw className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No executions yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-medium">
                                        <tr>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Amount</th>
                                            <th className="px-6 py-3">Transfer ID</th>
                                            <th className="px-6 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                        {executions.map((exec: any) => (
                                            <tr key={exec.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-4 text-gray-900 dark:text-white">
                                                    {new Date(exec.createdAt).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${exec.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' :
                                                        exec.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' :
                                                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
                                                        }`}>
                                                        {exec.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                    {formatCurrency(exec.amount, exec.currency)}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-500">
                                                    {exec.id.slice(0, 8)}...
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link href={`/dashboard/transfers/${exec.id}`} className="text-gray-400 hover:text-blue-600 transition-colors">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column (Settings & Info) */}
                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Configuration</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-sm text-gray-500">Frequency</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{schedule.frequency}</span>
                            </div>
                            {schedule.intervalValue > 1 && (
                                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                                    <span className="text-sm text-gray-500">Interval</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">Every {schedule.intervalValue} units</span>
                                </div>
                            )}
                            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-sm text-gray-500">Timezone</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">{schedule.timezone || 'UTC'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-sm text-gray-500">Created</span>
                                <span className="text-sm text-gray-900 dark:text-white">
                                    {new Date(schedule.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <RotateCw className="w-5 h-5 text-gray-500" />
                            Retry Settings
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-gray-500">Retry Enabled</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${schedule.retryEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {schedule.retryEnabled ? 'Yes' : 'No'}
                                </span>
                            </div>
                            {schedule.retryEnabled && (
                                <>
                                    <div className="flex justify-between py-2">
                                        <span className="text-sm text-gray-500">Max Attempts</span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{schedule.maxRetryAttempts}</span>
                                    </div>
                                    <div className="flex justify-between py-2">
                                        <span className="text-sm text-gray-500">Retry Window</span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{schedule.retryWindowDays} days</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>
                </div>

            </div>
        </div>
    );
}
