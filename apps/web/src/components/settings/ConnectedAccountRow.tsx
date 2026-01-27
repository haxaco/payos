'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, MoreVertical, RefreshCw, Trash2, TestTube2 } from 'lucide-react';
import type { ConnectedAccount, HandlerType } from '@/hooks/api/useConnectedAccounts';

interface ConnectedAccountRowProps {
  account: ConnectedAccount;
  onVerify: (id: string) => Promise<void>;
  onDisconnect: (id: string) => Promise<void>;
}

// Handler icons/logos
function HandlerIcon({ type }: { type: HandlerType }) {
  const baseClasses = 'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold';

  switch (type) {
    case 'stripe':
      return (
        <div className={`${baseClasses} bg-[#635bff] text-white`}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
          </svg>
        </div>
      );
    case 'paypal':
      return (
        <div className={`${baseClasses} bg-[#003087] text-white`}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.63h6.54c2.17 0 3.93.514 5.1 1.486 1.23 1.02 1.84 2.544 1.84 4.547 0 2.544-.89 4.554-2.65 5.98-1.7 1.38-3.97 2.08-6.77 2.08H7.69l-1.07 4.154a.641.641 0 0 1-.544.001zm1.87-7.257h1.84c1.43 0 2.574-.347 3.413-1.037.85-.7 1.277-1.67 1.277-2.91 0-.87-.26-1.52-.78-1.95-.51-.42-1.28-.63-2.29-.63h-1.67l-1.79 6.527z" />
          </svg>
        </div>
      );
    case 'circle':
      return (
        <div className={`${baseClasses} bg-[#3CB371] text-white`}>
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <circle cx="12" cy="12" r="10" strokeWidth="2" stroke="currentColor" fill="none" />
            <text x="12" y="16" textAnchor="middle" className="text-[8px] fill-current">$</text>
          </svg>
        </div>
      );
    case 'payos_native':
      return (
        <div className={`${baseClasses} bg-gradient-to-br from-blue-500 to-emerald-500 text-white`}>
          P
        </div>
      );
    default:
      return (
        <div className={`${baseClasses} bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300`}>
          ?
        </div>
      );
  }
}

// Status badge
function StatusBadge({ status }: { status: ConnectedAccount['status'] }) {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="w-3 h-3" />
          Active
        </span>
      );
    case 'error':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="w-3 h-3" />
          Error
        </span>
      );
    case 'inactive':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          <AlertCircle className="w-3 h-3" />
          Inactive
        </span>
      );
  }
}

// Handler type label
function getHandlerLabel(type: HandlerType): string {
  switch (type) {
    case 'stripe':
      return 'Stripe';
    case 'paypal':
      return 'PayPal';
    case 'circle':
      return 'Circle';
    case 'payos_native':
      return 'Sly Native';
    default:
      return type;
  }
}

export function ConnectedAccountRow({ account, onVerify, onDisconnect }: ConnectedAccountRowProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Check if this is a sandbox/test account
  const isSandbox = account.metadata?.environment === 'sandbox';

  const handleVerify = async () => {
    setIsVerifying(true);
    setShowMenu(false);
    try {
      await onVerify(account.id);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await onDisconnect(account.id);
    } finally {
      setIsDisconnecting(false);
      setShowDisconnectConfirm(false);
    }
  };

  const formattedDate = account.last_verified_at
    ? new Date(account.last_verified_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
      <div className="flex items-center gap-4">
        <HandlerIcon type={account.handler_type} />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">
              {account.handler_name}
            </span>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
              {getHandlerLabel(account.handler_type)}
            </span>
            {isSandbox && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                <TestTube2 className="w-3 h-3" />
                Sandbox
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Last verified: {formattedDate}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <StatusBadge status={account.status} />

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isVerifying || isDisconnecting}
          >
            {isVerifying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <MoreVertical className="w-4 h-4" />
            )}
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-40 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleVerify}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  Re-verify
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDisconnectConfirm(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Disconnect confirmation dialog */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Disconnect {account.handler_name}?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This will remove the {getHandlerLabel(account.handler_type)} connection.
              You can reconnect it later with new credentials.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isDisconnecting}
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                disabled={isDisconnecting}
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
