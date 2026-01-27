'use client';

import { CreditCard, Plus, Search, AlertCircle } from 'lucide-react';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { Button } from '@sly/ui';
import { CardListSkeleton } from '@/components/ui/skeletons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  }, [api, isConfigured]);

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
        <Button className="flex items-center gap-2">
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
          <Button className="inline-flex items-center gap-2">
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
    </div>
  );
}
