'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  Wallet,
  ExternalLink,
} from 'lucide-react';
import { initOnRamp, type CBPayInstanceType } from '@coinbase/cbpay-js';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { toast } from 'sonner';

const CDP_PROJECT_ID = process.env.NEXT_PUBLIC_CDP_PROJECT_ID || '';

interface DepositModalProps {
  walletId: string;
  walletName?: string;
  walletAddress?: string;
  blockchain?: string;
  walletType?: string;
  onClose: () => void;
}

const BLOCKCHAIN_TO_COINBASE: Record<string, string> = {
  base: 'base',
  eth: 'ethereum',
  ethereum: 'ethereum',
  polygon: 'polygon',
  sol: 'solana',
  solana: 'solana',
};

type Phase = 'init' | 'ready' | 'success' | 'error';

export function DepositModal({
  walletId,
  walletName,
  walletAddress,
  blockchain,
  walletType,
  onClose,
}: DepositModalProps) {
  const [phase, setPhase] = useState<Phase>('init');
  const [error, setError] = useState<string | null>(null);
  const instanceRef = useRef<CBPayInstanceType | null>(null);
  const lastEventAmountRef = useRef<number | null>(null);
  const popupOpenedRef = useRef(false);
  const phaseRef = useRef<Phase>('init');
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const api = useApiClient();
  const { authToken, apiUrl } = useApiConfig();
  const authTokenRef = useRef(authToken);
  const apiUrlRef = useRef(apiUrl);
  useEffect(() => { authTokenRef.current = authToken; }, [authToken]);
  useEffect(() => { apiUrlRef.current = apiUrl; }, [apiUrl]);
  const queryClient = useQueryClient();

  const isOnChain = walletAddress && !walletAddress.startsWith('internal://');

  const handleDepositComplete = useCallback(async () => {
    if (phaseRef.current === 'success') return; // Already handled
    setPhase('success');
    toast.success('Deposit flow completed! Syncing wallet...');

    const token = authTokenRef.current;
    const url = apiUrlRef.current;
    if (!token) return;

    // In sandbox: use Circle faucet to drip real testnet USDC
    if (process.env.NODE_ENV === 'development') {
      try {
        toast.info('Requesting faucet drip...');
        const resp = await fetch(`${url}/v1/wallets/${walletId}/fund`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ currency: 'USDC', native: true }),
        });
        if (resp.ok) {
          const data = await resp.json();
          toast.success(`Sandbox: faucet drip sent! Balance: $${data?.data?.new_balance || '?'} USDC`);
        } else {
          // Fallback to ledger test-fund if faucet fails (e.g. mainnet wallet)
          await fetch(`${url}/v1/wallets/${walletId}/test-fund`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount: lastEventAmountRef.current || 100, currency: 'USDC' }),
          });
          toast.success('Sandbox: test funds added to wallet');
        }
      } catch (e) {
        console.error('[Deposit] sandbox fund failed:', e);
      }
    }

    // Sync wallet balance
    const syncWallet = async () => {
      try {
        await fetch(`${url}/v1/wallets/${walletId}/sync`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      } catch {}
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balance', walletId] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    };

    syncWallet();
    setTimeout(syncWallet, 10000);
  }, [walletId, queryClient]);

  // Fallback: detect when user returns from popup via window focus
  useEffect(() => {
    const handleFocus = () => {
      if (popupOpenedRef.current && phaseRef.current === 'ready') {
        // Give SDK callbacks 2s to fire first
        setTimeout(() => {
          if (phaseRef.current === 'ready') {
            handleDepositComplete();
          }
        }, 2000);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [handleDepositComplete]);

  useEffect(() => {
    if (!isOnChain || !CDP_PROJECT_ID || !api) return;

    let destroyed = false;

    const setup = async () => {
      try {
        // Get session token from backend
        const session = await api.fundingSources.createOnrampSession({ walletId });
        if (destroyed) return;

        const network = session.network || BLOCKCHAIN_TO_COINBASE[blockchain || 'base'] || 'base';

        const isSandbox = process.env.NODE_ENV === 'development';

        initOnRamp(
          {
            appId: CDP_PROJECT_ID,
            ...(isSandbox ? { host: 'https://pay-sandbox.coinbase.com' } : {}),
            widgetParameters: {
              addresses: { [walletAddress!]: [network] },
              assets: ['USDC'],
              defaultAsset: 'USDC',
              defaultNetwork: network,
              sessionToken: session.session_token,
            } as any,
            onSuccess: () => {
              handleDepositComplete();
            },
            onExit: () => {
              // In sandbox, treat popup close as success since onSuccess may not fire
              if (process.env.NODE_ENV === 'development') {
                handleDepositComplete();
              }
            },
            onEvent: (event: any) => {
              console.log('[Coinbase Onramp]', JSON.stringify(event));
              // Try to capture the purchase amount from event data
              const amount = event?.purchaseAmount || event?.amount || event?.cryptoAmount
                || event?.destination_amount || event?.sourceAmount || event?.source_amount
                || event?.data?.purchaseAmount || event?.data?.amount;
              if (amount && !isNaN(Number(amount))) {
                lastEventAmountRef.current = Number(amount);
              }
            },
            experienceLoggedIn: 'popup',
            experienceLoggedOut: 'popup',
            closeOnExit: true,
            closeOnSuccess: true,
          },
          (err, instance) => {
            if (destroyed) return;
            if (err) {
              console.error('[Coinbase Onramp] init error:', err);
              setError(typeof err === 'string' ? err : (err as Error).message || 'Failed to initialize');
              setPhase('error');
            } else if (instance) {
              instanceRef.current = instance;
              setPhase('ready');
            }
          }
        );
      } catch (err: any) {
        if (!destroyed) {
          console.error('[Coinbase Onramp] setup error:', err);
          setError(err.message || 'Failed to create onramp session');
          setPhase('error');
        }
      }
    };

    setup();

    return () => {
      destroyed = true;
      instanceRef.current?.destroy();
    };
  }, [walletAddress, blockchain, isOnChain, api, walletId]);

  const handleBuy = useCallback(() => {
    popupOpenedRef.current = true;
    instanceRef.current?.open();
  }, []);

  const handleClose = useCallback(() => {
    instanceRef.current?.destroy();
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {phase === 'success' ? 'Deposit Complete' : 'Deposit USDC'}
            </h2>
            {walletName && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">to {walletName}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* No on-chain address */}
          {!isOnChain && (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                On-Chain Wallet Required
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                This wallet doesn't have an on-chain address. To deposit real USDC,
                create a Circle wallet with an on-chain address.
              </p>
              <button onClick={handleClose} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                Got It
              </button>
            </div>
          )}

          {/* Loading */}
          {phase === 'init' && isOnChain && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Initializing Coinbase...</p>
            </div>
          )}

          {/* Ready — show wallet info and buy button */}
          {phase === 'ready' && isOnChain && (
            <div className="space-y-5">
              {/* Wallet info */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Destination</span>
                  <span className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                    {walletAddress}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Network</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {blockchain || 'base'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Asset</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">USDC</span>
                </div>
              </div>

              {/* Features */}
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
                onClick={handleBuy}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                Buy USDC with Coinbase
              </button>

              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                Powered by Coinbase. 0% fees on USDC purchases.
              </p>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && isOnChain && (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Something went wrong
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {error || 'Failed to load the payment widget.'}
              </p>
              <button onClick={handleClose} className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors">
                Close
              </button>
            </div>
          )}

          {/* Success */}
          {phase === 'success' && isOnChain && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Deposit Successful!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">
                USDC has been delivered to your wallet. It may take a few minutes to appear.
              </p>
              <button onClick={handleClose} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
