'use client';

import { useQuery } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
} from '@sly/ui';
import {
    ArrowLeft,
    User,
    Mail,
    MapPin,
    Clock,
    CheckCircle2,
    XCircle,
    Copy,
    RefreshCw,
    CreditCard,
    MessageSquare,
} from 'lucide-react';
import { useApiClient } from '@/lib/api-client';
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
import { useParams } from 'next/navigation';
import { HostedCheckoutStatusBadge } from '@/components/ucp/hosted-checkout-status-badge';
import { LineItemsTable } from '@/components/ucp/line-items-table';
import { CheckoutTotalsCard } from '@/components/ucp/checkout-totals-card';
import { toast } from 'sonner';

export default function HostedCheckoutDetailPage() {
    const api = useApiClient();
    const params = useParams();
    const id = params.id as string;

    const { data: checkout, isLoading, refetch } = useQuery({
        queryKey: ['ucp-hosted-checkout', id],
        queryFn: () => {
            if (!api) throw new Error("API not initialized");
            return api.ucp.checkouts.get(id);
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

    if (!checkout) {
        return (
            <div className="p-8 max-w-[1200px] mx-auto">
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <XCircle className="h-12 w-12 mb-4" />
                    <p>Checkout not found</p>
                    <Link href="/dashboard/agentic-payments/ucp/hosted-checkouts">
                        <Button variant="link">Back to checkouts</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/agentic-payments/ucp/hosted-checkouts">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">Checkout Details</h1>
                        <HostedCheckoutStatusBadge status={checkout.status} />
                    </div>
                    <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
                        <span className="font-mono">{checkout.id}</span>
                        <button
                            onClick={() => copyToClipboard(checkout.id, 'Checkout ID')}
                            className="hover:text-foreground"
                        >
                            <Copy className="h-3 w-3" />
                        </button>
                        <span className="mx-2">•</span>
                        Created {safeFormatDate(checkout.created_at, 'MMM d, yyyy HH:mm')}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Line Items and Messages */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Line Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Line Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <LineItemsTable
                                items={checkout.line_items || []}
                                currency={checkout.currency || 'USD'}
                            />
                        </CardContent>
                    </Card>

                    {/* Payment Instruments */}
                    {checkout.payment_instruments && checkout.payment_instruments.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Payment Instruments
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {checkout.payment_instruments.map((instrument: any, index: number) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <div className="font-medium">{instrument.type}</div>
                                                    {instrument.details && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {instrument.details}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {instrument.status && (
                                                <span className="text-xs px-2 py-1 rounded bg-muted">
                                                    {instrument.status}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Messages */}
                    {checkout.messages && checkout.messages.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5" />
                                    Messages
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {checkout.messages.map((message: any, index: number) => (
                                        <div
                                            key={index}
                                            className={`p-3 rounded-lg ${
                                                message.role === 'agent'
                                                    ? 'bg-blue-50 border-blue-100'
                                                    : 'bg-gray-50 border-gray-100'
                                            } border`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-medium capitalize">
                                                    {message.role}
                                                </span>
                                                {message.timestamp && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {safeFormatDate(message.timestamp, 'HH:mm')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm">{message.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column: Summary and Buyer Info */}
                <div className="space-y-6">
                    {/* Order Totals */}
                    <CheckoutTotalsCard
                        totals={checkout.totals || []}
                        currency={checkout.currency || 'USD'}
                    />

                    {/* Buyer Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <User className="h-4 w-4" />
                                Buyer Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {checkout.buyer?.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{checkout.buyer.email}</span>
                                </div>
                            )}
                            {checkout.buyer?.name && (
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{checkout.buyer.name}</span>
                                </div>
                            )}
                            {checkout.buyer?.phone && (
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{checkout.buyer.phone}</span>
                                </div>
                            )}
                            {!checkout.buyer && (
                                <div className="text-sm text-muted-foreground text-center py-2">
                                    No buyer information
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Shipping Address */}
                    {checkout.shipping_address && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <MapPin className="h-4 w-4" />
                                    Shipping Address
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm space-y-1">
                                    {checkout.shipping_address.line1 && (
                                        <div>{checkout.shipping_address.line1}</div>
                                    )}
                                    {checkout.shipping_address.line2 && (
                                        <div>{checkout.shipping_address.line2}</div>
                                    )}
                                    <div>
                                        {[
                                            checkout.shipping_address.city,
                                            checkout.shipping_address.state,
                                            checkout.shipping_address.postal_code,
                                        ].filter(Boolean).join(', ')}
                                    </div>
                                    {checkout.shipping_address.country && (
                                        <div>{checkout.shipping_address.country}</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Status Timeline */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Clock className="h-4 w-4" />
                                Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">Created</div>
                                        <div className="text-xs text-muted-foreground">
                                            {safeFormatDate(checkout.created_at, 'MMM d, yyyy HH:mm:ss')}
                                        </div>
                                    </div>
                                </div>

                                {checkout.completed_at && (
                                    <div className="flex items-start gap-3">
                                        <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium">Completed</div>
                                            <div className="text-xs text-muted-foreground">
                                                {safeFormatDate(checkout.completed_at, 'MMM d, yyyy HH:mm:ss')}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {checkout.canceled_at && (
                                    <div className="flex items-start gap-3">
                                        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                            <XCircle className="h-3 w-3 text-gray-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium">Canceled</div>
                                            <div className="text-xs text-muted-foreground">
                                                {safeFormatDate(checkout.canceled_at, 'MMM d, yyyy HH:mm:ss')}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Order ID Link */}
                    {checkout.order_id && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Related Order</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Link
                                    href={`/dashboard/agentic-payments/ucp/orders/${checkout.order_id}`}
                                    className="text-sm text-primary hover:underline"
                                >
                                    View Order →
                                </Link>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
