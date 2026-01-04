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
    PieChart,
    CheckCircle2,
    XCircle,
    Clock,
    ShoppingBag,
    Users,
    AlertCircle,
} from 'lucide-react';
import { ACPAnalytics } from '@payos/api-client';

type Period = '24h' | '7d' | '30d' | '90d' | '1y';

const periodLabels: Record<Period, string> = {
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '1y': 'Last Year',
};

export function AcpAnalytics({ period }: { period: Period }) {
    const api = useApiClient();

    // Fetch summary
    const { data: analytics, isLoading } = useQuery({
        queryKey: ['acp', 'analytics', period],
        queryFn: async () => {
            if (!api) return null;
            return api.acp.getAnalytics({ period });
        },
        enabled: !!api,
    });

    const summary = analytics?.summary;
    const byStatus = analytics?.checkoutsByStatus;

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
                    title="Total Checkouts"
                    value={summary?.transactionCount?.toString() || '0'}
                    description={periodLabels[period]}
                    icon={<ShoppingBag className="h-5 w-5" />}
                />
                <StatCard
                    title="Avg Order Value"
                    value={`$${summary?.averageOrderValue?.toFixed(2) || '0.00'}`}
                    description="Per completed checkout"
                    icon={<Activity className="h-5 w-5" />}
                />
                <StatCard
                    title="Active Merchants"
                    value={summary?.uniqueMerchants?.toString() || '0'}
                    description="Unique merchants"
                    icon={<Users className="h-5 w-5" />}
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
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
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
                                    <AlertCircle className="h-5 w-5 text-red-600" />
                                    <span className="text-sm font-medium">Failed</span>
                                </div>
                                <span className="text-2xl font-bold">{byStatus?.failed || 0}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Revenue Stats */}
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                        <DollarSign className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">Gross Revenue</div>
                                        <div className="text-xs text-muted-foreground">Total volume</div>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold">${summary?.totalRevenue?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                        <PieChart className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">Net Revenue</div>
                                        <div className="text-xs text-muted-foreground">After fees</div>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold">${summary?.netRevenue?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                        <Activity className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">Total Fees</div>
                                        <div className="text-xs text-muted-foreground">Processing fees</div>
                                    </div>
                                </div>
                                <span className="text-2xl font-bold">${summary?.totalFees?.toFixed(2) || '0.00'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
