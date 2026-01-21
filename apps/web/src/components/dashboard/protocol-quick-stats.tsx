'use client';

import { useQuery } from '@tanstack/react-query';
import { Zap, Shield, ShoppingCart, Globe, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { useApiConfig } from '@/lib/api-client';
import { cn } from '@payos/ui';
import Link from 'next/link';

type ProtocolId = 'x402' | 'ap2' | 'acp' | 'ucp';

interface ProtocolStats {
  protocol: ProtocolId;
  protocol_name: string;
  enabled: boolean;
  primary_metric: {
    label: string;
    value: number | string;
  };
  secondary_metric: {
    label: string;
    value: number | string;
  };
  trend: {
    value: number;
    direction: 'up' | 'down' | 'flat';
  };
}

const PROTOCOL_UI: Record<ProtocolId, { icon: typeof Zap; color: string; bgColor: string; link: string }> = {
  x402: {
    icon: Zap,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-950',
    link: '/dashboard/agentic-payments/x402/endpoints',
  },
  ap2: {
    icon: Shield,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-950',
    link: '/dashboard/agentic-payments/ap2/mandates',
  },
  acp: {
    icon: ShoppingCart,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-950',
    link: '/dashboard/agentic-payments/acp/checkouts',
  },
  ucp: {
    icon: Globe,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-950',
    link: '/dashboard/agentic-payments/ucp/checkouts',
  },
};

async function fetchProtocolStats(authToken: string): Promise<{ data: ProtocolStats[] }> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/v1/analytics/protocol-stats`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!response.ok) {
    throw new Error('Failed to fetch protocol stats');
  }
  return response.json();
}

function formatValue(value: number | string): string {
  if (typeof value === 'string') return value;
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  if (value === Math.floor(value)) {
    return value.toString();
  }
  return `$${value.toFixed(2)}`;
}

function TrendIndicator({ trend }: { trend: ProtocolStats['trend'] }) {
  if (trend.direction === 'up') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
        <TrendingUp className="w-3 h-3" />
        {trend.value}%
      </span>
    );
  }
  if (trend.direction === 'down') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
        <TrendingDown className="w-3 h-3" />
        {trend.value}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
      <Minus className="w-3 h-3" />
      No change
    </span>
  );
}

function ProtocolCard({ stats }: { stats: ProtocolStats }) {
  const ui = PROTOCOL_UI[stats.protocol];
  const Icon = ui.icon;

  return (
    <Link href={ui.link}>
      <div
        className={cn(
          'bg-white dark:bg-gray-950 rounded-2xl p-5 border border-gray-200 dark:border-gray-800',
          'hover:border-gray-300 dark:hover:border-gray-700 transition-colors cursor-pointer group',
          !stats.enabled && 'opacity-50'
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', ui.bgColor)}>
            <Icon className={cn('w-5 h-5', ui.color)} />
          </div>
          <TrendIndicator trend={stats.trend} />
        </div>

        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 truncate">
          {stats.protocol_name}
        </h4>

        <div className="space-y-2">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{stats.primary_metric.label}</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {formatValue(stats.primary_metric.value)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{stats.secondary_metric.label}</div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatValue(stats.secondary_metric.value)}
            </div>
          </div>
        </div>

        {!stats.enabled && (
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Not enabled
          </div>
        )}
      </div>
    </Link>
  );
}

export function ProtocolQuickStats() {
  const { authToken, isConfigured } = useApiConfig();

  const { data, isLoading } = useQuery({
    queryKey: ['protocol-stats'],
    queryFn: () => fetchProtocolStats(authToken!),
    enabled: !!authToken && isConfigured,
    staleTime: 60 * 1000,
  });

  const stats = Array.isArray(data?.data) ? data.data : [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-950 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 animate-pulse"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl" />
              <div className="w-12 h-4 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-3" />
            <div className="space-y-2">
              <div>
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded mb-1" />
                <div className="h-6 w-12 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
              <div>
                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded mb-1" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <ProtocolCard key={stat.protocol} stats={stat} />
      ))}
    </div>
  );
}
