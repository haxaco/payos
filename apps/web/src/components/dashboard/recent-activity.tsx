'use client';

import { useEffect, useState } from 'react';
import { Badge, formatRelativeTime } from '@payos/ui';
import { useApiClient } from '@/lib/api-client';
import { ArrowRight, Bot, Users, Activity } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'account' | 'agent' | 'stream' | 'transfer';
  action: string;
  description: string;
  timestamp: string;
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const api = useApiClient();

  useEffect(() => {
    async function fetchActivity() {
      try {
        // Fetch recent audit logs
        const response = await api?.reports.getAuditLogs({ limit: 10 });
        
        if (response?.data) {
          setActivities(
            response.data.map((log) => ({
              id: log.id,
              type: log.entityType as 'account' | 'agent' | 'stream' | 'transfer',
              action: log.action,
              description: `${log.entityType} ${log.action}`,
              timestamp: log.createdAt,
            }))
          );
        }
      } catch (error) {
        console.error('Failed to fetch activity:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, [api]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Activity className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-sm font-medium">No recent activity</h3>
        <p className="text-xs text-muted-foreground">
          Activity will appear here as you use PayOS
        </p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'account':
        return <Users className="h-4 w-4" />;
      case 'agent':
        return <Bot className="h-4 w-4" />;
      case 'stream':
        return <Activity className="h-4 w-4" />;
      default:
        return <ArrowRight className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-4">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            {getIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{activity.description}</p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(activity.timestamp)}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {activity.action}
          </Badge>
        </div>
      ))}
    </div>
  );
}

