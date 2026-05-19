'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiConfig, useApiFetch } from '@/lib/api-client';
import { useEnvironment } from '@/lib/environment-context';
import { Shield, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ProductionStatus {
  status:
    | 'sandbox_only'
    | 'declaration_pending'
    | 'production_approved'
    | 'production_denied'
    | 'production_suspended';
  kyaTier: number;
  reviewNotes: string | null;
  ceiling: { perTx: number; daily: number; monthly: number; disabled: boolean; source: string };
}

const STATUS_META: Record<string, { label: string; icon: typeof Shield; tone: string }> = {
  sandbox_only: { label: 'Sandbox only', icon: Shield, tone: 'text-gray-500' },
  declaration_pending: { label: 'Under review', icon: Clock, tone: 'text-amber-500' },
  production_approved: { label: 'Approved for production', icon: CheckCircle2, tone: 'text-emerald-500' },
  production_denied: { label: 'Declined', icon: XCircle, tone: 'text-red-500' },
  production_suspended: { label: 'Suspended', icon: XCircle, tone: 'text-red-500' },
};

export default function ProductionAccessPage() {
  const apiFetch = useApiFetch();
  const { apiUrl } = useApiConfig();
  const queryClient = useQueryClient();
  const { refreshProductionStatus } = useEnvironment();

  const [useCase, setUseCase] = useState('');
  const [volume, setVolume] = useState('');
  const [website, setWebsite] = useState('');
  const [accepted, setAccepted] = useState(false);

  const { data, isLoading } = useQuery<ProductionStatus>({
    queryKey: ['production-status'],
    queryFn: async () => {
      const res = await apiFetch(`${apiUrl}/v1/tenants/production-status`);
      if (!res.ok) throw new Error('Failed to load production status');
      // Unwrap the { success, data, meta } response envelope — reading the
      // flat body made this page always fall back to 'sandbox_only'.
      const body = await res.json();
      return body?.data ?? body;
    },
  });

  const declare = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`${apiUrl}/v1/tenants/declare-production`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intended_use_case: useCase,
          expected_monthly_volume_usd: volume ? Number(volume) : undefined,
          website_url: website || undefined,
          accepted_terms: accepted,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Submission failed');
      return body;
    },
    onSuccess: () => {
      toast.success('Production access requested', {
        description: 'We review declarations manually and will email you with a decision.',
      });
      queryClient.invalidateQueries({ queryKey: ['production-status'] });
      void refreshProductionStatus();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  const status = data?.status ?? 'sandbox_only';
  const meta = STATUS_META[status] ?? STATUS_META.sandbox_only;
  const Icon = meta.icon;
  const canDeclare = status === 'sandbox_only' || status === 'production_denied';

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-foreground" />
        <h1 className="text-xl font-semibold text-foreground">Production access</h1>
      </div>

      <div className="rounded-xl border border-border bg-muted p-4 flex items-center gap-3">
        <Icon className={`w-5 h-5 ${meta.tone}`} />
        <div>
          <p className="text-sm font-medium text-foreground">{meta.label}</p>
          {data?.reviewNotes && (
            <p className="text-xs text-muted-foreground mt-0.5">{data.reviewNotes}</p>
          )}
        </div>
      </div>

      {status === 'production_approved' && (
        <p className="text-sm text-muted-foreground">
          Your organization can create live API keys and move real funds. A conservative
          beta ceiling still applies: {data?.ceiling.perTx} / tx, {data?.ceiling.daily} / day,
          {' '}{data?.ceiling.monthly} / month (USDC).
        </p>
      )}

      {status === 'declaration_pending' && (
        <p className="text-sm text-muted-foreground">
          Your declaration is under review. We approve accounts manually during this
          open beta phase — please hang tight and we&apos;ll email you as soon as a
          decision is made. You can keep building in Sandbox in the meantime.
        </p>
      )}

      {canDeclare && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            declare.mutate();
          }}
        >
          <p className="text-sm text-muted-foreground">
            Open beta runs in sandbox by default. To move real funds, tell us a little about
            your use case. We&apos;ve already captured your verified identity from sign-in.
          </p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              What will you use production for? <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              minLength={20}
              maxLength={1000}
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-2 text-sm"
              rows={4}
              placeholder="Describe the agent workflows and payments you plan to run in production (min 20 chars)."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Est. monthly volume (USD)
              </label>
              <input
                type="number"
                min={0}
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Website</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                placeholder="https://"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            I accept the production terms of service.
          </label>
          <button
            type="submit"
            disabled={!accepted || useCase.trim().length < 20 || declare.isPending}
            className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {declare.isPending ? 'Submitting…' : 'Request production access'}
          </button>
        </form>
      )}
    </div>
  );
}
