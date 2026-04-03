'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  Send,
  ExternalLink,
  Landmark,
} from 'lucide-react';
import { initOnRamp, type CBPayInstanceType } from '@coinbase/cbpay-js';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { toast } from 'sonner';

const CDP_PROJECT_ID = process.env.NEXT_PUBLIC_CDP_PROJECT_ID || '';

interface WithdrawModalProps {
  walletId: string;
  walletName?: string;
  walletAddress?: string;
  blockchain?: string;
  balance?: number;
  onClose: () => void;
}

const BLOCKCHAIN_TO_COINBASE: Record<string, string> = {
  base: 'base', eth: 'ethereum', ethereum: 'ethereum',
  polygon: 'polygon', sol: 'solana', solana: 'solana',
};

const NETWORK_DISPLAY: Record<string, string> = {
  base: 'Base', eth: 'Ethereum', ethereum: 'Ethereum',
  polygon: 'Polygon', sol: 'Solana', solana: 'Solana',
};

type WithdrawOption = 'send' | 'coinbase';
type Phase = 'select' | 'send-form' | 'sending' | 'coinbase-init' | 'coinbase-ready' | 'success' | 'error';

export function WithdrawModal({
  walletId, walletName, walletAddress, blockchain, balance, onClose,
}: WithdrawModalProps) {
  const [phase, setPhase] = useState<Phase>('select');
  const [error, setError] = useState<string | null>(null);
  const [destAddress, setDestAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);

  const instanceRef = useRef<CBPayInstanceType | null>(null);
  const popupOpenedRef = useRef(false);
  const phaseRef = useRef<Phase>('select');
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const api = useApiClient();
  const { authToken, apiUrl } = useApiConfig();
  const queryClient = useQueryClient();

  const networkDisplay = NETWORK_DISPLAY[blockchain || 'base'] || blockchain || 'Base';

  const refreshWallet = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
    queryClient.invalidateQueries({ queryKey: ['wallet-balance', walletId] });
    queryClient.invalidateQueries({ queryKey: ['wallets'] });
  }, [walletId, queryClient]);

  // ── Send to external address ──
  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) return;

    const sendAmount = parseFloat(amount);
    if (isNaN(sendAmount) || sendAmount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (balance !== undefined && sendAmount > balance) {
      setError(`Insufficient balance. Available: ${balance} USDC`);
      return;
    }
    if (!destAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Enter a valid EVM wallet address (0x...)');
      return;
    }

    setPhase('sending');
    setError(null);

    try {
      const result = await api.fundingSources.withdrawExternal({
        walletId,
        destinationAddress: destAddress,
        amount: sendAmount,
      });
      setTxHash(result.tx_hash || null);
      setPhase('success');
      toast.success(`Sent ${sendAmount} USDC`);
      refreshWallet();
    } catch (err: any) {
      setError(err.message || 'Transfer failed');
      setPhase('send-form');
    }
  }, [api, walletId, destAddress, amount, balance, refreshWallet]);

  // ── Coinbase offramp ──
  const initCoinbaseOfframp = useCallback(async () => {
    if (!api || !walletAddress) return;
    setPhase('coinbase-init');

    try {
      const session = await api.fundingSources.createOfframpSession({ walletId });
      const network = session.network || BLOCKCHAIN_TO_COINBASE[blockchain || 'base'] || 'base';
      const isSandbox = process.env.NODE_ENV === 'development';

      // cbpay-js doesn't have initOffRamp — use initOnRamp with sell URL
      // The Coinbase offramp uses the same session token approach
      // For now, open the Coinbase sell page directly
      const sellUrl = `https://${isSandbox ? 'pay-sandbox' : 'pay'}.coinbase.com/v3/sell/input?sessionToken=${session.session_token}&addresses={"${walletAddress}":["${network}"]}&assets=["USDC"]&defaultAsset=USDC`;

      window.open(sellUrl, '_blank', 'width=460,height=700');
      popupOpenedRef.current = true;
      setPhase('coinbase-ready');
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Coinbase');
      setPhase('error');
    }
  }, [api, walletAddress, walletId, blockchain]);

  // Focus fallback for Coinbase popup
  useEffect(() => {
    const handleFocus = () => {
      if (popupOpenedRef.current && phaseRef.current === 'coinbase-ready') {
        setTimeout(() => {
          if (phaseRef.current === 'coinbase-ready') {
            setPhase('success');
            toast.success('Withdrawal flow completed');
            refreshWallet();
          }
        }, 2000);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshWallet]);

  const selectOption = useCallback((option: WithdrawOption) => {
    if (option === 'send') setPhase('send-form');
    else if (option === 'coinbase') initCoinbaseOfframp();
  }, [initCoinbaseOfframp]);

  const handleClose = useCallback(() => {
    instanceRef.current?.destroy();
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {phase === 'success' ? 'Withdrawal Complete' : 'Withdraw USDC'}
            </h2>
            {walletName && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">from {walletName}</p>}
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* ── Option Selection ── */}
          {phase === 'select' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Choose how you'd like to withdraw:</p>

              <button onClick={() => selectOption('send')} className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-gray-900 dark:text-white">Send to Wallet</span>
                  </div>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">Free</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Send USDC to any external wallet address on {networkDisplay}.</p>
              </button>

              <button onClick={() => selectOption('coinbase')} className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-gray-900 dark:text-white">Coinbase (Sell → Fiat)</span>
                  </div>
                  <span className="text-sm font-medium text-gray-500">To bank/PayPal</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sell USDC and receive fiat to your bank account or PayPal. Requires Coinbase account.</p>
              </button>

              {balance !== undefined && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 pt-2">
                  Available: <strong>{balance} USDC</strong>
                </p>
              )}
            </div>
          )}

          {/* ── Send Form ── */}
          {phase === 'send-form' && (
            <form onSubmit={handleSend} className="space-y-5">
              {error && (
                <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Destination Address</label>
                <input
                  type="text"
                  required
                  value={destAddress}
                  onChange={(e) => setDestAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 text-sm font-mono bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount (USDC)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  max={balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 text-lg font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {balance !== undefined && (
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500">Available: {balance} USDC</p>
                    <button type="button" onClick={() => setAmount(String(balance))} className="text-xs text-blue-600 hover:underline">Max</button>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Network</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{networkDisplay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fee</span>
                  <span className="font-medium text-green-600">Gas only</span>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  Only send to an address on <strong>{networkDisplay}</strong>. Sending to the wrong network may result in permanent loss.
                </p>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => { setPhase('select'); setError(null); }} className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors">
                  Back
                </button>
                <button type="submit" disabled={!destAddress || !amount} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50">
                  <Send className="w-4 h-4" />Send USDC
                </button>
              </div>
            </form>
          )}

          {/* ── Sending ── */}
          {phase === 'sending' && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Sending USDC...</p>
              <p className="text-xs text-gray-400 mt-2">This may take a few seconds for on-chain confirmation.</p>
            </div>
          )}

          {/* ── Coinbase Init ── */}
          {phase === 'coinbase-init' && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Opening Coinbase...</p>
            </div>
          )}

          {/* ── Coinbase Ready ── */}
          {phase === 'coinbase-ready' && (
            <div className="text-center py-8">
              <ExternalLink className="w-10 h-10 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Coinbase Sell Window Open</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Complete the sale in the Coinbase popup. When you're done, return here.</p>
              <button onClick={() => { setPhase('success'); refreshWallet(); }} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                I'm Done
              </button>
            </div>
          )}

          {/* ── Error ── */}
          {phase === 'error' && (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Something went wrong</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{error}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => { setError(null); setPhase('select'); }} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">Try Again</button>
                <button onClick={handleClose} className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors">Close</button>
              </div>
            </div>
          )}

          {/* ── Success ── */}
          {phase === 'success' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Withdrawal Complete!</h3>
              {txHash && (
                <p className="text-xs font-mono text-gray-500 mt-2 break-all">Tx: {txHash}</p>
              )}
              <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">Your USDC has been sent.</p>
              <button onClick={handleClose} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
