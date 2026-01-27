'use client';

import { Badge } from '@sly/ui';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@sly/ui';
import { Eye, Edit, ShoppingCart, User, CreditCard, Settings } from 'lucide-react';

// UCP Identity scopes - matches backend format
export type UCPScope =
    | 'profile.read'
    | 'profile.write'
    | 'addresses.read'
    | 'addresses.write'
    | 'payment_methods.read'
    | 'payment_methods.write'
    | 'orders.read'
    | 'checkout.create'
    | 'checkout.complete';

const scopeConfig: Record<UCPScope, {
    label: string;
    description: string;
    icon: typeof Eye;
    className: string;
}> = {
    'profile.read': {
        label: 'Profile Read',
        description: 'Read buyer profile information',
        icon: User,
        className: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    'profile.write': {
        label: 'Profile Write',
        description: 'Modify buyer profile information',
        icon: User,
        className: 'bg-orange-100 text-orange-800 border-orange-200',
    },
    'addresses.read': {
        label: 'Addresses Read',
        description: 'Read saved addresses',
        icon: Settings,
        className: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    'addresses.write': {
        label: 'Addresses Write',
        description: 'Add and update addresses',
        icon: Settings,
        className: 'bg-orange-100 text-orange-800 border-orange-200',
    },
    'payment_methods.read': {
        label: 'Payment Methods Read',
        description: 'View saved payment methods',
        icon: CreditCard,
        className: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    'payment_methods.write': {
        label: 'Payment Methods Write',
        description: 'Add or remove payment methods',
        icon: CreditCard,
        className: 'bg-orange-100 text-orange-800 border-orange-200',
    },
    'orders.read': {
        label: 'Orders Read',
        description: 'View order history',
        icon: Eye,
        className: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    'checkout.create': {
        label: 'Checkout Create',
        description: 'Create checkouts on your behalf',
        icon: ShoppingCart,
        className: 'bg-green-100 text-green-800 border-green-200',
    },
    'checkout.complete': {
        label: 'Checkout Complete',
        description: 'Complete purchases on your behalf',
        icon: ShoppingCart,
        className: 'bg-green-100 text-green-800 border-green-200',
    },
};

interface ScopeBadgeProps {
    scope: UCPScope;
    showTooltip?: boolean;
}

export function ScopeBadge({ scope, showTooltip = true }: ScopeBadgeProps) {
    const config = scopeConfig[scope];

    if (!config) {
        return (
            <Badge variant="outline" className="bg-gray-100 text-gray-800">
                {scope}
            </Badge>
        );
    }

    const Icon = config.icon;

    const badge = (
        <Badge variant="outline" className={`${config.className} font-medium cursor-default`}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
        </Badge>
    );

    if (!showTooltip) {
        return badge;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    {badge}
                </TooltipTrigger>
                <TooltipContent>
                    <p>{config.description}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

interface ScopesListProps {
    scopes: UCPScope[];
    maxDisplay?: number;
}

export function ScopesList({ scopes, maxDisplay = 3 }: ScopesListProps) {
    const displayScopes = scopes.slice(0, maxDisplay);
    const remaining = scopes.length - maxDisplay;

    return (
        <div className="flex flex-wrap gap-1">
            {displayScopes.map((scope) => (
                <ScopeBadge key={scope} scope={scope} />
            ))}
            {remaining > 0 && (
                <Badge variant="outline" className="bg-gray-100 text-gray-600">
                    +{remaining} more
                </Badge>
            )}
        </div>
    );
}
