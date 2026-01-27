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
    TableRow,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@sly/ui';
import {
    Search,
    ShoppingCart,
    User,
    Filter,
    Package,
} from 'lucide-react';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { format, isValid, parseISO } from 'date-fns';
import Link from 'next/link';

// Safe date formatting helper
function safeFormatDate(dateStr: string | undefined | null, formatStr: string): string {
    if (!dateStr) return 'Unknown';
    try {
        const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
        if (!isValid(date)) return 'Invalid date';
        return format(date, formatStr);
    } catch {
        return 'Invalid date';
    }
}

// Get total amount from UCP totals array
function getTotalAmount(totals: any[] | undefined): number {
    if (!totals || !Array.isArray(totals)) return 0;
    const total = totals.find((t: any) => t.type === 'total');
    return total?.amount || 0;
}
import { HostedCheckoutStatusBadge, type HostedCheckoutStatus } from '@/components/ucp/hosted-checkout-status-badge';

type StatusFilter = 'all' | HostedCheckoutStatus;

export default function HostedCheckoutsPage() {
    const api = useApiClient();
    const { isLoading: isAuthLoading } = useApiConfig();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    const { data, isLoading } = useQuery({
        queryKey: ['ucp-hosted-checkouts', page, search, statusFilter],
        queryFn: () => {
            if (!api) return Promise.resolve({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
            return api.ucp.checkouts.list({
                limit: 10,
                offset: (page - 1) * 10,
                status: statusFilter !== 'all' ? statusFilter : undefined,
            });
        },
        enabled: !!api
    });

    const checkouts = data?.data || [];
    const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };

    if (isAuthLoading) {
        return (
            <div className="p-8 max-w-[1600px] mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Sly Checkouts</h1>
                        <p className="text-muted-foreground mt-1">
                            Hosted checkout sessions for agentic commerce
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
                    <h1 className="text-3xl font-bold tracking-tight">Sly Checkouts</h1>
                    <p className="text-muted-foreground mt-1">
                        Hosted checkout sessions for agentic commerce
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5" />
                                Checkout Sessions
                            </CardTitle>
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
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Filters:</span>
                            </div>
                            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="incomplete">Incomplete</SelectItem>
                                    <SelectItem value="requires_escalation">Requires Escalation</SelectItem>
                                    <SelectItem value="ready_for_complete">Ready to Complete</SelectItem>
                                    <SelectItem value="complete_in_progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="canceled">Canceled</SelectItem>
                                </SelectContent>
                            </Select>
                            {statusFilter !== 'all' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setStatusFilter('all')}
                                >
                                    Clear Filters
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
                                <TableHead>Status</TableHead>
                                <TableHead>Currency</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-center">Items</TableHead>
                                <TableHead>Buyer</TableHead>
                                <TableHead>Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-5 w-24 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded mx-auto" /></TableCell>
                                        <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                                    </TableRow>
                                ))
                            ) : checkouts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
                                            <span>No checkouts found</span>
                                            <span className="text-xs">Sly checkout sessions will appear here</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                checkouts.map((checkout: any) => (
                                    <TableRow key={checkout.id} className="group cursor-pointer hover:bg-muted/50">
                                        <TableCell className="font-mono text-xs">
                                            <Link
                                                href={`/dashboard/agentic-payments/ucp/hosted-checkouts/${checkout.id}`}
                                                className="block w-full h-full hover:underline"
                                            >
                                                {checkout.id.slice(0, 8)}...
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <HostedCheckoutStatusBadge status={checkout.status} />
                                        </TableCell>
                                        <TableCell className="text-sm font-medium">
                                            {checkout.currency || 'USD'}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(getTotalAmount(checkout.totals), checkout.currency || 'USD')}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Package className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-sm">{checkout.line_items?.length || 0}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm truncate max-w-[150px]">
                                                    {checkout.buyer?.email || 'No buyer info'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {safeFormatDate(checkout.created_at, 'MMM d, yyyy HH:mm')}
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
        </div>
    );
}
