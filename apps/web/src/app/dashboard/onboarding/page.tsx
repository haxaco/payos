'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Bot,
  Zap,
  ShoppingCart,
  CheckCircle2,
  Circle,
  Loader2,
  Play,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Rocket,
  XCircle,
} from 'lucide-react';
import { useApiConfig } from '@/lib/api-client';
import { cn } from '@sly/ui';
import { Card, CardContent, Button, Badge } from '@sly/ui';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Outcome = 'agent_spend' | 'api_monetization' | 'agent_checkout';

interface SmokeStep {
  name: string;
  ok: boolean;
  detail: string;
  reference?: string;
}

interface SmokeResult {
  ok: boolean;
  outcome: Outcome;
  durationMs: number;
  steps: SmokeStep[];
  reference?: string;
  error?: string;
  nextAction?: { label: string; href: string };
}

interface ProtocolState {
  enabled: boolean;
  prerequisites_met: boolean;
  progress_percentage: number;
}

interface OnboardingState {
  has_wallet: boolean;
  has_payment_handler: boolean;
  has_any_protocol_enabled: boolean;
  sandbox_mode: boolean;
  protocols: Record<'x402' | 'ap2' | 'acp' | 'ucp', ProtocolState>;
}

// ---------------------------------------------------------------------------
// Data fetching
//
// `credential` is the active auth token — the Supabase JWT for a logged-in
// dashboard user, or the stored API key for programmatic access. This mirrors
// the exact pattern the previous page used (and how the shared api-client
// resolves its token: `authToken ?? apiKey`). Both endpoints may return either
// a bare object or a `{ data: {...} }` envelope, so unwrap defensively.
// ---------------------------------------------------------------------------

