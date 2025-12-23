'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Clock,
  User,
  Zap,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Wallet,
  Globe,
} from 'lucide-react';
import type { Transfer } from '@payos/api-client';

export default function TransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const api = useApiClient();
  const { isConfigured } = useApiConfig();
  const transferId = params.id as string;

  const { data: transfer, isLoading, error } = useQuery({
    queryKey: ['transfer', transferId],
    queryFn: () => api!.transfers.get(transferId),
    enabled: !!api && isConfigured,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400';
      case 'failed':
        return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-emerald-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'x402':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400';
      case 'internal':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400';
      case 'payout':
        return 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
    }
  };

  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <FileText className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Configure API Key</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Please configure your API key to view transfer details.</p>
        <Link href="/dashboard/api-keys" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Configure API Key
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
          <div className="h-4 w-96 bg-gray-200 dark:bg-gray-800 rounded mb-8"></div>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto">
        <Link
          href="/dashboard/transfers"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to transfers
        </Link>
        <div className="text-center py-12">
          <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Transfer not found</h2>
          <p className="text-gray-500 dark:text-gray-400">
            The transfer with ID {transferId} could not be found.
          </p>
        </div>
      </div>
    );
  }

  const isX402 = transfer.type === 'x402';

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Back button */}
      <Link
        href="/dashboard/transfers"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to transfers
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
            transfer.status === 'completed' 
              ? 'bg-emerald-100 dark:bg-emerald-950' 
              : transfer.status === 'pending'
              ? 'bg-yellow-100 dark:bg-yellow-950'
              : 'bg-red-100 dark:bg-red-950'
          }`}>
            {getStatusIcon(transfer.status)}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                ${transfer.amount.toFixed(4)} {transfer.currency}
              </h1>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getTypeColor(transfer.type)}`}>
                {transfer.type.toUpperCase()}
              </span>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(transfer.status)}`}>
                {transfer.status}
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              {new Date(transfer.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Transfer Flow */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Transfer Flow</h3>
        <div className="flex items-center justify-between">
          {/* From */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">From</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {transfer.from?.accountName || 'Unknown Account'}
                </p>
                <Link 
                  href={`/dashboard/accounts/${transfer.from?.accountId}`}
                  className="text-xs text-blue-600 hover:underline font-mono"
                >
                  {transfer.from?.accountId?.slice(0, 8)}...
                </Link>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex-shrink-0 px-8">
            <div className="flex items-center gap-2">
              <div className="h-px w-12 bg-gray-300 dark:bg-gray-700"></div>
              <ArrowRight className="h-6 w-6 text-gray-400" />
              <div className="h-px w-12 bg-gray-300 dark:bg-gray-700"></div>
            </div>
            <p className="text-center text-sm font-medium text-gray-900 dark:text-white mt-1">
              ${transfer.amount.toFixed(4)}
            </p>
          </div>

          {/* To */}
          <div className="flex-1 text-right">
            <div className="flex items-center gap-3 justify-end">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">To</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {transfer.to?.accountName || 'Unknown Account'}
                </p>
                <Link 
                  href={`/dashboard/accounts/${transfer.to?.accountId}`}
                  className="text-xs text-blue-600 hover:underline font-mono"
                >
                  {transfer.to?.accountId?.slice(0, 8)}...
                </Link>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                <User className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Transfer Details */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transfer Details
          </h3>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Transfer ID</dt>
              <dd className="font-mono text-sm text-gray-900 dark:text-white">{transfer.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Type</dt>
              <dd className="text-gray-900 dark:text-white capitalize">{transfer.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Status</dt>
              <dd className="text-gray-900 dark:text-white capitalize">{transfer.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Amount</dt>
              <dd className="font-mono text-gray-900 dark:text-white">
                {transfer.amount.toFixed(8)} {transfer.currency}
              </dd>
            </div>
            {transfer.fees?.amount && transfer.fees.amount > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Fees</dt>
                <dd className="font-mono text-gray-900 dark:text-white">
                  {transfer.fees.amount.toFixed(8)} {transfer.fees.currency || transfer.currency}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Created</dt>
              <dd className="text-gray-900 dark:text-white">
                {new Date(transfer.createdAt).toLocaleString()}
              </dd>
            </div>
            {transfer.completedAt && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Completed</dt>
                <dd className="text-gray-900 dark:text-white">
                  {new Date(transfer.completedAt).toLocaleString()}
                </dd>
              </div>
            )}
            {transfer.failedAt && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Failed</dt>
                <dd className="text-red-600">
                  {new Date(transfer.failedAt).toLocaleString()}
                </dd>
              </div>
            )}
            {transfer.failureReason && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Failure Reason</dt>
                <dd className="text-red-600">{transfer.failureReason}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Initiated By */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Initiated By
          </h3>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Actor Type</dt>
              <dd className="text-gray-900 dark:text-white capitalize">{transfer.initiatedBy?.type || 'Unknown'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Actor ID</dt>
              <dd className="font-mono text-sm text-gray-900 dark:text-white">{transfer.initiatedBy?.id || 'N/A'}</dd>
            </div>
            {transfer.initiatedBy?.name && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Actor Name</dt>
                <dd className="text-gray-900 dark:text-white">{transfer.initiatedBy.name}</dd>
              </div>
            )}
            {transfer.idempotencyKey && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Idempotency Key</dt>
                <dd className="font-mono text-sm text-gray-900 dark:text-white">{transfer.idempotencyKey}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* x402 Metadata Section */}
      {isX402 && transfer.x402Metadata && (
        <div className="bg-purple-50 dark:bg-gray-900 rounded-2xl border border-purple-200 dark:border-purple-500/30 p-6 mb-6">
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-300 mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            x402 Payment Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Endpoint Info */}
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Endpoint Information
              </h4>
              <dl className="space-y-3">
                {transfer.x402Metadata.endpoint_path && (
                  <div className="flex justify-between">
                    <dt className="text-purple-600 dark:text-gray-400">Path</dt>
                    <dd className="font-mono text-sm text-purple-900 dark:text-white">
                      {transfer.x402Metadata.endpoint_path}
                    </dd>
                  </div>
                )}
                {transfer.x402Metadata.endpoint_method && (
                  <div className="flex justify-between">
                    <dt className="text-purple-600 dark:text-gray-400">Method</dt>
                    <dd className="font-mono text-sm text-purple-900 dark:text-white">
                      {transfer.x402Metadata.endpoint_method}
                    </dd>
                  </div>
                )}
                {transfer.x402Metadata.endpoint_id && (
                  <div className="flex justify-between">
                    <dt className="text-purple-600 dark:text-gray-400">Endpoint ID</dt>
                    <dd className="font-mono text-xs text-purple-900 dark:text-white">
                      <Link 
                        href={`/dashboard/x402/endpoints/${transfer.x402Metadata.endpoint_id}`}
                        className="hover:underline flex items-center gap-1 text-purple-600 dark:text-purple-400"
                      >
                        {transfer.x402Metadata.endpoint_id.slice(0, 8)}...
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Wallet Info */}
            <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Wallet & Settlement
              </h4>
              <dl className="space-y-3">
                {transfer.x402Metadata.wallet_id && (
                  <div className="flex justify-between">
                    <dt className="text-purple-600 dark:text-gray-400">Wallet ID</dt>
                    <dd className="font-mono text-xs text-purple-900 dark:text-white">
                      <Link 
                        href={`/dashboard/wallets?search=${transfer.x402Metadata.wallet_id}`}
                        className="hover:underline flex items-center gap-1 text-purple-600 dark:text-purple-400"
                      >
                        {transfer.x402Metadata.wallet_id.slice(0, 8)}...
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </dd>
                  </div>
                )}
                {transfer.x402Metadata.price_calculated !== undefined && (
                  <div className="flex justify-between">
                    <dt className="text-purple-600 dark:text-gray-400">Price</dt>
                    <dd className="font-mono text-sm text-purple-900 dark:text-white">
                      ${transfer.x402Metadata.price_calculated?.toFixed(4)}
                    </dd>
                  </div>
                )}
                {transfer.x402Metadata.settlement_fee !== undefined && (
                  <div className="flex justify-between">
                    <dt className="text-purple-600 dark:text-gray-400">Settlement Fee</dt>
                    <dd className="font-mono text-sm text-purple-900 dark:text-white">
                      ${transfer.x402Metadata.settlement_fee?.toFixed(4)}
                    </dd>
                  </div>
                )}
                {transfer.x402Metadata.settlement_net_amount !== undefined && (
                  <div className="flex justify-between">
                    <dt className="text-purple-600 dark:text-gray-400">Net Amount</dt>
                    <dd className="font-mono text-sm text-purple-900 dark:text-white">
                      ${transfer.x402Metadata.settlement_net_amount?.toFixed(4)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Request Info */}
          <div className="mt-6 pt-6 border-t border-purple-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Request Details
            </h4>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {transfer.x402Metadata.request_id && (
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                  <dt className="text-purple-600 dark:text-gray-400 text-sm">Request ID</dt>
                  <dd className="font-mono text-xs text-purple-900 dark:text-white mt-1">
                    {transfer.x402Metadata.request_id}
                  </dd>
                </div>
              )}
              {transfer.x402Metadata.timestamp && (
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                  <dt className="text-purple-600 dark:text-gray-400 text-sm">Timestamp</dt>
                  <dd className="font-mono text-xs text-purple-900 dark:text-white mt-1">
                    {transfer.x402Metadata.timestamp}
                  </dd>
                </div>
              )}
              {transfer.x402Metadata.volume_tier !== undefined && (
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                  <dt className="text-purple-600 dark:text-gray-400 text-sm">Volume Tier</dt>
                  <dd className="font-mono text-xs text-purple-900 dark:text-white mt-1">
                    {transfer.x402Metadata.volume_tier} calls
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Fee Calculation Breakdown */}
          {transfer.x402Metadata.fee_calculation && (
            <div className="mt-6 pt-6 border-t border-purple-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Fee Calculation Breakdown
              </h4>
              <dl className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                  <dt className="text-purple-600 dark:text-gray-400 text-sm">Gross Amount</dt>
                  <dd className="font-mono text-sm text-purple-900 dark:text-white mt-1">
                    ${transfer.x402Metadata.fee_calculation.grossAmount?.toFixed(4)}
                  </dd>
                </div>
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                  <dt className="text-purple-600 dark:text-gray-400 text-sm">Fee Amount</dt>
                  <dd className="font-mono text-sm text-purple-900 dark:text-white mt-1">
                    ${transfer.x402Metadata.fee_calculation.feeAmount?.toFixed(4)}
                  </dd>
                </div>
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                  <dt className="text-purple-600 dark:text-gray-400 text-sm">Net Amount</dt>
                  <dd className="font-mono text-sm text-purple-900 dark:text-white mt-1">
                    ${transfer.x402Metadata.fee_calculation.netAmount?.toFixed(4)}
                  </dd>
                </div>
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                  <dt className="text-purple-600 dark:text-gray-400 text-sm">Fee Type</dt>
                  <dd className="text-sm text-purple-900 dark:text-white capitalize mt-1">
                    {transfer.x402Metadata.fee_calculation.feeType}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      )}

      {/* Cross-Border Details */}
      {(transfer.destinationAmount || transfer.fxRate) && (
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Cross-Border Details
          </h3>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {transfer.destinationAmount && (
              <div>
                <dt className="text-gray-500 dark:text-gray-400 text-sm">Destination Amount</dt>
                <dd className="font-mono text-gray-900 dark:text-white">
                  {transfer.destinationAmount.toFixed(2)} {transfer.destinationCurrency}
                </dd>
              </div>
            )}
            {transfer.fxRate && (
              <div>
                <dt className="text-gray-500 dark:text-gray-400 text-sm">Exchange Rate</dt>
                <dd className="font-mono text-gray-900 dark:text-white">
                  {transfer.fxRate.toFixed(4)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Stream Link */}
      {transfer.streamId && (
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Related Stream</h3>
          <Link 
            href={`/dashboard/streams/${transfer.streamId}`}
            className="inline-flex items-center gap-2 text-blue-600 hover:underline"
          >
            View Stream
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

