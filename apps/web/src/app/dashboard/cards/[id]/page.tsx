'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import Link from 'next/link';
import {
    ArrowLeft,
    CreditCard,
    Calendar,
    DollarSign,
    Activity,
    Shield,
    Clock,
    MapPin,
    Building,
    ArrowUpRight,
    ArrowDownLeft,
} from 'lucide-react';

export default function CardDetailPage() {
    const params = useParams();
    const api = useApiClient();
    const { isConfigured } = useApiConfig();
    const cardId = params.id as string;

    // Fetch Card Details
    const { data: card, isLoading: isLoadingCard } = useQuery({
        queryKey: ['card', cardId],
        queryFn: () => api!.paymentMethods.get(cardId),
        enabled: !!api && isConfigured,
    });

    // Fetch Card Transactions
    const { data: transactionsData, isLoading: isLoadingTx } = useQuery({
        queryKey: ['card-transactions', cardId],
        queryFn: () => api!.paymentMethods.getTransactions(cardId, { limit: 20 }),
        enabled: !!api && isConfigured,
    });

    // Extract transactions from paginated response
    const transactions = transactionsData?.data || [];

    if (!isConfigured) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
                <CreditCard className="h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Configure API Key</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Please configure your API key to view card details.</p>
                <Link href="/dashboard/api-keys" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Configure API Key
                </Link>
            </div>
        );
    }

    if (isLoadingCard) {
        return (
            <div className="p-8 max-w-[1600px] mx-auto animate-pulse">
                <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-8"></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                    <div className="lg:col-span-2 h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
                </div>
            </div>
        );
    }

    if (!card) {
        return (
            <div className="p-8 max-w-[1600px] mx-auto text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Card Not Found</h2>
                <Link href="/dashboard/cards" className="text-blue-600 hover:text-blue-500">
                    Return to Cards
                </Link>
            </div>
        );
    }

    const metadata = (card as any).metadata || {};

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/cards"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <ArrowLeft className="h-6 w-6 text-gray-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        Card Details
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${metadata.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                            {metadata.status || 'Unknown'}
                        </span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Expected ID: {card.id}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Card Info Card */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Card Information</h3>
                        <CreditCard className="h-5 w-5 text-gray-400" />
                    </div>

                    <div className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

                        <div className="relative z-10 flex flex-col justify-between h-48">
                            <div className="flex justify-between items-start">
                                <div className="text-lg font-semibold tracking-wider">Sly</div>
                                <div className="text-sm font-mono opacity-70">
                                    {metadata.type?.toUpperCase() || 'VIRTUAL'}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="font-mono text-2xl tracking-widest">
                                    •••• •••• •••• {card.cardLastFour || '••••'}
                                </div>

                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-xs opacity-60 text-white uppercase mb-1">Card Holder</div>
                                        <div className="font-medium tracking-wide">
                                            {(card.bankAccountHolder || metadata.cardholderName || 'PAYOS USER').toUpperCase()}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs opacity-60 text-white uppercase mb-1">Expires</div>
                                        <div className="font-mono">
                                            {metadata.card_exp_month}/{metadata.card_exp_year}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Network</span>
                            <span className="font-medium text-gray-900 dark:text-white capitalize">
                                {metadata.brand || 'Visa'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Billing Address</span>
                            <span className="font-medium text-gray-900 dark:text-white text-right">
                                {metadata.billing_address?.line1 || 'N/A'}<br />
                                {metadata.billing_address?.city}, {metadata.billing_address?.postal_code}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Created At</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {new Date(card.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
                        <Link href={`/dashboard/card-transactions?cardId=${cardId}`} className="text-sm text-blue-600 hover:text-blue-500 flex items-center gap-1">
                            View All <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    </div>

                    {isLoadingTx ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg animate-pulse"></div>
                            ))}
                        </div>
                    ) : transactions.length > 0 ? (
                        <div className="space-y-4">
                            {transactions.map((tx: any) => (
                                <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${tx.amount > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                            }`}>
                                            {tx.amount > 0 ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                {tx.merchant?.name || tx.description || 'Transaction'}
                                            </h4>
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(tx.created_at).toLocaleDateString()}
                                                <span className="mx-1">•</span>
                                                <Clock className="h-3 w-3" />
                                                {new Date(tx.created_at).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-semibold ${tx.amount > 0 ? 'text-emerald-600' : 'text-gray-900 dark:text-white'
                                            }`}>
                                            {tx.currency} {Math.abs(tx.amount).toFixed(2)}
                                        </div>
                                        <div className="text-xs text-gray-500 capitalize">{tx.status}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 py-12">
                            <Activity className="h-10 w-10 mb-3 opacity-50" />
                            <p>No transactions found for this card yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
