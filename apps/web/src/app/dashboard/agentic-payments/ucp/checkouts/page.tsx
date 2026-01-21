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
} from '@payos/ui';
import {
    Search,
    ArrowLeftRight,
    User,
    Filter,
} from 'lucide-react';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { CheckoutStatusBadge } from '@/components/ucp/checkout-status-badge';
import { CorridorBadge } from '@/components/ucp/corridor-badge';

type SettlementStatus = 'all' | 'pending' | 'processing' | 'completed' | 'failed' | 'pending_approval';
type Corridor = 'all' | 'pix' | 'spei';

export default function UcpSettlementsPage() {
    const api = useApiClient();
    const { isLoading: isAuthLoading } = useApiConfig();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<SettlementStatus>('all');
    const [corridorFilter, setCorridorFilter] = useState<Corridor>('all');

    const { data, isLoading } = useQuery({
        queryKey: ['ucp-settlements', page, search, statusFilter, corridorFilter],
        queryFn: () => {
            if (!api) return Promise.resolve({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
            return api.ucp.list({
                page,
                limit: 10,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                corridor: corridorFilter !== 'all' ? corridorFilter : undefined,
            });
        },
        enabled: !!api
    });

    const settlements = data?.data || [];
    const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };

    if (isAuthLoading) {
        return (
            <div className="p-8 max-w-[1600px] mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Settlements</h1>
                        <p className="text-muted-foreground mt-1">
                            Cross-border settlements via UCP payment handlers
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
                    <h1 className="text-3xl font-bold tracking-tight">Settlements</h1>
                    <p className="text-muted-foreground mt-1">
                        Cross-border settlements via UCP payment handlers
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <ArrowLeftRight className="h-5 w-5" />
                                Recent Settlements
                            </CardTitle>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search settlements..."
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
                            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SettlementStatus)}>
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={corridorFilter} onValueChange={(v) => setCorridorFilter(v as Corridor)}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Corridor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Corridors</SelectItem>
                                    <SelectItem value="pix">🇧🇷 Pix</SelectItem>
                                    <SelectItem value="spei">🇲🇽 SPEI</SelectItem>
                                </SelectContent>
                            </Select>
                            {(statusFilter !== 'all' || corridorFilter !== 'all') && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setStatusFilter('all');
                                        setCorridorFilter('all');
                                    }}
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
                                <TableHead>Settlement ID</TableHead>
                                <TableHead>Recipient</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Corridor</TableHead>
                                <TableHead>FX Rate</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-5 w-20 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                                    </TableRow>
                                ))
                            ) : settlements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <ArrowLeftRight className="h-8 w-8 text-muted-foreground/50" />
                                            <span>No settlements found</span>
                                            <span className="text-xs">Settlements will appear here when you process UCP payments</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                settlements.map((settlement: any) => (
                                    <TableRow key={settlement.id} className="group cursor-pointer hover:bg-muted/50">
                                        <TableCell className="font-mono text-xs">
                                            <Link
                                                href={`/dashboard/agentic-payments/ucp/checkouts/${settlement.id}`}
                                                className="block w-full h-full hover:underline"
                                            >
                                                {settlement.id.slice(0, 8)}...
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium truncate max-w-[150px]">
                                                        {settlement.recipient?.name || 'Unknown'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {settlement.corridor === 'pix'
                                                            ? settlement.recipient?.pix_key?.slice(0, 12) + '...'
                                                            : settlement.recipient?.clabe?.slice(0, 8) + '...'
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {formatCurrency(settlement.amount, settlement.currency)}
                                                </span>
                                                {settlement.quote && (
                                                    <span className="text-xs text-muted-foreground">
                                                        → {formatCurrency(settlement.quote.toAmount, settlement.quote.toCurrency)}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <CorridorBadge corridor={settlement.corridor} />
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {settlement.quote?.fxRate?.toFixed(4) || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <CheckoutStatusBadge status={settlement.status} />
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {format(new Date(settlement.createdAt), 'MMM d, yyyy HH:mm')}
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
