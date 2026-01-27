'use client';

import { useQuery } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
    Badge,
} from '@sly/ui';
import {
    ArrowLeft,
    User,
    Globe,
    Landmark,
    ArrowRight,
    Clock,
    CheckCircle2,
    XCircle,
    Copy,
    ExternalLink,
    RefreshCw,
} from 'lucide-react';
import { useApiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckoutStatusBadge } from '@/components/ucp/checkout-status-badge';
import { CorridorBadge } from '@/components/ucp/corridor-badge';
import { toast } from 'sonner';

export default function UcpSettlementDetailPage() {
    const api = useApiClient();
    const params = useParams();
    const id = params.id as string;

    const { data: settlement, isLoading, refetch } = useQuery({
        queryKey: ['ucp-settlement', id],
        queryFn: () => {
            if (!api) throw new Error("API not initialized");
            return api.ucp.get(id);
        },
        enabled: !!api,
    });

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    if (isLoading) {
        return (
            <div className="p-8 max-w-[1200px] mx-auto">
                <div className="space-y-6">
                    <div className="h-8 w-64 bg-muted animate-pulse rounded" />
                    <div className="h-48 w-full bg-muted animate-pulse rounded" />
                </div>
            </div>
        );
    }

    if (!settlement) {
        return (
            <div className="p-8 max-w-[1200px] mx-auto">
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <XCircle className="h-12 w-12 mb-4" />
                    <p>Settlement not found</p>
                    <Link href="/dashboard/agentic-payments/ucp/settlements">
                        <Button variant="link">Back to settlements</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const quote = settlement.quote;
    const recipient = settlement.recipient;

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/agentic-payments/ucp/settlements">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">Settlement Details</h1>
                        <CheckoutStatusBadge status={settlement.status} />
                        <CorridorBadge corridor={settlement.corridor} showCountry />
                    </div>
                    <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
                        <span className="font-mono">{settlement.id}</span>
                        <button
                            onClick={() => copyToClipboard(settlement.id, 'Settlement ID')}
                            className="hover:text-foreground"
                        >
                            <Copy className="h-3 w-3" />
                        </button>
                        <span className="mx-2">•</span>
                        Created {format(new Date(settlement.createdAt), 'MMM d, yyyy HH:mm')}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Main Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Amount & Conversion */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ArrowRight className="h-5 w-5" />
                                Payment Amount
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-center gap-8 py-6">
                                {/* From Amount */}
                                <div className="text-center">
                                    <div className="text-sm text-muted-foreground mb-1">Paid</div>
                                    <div className="text-3xl font-bold">
                                        {formatCurrency(settlement.amount, settlement.currency)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {settlement.currency}
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="flex flex-col items-center">
                                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                                    {quote && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            @ {quote.fxRate?.toFixed(4)}
                                        </div>
                                    )}
                                </div>

                                {/* To Amount */}
                                <div className="text-center">
                                    <div className="text-sm text-muted-foreground mb-1">Received</div>
                                    <div className="text-3xl font-bold text-green-600">
                                        {quote ? formatCurrency(quote.toAmount, quote.toCurrency) : '-'}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {quote?.toCurrency || (settlement.corridor === 'pix' ? 'BRL' : 'MXN')}
                                    </div>
                                </div>
                            </div>

                            {/* Fee Breakdown */}
                            {quote?.fees && (
                                <div className="border-t pt-4 mt-4">
                                    <div className="text-sm font-medium mb-3">Fee Breakdown</div>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div className="p-3 bg-muted/50 rounded-lg">
                                            <div className="text-muted-foreground">Platform Fee</div>
                                            <div className="font-medium">${quote.fees.platform?.toFixed(2) || '0.00'}</div>
                                        </div>
                                        <div className="p-3 bg-muted/50 rounded-lg">
                                            <div className="text-muted-foreground">FX Fee</div>
                                            <div className="font-medium">${quote.fees.fx?.toFixed(2) || '0.00'}</div>
                                        </div>
                                        <div className="p-3 bg-muted/50 rounded-lg">
                                            <div className="text-muted-foreground">Total Fees</div>
                                            <div className="font-medium">${quote.fees.total?.toFixed(2) || '0.00'}</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recipient Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Recipient
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        {settlement.corridor === 'pix' ? (
                                            <Landmark className="h-6 w-6 text-primary" />
                                        ) : (
                                            <Globe className="h-6 w-6 text-primary" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-lg">{recipient?.name || 'Unknown'}</div>
                                        <div className="text-muted-foreground">
                                            {settlement.corridor === 'pix' ? 'Brazil' : 'Mexico'}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                    {settlement.corridor === 'pix' ? (
                                        <>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Pix Key Type</div>
                                                <div className="font-medium capitalize">{recipient?.pix_key_type || '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm text-muted-foreground">Pix Key</div>
                                                <div className="font-mono text-sm truncate">{recipient?.pix_key || '-'}</div>
                                            </div>
                                            {recipient?.tax_id && (
                                                <div>
                                                    <div className="text-sm text-muted-foreground">Tax ID (CPF/CNPJ)</div>
                                                    <div className="font-mono">{recipient.tax_id}</div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="col-span-2">
                                                <div className="text-sm text-muted-foreground">CLABE</div>
                                                <div className="font-mono text-sm flex items-center gap-2">
                                                    {recipient?.clabe || '-'}
                                                    {recipient?.clabe && (
                                                        <button 
                                                            onClick={() => copyToClipboard(recipient.clabe!, 'CLABE')}
                                                            className="text-muted-foreground hover:text-foreground"
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {recipient?.rfc && (
                                                <div>
                                                    <div className="text-sm text-muted-foreground">RFC</div>
                                                    <div className="font-mono">{recipient.rfc}</div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Status & Timeline */}
                <div className="space-y-6">
                    {/* Status Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Status Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Created */}
                                <div className="flex items-start gap-3">
                                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium">Created</div>
                                        <div className="text-sm text-muted-foreground">
                                            {format(new Date(settlement.createdAt), 'MMM d, yyyy HH:mm:ss')}
                                        </div>
                                    </div>
                                </div>

                                {/* Processing/Completed */}
                                {settlement.status === 'completed' && settlement.completedAt && (
                                    <div className="flex items-start gap-3">
                                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium">Completed</div>
                                            <div className="text-sm text-muted-foreground">
                                                {format(new Date(settlement.completedAt), 'MMM d, yyyy HH:mm:ss')}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Failed */}
                                {settlement.status === 'failed' && (
                                    <div className="flex items-start gap-3">
                                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                            <XCircle className="h-4 w-4 text-red-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-red-600">Failed</div>
                                            <div className="text-sm text-muted-foreground">
                                                {settlement.failureReason || 'Unknown error'}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Pending */}
                                {(settlement.status === 'pending' || settlement.status === 'processing') && (
                                    <div className="flex items-start gap-3">
                                        <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0 animate-pulse">
                                            <Clock className="h-4 w-4 text-yellow-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium">
                                                {settlement.status === 'processing' ? 'Processing' : 'Pending'}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Awaiting payment completion
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Related Links */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Related</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {settlement.transferId && (
                                <Link 
                                    href={`/dashboard/transfers/${settlement.transferId}`}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <span className="text-sm font-medium">View Transfer</span>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                </Link>
                            )}
                            {settlement.mandateId && (
                                <Link 
                                    href={`/dashboard/agentic-payments/ap2/mandates/${settlement.mandateId}`}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <span className="text-sm font-medium">View AP2 Mandate</span>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                </Link>
                            )}
                            {settlement.approvalId && (
                                <Link 
                                    href={`/dashboard/approvals?id=${settlement.approvalId}`}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <span className="text-sm font-medium">View Approval Request</span>
                                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                </Link>
                            )}
                            {!settlement.transferId && !settlement.mandateId && !settlement.approvalId && (
                                <div className="text-sm text-muted-foreground text-center py-2">
                                    No related records
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Metadata */}
                    {settlement.metadata && Object.keys(settlement.metadata).length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Metadata</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                                    {JSON.stringify(settlement.metadata, null, 2)}
                                </pre>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
