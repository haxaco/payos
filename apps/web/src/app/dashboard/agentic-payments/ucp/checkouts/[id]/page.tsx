'use client';

import { useQuery } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Badge,
    Button,
} from '@sly/ui';
import {
    ArrowLeft,
    ShoppingCart,
    Package,
    CreditCard,
    Clock,
    CheckCircle2,
    XCircle,
    Copy,
    Bot,
    User,
    MapPin,
} from 'lucide-react';
import { useApiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

export default function UcpCheckoutDetailPage() {
    const api = useApiClient();
    const params = useParams();
    const id = params.id as string;

    const { data: checkout, isLoading } = useQuery({
        queryKey: ['ucp-checkout', id],
        queryFn: async () => {
            if (!api) throw new Error('API not initialized');
            const result = await api.ucp.checkouts.get(id);
            const raw = result as any;
            return raw?.data || raw;
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
                    <p>Checkout session not found</p>
                    <Link href="/dashboard/agentic-payments">
                        <Button variant="link">Back to Agentic Payments</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const lineItems = checkout.line_items || [];
    const totals = checkout.totals || [];
    const buyer = checkout.buyer;
    const shipping = checkout.shipping_address;
    const metadata = checkout.metadata || {};
    const instruments = checkout.payment_instruments || [];
    const messages = checkout.messages || [];
    const totalAmount = totals.find((t: any) => t.type === 'total')?.amount ?? 0;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
            case 'confirmed':
                return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmed</Badge>;
            case 'requires_escalation':
                return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><Clock className="h-3 w-3 mr-1" />Requires Escalation</Badge>;
            case 'incomplete':
                return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" />Incomplete</Badge>;
            case 'cancelled':
                return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
            default:
                return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
        }
    };

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/agentic-payments">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">UCP Checkout</h1>
                        {getStatusBadge(checkout.status)}
                        {metadata.merchant_name && (
                            <Badge variant="outline">{metadata.merchant_name}</Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2">
                        <span className="font-mono">{checkout.id}</span>
                        <button
                            onClick={() => copyToClipboard(checkout.id, 'Checkout ID')}
                            className="hover:text-foreground"
                        >
                            <Copy className="h-3 w-3" />
                        </button>
                        <span className="mx-2">·</span>
                        Created {format(new Date(checkout.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Line Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5" />
                                Line Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {lineItems.map((item: any, i: number) => (
                                    <div key={item.id || i} className="flex items-start justify-between py-3 border-b last:border-0">
                                        <div className="flex items-start gap-3">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded object-cover" />
                                            ) : (
                                                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                                    <Package className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium">{item.name}</div>
                                                {item.description && (
                                                    <div className="text-sm text-muted-foreground">{item.description}</div>
                                                )}
                                                <div className="text-sm text-muted-foreground">Qty: {item.quantity}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium">
                                                {formatCurrency((item.total_price ?? 0) / 100, checkout.currency)}
                                            </div>
                                            {item.quantity > 1 && (
                                                <div className="text-xs text-muted-foreground">
                                                    {formatCurrency((item.unit_price ?? 0) / 100, checkout.currency)} each
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div className="border-t mt-4 pt-4 space-y-2">
                                {totals.map((t: any, i: number) => (
                                    <div key={i} className={`flex justify-between ${t.type === 'total' ? 'font-bold text-lg pt-2 border-t' : 'text-sm'}`}>
                                        <span className={t.type === 'total' ? '' : 'text-muted-foreground'}>{t.label}</span>
                                        <span>{formatCurrency((t.amount ?? 0) / 100, checkout.currency)}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Messages/Warnings */}
                    {messages.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Messages</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {messages.map((msg: any, i: number) => (
                                        <div key={i} className={`p-3 rounded-lg text-sm ${
                                            msg.type === 'error' ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200' :
                                            msg.type === 'warning' ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200' :
                                            'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                                        }`}>
                                            <span className="font-medium uppercase text-xs">{msg.code}</span>
                                            <p className="mt-1">{msg.content}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Agent & Metadata */}
                    {metadata.agent && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Bot className="h-5 w-5" />
                                    Agent
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="font-medium">{metadata.agent}</div>
                                {metadata.checkout_group && (
                                    <div>
                                        <div className="text-xs text-muted-foreground">Checkout Group</div>
                                        <div className="font-mono text-sm">{metadata.checkout_group}</div>
                                    </div>
                                )}
                                {metadata.price_optimized && (
                                    <Badge className="bg-green-100 text-green-800 border-green-200">
                                        Saved ${metadata.savings} (watched {metadata.price_watch_days} days)
                                    </Badge>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Buyer */}
                    {buyer && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Buyer
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                {buyer.name && <div className="font-medium">{buyer.name}</div>}
                                {buyer.email && <div className="text-muted-foreground">{buyer.email}</div>}
                                {buyer.phone && <div className="text-muted-foreground">{buyer.phone}</div>}
                            </CardContent>
                        </Card>
                    )}

                    {/* Shipping Address */}
                    {shipping && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
                                    Shipping
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-1">
                                <div>{shipping.line1}</div>
                                {shipping.line2 && <div>{shipping.line2}</div>}
                                <div>{shipping.city}, {shipping.state} {shipping.postal_code}</div>
                                <div>{shipping.country}</div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Payment Instruments */}
                    {instruments.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Payment
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {instruments.map((pi: any) => (
                                    <div key={pi.id} className="flex items-center gap-2 text-sm">
                                        <Badge variant="outline" className="capitalize">{pi.handler}</Badge>
                                        <span className="text-muted-foreground">{pi.type}</span>
                                        {pi.network && <span className="capitalize">{pi.network}</span>}
                                        {pi.last4 && <span className="font-mono">····{pi.last4}</span>}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Raw Metadata */}
                    {Object.keys(metadata).length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Metadata</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                                    {JSON.stringify(metadata, null, 2)}
                                </pre>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
