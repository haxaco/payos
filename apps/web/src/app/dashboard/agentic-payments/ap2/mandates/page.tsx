"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter, FileText, CheckCircle, DollarSign, BarChart3 } from "lucide-react";
import { useApiClient } from "@/lib/api-client";
import { formatDate, formatCurrency } from "@/lib/utils";

import {
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
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@sly/ui";
import { MandateStatusBadge } from "@/components/ap2/mandate-status-badge";
import { MandateStatus } from "@sly/api-client";
import { MandateActionsMenu } from "@/components/ap2/mandate-actions-menu";

export default function MandatesPage() {
    const api = useApiClient();
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    const { data: rawData, isLoading } = useQuery({
        queryKey: ["ap2-mandates", page, status, search, startDate, endDate],
        queryFn: () =>
            api!.ap2.list({
                page,
                limit: 20,
                status: status === "all" ? undefined : (status as MandateStatus),
                search: search || undefined,
            }),
        enabled: !!api,
    });

    const { data: analyticsData } = useQuery({
        queryKey: ["ap2-analytics"],
        queryFn: () => api!.ap2.getAnalytics({ period: '30d' }),
        enabled: !!api,
    });

    const analytics = (analyticsData as any)?.summary;

    // The API client now returns data directly (not double-nested)
    const mandates = (rawData as any)?.data || [];
    const pagination = (rawData as any)?.pagination;

    return (
        <div className="p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">AP2 Mandates</h1>
                    <p className="text-muted-foreground">
                        Manage agent authorization mandates provided by Google AP2.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/agentic-payments/ap2/mandates/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Mandate
                    </Link>
                </Button>
            </div>

            {/* KPI Stats */}
            {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Mandates</p>
                                    <p className="text-2xl font-bold mt-1">{analytics.totalMandates ?? 0}</p>
                                </div>
                                <FileText className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Active Mandates</p>
                                    <p className="text-2xl font-bold mt-1 text-green-600">{analytics.activeMandates ?? 0}</p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Authorized</p>
                                    <p className="text-2xl font-bold mt-1">${(analytics.totalAuthorized ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                <DollarSign className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Utilization Rate</p>
                                    <p className="text-2xl font-bold mt-1">{analytics.utilizationRate ?? 0}%</p>
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
                        <div className="flex flex-col md:flex-row gap-4 justify-between">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search mandates..."
                                    className="pl-9"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                        <SelectItem value="expired">Expired</SelectItem>
                                    </SelectContent>
                                </Select>
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
                                        setStartDate("");
                                        setEndDate("");
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
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mandate ID</TableHead>
                                    <TableHead>Agent</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Authorized</TableHead>
                                    <TableHead>Used</TableHead>
                                    <TableHead>Remaining</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Created</TableHead>
                                    <TableHead className="w-[80px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center">
                                            Loading mandates...
                                        </TableCell>
                                    </TableRow>
                                ) : mandates?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-24 text-center">
                                            No mandates found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    mandates?.map((mandate: any) => (
                                        <TableRow key={mandate.id} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell className="font-medium">
                                                <Link href={`/dashboard/agentic-payments/ap2/mandates/${mandate.id}`} className="block">
                                                    {mandate.mandateId}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{mandate.agent.name}</TableCell>
                                            <TableCell className="capitalize">{mandate.type}</TableCell>
                                            <TableCell>{formatCurrency(mandate.amount.authorized, mandate.amount.currency)}</TableCell>
                                            <TableCell>{formatCurrency(mandate.amount.used, mandate.amount.currency)}</TableCell>
                                            <TableCell>{formatCurrency(mandate.amount.remaining, mandate.amount.currency)}</TableCell>
                                            <TableCell>
                                                <MandateStatusBadge status={mandate.status} />
                                            </TableCell>
                                            <TableCell className="text-right text-muted-foreground">
                                                {formatDate(mandate.createdAt)}
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end">
                                                    <MandateActionsMenu mandate={mandate} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.total > 0 && (
                        <div className="flex items-center justify-between px-2 py-4">
                            <div className="text-sm text-muted-foreground">
                                Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, pagination.total)} of {pagination.total} mandates
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <div className="text-sm font-medium">
                                    Page {page} of {Math.ceil(pagination.total / 20)}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(page + 1)}
                                    disabled={page >= Math.ceil(pagination.total / 20)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
