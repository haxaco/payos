'use client';

import { useEffect, useState } from 'react';
import { Badge, formatCurrency, StreamHealthBadge, EmptyState } from '@payos/ui';
import { useApiClient } from '@/lib/api-client';
import type { Stream } from '@payos/api-client';
import { Activity, Plus } from 'lucide-react';
import Link from 'next/link';

export function StreamsOverview() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const api = useApiClient();

  useEffect(() => {
    async function fetchStreams() {
      try {
        const response = await api?.streams.list({ status: 'active', limit: 5 });
        if (response?.data) {
          setStreams(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch streams:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStreams();
  }, [api]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-6 w-20 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="h-8 w-8" />}
        title="No active streams"
        description="Create your first money stream to get started"
        action={{
          label: 'Create Stream',
          onClick: () => {},
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {streams.map((stream) => (
        <Link
          key={stream.id}
          href={`/dashboard/streams/${stream.id}`}
          className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <div className="space-y-1">
            <p className="font-medium text-sm">
              {stream.sender.accountName} → {stream.receiver.accountName}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stream.flowRate.perMonth)}/month
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StreamHealthBadge health={stream.health} />
          </div>
        </Link>
      ))}
      <Link
        href="/dashboard/streams"
        className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      >
        <Plus className="h-4 w-4" />
        View all streams
      </Link>
    </div>
  );
}

