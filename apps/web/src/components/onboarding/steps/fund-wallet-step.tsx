'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  CheckCircle,
  Info,
  AlertTriangle,
  Wallet,
  ExternalLink,
} from 'lucide-react';
import { initOnRamp, type CBPayInstanceType } from '@coinbase/cbpay-js';
import { useApiClient } from '@/lib/api-client';
import { toast } from 'sonner';

const CDP_PROJECT_ID = process.env.NEXT_PUBLIC_CDP_PROJECT_ID || '';

const BLOCKCHAIN_TO_COINBASE: Record<string, string> = {
  base: 'base',
  eth: 'ethereum',
  ethereum: 'ethereum',
  polygon: 'polygon',
  sol: 'solana',
  solana: 'solana',
};

interface FundWalletStepProps {
  walletId: string;
  onComplete: (data: { walletId: string; amount: number }) => void;
  helpText?: string;
}

type Phase = 'loading-wallet' | 'ready' | 'buying' | 'success' | 'no-address';

export function FundWalletStep({
  walletId,
  onComplete,
  helpText = 'Add USDC to your wallet via Coinbase. 0% fees on USDC purchases.',
}: FundWalletStepProps) {
  const [phase, setPhase] = useState<Phase>('loading-wallet');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [blockchain, setBlockchain] = useState<string>('base');
  const [error, setError] = useState<string | null>(null);
  const [onrampInstance, setOnrampInstance] = useState<CBPayInstanceType | null>(null);
  const api = useApiClient();
  const queryClient = useQueryClient();

  // Fetch wallet details to get on-chain address
  useEffect(() => {
    if (!api || !walletId) return;
    (async () => {
      try {
        const wallet = await api.wallets.get(walletId);
        const w = (wallet as any)?.data || wallet;
        const addr = w?.walletAddress || w?.wallet_address;
        if (addr && !addr.startsWith('internal://')) {
          setWalletAddress(addr);
          setBlockchain(w?.blockchain || 'base');
          setPhase('ready');
        } else {
          setPhase('no-address');
        }
      } catch {
        setError('Failed to load wallet details');
        setPhase('no-address');
      }
    })();
  }, [api, walletId]);

  // Initialize Coinbase Onramp once we have the wallet address
  useEffect(() => {
    if (!walletAddress || !CDP_PROJECT_ID) return;

    const network = BLOCKCHAIN_TO_COINBASE[blockchain] || 'base';

    initOnRamp(
      {
        appId: CDP_PROJECT_ID,
        widgetParameters: {
          addresses: { [walletAddress]: [network] },
          assets: ['USDC'],
          defaultAsset: 'USDC',
          defaultNetwork: network,
        },
        onSuccess: () => {
          setPhase('success');
          queryClient.invalidateQueries({ queryKey: ['wallets'] });
          queryClient.invalidateQueries({ queryKey: ['onboarding-state'] });
          toast.success('USDC deposited to your wallet!');
          onComplete({ walletId, amount: 0 });
        },
        onExit: () => {
          setPhase('ready');
        },
        onEvent: (event: any) => {
          console.log('[Coinbase Onramp]', event);
        },
        experienceLoggedIn: 'popup',
        experienceLoggedOut: 'popup',
        closeOnExit: true,
        closeOnSuccess: true,
      },
      (err, instance) => {
        if (err) {
          setError('Failed to initialize Coinbase. Check configuration.');
        } else if (instance) {
          setOnrampInstance(instance);
        }
      }
    );

    return () => {
      onrampInstance?.destroy();
    };
  }, [walletAddress, blockchain]);

  const handleOpenOnramp = useCallback(() => {
    if (onrampInstance) {
      setPhase('buying');
      onrampInstance.open();
    }
  }, [onrampInstance]);

  // No on-chain address
  if (phase === 'no-address') {
    return (
      <div className="max-w-xl mx-auto text-center py-6">
        <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          On-Chain Wallet Required
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          To deposit real USDC, you need a Circle wallet with an on-chain address.
          Skip this step and create one from the Wallets page.
        </p>
      </div>
    );
  }

  // Success
  if (phase === 'success') {
    return (
      <div className="max-w-xl mx-auto text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Wallet Funded!</h3>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          USDC has been delivered to your wallet. It may take a few minutes to appear.
        </p>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Click <strong>Continue</strong> to proceed to the next step
        </p>
      </div>
    );
  }

  // Loading wallet info
  if (phase === 'loading-wallet') {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading wallet details...</p>
      </div>
    );
  }

  // Ready — show buy button
  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-6">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-200">{helpText}</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-6">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-5">
        {/* Wallet info */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Destination</span>
            <span className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
              {walletAddress}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Network</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{blockchain}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Asset</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">USDC</span>
          </div>
        </div>

        {/* 0% fees highlight */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-lg font-bold text-green-600 dark:text-green-400">0%</p>
            <p className="text-xs text-green-700 dark:text-green-300">USDC fees</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">Card, Bank</p>
            <p className="text-xs text-blue-700 dark:text-blue-300">Apple Pay</p>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mt-1">Direct to</p>
            <p className="text-xs text-purple-700 dark:text-purple-300">wallet</p>
          </div>
        </div>

        <button
          onClick={handleOpenOnramp}
          disabled={!onrampInstance || phase === 'buying'}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {phase === 'buying' ? (
            <><Loader2 className="w-5 h-5 animate-spin" />Opening Coinbase...</>
          ) : !onrampInstance ? (
            <><Loader2 className="w-5 h-5 animate-spin" />Initializing...</>
          ) : (
            <><ExternalLink className="w-5 h-5" />Buy USDC with Coinbase</>
          )}
        </button>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          Powered by Coinbase. 0% fees on USDC purchases.
        </p>
      </div>
    </div>
  );
}
