'use client';

import { useQuery } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Avatar,
    AvatarFallback,
    AvatarImage
} from '@payos/ui';
import {
    ArrowLeft,
    Store,
    Bot,
    User,
    ShoppingCart,
    CreditCard,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useApiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CheckoutStatusBadge } from '@/components/acp/checkout-status-badge';
import { CompleteCheckoutDialog } from '@/components/acp/complete-checkout-dialog';
import { toast } from 'sonner';
import { useState } from 'react';

export default function CheckoutDetailPage() {
    const api = useApiClient();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [showCompleteDialog, setShowCompleteDialog] = useState(false);

    const { data: checkout, isLoading, refetch } = useQuery({
        queryKey: ['acp-checkout', id],
        queryFn: () => {
            if (!api) throw new Error("API not initialized");
            return api.acp.get(id);
        },
    });

    const handleCancel = async () => {
        if (!api) return;
        try {
            await api.acp.cancel(id);
            toast.success('Checkout cancelled');
            refetch();
        } catch (error) {
            toast.error('Failed to cancel checkout');
        }
    };

    if (isLoading) {
        return <div className="p-8">Loading checkout details...</div>;
    }

    if (!checkout) {
        return <div className="p-8">Checkout not found</div>;
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/agentic-payments/acp/checkouts">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">{checkout.checkout_id}</h1>
                        <CheckoutStatusBadge status={checkout.status} />
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">
                        ID: {checkout.id} • Created on {format(new Date(checkout.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                </div>
                <div className="ml-auto flex gap-2">
                    {checkout.status === 'pending' && (
                        <>
                            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                            <Button onClick={() => setShowCompleteDialog(true)}>Complete Checkout</Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Items & Payment */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Cart Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                                Cart Items
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
                                        <TableHead className="text-center">Qty</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {checkout.items?.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {item.image_url ? (
                                                        <img src={item.image_url} alt={item.name} className="h-10 w-10 rounded-md object-cover border" />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                                                            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-medium">{item.name}</div>
                                                        {item.description && (
                                                            <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                                                                {item.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(item.unit_price, item.currency)}
                                            </TableCell>
                                            <TableCell className="text-center">{item.quantity}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(item.total_price, item.currency)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Payment Info (if completed) */}
                    {checkout.status === 'completed' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                                    Payment Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Payment Method</div>
                                    <div className="mt-1 capitalize">{checkout.payment_method || 'Unknown'}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Token</div>
                                    <div className="mt-1 font-mono text-xs truncate" title={checkout.shared_payment_token}>
                                        {checkout.shared_payment_token}
                                    </div>
                                </div>
                                {checkout.transfer_id && (
                                    <div className="col-span-2">
                                        <div className="text-sm font-medium text-muted-foreground">Transaction</div>
                                        <Link
                                            href={`/dashboard/transactions/${checkout.transfer_id}`}
                                            className="mt-1 text-primary hover:underline flex items-center gap-1"
                                        >
                                            {checkout.transfer_id}
                                            <ArrowLeft className="h-3 w-3 rotate-180" />
                                        </Link>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column: Entities & Summary */}
                <div className="space-y-6">

                    {/* Order Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>{formatCurrency(checkout.subtotal, checkout.currency)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Shipping</span>
                                <span>{formatCurrency(checkout.shipping_amount, checkout.currency)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tax</span>
                                <span>{formatCurrency(checkout.tax_amount, checkout.currency)}</span>
                            </div>
                            {checkout.discount_amount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Discount</span>
                                    <span>-{formatCurrency(checkout.discount_amount, checkout.currency)}</span>
                                </div>
                            )}
                            <div className="border-t pt-4 flex justify-between font-bold text-lg">
                                <span>Total</span>
                                <span>{formatCurrency(checkout.total_amount, checkout.currency)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Entities */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Entities Involved
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Merchant */}
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                    <Store className="h-5 w-5 text-blue-600 dark:text-blue-200" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">Merchant</div>
                                    <div className="text-sm">{checkout.merchant_name}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">{checkout.merchant_id}</div>
                                </div>
                            </div>

                            {/* Agent */}
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                    <Bot className="h-5 w-5 text-purple-600 dark:text-purple-200" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">Agent</div>
                                    <div className="text-sm">{checkout.agent_name || 'Unknown Agent'}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">{checkout.agent_id}</div>
                                </div>
                            </div>

                            {/* Customer */}
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                    <User className="h-5 w-5 text-green-600 dark:text-green-200" />
                                </div>
                                <div>
                                    <div className="font-medium text-sm">Customer</div>
                                    <div className="text-sm">{checkout.customer_id || 'Guest'}</div>
                                    {checkout.customer_email && (
                                        <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
                                            {checkout.customer_email}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Shipping Address */}
                    {checkout.shipping_address && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                    Shipping Address
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-1">
                                <div className="font-medium">{checkout.shipping_address.name}</div>
                                <div>{checkout.shipping_address.line1}</div>
                                <div>{checkout.shipping_address.line2}</div>
                                <div>
                                    {checkout.shipping_address.city}, {checkout.shipping_address.state} {checkout.shipping_address.postal_code}
                                </div>
                                <div>{checkout.shipping_address.country}</div>
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>

            <CompleteCheckoutDialog
                checkoutId={id}
                totalAmount={checkout.total_amount}
                currency={checkout.currency}
                open={showCompleteDialog}
                onOpenChange={setShowCompleteDialog}
                onSuccess={() => refetch()}
            />
        </div>
    );
}
