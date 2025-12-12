import * as React from 'react';
import { Badge } from './badge';
import { cn } from '../lib/utils';
import { Activity, AlertTriangle, XCircle } from 'lucide-react';

export type StreamHealth = 'healthy' | 'warning' | 'critical';

export interface StreamHealthBadgeProps {
  health: StreamHealth;
  showIcon?: boolean;
  className?: string;
}

const healthConfig: Record<
  StreamHealth,
  { label: string; variant: 'success' | 'warning' | 'error'; icon: React.ReactNode }
> = {
  healthy: {
    label: 'Healthy',
    variant: 'success',
    icon: <Activity className="h-3 w-3" />,
  },
  warning: {
    label: 'Warning',
    variant: 'warning',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  critical: {
    label: 'Critical',
    variant: 'error',
    icon: <XCircle className="h-3 w-3" />,
  },
};

export function StreamHealthBadge({
  health,
  showIcon = true,
  className,
}: StreamHealthBadgeProps) {
  const config = healthConfig[health];

  return (
    <Badge variant={config.variant} className={cn('gap-1', className)}>
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
}

