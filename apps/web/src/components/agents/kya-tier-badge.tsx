'use client';

import { cn } from '@sly/ui';

interface KyaTierBadgeProps {
  tier: number;
  className?: string;
}

const tierConfig: Record<number, { label: string; bg: string; text: string }> = {
  0: {
    label: 'Unverified',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
  },
  1: {
    label: 'Basic',
    bg: 'bg-blue-100 dark:bg-blue-950',
    text: 'text-blue-700 dark:text-blue-300',
  },
  2: {
    label: 'Standard',
    bg: 'bg-emerald-100 dark:bg-emerald-950',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  3: {
    label: 'Premium',
    bg: 'bg-amber-100 dark:bg-amber-950',
    text: 'text-amber-700 dark:text-amber-300',
  },
};

export function KyaTierBadge({ tier, className }: KyaTierBadgeProps) {
  const config = tierConfig[tier] || tierConfig[0];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full',
        config.bg,
        config.text,
        className
      )}
    >
      Tier {tier} — {config.label}
    </span>
  );
}
