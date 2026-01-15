"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Play, Calendar } from "lucide-react";
import { useApiClient } from "@/lib/api-client";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Separator,
    Badge,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@payos/ui";

import { MandateStatusBadge } from "@/components/ap2/mandate-status-badge";
import { MandateUtilizationBar } from "@/components/ap2/mandate-utilization-bar";
import { ExecutePaymentDialog } from "@/components/ap2/execute-payment-dialog";
import { ProtocolBadge } from "@/components/agentic-payments/protocol-badge";
import { MandateActionsMenu } from "@/components/ap2/mandate-actions-menu";
import { VirtualCard } from "@/components/ap2/virtual-card";

export default function MandateDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const api = useApiClient();
    const queryClient = useQueryClient();
    const [showExecuteDialog, setShowExecuteDialog] = useState(false);

    const { data: mandate, isLoading, refetch } = useQuery({
        queryKey: ["mandate", id],
        queryFn: async () => {
            if (!api) throw new Error("API client not initialized");
            return api.ap2.get(id as string);
        },
        enabled: !!api && !!id,
    });

    const cancelMutation = useMutation({
        mutationFn: async () => {
            if (!api) throw new Error("API client not initialized");
            return api.ap2.cancel(id as string);
        },
        onSuccess: () => {
            toast.success("Mandate cancelled");
            queryClient.invalidateQueries({ queryKey: ["mandate", id] });
            refetch(); // Refetch to update status
        },
        onError: () => {
            toast.error("Failed to cancel mandate");
        }
    });

    // Helper to check if a string is a valid UUID
    const isValidUUID = (str: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    };

    // Fetch Agent details only if agent_id is a valid UUID (PayOS agent)
    // AP2 agent_id can be external identifiers like "agent_booking_bot_123"
    const { data: agent } = useQuery({
        queryKey: ["agent", mandate?.agent?.id],
        queryFn: async () => {
            if (!api || !mandate?.agent?.id) return null;
            return api.agents.get(mandate.agent.id);
        },
        enabled: !!api && !!mandate?.agent?.id && isValidUUID(mandate.agent.id),
    });

    // Fetch Account details if name is unknown
    const { data: account } = useQuery({
        queryKey: ["account", mandate?.account?.id],
        queryFn: async () => {
            if (!api || !mandate?.account?.id) return null;
            return api.accounts.get(mandate.account.id);
        },
        enabled: !!api && !!mandate?.account?.id,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="text-center">Loading mandate details...</div>
            </div>
        );
    }



    if (!mandate) {
        return (
            <div className="flex flex-col items-center justify-center p-12 gap-4">
                <div className="text-xl font-semibold">Mandate not found</div>
                <Button asChild variant="outline">
                    <Link href="/dashboard/agentic-payments/ap2/mandates">Go Back</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Link href="/dashboard/agentic-payments/ap2/mandates" className="hover:text-foreground">
                    Mandates
                </Link>
                <span>/</span>
                <span className="text-foreground">{mandate.mandateId}</span>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <ProtocolBadge protocol="ap2" className="h-8 w-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">{mandate.mandateId}</h1>
                            <MandateStatusBadge status={mandate.status} />
                        </div>
                        <p className="text-muted-foreground flex items-center gap-2 text-sm mt-1">
                            <span>{mandate.id}</span>
                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => {
                                navigator.clipboard.writeText(mandate.id);
                                toast.success("Copied to clipboard");
                            }}>
                                <Copy className="h-3 w-3" />
                            </Button>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {mandate.status === "active" && (
                        <Button onClick={() => setShowExecuteDialog(true)}>
                            <Play className="mr-2 h-4 w-4" />
                            Execute Payment
                        </Button>
                    )}

                    <MandateActionsMenu
                        mandate={mandate}
                        variant="button"
                        showViewDetails={false}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Mandate Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MandateUtilizationBar
                            authorized={mandate.amount.authorized}
                            used={mandate.amount.used}
                            currency={mandate.amount.currency}
                            className="mt-2"
                        />

                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg bg-muted/50 border">
                                <div className="text-sm text-muted-foreground mb-1">Total Authorized</div>
                                <div className="text-2xl font-bold">{formatCurrency(mandate.amount.authorized, mandate.amount.currency)}</div>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50 border">
                                <div className="text-sm text-muted-foreground mb-1">Total Used</div>
                                <div className="text-2xl font-bold">{formatCurrency(mandate.amount.used, mandate.amount.currency)}</div>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50 border">
                                <div className="text-sm text-muted-foreground mb-1">Remaining</div>
                                <div className="text-2xl font-bold text-primary">{formatCurrency(mandate.amount.remaining, mandate.amount.currency)}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="text-sm text-muted-foreground mb-1">Authorized Agent</div>
                                <div className="font-medium flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">A</div>
                                    {agent?.name || mandate.agent.name}
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <div className="text-sm text-muted-foreground mb-1">Funding Account</div>
                                <div className="font-medium flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-xs">F</div>
                                    {account?.name || mandate.account.name}
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <div className="text-sm text-muted-foreground mb-1">Type</div>
                                <Badge variant="outline" className="capitalize">{mandate.type}</Badge>
                            </div>
                            <Separator />
                            <div>
                                <div className="text-sm text-muted-foreground mb-1">Created At</div>
                                <div className="font-medium text-sm flex items-center gap-2">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(mandate.createdAt)}
                                </div>
                            </div>
                            {mandate.expiresAt && (
                                <>
                                    <Separator />
                                    <div>
                                        <div className="text-sm text-muted-foreground mb-1">Expires At</div>
                                        <div className="font-medium text-sm text-amber-600 flex items-center gap-2">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(mandate.expiresAt)}
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <VirtualCard mandate={mandate} />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Execution History</CardTitle>
                    <CardDescription>All payments processed under this mandate.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Execution ID</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mandate.executions && mandate.executions.length > 0 ? (
                                mandate.executions.map((execution) => (
                                    <TableRow key={execution.id}>
                                        <TableCell className="font-mono text-xs">#{execution.executionIndex}</TableCell>
                                        <TableCell>{formatCurrency(execution.amount, execution.currency)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={execution.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 border-transparent' : ''}>
                                                {execution.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(execution.createdAt)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/dashboard/transfers/${execution.transferId}`}>
                                                    View Transfer
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No executions yet. Execute a payment to see history here.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {
                showExecuteDialog && (
                    <ExecutePaymentDialog
                        mandate={mandate}
                        open={showExecuteDialog}
                        onOpenChange={setShowExecuteDialog}
                        onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ["mandate", id] });
                            toast.success("Mandate updated");
                        }}
                    />
                )
            }
        </div >
    );
}
