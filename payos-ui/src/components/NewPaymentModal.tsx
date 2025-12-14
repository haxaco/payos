import { useState } from 'react';
import { X, ArrowUpRight, Zap, Calendar, Shield, Eye, EyeOff, Lock } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'transaction' | 'stream';
  fromAccount?: {
    id: string;
    name: string;
    type: 'person' | 'business';
  };
}

export function NewPaymentModal({ isOpen, onClose, defaultType = 'transaction', fromAccount }: Props) {
  const [paymentType, setPaymentType] = useState<'transaction' | 'stream'>(defaultType);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  
  // Stream-specific state
  const [duration, setDuration] = useState<'indefinite' | 'fixed'>('indefinite');
  const [durationMonths, setDurationMonths] = useState('');
  const [funding, setFunding] = useState<'minimum' | 'month'>('month');
  const [autoPause, setAutoPause] = useState(true);
  const [autoWrap, setAutoWrap] = useState(false);

  if (!isOpen) return null;

  const monthlyRate = parseFloat(amount) || 0;
  const perSecond = monthlyRate / 30 / 24 / 60 / 60;
  const minimumFunding = (monthlyRate / 30 * 7) + (monthlyRate / 30 / 6); // 7 days + 4hr buffer

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            New Payment
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* From Account (Locked) */}
          {fromAccount && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                From Account
              </label>
              <div className="relative">
                <div className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 dark:text-white font-medium">{fromAccount.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">({fromAccount.id})</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Lock className="w-4 h-4" />
                    <span className="text-xs">Locked</span>
                  </div>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Payments originate from this account. Multi-account selection coming soon.
              </p>
            </div>
          )}
          
          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To Account
            </label>
            <input 
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Search name, email, or wallet address..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Payment Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* One-Time Option */}
              <button 
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  paymentType === 'transaction' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setPaymentType('transaction')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpRight className={`w-5 h-5 ${paymentType === 'transaction' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className="font-medium text-gray-900 dark:text-white">One-Time</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Send fixed amount once
                </p>
              </button>
              
              {/* Stream Option */}
              <button 
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  paymentType === 'stream' 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setPaymentType('stream')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Zap className={`w-5 h-5 ${paymentType === 'stream' ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="font-medium text-gray-900 dark:text-white">Stream</span>
                  <span className="px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded text-xs font-medium">
                    Beta
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Pay continuously over time
                </p>
              </button>
            </div>
          </div>
          
          {/* Amount / Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {paymentType === 'transaction' ? 'Amount' : 'Monthly Rate'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input 
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {paymentType === 'stream' && amount && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                = ${perSecond.toFixed(6)}/second
              </p>
            )}
          </div>
          
          {/* Stream-specific options */}
          {paymentType === 'stream' && (
            <>
              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration
                </label>
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
                    duration === 'indefinite' 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <input 
                      type="radio" 
                      name="duration" 
                      checked={duration === 'indefinite'}
                      onChange={() => setDuration('indefinite')}
                      className="w-4 h-4 text-green-600" 
                    />
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">Until cancelled</span>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
                    duration === 'fixed' 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <input 
                      type="radio" 
                      name="duration" 
                      checked={duration === 'fixed'}
                      onChange={() => setDuration('fixed')}
                      className="w-4 h-4 text-green-600" 
                    />
                    <span className="text-gray-700 dark:text-gray-300">Fixed:</span>
                    <input 
                      type="number" 
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(e.target.value)}
                      placeholder="3" 
                      className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-center"
                      onClick={() => setDuration('fixed')}
                    />
                    <span className="text-gray-700 dark:text-gray-300">months</span>
                  </label>
                </div>
              </div>
              
              {/* Initial Funding */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Initial Funding
                </label>
                <div className="space-y-2">
                  <label className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border-2 transition-all ${
                    funding === 'minimum' 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="funding" 
                        checked={funding === 'minimum'}
                        onChange={() => setFunding('minimum')}
                        className="w-4 h-4 text-green-600" 
                      />
                      <div>
                        <span className="text-gray-700 dark:text-gray-300">Minimum</span>
                        <p className="text-xs text-gray-500">Buffer + 7 days runway</p>
                      </div>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${minimumFunding.toFixed(2)}
                    </span>
                  </label>
                  <label className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border-2 transition-all ${
                    funding === 'month' 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="funding" 
                        checked={funding === 'month'}
                        onChange={() => setFunding('month')}
                        className="w-4 h-4 text-green-600" 
                      />
                      <div>
                        <span className="text-gray-700 dark:text-gray-300">One month</span>
                        <p className="text-xs text-gray-500">30 days runway</p>
                      </div>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${monthlyRate.toFixed(2)}
                    </span>
                  </label>
                </div>
              </div>
              
              {/* Protection Options */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stream Protection
                  </span>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={autoPause}
                      onChange={(e) => setAutoPause(e.target.checked)}
                      className="w-4 h-4 rounded text-green-600" 
                    />
                    <div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Auto-pause before liquidation
                      </span>
                      <p className="text-xs text-gray-500">
                        Pause stream when balance is critically low
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={autoWrap}
                      onChange={(e) => setAutoWrap(e.target.checked)}
                      className="w-4 h-4 rounded text-green-600" 
                    />
                    <div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Auto-wrap when balance low
                      </span>
                      <p className="text-xs text-gray-500">
                        Automatically fund stream from available balance
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <input 
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Monthly salary, Invoice #123, etc."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button 
            className={`flex-1 px-4 py-3 text-white rounded-xl font-medium transition-colors ${
              paymentType === 'transaction'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {paymentType === 'transaction' ? 'Send Payment' : 'Start Stream'}
          </button>
        </div>
      </div>
    </div>
  );
}
