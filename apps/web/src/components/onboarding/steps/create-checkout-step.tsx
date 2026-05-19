'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Loader2, CheckCircle, Info, Plus, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { useApiClient } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { CreateCheckoutInput } from '@sly/api-client';

interface CreateCheckoutStepProps {
  onCheckoutCreated: (checkoutId: string) => void;
  helpText?: string;
}

const CURRENCIES = ['USD', 'EUR', 'GBP'];

interface ItemDraft {
  name: string;
  quantity: string;
  unit_price: string;
}

export function CreateCheckoutStep({
  onCheckoutCreated,
  helpText = 'Set your store name, currency, and the items in this checkout.',
}: CreateCheckoutStepProps) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    merchantName: '',
    currency: 'USD',
    accountId: '',
  });
  const [items, setItems] = useState<ItemDraft[]>([
    { name: '', quantity: '1', unit_price: '0' },
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCheckout, setCreatedCheckout] = useState<{
    id: string;
    merchantName: string;
    total: number;
    currency: string;
  } | null>(null);

  const { data: accountsData } = useQuery({
    queryKey: ['accounts', 'for-checkout-wizard'],
    queryFn: () => api!.accounts.list({ limit: 100 }),
    enabled: !!api,
  });

  const accounts = useMemo(() => {
    const raw = (accountsData as any)?.data ?? accountsData ?? [];
    return Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
  }, [accountsData]);

  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0,
  );

  const addItem = () =>
    setItems(prev => [...prev, { name: '', quantity: '1', unit_price: '0' }]);

  const removeItem = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, patch: Partial<ItemDraft>) =>
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) {
      toast.error('API client not ready');
      return;
    }
    if (!formData.accountId) {
      toast.error('Pick an account for this checkout');
      return;
    }
    if (!formData.merchantName.trim()) {
      toast.error('Store name is required');
      return;
    }

    const cleanItems = items
      .filter(it => it.name.trim())
      .map(it => {
        const quantity = Number(it.quantity) || 0;
        const unit_price = Number(it.unit_price) || 0;
        return {
          name: it.name.trim(),
          quantity,
          unit_price,
          total_price: quantity * unit_price,
          currency: formData.currency,
        };
      });

    if (cleanItems.length === 0) {
      toast.error('Add at least one item with a name');
      return;
    }
    if (cleanItems.some(it => it.quantity < 1)) {
      toast.error('Each item quantity must be at least 1');
      return;
    }

    const merchantSlug = formData.merchantName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'store';

    const checkoutId = `chk_${Math.random().toString(36).substring(2, 9)}`;

    const payload: CreateCheckoutInput = {
      checkout_id: checkoutId,
      agent_id: `wizard-${merchantSlug}`,
      account_id: formData.accountId,
      merchant_id: merchantSlug,
      merchant_name: formData.merchantName.trim(),
      currency: formData.currency,
      items: cleanItems,
    };

    setIsCreating(true);
    setError(null);

    try {
      const created = await api.acp.create(payload);

      queryClient.invalidateQueries({ queryKey: ['acp-checkouts'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-state'] });

      const id = (created as any)?.id ?? checkoutId;
      setCreatedCheckout({
        id,
        merchantName: formData.merchantName.trim(),
        total: subtotal,
        currency: formData.currency,
      });

      toast.success('Checkout created successfully');
      onCheckoutCreated(id);
    } catch (err: any) {
      const message = getApiErrorMessage(err, 'Failed to create checkout');
      setError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  if (createdCheckout) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Checkout Created!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Your hosted checkout session is ready
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Store</span>
            <span className="font-medium text-gray-900 dark:text-white">{createdCheckout.merchantName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Order Total</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {createdCheckout.total.toFixed(2)} {createdCheckout.currency}
            </span>
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
            Store Name
          </label>
          <input
            type="text"
            required
            value={formData.merchantName}
            onChange={(e) => setFormData(prev => ({ ...prev, merchantName: e.target.value }))}
            placeholder="e.g., My Awesome Store"
            className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
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
              <option value="">Select account…</option>
              {accounts.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name || a.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Items
            </label>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
              >
                <div className="col-span-6">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                    placeholder="Product name"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateItem(idx, { unit_price: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-1 flex justify-center pb-2">
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Remove item"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Order Total</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {subtotal.toFixed(2)} {formData.currency}
          </span>
        </div>

        <button
          type="submit"
          disabled={isCreating || !formData.merchantName || !formData.accountId}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Checkout...
            </>
          ) : (
            <>
              <ShoppingBag className="w-5 h-5" />
              Create Checkout
            </>
          )}
        </button>
      </form>
    </div>
  );
}
