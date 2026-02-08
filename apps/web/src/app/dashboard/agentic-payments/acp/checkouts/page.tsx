'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
    Input,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@sly/ui';
import {
    Plus,
    Search,
    ShoppingCart,
    Store,
    Bot,
    CheckCircle,
    DollarSign,
    BarChart3,
} from 'lucide-react';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { CheckoutStatusBadge } from '@/components/acp/checkout-status-badge';
import { CheckoutStatus } from '@sly/api-client';

export default function CheckoutsPage() {
    const api = useApiClient();
    const { isConfigured, isLoading: isAuthLoading } = useApiConfig();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const { data, isLoading } = useQuery({
        queryKey: ['acp-checkouts', page, search, startDate, endDate],
        queryFn: () => {
            if (!api) return Promise.resolve({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
            return api.acp.list({
                page,
                limit: 10,
            });
        },
        enabled: !!api
    });

    const { data: analyticsData } = useQuery({
        queryKey: ['acp-analytics'],
        queryFn: () => api!.acp.getAnalytics({ period: '30d' }),
        enabled: !!api,
    });

    const analytics = (analyticsData as any)?.summary;

    const rawData = (data as any)?.data;
    const checkouts = Array.isArray(rawData)
        ? rawData
        : (Array.isArray((rawData as any)?.data)
            ? (rawData as any).data
            : []);

    // Check various pagination locations or empty object default
    const pagination = (data as any)?.data?.pagination || (data as any)?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };

    if (isAuthLoading) {
        return (
            <div className="p-8 max-w-[1600px] mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Checkouts</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage agentic commerce checkouts and orders
                        </p>
                    </div>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="h-10 w-full bg-muted animate-pulse rounded" />
                            <div className="h-48 w-full bg-muted animate-pulse rounded" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Checkouts</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage agentic commerce checkouts and orders
                    </p>
                </div>
                <Link href="/dashboard/agentic-payments/acp/checkouts/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Checkout
                    </Button>
                </Link>
            </div>

            {/* KPI Stats */}
            {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Checkouts</p>
                                    <p className="text-2xl font-bold mt-1">{(analytics.completedCheckouts ?? 0) + (analytics.pendingCheckouts ?? 0)}</p>
                                </div>
                                <ShoppingCart className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                                    <p className="text-2xl font-bold mt-1 text-green-600">{analytics.completedCheckouts ?? 0}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                                    <p className="text-2xl font-bold mt-1">${(analytics.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                <DollarSign className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg Order Value</p>
                                    <p className="text-2xl font-bold mt-1">${(analytics.averageOrderValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                <BarChart3 className="h-8 w-8 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <CardTitle>Recent Checkouts</CardTitle>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search checkouts..."
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="flex flex-col gap-2 flex-1">
                                <label htmlFor="start-date" className="text-sm text-muted-foreground">Start Date</label>
                                <Input
                                    id="start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            <div className="flex flex-col gap-2 flex-1">
                                <label htmlFor="end-date" className="text-sm text-muted-foreground">End Date</label>
                                <Input
                                    id="end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                            {(startDate || endDate) && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setStartDate('');
                                        setEndDate('');
                                    }}
                                    className="whitespace-nowrap"
                                >
                                    Clear Dates
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Checkout ID</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Entities</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                // Skeleton loading state
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-8 w-8 bg-muted animate-pulse rounded-full" /></TableCell>
                                        <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                                    </TableRow>
                                ))
                            ) : checkouts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        No checkouts found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                checkouts.map((checkout: any) => (
                                    <TableRow key={checkout.id} className="group cursor-pointer hover:bg-muted/50">
                                        <TableCell className="font-mono text-xs">
                                            <Link href={`/dashboard/agentic-payments/acp/checkouts/${checkout.id}`} className="block w-full h-full">
                                                {checkout.checkout_id}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span className="text-muted-foreground text-xs">{checkout.id.slice(0, 8)}...</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2" title={`Merchant: ${checkout.merchant_name}`}>
                                                    <Store className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm truncate max-w-[100px]">{checkout.merchant_name || checkout.merchant_id}</span>
                                                </div>
                                                <div className="flex items-center gap-2" title={`Agent: ${checkout.agent_name}`}>
                                                    <Bot className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm truncate max-w-[100px]">{checkout.agent_name || 'Unknown'}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm">
                                                <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                                                <span>{checkout.item_count ?? checkout.items?.length ?? 0}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {formatCurrency(checkout.total_amount, checkout.currency)}
                                        </TableCell>
                                        <TableCell>
                                            <CheckoutStatusBadge status={checkout.status} />
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {format(new Date(checkout.created_at), 'MMM d, yyyy HH:mm')}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Page {page} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    );
}
