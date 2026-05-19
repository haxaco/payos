'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Zap, Loader2, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useApiClient } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { CreateX402EndpointInput, X402EndpointMethod, X402Currency } from '@sly/api-client';

interface RegisterEndpointStepProps {
  onEndpointRegistered: (endpointId: string) => void;
  helpText?: string;
}

const METHODS: X402EndpointMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const CURRENCIES: X402Currency[] = ['USDC', 'EURC'];

export function RegisterEndpointStep({
  onEndpointRegistered,
  helpText = 'Enter your API base URL and we\'ll generate the x402 payment gateway URL.',
}: RegisterEndpointStepProps) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    path: '',
    method: 'GET' as X402EndpointMethod,
    backendUrl: '',
    basePrice: '0.01',
    currency: 'USDC' as X402Currency,
    accountId: '',
    description: '',
  });

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEndpoint, setCreatedEndpoint] = useState<{
    id: string;
    name: string;
    path: string;
  } | null>(null);

  // Endpoints are owned by businesses (merchants), not personal accounts —
  // mirrors the dashboard create page filter.
  const { data: accountsData } = useQuery({
    queryKey: ['accounts', 'for-x402-wizard'],
    queryFn: () => api!.accounts.list({ limit: 100 }),
    enabled: !!api,
  });

  const accounts = useMemo(() => {
    const raw = (accountsData as any)?.data ?? accountsData ?? [];
    const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
    return list.filter((a: any) => a.type === 'business' || a.subtype === 'merchant');
  }, [accountsData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) {
      toast.error('API client not ready');
      return;
    }
    if (!formData.accountId) {
      toast.error('Pick an account to receive settlement');
      return;
    }

    const priceNum = Number(formData.basePrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error('Base price must be a positive number');
      return;
    }

    // Normalize: single leading slash, collapse accidental double slashes.
    const normalizedPath = ('/' + formData.path.trim()).replace(/\/{2,}/g, '/');
    if (normalizedPath.length < 2) {
      toast.error('Enter a path, e.g. /v1/weather');
      return;
    }

    const input: CreateX402EndpointInput = {
      accountId: formData.accountId,
      name: formData.name.trim(),
      path: normalizedPath,
      method: formData.method,
      description: formData.description.trim() || undefined,
      basePrice: priceNum,
      currency: formData.currency,
      backendUrl: formData.backendUrl.trim() || undefined,
      network: 'base-sepolia',
    };

    setIsCreating(true);
    setError(null);

    try {
      const created = await api.x402Endpoints.create(input);

      queryClient.invalidateQueries({ queryKey: ['x402-endpoints'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-state'] });

      setCreatedEndpoint({
        id: created.id,
        name: created.name || formData.name,
        path: normalizedPath,
      });

      toast.success(`Endpoint "${created.name || formData.name}" created`);
      onEndpointRegistered(created.id);
    } catch (err: any) {
      const message = getApiErrorMessage(err, 'Failed to create endpoint');
      setError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  if (createdEndpoint) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Endpoint Registered!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Your x402-monetized API endpoint is now live
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Name</span>
            <span className="font-medium text-gray-900 dark:text-white">{createdEndpoint.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Path</span>
            <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              {createdEndpoint.path}
            </code>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Click <strong>Continue</strong> to proceed to the next step
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Help tip */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-6">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-200">{helpText}</p>
      </div>

      <form onSubmit={handleCreate} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Weather API"
            maxLength={255}
            className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Method
            </label>
            <select
              value={formData.method}
              onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value as X402EndpointMethod }))}
              className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Path
            </label>
            <input
              type="text"
              required
              value={formData.path}
              onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))}
              placeholder="/v1/weather"
              className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Receiving Account
          </label>
          <select
            required
            value={formData.accountId}
            onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
            className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Backend URL <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={formData.backendUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, backendUrl: e.target.value }))}
            placeholder="https://api.example.com/weather"
            className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Never exposed to buyers. Sly proxies to this after settlement.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Base Price per Call
            </label>
            <input
              type="number"
              required
              step="0.0001"
              min="0.0001"
              value={formData.basePrice}
              onChange={(e) => setFormData(prev => ({ ...prev, basePrice: e.target.value }))}
              placeholder="0.01"
              className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as X402Currency }))}
              className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="A short summary callers see in catalog listings."
            rows={2}
            maxLength={1000}
            className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isCreating || !formData.name || !formData.path || !formData.accountId}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Registering Endpoint...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Register Endpoint
            </>
          )}
        </button>
      </form>
    </div>
  );
}
