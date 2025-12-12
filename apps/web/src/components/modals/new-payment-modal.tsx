'use client';

import { useState, useEffect, useMemo } from 'react';
import { useApiClient } from '@/lib/api-client';
import {
  X,
  ArrowRight,
  Zap,
  Clock,
  DollarSign,
  Search,
  Building2,
  User,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import type { Account } from '@payos/api-client';

interface NewPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultType?: 'transfer' | 'stream';
  defaultFromAccountId?: string;
}

type PaymentType = 'transfer' | 'stream';

export function NewPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'transfer',
  defaultFromAccountId,
}: NewPaymentModalProps) {
  const api = useApiClient();
  
  // Form state
  const [paymentType, setPaymentType] = useState<PaymentType>(defaultType);
  const [fromAccountId, setFromAccountId] = useState(defaultFromAccountId || '');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  
  // Stream-specific state
  const [flowRatePerMonth, setFlowRatePerMonth] = useState('');
  const [streamDuration, setStreamDuration] = useState<'ongoing' | 'fixed'>('ongoing');
  const [durationMonths, setDurationMonths] = useState('1');
  const [fundingAmount, setFundingAmount] = useState('');
  
  // UI state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  // Fetch accounts
  useEffect(() => {
    async function fetchAccounts() {
      if (!api || !isOpen) return;
      setLoading(true);
      try {
        const response = await api.accounts.list({ limit: 100 });
        setAccounts(response.data || []);
      } catch (err) {
        console.error('Failed to fetch accounts:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAccounts();
  }, [api, isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPaymentType(defaultType);
      setFromAccountId(defaultFromAccountId || '');
      setToAccountId('');
      setAmount('');
      setDescription('');
      setFlowRatePerMonth('');
      setStreamDuration('ongoing');
      setDurationMonths('1');
      setFundingAmount('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, defaultType, defaultFromAccountId]);

  // Filter accounts for dropdowns
  const filteredFromAccounts = useMemo(() => {
    return accounts.filter(a => 
      a.name.toLowerCase().includes(searchFrom.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchFrom.toLowerCase())
    );
  }, [accounts, searchFrom]);

  const filteredToAccounts = useMemo(() => {
    return accounts.filter(a => 
      a.id !== fromAccountId &&
      (a.name.toLowerCase().includes(searchTo.toLowerCase()) ||
       a.email?.toLowerCase().includes(searchTo.toLowerCase()))
    );
  }, [accounts, searchTo, fromAccountId]);

  // Selected accounts
  const fromAccount = accounts.find(a => a.id === fromAccountId);
  const toAccount = accounts.find(a => a.id === toAccountId);

  // Stream calculations
  const flowRatePerSecond = useMemo(() => {
    const monthly = parseFloat(flowRatePerMonth) || 0;
    return monthly / (30 * 24 * 60 * 60);
  }, [flowRatePerMonth]);

  const flowRatePerDay = useMemo(() => {
    return flowRatePerSecond * 24 * 60 * 60;
  }, [flowRatePerSecond]);

  const minimumFunding = useMemo(() => {
    // 4 hours buffer + 7 days runway
    const bufferHours = 4;
    const runwayDays = 7;
    const buffer = flowRatePerSecond * bufferHours * 60 * 60;
    const runway = flowRatePerSecond * runwayDays * 24 * 60 * 60;
    return buffer + runway;
  }, [flowRatePerSecond]);

  const estimatedRunway = useMemo(() => {
    const funding = parseFloat(fundingAmount) || 0;
    if (flowRatePerSecond <= 0) return 'N/A';
    const seconds = funding / flowRatePerSecond;
    const days = Math.floor(seconds / (24 * 60 * 60));
    if (days > 365) return `${Math.floor(days / 365)} years`;
    if (days > 30) return `${Math.floor(days / 30)} months`;
    return `${days} days`;
  }, [fundingAmount, flowRatePerSecond]);

  // Handle submit
  const handleSubmit = async () => {
    if (!api) return;
    
    setError(null);
    setSubmitting(true);

    try {
      if (paymentType === 'transfer') {
        await api.transfers.create({
          fromAccountId,
          toAccountId,
          amount: parseFloat(amount),
          description: description || undefined,
        });
      } else {
        await api.streams.create({
          senderAccountId: fromAccountId,
          receiverAccountId: toAccountId,
          flowRatePerMonth: parseFloat(flowRatePerMonth),
          fundingAmount: parseFloat(fundingAmount) || undefined,
          description: description || undefined,
        });
      }
      
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to create payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Validation
  const isValid = useMemo(() => {
    if (!fromAccountId || !toAccountId) return false;
    
    if (paymentType === 'transfer') {
      const amt = parseFloat(amount);
      return amt > 0 && amt <= (fromAccount?.balanceAvailable || 0);
    } else {
      const rate = parseFloat(flowRatePerMonth);
      const funding = parseFloat(fundingAmount);
      return rate > 0 && funding >= minimumFunding;
    }
  }, [paymentType, fromAccountId, toAccountId, amount, flowRatePerMonth, fundingAmount, minimumFunding, fromAccount]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-950 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              New Payment
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          {/* Payment Type Toggle */}
          <div className="mt-4 flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1">
            <button
              onClick={() => setPaymentType('transfer')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                paymentType === 'transfer'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              One-time Transfer
            </button>
            <button
              onClick={() => setPaymentType('stream')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                paymentType === 'stream'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Zap className="h-4 w-4" />
              Money Stream
            </button>
          </div>
        </div>

        {/* Success State */}
        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {paymentType === 'transfer' ? 'Transfer Created!' : 'Stream Started!'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {paymentType === 'transfer' 
                ? 'Your transfer is being processed.'
                : 'Money is now streaming to the recipient.'}
            </p>
          </div>
        ) : (
          <>
            {/* Form */}
            <div className="p-6 space-y-6">
              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {/* From Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  From Account
                </label>
                <div className="relative">
                  <div
                    onClick={() => setShowFromDropdown(!showFromDropdown)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                  >
                    {fromAccount ? (
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          fromAccount.type === 'business' ? 'bg-purple-100 dark:bg-purple-950' : 'bg-blue-100 dark:bg-blue-950'
                        }`}>
                          {fromAccount.type === 'business' ? (
                            <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">{fromAccount.name}</div>
                          <div className="text-sm text-gray-500">
                            Available: ${fromAccount.balanceAvailable?.toLocaleString() || '0'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Search className="h-4 w-4" />
                        Select sender account...
                      </div>
                    )}
                  </div>
                  
                  {showFromDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-800">
                        <input
                          type="text"
                          value={searchFrom}
                          onChange={(e) => setSearchFrom(e.target.value)}
                          placeholder="Search accounts..."
                          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg border-0 focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                      {filteredFromAccounts.map((account) => (
                        <button
                          key={account.id}
                          onClick={() => {
                            setFromAccountId(account.id);
                            setShowFromDropdown(false);
                            setSearchFrom('');
                          }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            account.type === 'business' ? 'bg-purple-100 dark:bg-purple-950' : 'bg-blue-100 dark:bg-blue-950'
                          }`}>
                            {account.type === 'business' ? (
                              <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            ) : (
                              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-gray-900 dark:text-white">{account.name}</div>
                            <div className="text-sm text-gray-500">${account.balanceAvailable?.toLocaleString() || '0'} available</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* To Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  To Account
                </label>
                <div className="relative">
                  <div
                    onClick={() => setShowToDropdown(!showToDropdown)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                  >
                    {toAccount ? (
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          toAccount.type === 'business' ? 'bg-purple-100 dark:bg-purple-950' : 'bg-blue-100 dark:bg-blue-950'
                        }`}>
                          {toAccount.type === 'business' ? (
                            <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">{toAccount.name}</div>
                          <div className="text-sm text-gray-500">{toAccount.email}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Search className="h-4 w-4" />
                        Select recipient account...
                      </div>
                    )}
                  </div>
                  
                  {showToDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-800">
                        <input
                          type="text"
                          value={searchTo}
                          onChange={(e) => setSearchTo(e.target.value)}
                          placeholder="Search accounts..."
                          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg border-0 focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      </div>
                      {filteredToAccounts.map((account) => (
                        <button
                          key={account.id}
                          onClick={() => {
                            setToAccountId(account.id);
                            setShowToDropdown(false);
                            setSearchTo('');
                          }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            account.type === 'business' ? 'bg-purple-100 dark:bg-purple-950' : 'bg-blue-100 dark:bg-blue-950'
                          }`}>
                            {account.type === 'business' ? (
                              <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            ) : (
                              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium text-gray-900 dark:text-white">{account.name}</div>
                            <div className="text-sm text-gray-500">{account.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Transfer Amount */}
              {paymentType === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-16 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">USDC</span>
                  </div>
                  {fromAccount && parseFloat(amount) > fromAccount.balanceAvailable && (
                    <p className="mt-2 text-sm text-red-600">Insufficient balance</p>
                  )}
                </div>
              )}

              {/* Stream Options */}
              {paymentType === 'stream' && (
                <>
                  {/* Flow Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Flow Rate (per month)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={flowRatePerMonth}
                        onChange={(e) => setFlowRatePerMonth(e.target.value)}
                        placeholder="1,000.00"
                        className="w-full pl-8 pr-24 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">/month</span>
                    </div>
                    
                    {/* Real-time calculations */}
                    {flowRatePerSecond > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-xl">
                        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                          <Zap className="h-4 w-4" />
                          <span className="font-mono">${flowRatePerSecond.toFixed(8)}</span>
                          <span>per second</span>
                        </div>
                        <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          ≈ ${flowRatePerDay.toFixed(2)} per day
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Initial Funding */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Initial Funding
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={fundingAmount}
                        onChange={(e) => setFundingAmount(e.target.value)}
                        placeholder={minimumFunding > 0 ? `Min: ${minimumFunding.toFixed(2)}` : '0.00'}
                        className="w-full pl-8 pr-16 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">USDC</span>
                    </div>
                    
                    {minimumFunding > 0 && (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-gray-500">Minimum required:</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          ${minimumFunding.toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    {parseFloat(fundingAmount) > 0 && (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Estimated runway:
                        </span>
                        <span className="text-emerald-600 font-medium">{estimatedRunway}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={paymentType === 'transfer' ? 'Payment for...' : 'Monthly salary, subscription...'}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={handleSubmit}
                disabled={!isValid || submitting}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:dark:bg-gray-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : paymentType === 'transfer' ? (
                  <>
                    <DollarSign className="h-5 w-5" />
                    Send ${amount || '0'} USDC
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Start Stream
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

