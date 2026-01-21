'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Badge,
} from '@payos/ui';
import { RefreshCcw, RotateCcw, Gift, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, isValid, parseISO } from 'date-fns';

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

export type AdjustmentType = 'refund' | 'return' | 'credit' | 'fee';

export interface Adjustment {
    id: string;
    type: AdjustmentType;
    amount: number;
    currency: string;
    reason: string;
    created_at: string;
    status?: 'pending' | 'completed' | 'failed';
}

const typeConfig: Record<AdjustmentType, {
    label: string;
    icon: typeof RefreshCcw;
    className: string;
}> = {
    refund: {
        label: 'Refund',
        icon: RefreshCcw,
        className: 'bg-orange-100 text-orange-800',
    },
    return: {
        label: 'Return',
        icon: RotateCcw,
        className: 'bg-purple-100 text-purple-800',
    },
    credit: {
        label: 'Credit',
        icon: Gift,
        className: 'bg-green-100 text-green-800',
    },
    fee: {
        label: 'Fee',
        icon: DollarSign,
        className: 'bg-gray-100 text-gray-800',
    },
};

interface AdjustmentsTableProps {
    adjustments: Adjustment[];
    currency?: string; // Fallback currency if not on individual adjustments
}

export function AdjustmentsTable({ adjustments, currency = 'USD' }: AdjustmentsTableProps) {
    if (!adjustments || adjustments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <RefreshCcw className="h-8 w-8 mb-2 opacity-50" />
                <span className="text-sm">No adjustments</span>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {adjustments.map((adjustment) => {
                    const config = typeConfig[adjustment.type] || typeConfig.refund;
                    const Icon = config.icon;

                    return (
                        <TableRow key={adjustment.id}>
                            <TableCell>
                                <Badge variant="outline" className={`${config.className} font-medium`}>
                                    <Icon className="h-3 w-3 mr-1" />
                                    {config.label}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                {adjustment.type === 'fee'
                                    ? `-${formatCurrency(adjustment.amount, adjustment.currency || currency)}`
                                    : formatCurrency(adjustment.amount, adjustment.currency || currency)
                                }
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                                {adjustment.reason}
                            </TableCell>
                            <TableCell>
                                {adjustment.status && (
                                    <Badge
                                        variant={
                                            adjustment.status === 'completed' ? 'default' :
                                            adjustment.status === 'failed' ? 'destructive' : 'secondary'
                                        }
                                        className="text-xs"
                                    >
                                        {adjustment.status}
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                                {safeFormatDate(adjustment.created_at, 'MMM d, yyyy')}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
