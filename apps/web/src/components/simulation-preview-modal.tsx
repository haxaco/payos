'use client';

/**
 * Simulation Preview Modal
 * Story 28.8: Shows simulation results before execution
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@payos/ui';
import { 
  AlertCircle, 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  DollarSign,
  TrendingUp,
  Loader2
} from 'lucide-react';

interface TransferPreview {
  source: {
    account_id: string;
    account_name?: string;
    amount: string;
    currency: string;
    balance_before: string;
    balance_after: string;
  };
  destination: {
    account_id: string;
    account_name?: string;
    amount: string;
    currency: string;
  };
  fx?: {
    rate: string;
    spread: string;
    rate_locked: boolean;
  };
  fees: {
    platform_fee: string;
    fx_fee: string;
    rail_fee: string;
    total: string;
    currency: string;
  };
  timing: {
    estimated_duration_seconds: number;
    estimated_arrival: string;
    rail: string;
  };
}

interface SimulationWarning {
  code: string;
  message: string;
  details?: Record<string, any>;
}

interface SimulationError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

interface SimulationData {
  simulation_id: string;
  status: string;
  can_execute: boolean;
  preview: TransferPreview | null;
  warnings: SimulationWarning[];
  errors: SimulationError[];
  execute_url: string;
}

interface SimulationPreviewModalProps {
  open: boolean;
  onClose: () => void;
  simulation: SimulationData | null;
  onExecute?: () => Promise<void>;
  isExecuting?: boolean;
}

export function SimulationPreviewModal({
  open,
  onClose,
  simulation,
  onExecute,
  isExecuting = false,
}: SimulationPreviewModalProps) {
  if (!simulation || !simulation.preview) {
    return null;
  }

  const { preview, warnings, errors, can_execute } = simulation;

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'USDC' ? 'USD' : currency,
    }).format(parseFloat(amount));
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Transfer Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {can_execute ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ready to Execute
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Cannot Execute
              </Badge>
            )}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Errors:</div>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx} className="text-sm">
                      {error.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Warnings:</div>
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm">
                      {warning.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Transfer Flow */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">From</div>
                <div className="font-semibold">{preview.source.account_name || 'Source Account'}</div>
                <div className="text-2xl font-bold text-red-600">
                  -{formatCurrency(preview.source.amount, preview.source.currency)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Balance: {formatCurrency(preview.source.balance_before, preview.source.currency)}
                  {' → '}
                  {formatCurrency(preview.source.balance_after, preview.source.currency)}
                </div>
              </div>

              <div className="px-4">
                <ArrowRight className="h-6 w-6 text-muted-foreground" />
              </div>

              <div className="flex-1 text-right">
                <div className="text-sm text-muted-foreground">To</div>
                <div className="font-semibold">{preview.destination.account_name || 'Destination Account'}</div>
                <div className="text-2xl font-bold text-green-600">
                  +{formatCurrency(preview.destination.amount, preview.destination.currency)}
                </div>
              </div>
            </div>
          </div>

          {/* FX Rate */}
          {preview.fx && (
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Exchange Rate</div>
                  <div className="text-2xl font-bold">
                    1 {preview.source.currency} = {preview.fx.rate} {preview.destination.currency}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Spread: {preview.fx.spread}
                  </div>
                </div>
                {preview.fx.rate_locked && (
                  <Badge variant="secondary">Rate Locked</Badge>
                )}
              </div>
            </div>
          )}

          {/* Fee Breakdown */}
          <div>
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Fee Breakdown
            </div>
            <div className="space-y-2">
              {parseFloat(preview.fees.platform_fee) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform Fee</span>
                  <span>{formatCurrency(preview.fees.platform_fee, preview.fees.currency)}</span>
                </div>
              )}
              {parseFloat(preview.fees.fx_fee) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">FX Fee</span>
                  <span>{formatCurrency(preview.fees.fx_fee, preview.fees.currency)}</span>
                </div>
              )}
              {parseFloat(preview.fees.rail_fee) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rail Fee ({preview.timing.rail.toUpperCase()})</span>
                  <span>{formatCurrency(preview.fees.rail_fee, preview.fees.currency)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Fees</span>
                <span>{formatCurrency(preview.fees.total, preview.fees.currency)}</span>
              </div>
            </div>
          </div>

          {/* Timing */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Estimated arrival: {formatDuration(preview.timing.estimated_duration_seconds)}
              {' via '}
              <span className="font-medium">{preview.timing.rail.toUpperCase()}</span>
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isExecuting}>
            Cancel
          </Button>
          {can_execute && onExecute && (
            <Button 
              onClick={onExecute} 
              disabled={isExecuting}
              className="min-w-[140px]"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm & Execute
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

