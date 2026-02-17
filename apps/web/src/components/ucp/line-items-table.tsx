'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@sly/ui';
import { Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface LineItem {
    id?: string;
    name: string;
    description?: string;
    image_url?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    currency?: string;
}

interface LineItemsTableProps {
    items: LineItem[];
    currency?: string;
    showImage?: boolean;
}

export function LineItemsTable({ items, currency = 'USD', showImage = true }: LineItemsTableProps) {
    if (!items || items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mb-2 opacity-50" />
                <span className="text-sm">No line items</span>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {showImage && <TableHead className="w-[60px]">Image</TableHead>}
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item, index) => (
                    <TableRow key={item.id || index}>
                        {showImage && (
                            <TableCell>
                                {item.image_url ? (
                                    <img
                                        src={item.image_url}
                                        alt={item.name}
                                        className="w-10 h-10 rounded object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                )}
                            </TableCell>
                        )}
                        <TableCell>
                            <div className="flex flex-col">
                                <span className="font-medium">{item.name}</span>
                                {item.description && (
                                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                        {item.description}
                                    </span>
                                )}
                            </div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                            {formatCurrency((item.unit_price ?? 0) / 100, item.currency || currency)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                            {formatCurrency((item.total_price ?? 0) / 100, item.currency || currency)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
