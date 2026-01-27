
import { Zap, Bot, ShoppingCart } from 'lucide-react';
import { Badge } from '@sly/ui';
import { cn } from '@sly/ui';

interface ProtocolBadgeProps {
    protocol?: 'x402' | 'ap2' | 'acp' | null | string; // loose typing for now
    size?: 'sm' | 'md';
    className?: string;
}

const protocolConfig: Record<string, { label: string; icon: any; className: string }> = {
    x402: {
        label: 'x402',
        icon: Zap,
        className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20',
    },
    ap2: {
        label: 'AP2',
        icon: Bot,
        className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20',
    },
    acp: {
        label: 'ACP',
        icon: ShoppingCart,
        className: 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20',
    },
};

export function ProtocolBadge({ protocol, size = 'sm', className }: ProtocolBadgeProps) {
    if (!protocol || !protocolConfig[protocol]) {
        return null;
    }

    const config = protocolConfig[protocol];
    const Icon = config.icon;
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

    return (
        <Badge
            variant="outline"
            className={cn('gap-1 transition-colors', config.className, className)}
        >
            <Icon className={iconSize} />
            {config.label}
        </Badge>
    );
}
