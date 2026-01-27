'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    StatCard,
} from '@sly/ui';
import { TableSkeleton } from '@/components/ui/skeletons';
import {
    DollarSign,
    Activity,
    PieChart,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    TrendingUp,
    FileText,
} from 'lucide-react';

type Period = '24h' | '7d' | '30d' | '90d' | '1y';

const periodLabels: Record<Period, string> = {
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '1y': 'Last Year',
};

export function Ap2Analytics({ period }: { period: Period }) {
    const api = useApiClient();

    // Fetch analytics
    const { data: analytics, isLoading } = useQuery({
        queryKey: ['ap2', 'analytics', period],
        queryFn: async () => {
            if (!api) return null;
            return api.ap2.getAnalytics({ period });
        },
        enabled: !!api,
    });

    const summary = analytics?.summary;
    const byType = analytics?.mandatesByType;
    const byStatus = analytics?.mandatesByStatus;

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <TableSkeleton rows={1} columns={1} />
                    <TableSkeleton rows={1} columns={1} />
                    <TableSkeleton rows={1} columns={1} />
                    <TableSkeleton rows={1} columns={1} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={`$${summary?.totalRevenue?.toFixed(2) || '0.00'}`}
                    description="Gross revenue"
                    icon={<DollarSign className="h-5 w-5" />}
                />
                <StatCard
                    title="Total Executions"
                    value={summary?.transactionCount?.toString() || '0'}
                    description={periodLabels[period]}
                    icon={<Activity className="h-5 w-5" />}
                />
                <StatCard
                    title="Active Mandates"
                    value={summary?.activeMandates?.toString() || '0'}
                    description="Currently active"
                    icon={<FileText className="h-5 w-5" />}
                />
                <StatCard
                    title="Utilization Rate"
                    value={`${summary?.utilizationRate?.toFixed(1) || '0'}%`}
                    description="Of authorized amount"
                    icon={<TrendingUp className="h-5 w-5" />}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Mandates by Status */}
                <Card>
                    <CardHeader>
                        <CardTitle>Mandates by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    <span className="text-sm font-medium">Active</span>
                                </div>
                                <span className="text-2xl font-bold">{byStatus?.active || 0}</span>
                            </div>
                            <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                                    <span className="text-sm font-medium">Completed</span>
                                </div>
                                <span className="text-2xl font-bold">{byStatus?.completed || 0}</span>
                            </div>
                            <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-5 w-5 text-red-500" />
                                    <span className="text-sm font-medium">Cancelled</span>
                                </div>
                                <span className="text-2xl font-bold">{byStatus?.cancelled || 0}</span>
                            </div>
                            <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-yellow-500" />
                                    <span className="text-sm font-medium">Expired</span>
                                </div>
                                <span className="text-2xl font-bold">{byStatus?.expired || 0}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Mandates by Type */}
                <Card>
                    <CardHeader>
                        <CardTitle>Mandates by Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">Payment</div>
                                        <div className="text-xs text-muted-foreground">Direct payments</div>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold">{byType?.payment || 0}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                        <PieChart className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">Cart</div>
                                        <div className="text-xs text-muted-foreground">Shopping carts</div>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold">{byType?.cart || 0}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                        <Activity className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">Intent</div>
                                        <div className="text-xs text-muted-foreground">Intent-based</div>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold">{byType?.intent || 0}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Authorization Stats */}
            <Card>
                <CardHeader>
                    <CardTitle>Authorization Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="font-medium">Total Authorized</div>
                                    <div className="text-xs text-muted-foreground">Max potential</div>
                                </div>
                            </div>
                            <span className="text-2xl font-bold">${summary?.totalAuthorized?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="font-medium">Total Used</div>
                                    <div className="text-xs text-muted-foreground">Executed amount</div>
                                </div>
                            </div>
                            <span className="text-2xl font-bold">${summary?.totalUsed?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="font-medium">Utilization</div>
                                    <div className="text-xs text-muted-foreground">Usage rate</div>
                                </div>
                            </div>
                            <span className="text-2xl font-bold">{summary?.utilizationRate?.toFixed(1) || '0'}%</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
