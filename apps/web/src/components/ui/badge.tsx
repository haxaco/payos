import * as React from 'react';
import { cn } from '@payos/ui';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        {
          'border-transparent bg-gray-900 dark:bg-gray-50 text-gray-50 dark:text-gray-900':
            variant === 'default',
          'border-transparent bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-50':
            variant === 'secondary',
          'border-transparent bg-red-500 text-white':
            variant === 'destructive',
          'text-gray-950 dark:text-gray-50': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };



