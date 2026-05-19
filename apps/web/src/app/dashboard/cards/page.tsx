'use client';

import { CreditCard, Plus, Search, AlertCircle, X } from 'lucide-react';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { Button } from '@sly/ui';
import { CardListSkeleton } from '@/components/ui/skeletons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';

interface PaymentMethod {
  id: string;
  accountId: string;
  type: string;
  status: string;
  label?: string;
  isDefault: boolean;
  bankAccountLast4?: string;
  bankAccountHolder?: string;
  bankAccountType?: string;
  cardLast4?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  walletAddress?: string;
  walletNetwork?: string;
  createdAt: string;
  updatedAt: string;
}

export default function CardsPage() {
  const api = useApiClient();
  const { isConfigured, isLoading: isApiLoading } = useApiConfig();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [cards, setCards] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Add-card modal state
  const [showIssue, setShowIssue] = useState(false);
  const [accountOptions, setAccountOptions] = useState<{ id: string; name: string }[]>([]);
  const [cardAccountId, setCardAccountId] = useState('');
  const [cardLabel, setCardLabel] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [creatingCard, setCreatingCard] = useState(false);

  // Load accounts for the owning-account picker when the modal opens.
  useEffect(() => {
    if (!showIssue || !api || !isConfigured) return;
    (async () => {
      try {
        const res: any = await api.accounts.list({ limit: 100 });
        const raw = res?.data?.data ?? res?.data ?? res ?? [];
        const list = Array.isArray(raw) ? raw : [];
        setAccountOptions(list.map((a: any) => ({ id: a.id, name: a.name })));
        if (list.length && !cardAccountId) setCardAccountId(list[0].id);
      } catch {
        setAccountOptions([]);
      }
    })();
  }, [showIssue, api, isConfigured]);

  // Fetch card transactions since payment methods API doesn't support global list
  useEffect(() => {
    async function fetchCards() {
      // Wait for API to initialize
      if (isApiLoading) return;

      if (!api || !isConfigured) {
        setLoading(false);
        return;
      }

      try {
        const response: any = await api.paymentMethods.listAll({ type: 'card' });

        // Handle standard API response format { data: [...] } or legacy { payment_methods: [...] }
        const cardsData = response.data || response.payment_methods || response || [];

        if (!Array.isArray(cardsData)) {
          console.error('Invalid cards data received:', cardsData);
          setCards([]);
          return;
        }

        const mappedCards: PaymentMethod[] = cardsData.map((card: any) => ({
          id: card.id,
          accountId: card.account_id,
          type: card.type,
          status: card.metadata?.status || card.status,
          label: card.label,
          isDefault: card.is_default,
          // Handle both camelCase (if transformed) and snake_case API response
          bankAccountLast4: card.bank_account_last_four,
          bankAccountHolder: card.bank_account_holder,
          bankAccountType: card.bank_account_type,
          cardLast4: card.card_last_four,
          // Extract metadata fields or top level
          cardBrand: card.metadata?.cardBrand || card.card_brand,
          cardExpMonth: card.metadata?.cardExpMonth || card.card_exp_month,
          cardExpYear: card.metadata?.cardExpYear || card.card_exp_year,
          walletAddress: card.wallet_address,
          walletNetwork: card.wallet_network,
          createdAt: card.created_at,
          updatedAt: card.updated_at,
        }));

        setCards(mappedCards);
      } catch (error) {
        console.error('Failed to fetch cards:', error);
        setCards([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCards();
  }, [api, isConfigured, refreshKey]);

  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      !searchTerm ||
      card.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.bankAccountHolder?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.cardLast4?.includes(searchTerm);
    return matchesSearch;
  });

  const activeCards = filteredCards.filter(c => c.status === 'active').length;

  if (isApiLoading) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Cards</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage payment cards</p>
          </div>
        </div>
        <CardListSkeleton count={6} />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configure API Key</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Please configure your API key to access card data.
          </p>
          <Link
            href="/dashboard/api-keys"
            className="inline-flex mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Configure API Key
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Cards</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage payment cards</p>
        </div>
        <Button
          onClick={() => setShowIssue(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Card
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Cards</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? '...' : filteredCards.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">{activeCards} active</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Cards</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? '...' : activeCards}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Ready to use</div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Inactive Cards</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? '...' : filteredCards.length - activeCards}
          </div>
          <div className="text-xs text-gray-500 mt-1">Suspended or expired</div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by card number, holder, or label..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Cards List */}
      {loading ? (
        <CardListSkeleton count={6} />
      ) : filteredCards.length === 0 ? (
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Cards Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchTerm ? 'No cards match your search.' : 'Add your first card to get started.'}
          </p>
          <Button
            onClick={() => setShowIssue(true)}
            className="inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Card
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((card: any) => (
            <div
              key={card.id}
              onClick={() => router.push(`/dashboard/cards/${card.id}`)}
              className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${card.status === 'active'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                  }`}>
                  {card.status}
                </span>
              </div>

              <div className="mb-4">
                <div className="text-sm font-mono text-gray-900 dark:text-white mb-1">
                  •••• •••• •••• {card.cardLast4 || card.bankAccountLast4 || '****'}
                </div>
                {card.label && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">{card.label}</div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Holder</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {card.bankAccountHolder || 'N/A'}
                  </span>
                </div>
                {card.cardBrand && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Brand</span>
                    <span className="text-gray-900 dark:text-white font-medium capitalize">
                      {card.cardBrand}
                    </span>
                  </div>
                )}
                {card.cardExpMonth && card.cardExpYear && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Expires</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {String(card.cardExpMonth).padStart(2, '0')}/{String(card.cardExpYear).slice(-2)}
                    </span>
                  </div>
                )}
                {card.isDefault && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      ⭐ Default Payment Method
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Card (payment method) modal */}
      {showIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-950 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Card</h2>
              <button
                onClick={() => setShowIssue(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Register a card payment method on an account.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!cardAccountId) {
                  toast.error('Select an account');
                  return;
                }
                if (!cardLabel.trim()) {
                  toast.error('Card label is required');
                  return;
                }
                if (!/^\d{4}$/.test(cardLast4)) {
                  toast.error('Enter the last 4 digits of the card');
                  return;
                }
                if (!api) {
                  toast.error('API client not ready');
                  return;
                }
                setCreatingCard(true);
                try {
                  await api.paymentMethods.create(cardAccountId, {
                    type: 'card',
                    label: cardLabel.trim(),
                    cardLastFour: cardLast4,
                  });
                  toast.success(`Card "${cardLabel.trim()}" added`);
                  setShowIssue(false);
                  setCardLabel('');
                  setCardLast4('');
                  setRefreshKey((k) => k + 1);
                } catch (err) {
                  toast.error(getApiErrorMessage(err, 'Failed to add card'));
                } finally {
                  setCreatingCard(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={cardAccountId}
                  onChange={(e) => setCardAccountId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  {accountOptions.length === 0 && <option value="">No accounts found</option>}
                  {accountOptions.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  value={cardLabel}
                  onChange={(e) => setCardLabel(e.target.value)}
                  placeholder="e.g. Corporate Visa"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last 4 digits <span className="text-red-500">*</span>
                </label>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  value={cardLast4}
                  onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="4242"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-400 mt-1">Last 4 only — never enter the full card number.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssue(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCard || !cardAccountId || !cardLabel.trim() || !/^\d{4}$/.test(cardLast4)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {creatingCard ? 'Adding…' : 'Add Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
