'use client';

import { Download, ChevronRight, ShieldCheck, Activity, Webhook, FlaskConical } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiFetch, useApiConfig } from '@/lib/api-client';

// Locale-stable timestamp formatter. toLocaleString without a fixed
// locale produces different output on server vs. client (react #418
// hydration mismatch). Force en-US so SSR and CSR render identical text.
function fmtTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

export default function LogsPage() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Logs</h1>
          <p className="text-gray-600 dark:text-gray-400">Audit trail, operation events, and request history across your tenant.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Real streams only — every section pulls live data from a
          tenant-scoped endpoint. No hardcoded mock rows. */}
      <div className="space-y-3">
        <OperationEventsSection defaultOpen />
        <AuditTrailSection defaultOpen />
        <WebhookDeliveriesSection />
        <ScenarioRunsSection />
      </div>
    </div>
  );
}

// ─── Collapsible section wrapper ──────────────────────────────────────────
// Native <details> + <summary> for keyboard + a11y. defaultOpen sets the
// initial state; React state controls lazy-fetch enablement.

function CollapsibleSection({
  icon: Icon,
  title,
  subtitle,
  children,
  defaultOpen = false,
  onToggle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
}) {
  return (
    <details
      open={defaultOpen}
      className="group bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
      onToggle={(e) => onToggle?.((e.target as HTMLDetailsElement).open)}
    >
      <summary className="flex items-center gap-3 px-6 py-4 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
        <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
        <Icon className="h-4 w-4 text-gray-500" />
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900 dark:text-white">{title}</div>
          {subtitle && <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>}
        </div>
      </summary>
      <div className="border-t border-gray-100 dark:border-gray-900">{children}</div>
    </details>
  );
}

// ─── Audit Trail — real data via api.reports.getAuditLogs ────────────────

export function AuditTrailSection({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const apiFetch = useApiFetch();
  const { authToken, apiUrl, apiEnvironment } = useApiConfig();
  const [open, setOpen] = useState(defaultOpen);
  const { data, isLoading } = useQuery({
    queryKey: ['logs', 'audit-trail', apiEnvironment],
    queryFn: async () => {
      const res = await apiFetch(`${apiUrl}/v1/usage/audit-log?limit=50`);
      if (!res.ok) return { data: [] };
      return res.json();
    },
    // Gate on authToken so the query doesn't fire before JWT is loaded
    // (fired-without-auth produces a 401 spam in the console).
    enabled: !!authToken && !!apiUrl && open,
    refetchInterval: 60_000,
  });
  const entries = ((data as any)?.data as any[]) || [];

  return (
    <CollapsibleSection
      icon={ShieldCheck}
      title="Audit Trail"
      subtitle="Tenant-scoped audit log entries — who did what, when"
      defaultOpen={defaultOpen}
      onToggle={setOpen}
    >
      {isLoading ? (
        <div className="p-6 text-sm text-gray-500">Loading audit entries…</div>
      ) : entries.length === 0 ? (
        <div className="p-6 text-sm text-gray-500">No audit entries in the current window.</div>
      ) : (
        <table className="w-full text-sm font-mono">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
            {entries.map((e: any) => (
              <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-6 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmtTime(e.createdAt)}</td>
                <td className="px-6 py-2 text-gray-600 dark:text-gray-400">{e.actor?.name || e.actor?.id?.slice(0, 8) || '—'}</td>
                <td className="px-6 py-2 text-gray-900 dark:text-white">{e.entityType} <span className="text-gray-400">{String(e.entityId).slice(0, 8)}</span></td>
                <td className="px-6 py-2 text-gray-900 dark:text-white">{e.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CollapsibleSection>
  );
}

// ─── Operation Events — real data via /v1/usage/operations ───────────────

export function OperationEventsSection({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const apiFetch = useApiFetch();
  const { authToken, apiUrl, apiEnvironment } = useApiConfig();
  const [open, setOpen] = useState(defaultOpen);
  const { data, isLoading } = useQuery({
    queryKey: ['logs', 'operations', apiEnvironment],
    queryFn: async () => {
      const res = await apiFetch(`${apiUrl}/v1/usage/operations?limit=50`);
      if (!res.ok) return { data: [] };
      return res.json();
    },
    // Gate on authToken so the fetch doesn't fire before JWT is loaded.
    enabled: !!authToken && !!apiUrl && open,
    refetchInterval: 30_000,
  });
  const events = ((data as any)?.data as any[]) || [];

  return (
    <CollapsibleSection
      icon={Activity}
      title="Operation Events"
      subtitle="Per-request events from the operations ledger (protocol, category, subject)"
      defaultOpen={defaultOpen}
      onToggle={setOpen}
    >
      {isLoading ? (
        <div className="p-6 text-sm text-gray-500">Loading operations…</div>
      ) : events.length === 0 ? (
        <div className="p-6 text-sm text-gray-500">No operation events in the current window.</div>
      ) : (
        <table className="w-full text-sm font-mono">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocol</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operation</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
            {events.map((e: any) => (
              <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-6 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmtTime(e.time || e.occurredAt)}</td>
                <td className="px-6 py-2 text-gray-600 dark:text-gray-400">{e.protocol || '—'}</td>
                <td className="px-6 py-2 text-gray-600 dark:text-gray-400">{e.category || '—'}</td>
                <td className="px-6 py-2 text-gray-900 dark:text-white">{e.operation || '—'}</td>
                <td className="px-6 py-2 text-gray-600 dark:text-gray-400 max-w-[280px] truncate">{e.subject || '—'}</td>
                <td className="px-6 py-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${e.success ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'}`}>
                    {e.success ? 'ok' : 'fail'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </CollapsibleSection>
  );
}

// ─── Webhook Deliveries — placeholder pending a dedicated endpoint ───────

function WebhookDeliveriesSection() {
  return (
    <CollapsibleSection
      icon={Webhook}
      title="Webhook Deliveries"
      subtitle="Outbound webhook dispatch history with retry state"
    >
      <div className="p-6 text-sm text-gray-500">
        Webhook delivery history is available per-endpoint on the{' '}
        <a href="/dashboard/webhooks" className="text-blue-600 hover:underline">Webhooks page</a>. A unified stream
        lands here when the dedicated endpoint ships.
      </div>
    </CollapsibleSection>
  );
}

// ─── Scenario Runs — placeholder for marketplace-sim history ─────────────

function ScenarioRunsSection() {
  return (
    <CollapsibleSection
      icon={FlaskConical}
      title="Scenario Runs"
      subtitle="Marketplace-sim scenario execution history"
    >
      <div className="p-6 text-sm text-gray-500">
        Sim runs are produced by the marketplace-sim sidecar at{' '}
        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">127.0.0.1:4500/runs</code>{' '}
        (dev only). A tenant-visible run history lands here once the sidecar moves behind platform-admin auth.
      </div>
    </CollapsibleSection>
  );
}
