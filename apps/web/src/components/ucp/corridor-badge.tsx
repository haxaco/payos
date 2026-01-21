'use client';

import { Badge } from '@payos/ui';
import { Landmark, Globe } from 'lucide-react';

type Corridor = 'pix' | 'spei';

const corridorConfig: Record<Corridor, {
    label: string;
    country: string;
    flag: string;
    icon: typeof Landmark;
    className: string;
}> = {
    pix: {
        label: 'Pix',
        country: 'Brazil',
        flag: '🇧🇷',
        icon: Landmark,
        className: 'bg-green-100 text-green-800 border-green-200',
    },
    spei: {
        label: 'SPEI',
        country: 'Mexico',
        flag: '🇲🇽',
        icon: Globe,
        className: 'bg-blue-100 text-blue-800 border-blue-200',
    },
};

interface CorridorBadgeProps {
    corridor: Corridor;
    showFlag?: boolean;
    showCountry?: boolean;
}

export function CorridorBadge({ corridor, showFlag = true, showCountry = false }: CorridorBadgeProps) {
    const config = corridorConfig[corridor] || corridorConfig.pix;

    return (
        <Badge variant="outline" className={`${config.className} font-medium`}>
            {showFlag && <span className="mr-1">{config.flag}</span>}
            {config.label}
            {showCountry && <span className="ml-1 text-xs opacity-75">({config.country})</span>}
        </Badge>
    );
}
