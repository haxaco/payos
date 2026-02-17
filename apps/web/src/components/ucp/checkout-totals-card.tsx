'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@sly/ui';
import { Calculator } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// UCP totals format
export interface UCPTotal {
    type: string;
    amount: number;
    label?: string;
}

interface CheckoutTotalsCardProps {
    totals: UCPTotal[];
    currency: string;
    title?: string;
}

export function CheckoutTotalsCard({ totals, currency, title = 'Order Summary' }: CheckoutTotalsCardProps) {
    // Find specific totals
    const subtotal = totals.find(t => t.type === 'subtotal');
    const tax = totals.find(t => t.type === 'tax');
    const shipping = totals.find(t => t.type === 'shipping');
    const discount = totals.find(t => t.type === 'discount');
    const total = totals.find(t => t.type === 'total');

    if (!totals || totals.length === 0) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Calculator className="h-4 w-4" />
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground text-center py-2">
                        No totals available
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Calculator className="h-4 w-4" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {subtotal && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{subtotal.label || 'Subtotal'}</span>
                        <span>{formatCurrency((subtotal.amount ?? 0) / 100, currency)}</span>
                    </div>
                )}
                {tax && tax.amount > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{tax.label || 'Tax'}</span>
                        <span>{formatCurrency((tax.amount ?? 0) / 100, currency)}</span>
                    </div>
                )}
                {shipping && shipping.amount > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{shipping.label || 'Shipping'}</span>
                        <span>{formatCurrency((shipping.amount ?? 0) / 100, currency)}</span>
                    </div>
                )}
                {discount && discount.amount !== 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{discount.label || 'Discount'}</span>
                        <span className="text-green-600">
                            {discount.amount < 0 ? formatCurrency((discount.amount ?? 0) / 100, currency) : `-${formatCurrency((discount.amount ?? 0) / 100, currency)}`}
                        </span>
                    </div>
                )}
                {total && (
                    <div className="border-t pt-3">
                        <div className="flex justify-between font-semibold">
                            <span>{total.label || 'Total'}</span>
                            <span className="text-lg">{formatCurrency((total.amount ?? 0) / 100, currency)}</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
