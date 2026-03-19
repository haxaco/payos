'use client';

import { useApiClient } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';

interface SourceData {
  source: string;
  available: boolean;
  score: number | null;
  dataPoints: number;
  latencyMs: number;
  queriedAt: string;
}

interface SourcesResponse {
  identifier: string;
  unifiedScore: number;
  tier: string;
  sources: SourceData[];
}

interface DimensionData {
  name: string;
  score: number;
  weight: number;
  sources: string[];
  dataPoints: number;
}

interface ReputationData {
  dimensions: DimensionData[];
  lastRefreshed: string;
}

const DIMENSION_LABELS: Record<string, string> = {
  identity: 'Identity',
  payment_reliability: 'Payment Reliability',
  capability_trust: 'Capability Trust',
  community_signal: 'Community Signal',
  service_quality: 'Service Quality',
};

const DIMENSION_COLORS: Record<string, string> = {
  identity: 'bg-blue-500',
  payment_reliability: 'bg-emerald-500',
  capability_trust: 'bg-purple-500',
  community_signal: 'bg-amber-500',
  service_quality: 'bg-pink-500',
};

const SOURCE_LABELS: Record<string, string> = {
  erc8004: 'ERC-8004',
  mnemom: 'Mnemom',
  vouched: 'Vouched',
  escrow_history: 'Escrow History',
  a2a_feedback: 'A2A Feedback',
};

export function TrustBreakdown({ agentId }: { agentId: string }) {
  const api = useApiClient();

  const { data: reputation } = useQuery<ReputationData>({
    queryKey: ['reputation', agentId],
    queryFn: async () => {
      if (!api) throw new Error('API not configured');
      const res = await fetch(`${api.baseUrl}/v1/reputation/${agentId}`, {
        headers: { Authorization: `Bearer ${api.apiKey}` },
      });
      if (!res.ok) throw new Error('Failed to fetch reputation');
      return res.json();
    },
    enabled: !!api,
    staleTime: 5 * 60 * 1000,
  });

  const { data: sourcesData } = useQuery<SourcesResponse>({
    queryKey: ['reputation-sources', agentId],
    queryFn: async () => {
      if (!api) throw new Error('API not configured');
      const res = await fetch(`${api.baseUrl}/v1/reputation/${agentId}/sources`, {
        headers: { Authorization: `Bearer ${api.apiKey}` },
      });
      if (!res.ok) throw new Error('Failed to fetch sources');
      return res.json();
    },
    enabled: !!api,
    staleTime: 5 * 60 * 1000,
  });

  const dimensions = reputation?.dimensions || [];
  const sources = sourcesData?.sources || [];

  if (dimensions.length === 0 && sources.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
      {/* Dimension Scores */}
      {dimensions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Dimensions
          </h4>
          <div className="space-y-3">
            {dimensions.map((dim) => (
              <div key={dim.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">
                    {DIMENSION_LABELS[dim.name] || dim.name}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {dim.score}
                    <span className="text-gray-400 font-normal"> ({Math.round(dim.weight * 100)}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${DIMENSION_COLORS[dim.name] || 'bg-gray-400'}`}
                    style={{ width: `${(dim.score / 1000) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source Indicators */}
      {sources.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Data Sources
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {sources.map((source) => (
              <div
                key={source.source}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900"
              >
                <div className={`h-2 w-2 rounded-full ${source.available ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                <span className={source.available ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}>
                  {SOURCE_LABELS[source.source] || source.source}
                </span>
                {source.available && source.score !== null && (
                  <span className="ml-auto text-gray-500 dark:text-gray-400 font-mono text-xs">
                    {source.score}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      {reputation?.lastRefreshed && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Last updated {new Date(reputation.lastRefreshed).toLocaleString()}
        </p>
      )}
    </div>
  );
}