async function fetchOnboardingState(
  credential: string,
  apiUrl: string,
): Promise<OnboardingState> {
  const res = await fetch(`${apiUrl}/v1/onboarding`, {
    headers: {
      Authorization: `Bearer ${credential}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch onboarding state');
  }
  const json = await res.json();
  return json.data ?? json;
}

async function runSmokeTest(
  credential: string,
  apiUrl: string,
  outcome: Outcome,
): Promise<SmokeResult> {
  const res = await fetch(`${apiUrl}/v1/onboarding/smoke-test`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credential}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ outcome }),
  });
  // The SmokeResult body is present on BOTH 200 (ok) and 422 (not ok), so we
  // read the JSON regardless of res.ok and drive the UI purely off `ok` flags.
  const json = await res.json();
  return json.data ?? json;
}

// ---------------------------------------------------------------------------
// Outcome catalog — all three shown with equal visual weight, no recommended
// or default bias.
// ---------------------------------------------------------------------------

const OUTCOMES: {
  key: Outcome;
  title: string;
  blurb: string;
  icon: typeof Bot;
  // Which protocol flag means "the rail behind this outcome is enabled".
  protocolEnabled: (p: OnboardingState['protocols']) => boolean;
}[] = [
  {
    key: 'agent_spend',
    title: 'Let an AI agent buy & spend',
    blurb: 'An autonomous agent makes purchases on your behalf, within limits you set.',
    icon: Bot,
    protocolEnabled: (p) => p.x402?.enabled || p.ap2?.enabled,
  },
  {
    key: 'api_monetization',
    title: 'Get paid per API call',
    blurb: 'Charge AI agents a micro-payment every time they hit your API.',
    icon: Zap,
    protocolEnabled: (p) => p.x402?.enabled,
  },
  {
    key: 'agent_checkout',
    title: 'Accept agent checkouts',
    blurb: 'Let shopping agents discover your products and check out on your store.',
    icon: ShoppingCart,
    protocolEnabled: (p) => p.acp?.enabled || p.ucp?.enabled,
  },
];

const ADVANCED_LINKS: { href: string; label: string }[] = [
  { href: '/dashboard/agentic-payments/x402/integration', label: 'x402 integration guide' },
  { href: '/dashboard/agentic-payments/ap2/integration', label: 'AP2 integration guide' },
  { href: '/dashboard/agentic-payments/acp/integration', label: 'ACP integration guide' },
  { href: '/dashboard/agentic-payments/ucp/integration', label: 'UCP integration guide' },
  { href: '/dashboard/agentic-payments/x402/endpoints', label: 'Manage x402 endpoints' },
  { href: '/dashboard/agents', label: 'Manage agents' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProvisionedRow({ label, done }: { label: string; done: boolean }) {
  if (done) {
    return (
      <li className="flex items-center gap-2.5 text-sm">
        <CheckCircle2
          className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
        <span className="text-foreground">{label}</span>
      </li>
    );
  }
  // Not a gate — show as one subtle muted line, never blocking.
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
      <span className="text-muted-foreground">{label}</span>
    </li>
  );
}

function SmokeStepRow({ step }: { step: SmokeStep }) {
  return (
    <li className="flex items-start gap-3 rounded-md px-3 py-2.5">
      {step.ok ? (
        <CheckCircle2
          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
      ) : (
        <XCircle
          className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
          aria-hidden="true"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{step.name}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{step.detail}</p>
        {step.reference && (
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground/80">
            {step.reference}
          </p>
        )}
      </div>
    </li>
  );
}

function RunningStepper() {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-4"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-foreground">Running a real transaction…</p>
        <p className="text-sm text-muted-foreground">
          This runs live on the Sly sandbox and can take up to ~15 seconds.
        </p>
      </div>
    </div>
  );
}

function SmokeResultPanel({ result }: { result: SmokeResult }) {
  return (
    <div className="space-y-4">
      {result.ok ? (
        <div className="rounded-lg border border-emerald-300/60 bg-emerald-50 px-5 py-4 dark:border-emerald-800/60 dark:bg-emerald-950/40">
          <div className="flex items-start gap-3">
            <Sparkles
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                It works — you just ran real agentic commerce on Sly
              </p>
              <p className="mt-0.5 text-sm text-emerald-800/90 dark:text-emerald-200/80">
                Completed in {(result.durationMs / 1000).toFixed(1)}s
                {result.reference ? (
                  <>
                    {' · '}
                    <span className="break-all font-mono text-xs">{result.reference}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-foreground">The test didn&apos;t complete</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {result.error ?? 'One of the steps failed. See the breakdown below.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {result.steps.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {result.steps.map((step, i) => (
            <SmokeStepRow key={`${step.name}-${i}`} step={step} />
          ))}
        </ul>
      )}

      {result.nextAction && (
        <Button asChild>
          <Link href={result.nextAction.href}>
            {result.nextAction.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      )}
    </div>
  );
}

function OutcomePanel({
  outcome,
  state,
  credential,
  apiUrl,
}: {
  outcome: (typeof OUTCOMES)[number];
  state: OnboardingState | undefined;
  credential: string;
  apiUrl: string;
}) {
  const smokeMutation = useMutation({
    mutationFn: () => runSmokeTest(credential, apiUrl, outcome.key),
  });

  const protocolEnabled = state ? outcome.protocolEnabled(state.protocols) : false;

  const provisioned = [
    { label: 'Sandbox wallet ready', done: !!state?.has_wallet },
    { label: 'Test funds loaded', done: !!state?.has_wallet },
    { label: 'Protocol enabled', done: protocolEnabled },
    { label: 'Agent ready', done: !!state?.has_any_protocol_enabled },
  ];

  const allProvisioned = provisioned.every((p) => p.done);

  return (
    <div className="mt-5 space-y-6 border-t border-border pt-6">
      {/* Already set up for you */}
      <section aria-label="What Sly provisioned automatically">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Already set up for you</h3>
          {allProvisioned && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Ready
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Sly provisioned this automatically — there&apos;s nothing for you to do.
        </p>
        <ul className="mt-3 space-y-2">
          {provisioned.map((p) => (
            <ProvisionedRow key={p.label} label={p.label} done={p.done} />
          ))}
        </ul>
      </section>

      {/* Live test */}
      <section aria-label="Run a live test">
        {smokeMutation.isPending ? (
          <RunningStepper />
        ) : smokeMutation.data ? (
          <div className="space-y-4">
            <SmokeResultPanel result={smokeMutation.data} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => smokeMutation.mutate()}
              disabled={smokeMutation.isPending}
            >
              Run it again
            </Button>
          </div>
        ) : smokeMutation.isError ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground">
              Couldn&apos;t reach the test runner. Check your connection and try again.
            </div>
            <Button onClick={() => smokeMutation.mutate()}>
              <Play className="h-4 w-4" aria-hidden="true" />
              Run a live test
            </Button>
          </div>
        ) : (
          <div>
            <Button onClick={() => smokeMutation.mutate()}>
              <Play className="h-4 w-4" aria-hidden="true" />
              Run a live test
            </Button>
            <p className="mt-2 text-sm text-muted-foreground">
              We&apos;ll run one real transaction end-to-end so you can see it work.
            </p>
          </div>
        )}
      </section>

      {/* Advanced disclosure */}
      <AdvancedDisclosure />
    </div>
  );
}

function AdvancedDisclosure() {
  const [open, setOpen] = useState(false);
  return (
    <section className="border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {open ? (
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        )}
        Advanced: manual setup &amp; docs
      </button>
      {open && (
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {ADVANCED_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
              >
                {link.label}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const {
    isConfigured,
    isLoading: isAuthLoading,
    authToken,
    apiKey,
    apiUrl,
  } = useApiConfig();

  // Active credential: Supabase JWT for logged-in users, or the stored API key
  // for programmatic access — same resolution the shared api-client uses.
  const credential = authToken ?? apiKey;

  const [selected, setSelected] = useState<Outcome | null>(null);

  const { data: onboardingState, isLoading: isLoadingState } = useQuery({
    queryKey: ['onboarding-state'],
    queryFn: () => fetchOnboardingState(credential!, apiUrl),
    enabled: !!credential,
  });

  if (isAuthLoading || (isLoadingState && !!credential)) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-9 w-72 rounded bg-muted" />
          <div className="h-5 w-96 rounded bg-muted" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="p-8">
        <div className="py-12 text-center">
          <Rocket className="mx-auto mb-4 h-12 w-12 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-foreground">Authentication required</h1>
          <p className="mt-2 text-muted-foreground">
            Please log in to set up agentic payments.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* Hero */}
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Start accepting agentic payments
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Sly already provisioned everything you need. Pick what you want to do
          and run one real test to see it work.
        </p>
      </header>

      {/* Outcome cards — equal weight, no recommended bias */}
      <div
        className="grid gap-4 md:grid-cols-3"
        role="radiogroup"
        aria-label="Choose what you want to do"
      >
        {OUTCOMES.map((o) => {
          const Icon = o.icon;
          const isActive = selected === o.key;
          return (
            <Card
              key={o.key}
              className={cn(
                'cursor-pointer transition-colors',
                isActive
                  ? 'border-primary ring-1 ring-primary'
                  : 'hover:border-foreground/20',
              )}
            >
              <CardContent className="p-5">
                <button
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setSelected(o.key)}
                  className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h2 className="mt-3 font-semibold text-foreground">{o.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{o.blurb}</p>
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected outcome panel */}
      {selected && (
        <Card className="mt-6">
          <CardContent className="p-6">
            {(() => {
              const o = OUTCOMES.find((x) => x.key === selected)!;
              return (
                <OutcomePanel
                  key={o.key}
                  outcome={o}
                  state={onboardingState}
                  credential={credential!}
                  apiUrl={apiUrl}
                />
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
