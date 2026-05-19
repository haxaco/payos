'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
  Skeleton,
} from '@sly/ui';
import { ArrowRight, Sparkles, Check, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { Recommendation } from '@sly/api-client';
import { useApiClient } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatCurrencyStandalone } from '@/lib/locale';

interface RebalanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RebalanceDialog({ open, onOpenChange }: RebalanceDialogProps) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [actingId, setActingId] = useState<string | null>(null);

  const {
    data: recommendations = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['treasury', 'recommendations', 'pending'],
    queryFn: async () => {
      if (!api) throw new Error('API not initialized');
      return api.treasury.getRecommendations({ status: 'pending' });
    },
    enabled: !!api && open,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['treasury', 'recommendations'] });
    queryClient.invalidateQueries({ queryKey: ['treasury', 'accounts'] });
    queryClient.invalidateQueries({ queryKey: ['treasury', 'dashboard'] });
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!api) throw new Error('API not initialized');
      return api.treasury.generateRecommendations();
    },
    onSuccess: (recs) => {
      queryClient.invalidateQueries({ queryKey: ['treasury', 'recommendations'] });
      toast.success(
        recs && recs.length > 0
          ? `Generated ${recs.length} rebalancing recommendation${recs.length === 1 ? '' : 's'}`
          : 'No rebalancing needed right now',
      );
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to generate recommendations'));
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!api) throw new Error('API not initialized');
      return api.treasury.approveRecommendation(id);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Recommendation approved');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to approve recommendation'));
    },
    onSettled: () => setActingId(null),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!api) throw new Error('API not initialized');
      return api.treasury.rejectRecommendation(id);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Recommendation rejected');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to reject recommendation'));
    },
    onSettled: () => setActingId(null),
  });

  const isGenerating = generateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rebalance Treasury</DialogTitle>
          <DialogDescription>
            Review pending rebalancing recommendations and approve or reject the
            proposed fund movements between treasury accounts.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading recommendations">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getApiErrorMessage(error, 'Could not load recommendations')}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Sparkles className="h-8 w-8 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No pending recommendations. Generate a new rebalancing plan to
                analyze current balances.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {recommendations.map((rec: Recommendation) => {
                const busy =
                  actingId === rec.id &&
                  (approveMutation.isPending || rejectMutation.isPending);
                return (
                  <li
                    key={rec.id}
                    className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                          <span className="font-mono truncate">{rec.sourceAccountId}</span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />
                          <span className="font-mono truncate">{rec.targetAccountId}</span>
                        </div>
                        <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                          {formatCurrencyStandalone(rec.amount, rec.currency)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {rec.reason}
                        </p>
                      </div>
                      <Badge variant="secondary" className="capitalize shrink-0">
                        {rec.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        aria-label={`Reject rebalance of ${formatCurrencyStandalone(rec.amount, rec.currency)}`}
                        onClick={() => {
                          setActingId(rec.id);
                          rejectMutation.mutate(rec.id);
                        }}
                      >
                        <X className="mr-1.5 h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy}
                        aria-label={`Approve rebalance of ${formatCurrencyStandalone(rec.amount, rec.currency)}`}
                        onClick={() => {
                          setActingId(rec.id);
                          approveMutation.mutate(rec.id);
                        }}
                      >
                        <Check className="mr-1.5 h-4 w-4" />
                        Approve
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={() => generateMutation.mutate()}
            disabled={isGenerating || !api}
          >
            <Sparkles className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-pulse' : ''}`} />
            {isGenerating ? 'Generating…' : 'Generate Recommendations'}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
