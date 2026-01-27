'use client';

import { Badge } from '@sly/ui';
import {
    CheckCircle,
    Clock,
    Truck,
    PackageCheck,
    XCircle,
    RefreshCcw,
} from 'lucide-react';

export type OrderStatus =
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'refunded';

const statusConfig: Record<OrderStatus, {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: typeof CheckCircle;
    className: string;
}> = {
    confirmed: {
        label: 'Confirmed',
        variant: 'default',
        icon: CheckCircle,
        className: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    processing: {
        label: 'Processing',
        variant: 'secondary',
        icon: Clock,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    shipped: {
        label: 'Shipped',
        variant: 'default',
        icon: Truck,
        className: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    delivered: {
        label: 'Delivered',
        variant: 'default',
        icon: PackageCheck,
        className: 'bg-green-100 text-green-800 border-green-200',
    },
    cancelled: {
        label: 'Cancelled',
        variant: 'secondary',
        icon: XCircle,
        className: 'bg-gray-100 text-gray-800 border-gray-200',
    },
    refunded: {
        label: 'Refunded',
        variant: 'secondary',
        icon: RefreshCcw,
        className: 'bg-orange-100 text-orange-800 border-orange-200',
    },
};

interface OrderStatusBadgeProps {
    status: OrderStatus;
    showIcon?: boolean;
}

export function OrderStatusBadge({ status, showIcon = true }: OrderStatusBadgeProps) {
    const config = statusConfig[status] || statusConfig.confirmed;
    const Icon = config.icon;

    return (
        <Badge variant={config.variant} className={`${config.className} font-medium`}>
            {showIcon && <Icon className="h-3 w-3 mr-1" />}
            {config.label}
        </Badge>
    );
}
