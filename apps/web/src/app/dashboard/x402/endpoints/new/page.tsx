'use client';

/**
 * x402 endpoint creation form.
 *
 * The "New Endpoint" CTA on /dashboard/x402/endpoints (and its mirror under
 * /dashboard/agentic-payments/x402/endpoints) used to point here without a
 * page existing. This is the actual form.
 *
 * After successful creation, optionally hits the publish lifecycle so the
 * endpoint is fanned out to Coinbase Bazaar (the live v1 marketplace adapter
 * — A2A and Smithery are stubbed pending Epic 84 phase 1).
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Badge,
} from '@sly/ui';
import {
  ArrowLeft,
  Zap,
  Globe,
  Lock,
  Check,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import type { CreateX402EndpointInput, X402Currency, X402EndpointMethod } from '@sly/api-client';

type Marketplace = {
  id: 'bazaar' | 'a2a' | 'smithery';
  label: string;
  description: string;
  status: 'live' | 'coming-soon';
  defaultChecked: boolean;
};

const MARKETPLACES: Marketplace[] = [
  {
    id: 'bazaar',
    label: 'Coinbase Bazaar',
    description: 'agentic.market — discoverable by every CDP-facilitator agent on Base.',
    status: 'live',
    defaultChecked: true,
  },
  {
    id: 'a2a',
    label: 'Sly A2A registry',
    description: 'Surfaces in find_agent / list_agents for every Sly-network agent. Epic 84.',
    status: 'coming-soon',
    defaultChecked: true,
  },
  {
    id: 'smithery',
    label: 'Smithery (MCP)',
    description: 'Exposes the endpoint as a paid MCP tool to Claude Desktop and downstream clients.',
    status: 'coming-soon',
    defaultChecked: false,
  },
];

const METHODS: X402EndpointMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const CURRENCIES: X402Currency[] = ['USDC', 'EURC'];

export default function NewX402EndpointPage() {
  const api = useApiClient();
  const { isConfigured, isLoading: isAuthLoading, apiEnvironment } = useApiConfig();
  const router = useRouter();

  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [method, setMethod] = useState<X402EndpointMethod>('GET');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('0.01');
  const [currency, setCurrency] = useState<X402Currency>('USDC');
  const [accountId, setAccountId] = useState('');
  const [serviceSlug, setServiceSlug] = useState('');
  const [category, setCategory] = useState('');
  const [backendUrl, setBackendUrl] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<Set<string>>(
    new Set(MARKETPLACES.filter(m => m.defaultChecked).map(m => m.id))
  );
  const [submitting, setSubmitting] = useState(false);

  // Pull tenant accounts so the user picks which account receives settlement.
  // For YC demo on Invu POS this should list the 5 merchants — endpoint is
  // owned by El Trapiche etc.
  const { data: accountsData } = useQuery({
    queryKey: ['accounts', 'for-x402'],
    queryFn: () => api!.accounts.list({ limit: 100 }),
    enabled: !!api,
  });

  const accounts = useMemo(() => {
    const raw = (accountsData as any)?.data ?? accountsData ?? [];
    const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
    // Endpoints are owned by businesses (merchants), not personal accounts.
    return list.filter((a: any) => a.type === 'business' || a.subtype === 'merchant');
  }, [accountsData]);

  const toggleMarketplace = (id: string) => {
    const next = new Set(selectedMarketplaces);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedMarketplaces(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) {
      toast.error('API client not ready');
      return;
    }

    if (!accountId) {
      toast.error('Pick an account to receive settlement');
      return;
    }

    const priceNum = Number(basePrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error('Base price must be a positive number');
      return;
    }

    // Normalize: ensure a single leading slash and collapse any accidental
    // double slashes (e.g. a user typing "/geocode" after a "/v1/" prefix).
    const normalizedPath = ('/' + path.trim()).replace(/\/{2,}/g, '/');
    if (normalizedPath.length < 2) {
      toast.error('Enter a path, e.g. /v1/merchant-fraud-score');
      return;
    }

    const input: CreateX402EndpointInput = {
      accountId,
      name: name.trim(),
      path: normalizedPath,
      method,
      description: description.trim() || undefined,
      basePrice: priceNum,
      currency,
      serviceSlug: serviceSlug.trim() || undefined,
      backendUrl: backendUrl.trim() || undefined,
      category: category.trim() || undefined,
      network: 'base-sepolia',
    };

    setSubmitting(true);
    try {
      const created = await api.x402Endpoints.create(input);
      toast.success(`Endpoint "${created.name}" created`);

      // Trigger publish if any marketplace is selected and visibility is public.
      // Only Bazaar is live in v1; the other adapters are persisted as intent
      // (selectedMarketplaces) but no publish call fires for them yet — once
      // Epic 84 phase 1 lands, the same selection drives the fanout.
      // Coinbase Bazaar publish needs a mainnet-upgraded facilitator and is
      // a no-op in sandbox — firing it in test mode only produces a
      // misleading "Failed" state. Skip it in sandbox; the endpoint is fully
      // usable for sandbox testing and can be published once live.
      if (visibility === 'public' && selectedMarketplaces.has('bazaar')) {
        if (apiEnvironment === 'test') {
          toast.success('Endpoint created in sandbox. Publish to Coinbase Bazaar from the detail page once you go live.');
        } else {
          try {
            await api.x402Endpoints.publish(created.id, {});
            toast.success('Publishing to Coinbase Bazaar — indexing on first settle');
          } catch (publishErr: any) {
            // Endpoint is created; publish failure is recoverable from detail page
            toast.warning('Endpoint created, but publish to Bazaar failed. Try again from the detail page.');
            console.error('Publish failed:', publishErr);
          }
        }
      }

      router.push(`/dashboard/x402/endpoints/${created.id}`);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to create endpoint'));
      setSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-6" />
        <div className="h-96 bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/dashboard/x402/endpoints"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Endpoints
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-950 flex items-center justify-center">
            <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New x402 endpoint</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Monetize an API in USDC. One publish action fans out to every catalog you opt into.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>What does this endpoint do?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. merchant-fraud-score"
                required
                maxLength={255}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A 1–3 sentence summary that callers see in catalog listings. ≥ 60 chars for Bazaar."
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/1000 — Bazaar requires ≥ 60 characters.</p>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. fraud-detection, weather, geocoding"
                maxLength={64}
              />
            </div>
          </CardContent>
        </Card>

        {/* Routing */}
        <Card>
          <CardHeader>
            <CardTitle>Routing</CardTitle>
            <CardDescription>HTTP path + the account that receives settlement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="method">Method</Label>
                <select
                  id="method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as X402EndpointMethod)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                >
                  {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="path">Path</Label>
                <Input
                  id="path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/v1/merchant-fraud-score"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="account">Receiving account</Label>
              <select
                id="account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
              >
                <option value="">Pick the account that receives settlement…</option>
                {accounts.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.name} {a.subtype === 'merchant' ? '— merchant' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="backendUrl">Backend URL <span className="text-gray-400">(optional)</span></Label>
              <Input
                id="backendUrl"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                type="url"
                placeholder="https://api.your-service.com/fraud-score — Sly proxies to this after settlement"
              />
              <p className="text-xs text-gray-500 mt-1">Never exposed to buyers. Sly attaches its own auth when proxying.</p>
            </div>
            <div>
              <Label htmlFor="serviceSlug">Service slug <span className="text-gray-400">(optional)</span></Label>
              <Input
                id="serviceSlug"
                value={serviceSlug}
                onChange={(e) => setServiceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="merchant-fraud-score"
                pattern="[a-z0-9][a-z0-9-]{1,39}"
                maxLength={40}
              />
              <p className="text-xs text-gray-500 mt-1">Sets the gateway URL: <code className="text-xs">https://&lt;tenant&gt;.x402.getsly.ai/&lt;slug&gt;</code></p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Stablecoins only — required by the x402 spec.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="basePrice">Base price per call</Label>
                <Input
                  id="basePrice"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  placeholder="0.01"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Up to 4 decimals. Minimum 0.0001.</p>
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as X402Currency)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visibility & marketplaces */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution</CardTitle>
            <CardDescription>Where should this endpoint be discoverable?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
                  visibility === 'public'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Public</div>
                  <div className="text-xs text-gray-500 mt-0.5">Indexed in selected marketplaces. Discoverable by all agents.</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
                  visibility === 'private'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <Lock className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Private</div>
                  <div className="text-xs text-gray-500 mt-0.5">Tenant-only. Skip catalog publishing.</div>
                </div>
              </button>
            </div>

            {visibility === 'public' && (
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <Label>Marketplaces</Label>
                <p className="text-xs text-gray-500 -mt-1 mb-3">
                  Publish once, distribute everywhere. Listing pricing is per marketplace; gateway proxying happens on Sly.
                </p>
                {MARKETPLACES.map((mk) => {
                  const checked = selectedMarketplaces.has(mk.id);
                  const disabled = mk.status === 'coming-soon';
                  return (
                    <label
                      key={mk.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        checked && !disabled
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                          : 'border-gray-200 dark:border-gray-700'
                      } ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-gray-300'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleMarketplace(mk.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{mk.label}</span>
                          {mk.status === 'live' && (
                            <Badge variant="default" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                              Live
                            </Badge>
                          )}
                          {mk.status === 'coming-soon' && (
                            <Badge variant="secondary">Coming soon</Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{mk.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Link
            href="/dashboard/x402/endpoints"
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            Cancel
          </Link>
          <Button type="submit" disabled={submitting || !accountId} size="lg">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : visibility === 'public' && selectedMarketplaces.has('bazaar') ? (
              <>
                Create &amp; publish
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                Create endpoint
                <Check className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
