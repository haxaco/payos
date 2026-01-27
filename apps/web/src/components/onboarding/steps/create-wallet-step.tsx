'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Wallet, Loader2, CheckCircle, Info, Zap, Shield } from 'lucide-react';
import { cn } from '@sly/ui';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { toast } from 'sonner';

interface CreateWalletStepProps {
  onWalletCreated: (walletId: string) => void;
  purpose?: string;
  recommendedNetwork?: 'base' | 'ethereum' | 'polygon';
  helpText?: string;
}

export function CreateWalletStep({
  onWalletCreated,
  purpose = 'Receiving wallet for payments',
  recommendedNetwork = 'base',
  helpText = 'Your wallet will receive payments. We recommend Base for lowest fees.',
}: CreateWalletStepProps) {
  const api = useApiClient();
  const { authToken, isConfigured } = useApiConfig();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    purpose: purpose,
    currency: 'USDC' as 'USDC' | 'EURC',
    walletType: 'internal' as 'internal' | 'circle_custodial',
    blockchain: recommendedNetwork as 'base' | 'ethereum' | 'polygon',
  });

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdWallet, setCreatedWallet] = useState<{ id: string; name: string; walletAddress?: string } | null>(null);
  const [accountId, setAccountId] = useState<string>('');

  // Fetch account ID
  useEffect(() => {
    async function fetchAccountId() {
      if (!api) return;
      try {
        const accountsResponse = await api.accounts.list({ limit: 1 });
        if (accountsResponse.data && accountsResponse.data.length > 0) {
          setAccountId(accountsResponse.data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch account:', error);
      }
    }
    fetchAccountId();
  }, [api]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api || !accountId) return;

    setIsCreating(true);
    setError(null);

    try {
      const newWallet = await api.wallets.create({
        ownerAccountId: accountId,
        name: formData.name,
        purpose: formData.purpose,
        currency: formData.currency,
        type: formData.walletType,
        blockchain: formData.blockchain,
      });

      setCreatedWallet({
        id: newWallet.id,
        name: newWallet.name || formData.name,
        walletAddress: newWallet.walletAddress,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-state'] });

      toast.success('Wallet created successfully!');
      onWalletCreated(newWallet.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create wallet');
      toast.error('Failed to create wallet');
    } finally {
      setIsCreating(false);
    }
  };

  if (createdWallet) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Wallet Created!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Your wallet is ready to receive payments
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Wallet Name</span>
            <span className="font-medium text-gray-900 dark:text-white">{createdWallet.name}</span>
          </div>
          {createdWallet.walletAddress && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Address</span>
              <span className="font-mono text-sm text-gray-900 dark:text-white truncate max-w-[200px]">
                {createdWallet.walletAddress}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Network</span>
            <span className="font-medium text-gray-900 dark:text-white capitalize">{formData.blockchain}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Currency</span>
            <span className="font-medium text-gray-900 dark:text-white">{formData.currency}</span>
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
            Wallet Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., API Payments Wallet"
            className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Purpose
          </label>
          <input
            type="text"
            value={formData.purpose}
            onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
            placeholder="e.g., Receiving payments from API calls"
            className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Network
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'base', label: 'Base', desc: 'Lowest fees', recommended: true },
              { value: 'ethereum', label: 'Ethereum', desc: 'Most liquidity', recommended: false },
              { value: 'polygon', label: 'Polygon', desc: 'Fast & cheap', recommended: false },
            ].map((network) => (
              <button
                key={network.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, blockchain: network.value as any }))}
                className={cn(
                  'relative p-4 rounded-xl border-2 text-left transition-all',
                  formData.blockchain === network.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                {network.recommended && (
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full">
                    Recommended
                  </span>
                )}
                <div className="font-medium text-gray-900 dark:text-white">{network.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{network.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as any }))}
              className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USDC">USDC</option>
              <option value="EURC">EURC</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Wallet Type
            </label>
            <select
              value={formData.walletType}
              onChange={(e) => setFormData(prev => ({ ...prev, walletType: e.target.value as any }))}
              className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="internal">PayOS Managed</option>
              <option value="circle_custodial">Circle Wallet (MPC)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isCreating || !accountId || !formData.name}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Wallet...
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              Create Wallet
            </>
          )}
        </button>
      </form>
    </div>
  );
}
