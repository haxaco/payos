'use client';

import { useQuery } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
} from '@payos/ui';
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    Clock,
    XCircle,
    Copy,
    RefreshCw,
    CreditCard,
    ShoppingCart,
    CalendarClock,
    MapPin,
} from 'lucide-react';
import { useApiClient } from '@/lib/api-client';
import { format, isValid, parseISO } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { OrderStatusBadge } from '@/components/ucp/order-status-badge';
import { LineItemsTable } from '@/components/ucp/line-items-table';
import { CheckoutTotalsCard } from '@/components/ucp/checkout-totals-card';
import { FulfillmentTimeline } from '@/components/ucp/fulfillment-timeline';
import { AdjustmentsTable } from '@/components/ucp/adjustments-table';
import { toast } from 'sonner';

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

export default function OrderDetailPage() {
    const api = useApiClient();
    const params = useParams();
    const id = params.id as string;

    const { data: order, isLoading, refetch } = useQuery({
        queryKey: ['ucp-order', id],
        queryFn: () => {
            if (!api) throw new Error("API not initialized");
            return api.ucp.orders.get(id);
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

    if (!order) {
        return (
            <div className="p-8 max-w-[1200px] mx-auto">
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <XCircle className="h-12 w-12 mb-4" />
                    <p>Order not found</p>
                    <Link href="/dashboard/agentic-payments/ucp/orders">
                        <Button variant="link">Back to orders</Button>
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
                    <Link href="/dashboard/agentic-payments/ucp/orders">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">Order Details</h1>
                        <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
                        <span className="font-mono">{order.id}</span>
                        <button
                            onClick={() => copyToClipboard(order.id, 'Order ID')}
                            className="hover:text-foreground"
                        >
                            <Copy className="h-3 w-3" />
                        </button>
                        <span className="mx-2">•</span>
                        Created {safeFormatDate(order.created_at, 'MMM d, yyyy HH:mm')}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Line Items, Fulfillment, Adjustments */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Line Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Line Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <LineItemsTable
                                items={order.line_items || []}
                                currency={order.currency || 'USD'}
                            />
                        </CardContent>
                    </Card>

                    {/* Fulfillment Timeline */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Fulfillment Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FulfillmentTimeline events={order.events || []} />
                        </CardContent>
                    </Card>

                    {/* Adjustments */}
                    {order.adjustments && order.adjustments.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Adjustments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <AdjustmentsTable adjustments={order.adjustments} currency={order.currency || 'USD'} />
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column: Summary, Buyer Info, Related */}
                <div className="space-y-6">
                    {/* Order Summary */}
                    <CheckoutTotalsCard
                        title="Order Summary"
                        totals={order.totals || []}
                        currency={order.currency || 'USD'}
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
                            {order.buyer?.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{order.buyer.email}</span>
                                </div>
                            )}
                            {order.buyer?.name && (
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{order.buyer.name}</span>
                                </div>
                            )}
                            {order.buyer?.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{order.buyer.phone}</span>
                                </div>
                            )}
                            {!order.buyer && (
                                <div className="text-sm text-muted-foreground text-center py-2">
                                    No buyer information
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Shipping Address */}
                    {order.shipping_address && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <MapPin className="h-4 w-4" />
                                    Shipping Address
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm space-y-1">
                                    {order.shipping_address.line1 && (
                                        <div>{order.shipping_address.line1}</div>
                                    )}
                                    {order.shipping_address.line2 && (
                                        <div>{order.shipping_address.line2}</div>
                                    )}
                                    <div>
                                        {[
                                            order.shipping_address.city,
                                            order.shipping_address.state,
                                            order.shipping_address.postal_code,
                                        ].filter(Boolean).join(', ')}
                                    </div>
                                    {order.shipping_address.country && (
                                        <div>{order.shipping_address.country}</div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Expectations */}
                    {order.expectations && order.expectations.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <CalendarClock className="h-4 w-4" />
                                    Delivery Expectations
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                {order.expectations.map((exp: any, idx: number) => (
                                    <div key={idx} className="border-b last:border-0 pb-2 last:pb-0">
                                        {exp.description && (
                                            <div className="font-medium">{exp.description}</div>
                                        )}
                                        {exp.estimated_date && (
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>Est. Date</span>
                                                <span>{safeFormatDate(exp.estimated_date, 'MMM d, yyyy')}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Payment Status */}
                    {order.payment && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <CreditCard className="h-4 w-4" />
                                    Payment
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Status</span>
                                    <span className={`font-medium ${order.payment.status === 'completed' ? 'text-green-600' : ''}`}>
                                        {order.payment.status || 'Pending'}
                                    </span>
                                </div>
                                {order.payment.handler_id && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Handler</span>
                                        <span>{order.payment.handler_id}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Related Links */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Related</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {order.checkout_id && (
                                <Link
                                    href={`/dashboard/agentic-payments/ucp/hosted-checkouts/${order.checkout_id}`}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">View Checkout</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {order.checkout_id.slice(0, 8)}...
                                    </span>
                                </Link>
                            )}
                            {!order.checkout_id && (
                                <div className="text-sm text-muted-foreground text-center py-2">
                                    No related records
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
