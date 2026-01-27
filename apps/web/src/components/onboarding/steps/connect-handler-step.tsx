'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  CheckCircle,
  Info,
  ExternalLink,
  CreditCard,
} from 'lucide-react';
import { cn } from '@sly/ui';
import { toast } from 'sonner';
import {
  useConnectedAccounts,
  HANDLER_INFO,
  type HandlerType,
  type CreateConnectedAccountInput,
} from '@/hooks/api/useConnectedAccounts';

interface ConnectHandlerStepProps {
  onHandlerConnected: (handlerId: string) => void;
  helpText?: string;
}

// Icons for handlers
const HANDLER_ICONS: Record<string, string> = {
  stripe: '/icons/stripe.svg',
  paypal: '/icons/paypal.svg',
  circle: '/icons/circle.svg',
  payos_native: '/icons/payos.svg',
};

export function ConnectHandlerStep({
  onHandlerConnected,
  helpText = 'Connect a payment processor to handle customer payments.',
}: ConnectHandlerStepProps) {
  const { accounts, connect, isLoading } = useConnectedAccounts();
  const queryClient = useQueryClient();

  const [selectedHandler, setSelectedHandler] = useState<HandlerType | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string | boolean>>({});
  const [connectedAccount, setConnectedAccount] = useState<{ id: string; name: string } | null>(null);

  // Check if already connected
  const existingAccounts = accounts.filter(a => a.status === 'active');
  const hasExistingHandler = existingAccounts.length > 0;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHandler) return;

    setIsConnecting(true);
    setError(null);

    const handlerInfo = HANDLER_INFO[selectedHandler];

    try {
      const input: CreateConnectedAccountInput = {
        handler_type: selectedHandler,
        handler_name: handlerInfo.name,
        credentials: credentials,
      };

      const result = await connect(input);

      if (result.error) {
        setError(result.error);
        toast.error('Failed to connect handler');
        return;
      }

      if (result.data) {
        setConnectedAccount({
          id: result.data.id,
          name: result.data.handler_name,
        });

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
        queryClient.invalidateQueries({ queryKey: ['onboarding-state'] });

        toast.success(`${handlerInfo.name} connected successfully!`);
        onHandlerConnected(result.data.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect handler');
      toast.error('Failed to connect handler');
    } finally {
      setIsConnecting(false);
    }
  };

  // If already connected, show success state
  if (connectedAccount || hasExistingHandler) {
    const displayAccount = connectedAccount || existingAccounts[0];
    const displayName = connectedAccount
      ? connectedAccount.name
      : existingAccounts[0]?.handler_name;

    return (
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Payment Handler Connected!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Your payment processor is ready to accept payments
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Handler</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {displayName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
              <CheckCircle className="w-3 h-3" />
              Active
            </span>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Click <strong>Continue</strong> to proceed to the next step
        </p>
      </div>
    );
  }

  // Handler selection view
  if (!selectedHandler) {
    return (
      <div className="max-w-xl mx-auto">
        {/* Help tip */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-6">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-200">{helpText}</p>
        </div>

        <div className="space-y-4">
          {/* Stripe */}
          <button
            onClick={() => setSelectedHandler('stripe')}
            className="w-full p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#635BFF]/10 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-[#635BFF]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    Stripe
                  </h3>
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  2.9% + $0.30 per transaction. Cards, Apple Pay, Google Pay
                </p>
              </div>
            </div>
          </button>

          {/* PayPal */}
          <button
            onClick={() => setSelectedHandler('paypal')}
            className="w-full p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#003087]/10 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-[#003087]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  PayPal
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  2.99% + $0.49 per transaction. PayPal balance, Venmo
                </p>
              </div>
            </div>
          </button>

          {/* Circle */}
          <button
            onClick={() => setSelectedHandler('circle')}
            className="w-full p-5 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#00D632]/10 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-[#00D632]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Circle
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  USDC payments via Circle. Low fees for stablecoin transfers
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Credentials form
  const handlerInfo = HANDLER_INFO[selectedHandler];

  return (
    <div className="max-w-xl mx-auto">
      <button
        onClick={() => {
          setSelectedHandler(null);
          setCredentials({});
          setError(null);
        }}
        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
      >
        &larr; Back to handler selection
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{handlerInfo.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{handlerInfo.description}</p>
        </div>
      </div>

      <a
        href={handlerInfo.docsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors mb-6"
      >
        <ExternalLink className="w-4 h-4" />
        {handlerInfo.docsLabel}
      </a>

      <form onSubmit={handleConnect} className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {handlerInfo.fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {field.label} {field.required && '*'}
            </label>
            {field.type === 'toggle' ? (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={credentials[field.key] as boolean ?? field.defaultValue ?? false}
                  onChange={(e) => setCredentials(prev => ({ ...prev, [field.key]: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">{field.helpText}</span>
              </label>
            ) : (
              <>
                <input
                  type={field.type}
                  required={field.required}
                  value={credentials[field.key] as string || ''}
                  onChange={(e) => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {field.helpText && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{field.helpText}</p>
                )}
              </>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={isConnecting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Connect {handlerInfo.name}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
