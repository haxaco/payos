'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Badge,
    Button,
    StatCard,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@payos/ui';
import { TableSkeleton } from '@/components/ui/skeletons';
import {
    DollarSign,
    TrendingUp,
    BarChart3,
    Zap,
    ArrowUpRight,
} from 'lucide-react';

type Metric = 'revenue' | 'calls' | 'unique_payers';
type Period = string;

const metricLabels: Record<Metric, string> = {
    'revenue': 'By Revenue',
    'calls': 'By API Calls',
    'unique_payers': 'By Unique Payers',
};

const periodLabels: Record<string, string> = {
    '24h': 'Last 24 Hours',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
    '1y': 'Last Year',
};

export function X402Analytics({ period }: { period: Period }) {
    const router = useRouter();
    const api = useApiClient();
    const [topMetric, setTopMetric] = useState<Metric>('revenue');

    // Fetch summary
    const { data: summaryData, isLoading: summaryLoading } = useQuery({
        queryKey: ['x402', 'analytics', 'summary', period],
        queryFn: () => {
            if (!api) return null;
            return api.x402Analytics.getSummary({ period });
        },
        enabled: !!api,
    });

    // Fetch top endpoints
    const { data: topEndpointsData, isLoading: topLoading } = useQuery({
        queryKey: ['x402', 'analytics', 'top-endpoints', period, topMetric],
        queryFn: () => {
            if (!api) return null;
            return api.x402Analytics.getTopEndpoints({ period, metric: topMetric, limit: 10 });
        },
        enabled: !!api,
    });

    const summary = summaryData;
    const topEndpoints = topEndpointsData?.endpoints || [];

    return (
        <div className="space-y-8">
            {/* Summary Stats */}
            {summaryLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <TableSkeleton rows={1} columns={1} />
                    <TableSkeleton rows={1} columns={1} />
                    <TableSkeleton rows={1} columns={1} />
                    <TableSkeleton rows={1} columns={1} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Gross Revenue"
                        value={`$${summary?.totalRevenue?.toFixed(2) || '0.00'}`}
                        description={periodLabels[period] || period}
                        icon={<DollarSign className="h-5 w-5" />}
                        trend={summary?.totalRevenue > 0 ? { value: summary.totalRevenue } : undefined}
                    />
                    <StatCard
                        title="Net Revenue"
                        value={`$${summary?.netRevenue?.toFixed(2) || '0.00'}`}
                        description={`-$${summary?.totalFees?.toFixed(2) || '0.00'} fees`}
                        icon={<TrendingUp className="h-5 w-5" />}
                        trend={summary?.netRevenue > 0 ? { value: summary.netRevenue } : undefined}
                    />
                    <StatCard
                        title="Total API Calls"
                        value={summary?.transactionCount?.toLocaleString() || '0'}
                        description={`$${summary?.averageTransactionSize?.toFixed(4) || '0'} avg`}
                        icon={<BarChart3 className="h-5 w-5" />}
                    />
                    <StatCard
                        title="Unique Payers"
                        value={summary?.uniquePayers?.toString() || '0'}
                        description={`${summary?.activeEndpoints || '0'} endpoints`}
                        icon={<Zap className="h-5 w-5" />}
                    />
                </div>
            )}

            {/* Top Endpoints */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Top Performing Endpoints</CardTitle>
                        <CardDescription>
                            Best performing APIs by selected metric
                        </CardDescription>
                    </div>
                    <Select value={topMetric} onValueChange={(v) => setTopMetric(v as Metric)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(metricLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent>
                    {topLoading ? (
                        <TableSkeleton rows={5} columns={6} />
                    ) : topEndpoints.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Zap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p>No endpoint data yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-3 font-medium">Rank</th>
                                        <th className="text-left p-3 font-medium">Endpoint</th>
                                        <th className="text-right p-3 font-medium">Revenue</th>
                                        <th className="text-right p-3 font-medium">Net Revenue</th>
                                        <th className="text-right p-3 font-medium">Calls</th>
                                        <th className="text-right p-3 font-medium">Payers</th>
                                        <th className="text-right p-3 font-medium">Avg Value</th>
                                        <th className="text-right p-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topEndpoints.map((item: any, index: number) => (
                                        <tr
                                            key={item.endpoint.id}
                                            className="border-b hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                                            onClick={() => router.push(`/dashboard/agentic-payments/x402/endpoints/${item.endpoint.id}`)}
                                        >
                                            <td className="p-3">
                                                <Badge variant="outline">#{index + 1}</Badge>
                                            </td>
                                            <td className="p-3">
                                                <div>
                                                    <div className="font-medium">{item.endpoint.name}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {item.endpoint.path}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-right font-medium">
                                                ${item.revenue.toFixed(2)}
                                            </td>
                                            <td className="p-3 text-right text-green-600 dark:text-green-400">
                                                ${item.netRevenue.toFixed(2)}
                                            </td>
                                            <td className="p-3 text-right">{item.calls.toLocaleString()}</td>
                                            <td className="p-3 text-right">{item.uniquePayers}</td>
                                            <td className="p-3 text-right font-mono text-sm">
                                                ${item.averageCallValue.toFixed(4)}
                                            </td>
                                            <td className="p-3 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/dashboard/agentic-payments/x402/endpoints/${item.endpoint.id}`);
                                                    }}
                                                >
                                                    <ArrowUpRight className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue Breakdown</CardTitle>
                        <CardDescription>
                            Gross revenue, fees, and net revenue
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Gross Revenue</span>
                                <span className="font-medium">${summary?.totalRevenue?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Platform Fees</span>
                                <span className="font-medium text-red-600 dark:text-red-400">
                                    -${summary?.totalFees?.toFixed(2) || '0.00'}
                                </span>
                            </div>
                            <div className="h-px bg-gray-200 dark:bg-gray-800" />
                            <div className="flex items-center justify-between">
                                <span className="font-medium">Net Revenue</span>
                                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                    ${summary?.netRevenue?.toFixed(2) || '0.00'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Transaction Metrics</CardTitle>
                        <CardDescription>
                            API calls and payment statistics
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Total Calls</span>
                                <span className="font-medium">{summary?.transactionCount?.toLocaleString() || '0'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Unique Payers</span>
                                <span className="font-medium">{summary?.uniquePayers || '0'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Avg Transaction</span>
                                <span className="font-medium font-mono">
                                    ${summary?.averageTransactionSize?.toFixed(4) || '0.0000'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Active Endpoints</span>
                                <span className="font-medium">{summary?.activeEndpoints || '0'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
