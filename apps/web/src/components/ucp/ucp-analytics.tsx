'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    StatCard,
} from '@payos/ui';
import { TableSkeleton } from '@/components/ui/skeletons';
import {
    DollarSign,
    Activity,
    CheckCircle2,
    XCircle,
    Clock,
    Globe,
    ArrowLeftRight,
    Timer,
    Landmark,
    Loader2,
} from 'lucide-react';

type Period = '24h' | '7d' | '30d' | '90d' | '1y';

const periodLabels: Record<Period, string> = {
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '1y': 'Last Year',
};

export function UcpAnalytics({ period }: { period: Period }) {
    const api = useApiClient();

    // Fetch analytics
    const { data: analytics, isLoading } = useQuery({
        queryKey: ['ucp', 'analytics', period],
        queryFn: async () => {
            if (!api) return null;
            return api.ucp.getAnalytics({ period });
        },
        enabled: !!api,
    });

    const summary = analytics?.summary;
    const byStatus = analytics?.byStatus;
    const byCorridor = analytics?.byCorridor;

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

    // Format time from seconds
    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${Math.round(seconds / 3600)}h`;
    };

    return (
        <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Volume"
                    value={`$${summary?.totalVolume?.toFixed(2) || '0.00'}`}
                    description="Checkout payments processed"
                    icon={<DollarSign className="h-5 w-5" />}
                />
                <StatCard
                    title="Total Checkouts"
                    value={summary?.totalSettlements?.toString() || '0'}
                    description={periodLabels[period]}
                    icon={<ArrowLeftRight className="h-5 w-5" />}
                />
                <StatCard
                    title="Avg Processing Time"
                    value={formatTime(summary?.averageSettlementTime || 0)}
                    description="Time to completion"
                    icon={<Timer className="h-5 w-5" />}
                />
                <StatCard
                    title="Success Rate"
                    value={`${summary?.totalSettlements ? Math.round((summary?.completedSettlements || 0) / summary.totalSettlements * 100) : 0}%`}
                    description="Completed checkouts"
                    icon={<Activity className="h-5 w-5" />}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Checkouts by Status */}
                <Card>
                    <CardHeader>
                        <CardTitle>Checkouts by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-yellow-500" />
                                    <span className="text-sm font-medium">Pending</span>
                                </div>
                                <span className="text-2xl font-bold">{byStatus?.pending || 0}</span>
                            </div>
                            <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 text-blue-500" />
                                    <span className="text-sm font-medium">Processing</span>
                                </div>
                                <span className="text-2xl font-bold">{byStatus?.processing || 0}</span>
                            </div>
                            <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    <span className="text-sm font-medium">Completed</span>
                                </div>
                                <span className="text-2xl font-bold">{byStatus?.completed || 0}</span>
                            </div>
                            <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-5 w-5 text-red-500" />
                                    <span className="text-sm font-medium">Failed</span>
                                </div>
                                <span className="text-2xl font-bold">{byStatus?.failed || 0}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Checkouts by Corridor */}
                <Card>
                    <CardHeader>
                        <CardTitle>Volume by Corridor</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Pix Corridor */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <Landmark className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium flex items-center gap-2">
                                            Pix
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                                Brazil
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {byCorridor?.pix?.count || 0} checkouts
                                        </div>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold">
                                    ${byCorridor?.pix?.volume?.toFixed(2) || '0.00'}
                                </span>
                            </div>

                            {/* SPEI Corridor */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <Globe className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium flex items-center gap-2">
                                            SPEI
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                Mexico
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {byCorridor?.spei?.count || 0} checkouts
                                        </div>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold">
                                    ${byCorridor?.spei?.volume?.toFixed(2) || '0.00'}
                                </span>
                            </div>

                            {/* Total Fees */}
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                        <Activity className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">Total Fees Collected</div>
                                        <div className="text-xs text-muted-foreground">
                                            Platform + FX fees
                                        </div>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold">
                                    ${summary?.totalFees?.toFixed(2) || '0.00'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
