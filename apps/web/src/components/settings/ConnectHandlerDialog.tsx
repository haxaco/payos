'use client';

import { useState, useEffect } from 'react';
import { X, ArrowLeft, Check, AlertCircle, Eye, EyeOff, TestTube2, ExternalLink } from 'lucide-react';
import type {
  HandlerType,
  CreateConnectedAccountInput,
  HandlerInfo,
} from '@/hooks/api/useConnectedAccounts';
import { HANDLER_INFO } from '@/hooks/api/useConnectedAccounts';

interface ConnectHandlerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (input: CreateConnectedAccountInput) => Promise<{ data?: unknown; error?: string }>;
}

type DialogStep = 'select' | 'configure';

// Handler option card for selection step
function HandlerOption({
  handler,
  onSelect,
}: {
  handler: HandlerInfo;
  onSelect: () => void;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all overflow-hidden">
      <button
        onClick={onSelect}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <HandlerIcon type={handler.type} />
          <div className="flex-1">
            <div className="font-medium text-gray-900 dark:text-white">
              {handler.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {handler.description}
            </div>
          </div>
        </div>
      </button>
      <div className="px-4 pb-3 pt-0">
        <a
          href={handler.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          {handler.docsLabel}
        </a>
      </div>
    </div>
  );
}

// Handler icons
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

// Password input with toggle
function PasswordInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id: string;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 pr-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function ConnectHandlerDialog({ isOpen, onClose, onConnect }: ConnectHandlerDialogProps) {
  const [step, setStep] = useState<DialogStep>('select');
  const [selectedHandler, setSelectedHandler] = useState<HandlerType | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [credentials, setCredentials] = useState<Record<string, string | boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlers = Object.values(HANDLER_INFO);

  const handleSelectHandler = (type: HandlerType) => {
    setSelectedHandler(type);
    setDisplayName(`My ${HANDLER_INFO[type].name} Account`);

    // Set default values for toggle fields
    const defaultCredentials: Record<string, string | boolean> = {};
    HANDLER_INFO[type].fields.forEach((field) => {
      if (field.type === 'toggle' && field.defaultValue !== undefined) {
        defaultCredentials[field.key] = field.defaultValue;
      }
    });
    setCredentials(defaultCredentials);
    setError(null);
    setStep('configure');
  };

  const handleBack = () => {
    setStep('select');
    setSelectedHandler(null);
    setCredentials({});
    setError(null);
  };

  const handleClose = () => {
    setStep('select');
    setSelectedHandler(null);
    setDisplayName('');
    setCredentials({});
    setError(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedHandler) return;

    const handler = HANDLER_INFO[selectedHandler];

    // Validate required fields
    for (const field of handler.fields) {
      if (field.required && field.type !== 'toggle') {
        const value = credentials[field.key];
        if (!value || (typeof value === 'string' && !value.trim())) {
          setError(`${field.label} is required`);
          return;
        }
      }
    }

    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    // Build credentials object
    const filteredCredentials: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(credentials)) {
      if (typeof value === 'boolean') {
        // Boolean values (toggles) are included directly
        filteredCredentials[key] = value;
      } else if (typeof value === 'string' && value.trim()) {
        // String values are trimmed and included if non-empty
        filteredCredentials[key] = value.trim();
      }
    }

    const result = await onConnect({
      handler_type: selectedHandler,
      handler_name: displayName.trim(),
      credentials: filteredCredentials,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {step === 'configure' && (
              <button
                onClick={handleBack}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {step === 'select' ? 'Connect Payment Handler' : `Connect ${selectedHandler ? HANDLER_INFO[selectedHandler].name : ''}`}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose a payment processor to connect with your PayOS account.
              </p>
              {handlers.map((handler) => (
                <HandlerOption
                  key={handler.type}
                  handler={handler}
                  onSelect={() => handleSelectHandler(handler.type)}
                />
              ))}
            </div>
          )}

          {step === 'configure' && selectedHandler && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Documentation Link */}
              <a
                href={HANDLER_INFO[selectedHandler].docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {HANDLER_INFO[selectedHandler].docsLabel}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">
                  Opens in new tab
                </span>
              </a>

              {/* Display Name */}
              <div>
                <label
                  htmlFor="display-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Display Name
                </label>
                <input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., Production Stripe Account"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  A friendly name to identify this connection
                </p>
              </div>

              {/* Handler-specific credential fields */}
              {HANDLER_INFO[selectedHandler].fields.map((field) => (
                <div key={field.key}>
                  {field.type === 'toggle' ? (
                    // Toggle field
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <label
                          htmlFor={field.key}
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          {field.label}
                        </label>
                        {field.helpText && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {field.helpText}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        id={field.key}
                        onClick={() =>
                          setCredentials({
                            ...credentials,
                            [field.key]: !credentials[field.key],
                          })
                        }
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          credentials[field.key]
                            ? 'bg-amber-500'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            credentials[field.key] ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ) : (
                    // Text/password field
                    <>
                      <label
                        htmlFor={field.key}
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        {field.label}
                        {!field.required && (
                          <span className="ml-1 text-gray-400 font-normal">(optional)</span>
                        )}
                      </label>
                      {field.type === 'password' ? (
                        <PasswordInput
                          id={field.key}
                          value={(credentials[field.key] as string) || ''}
                          onChange={(value) =>
                            setCredentials({ ...credentials, [field.key]: value })
                          }
                          placeholder={field.placeholder}
                        />
                      ) : (
                        <input
                          id={field.key}
                          type="text"
                          value={(credentials[field.key] as string) || ''}
                          onChange={(e) =>
                            setCredentials({ ...credentials, [field.key]: e.target.value })
                          }
                          placeholder={field.placeholder}
                          className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      )}
                      {field.helpText && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {field.helpText}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}

              {/* Security notice */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm rounded-lg">
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Your credentials are encrypted with AES-256-GCM before storage and never
                  logged or exposed in API responses.
                </span>
              </div>

              {/* Submit button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Connecting...' : 'Connect Account'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
