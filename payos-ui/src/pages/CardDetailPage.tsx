import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, CreditCard, Eye, EyeOff, Copy, Snowflake, 
  Trash2, ShoppingBag, Loader2, AlertCircle, Ban, RefreshCw
} from 'lucide-react';
import { usePaymentMethod, useCardTransactions } from '../hooks/api';

export function CardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Fetch payment method from API
  const { data: paymentMethod, loading, error } = usePaymentMethod(id);
  
  // Fetch card transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useCardTransactions(id, { limit: 10 });
  
  const [showPan, setShowPan] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  // Use frozen state from API, allow local toggle
  const [isFrozen, setIsFrozen] = useState(false);
  
  // Sync frozen state with API data
  React.useEffect(() => {
    if (paymentMethod) {
      setIsFrozen(paymentMethod.is_frozen ?? false);
    }
  }, [paymentMethod]);

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <button 
          onClick={() => navigate('/cards')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          <span className="text-sm font-medium">Back to Cards</span>
        </button>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <button 
          onClick={() => navigate('/cards')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          <span className="text-sm font-medium">Back to Cards</span>
        </button>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-gray-500 dark:text-gray-400">Failed to load payment method</p>
          <p className="text-sm text-gray-400">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!paymentMethod) {
    return (
      <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
        <button 
          onClick={() => navigate('/cards')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          <span className="text-sm font-medium">Back to Cards</span>
        </button>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">Card not found</p>
        </div>
      </div>
    );
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button 
          onClick={() => navigate('/cards')}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          Cards
        </button>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 dark:text-white font-medium">
          {paymentMethod.label || `•••• ${paymentMethod.bank_account_last_four}`}
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Card Visual */}
        <div className="col-span-2 space-y-6">
          {/* Card */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-white relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>
            
            <div className="relative">
              {/* Logo */}
              <div className="flex items-center justify-between mb-12">
                <span className="text-xl font-bold">PayOS</span>
                <span className="text-sm opacity-75 uppercase">{paymentMethod.type}</span>
              </div>
              
              {/* Card Number */}
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-mono tracking-wider">
                    •••• •••• •••• {paymentMethod.bank_account_last_four || '****'}
                  </span>
                  <button 
                    onClick={() => setShowPan(!showPan)}
                    className="p-1 hover:bg-white/10 rounded"
                    disabled
                    title="Full PAN not available via API for security"
                  >
                    <Eye className="w-5 h-5 opacity-50" />
                  </button>
                </div>
                <p className="text-xs opacity-60 mt-2">Full card number hidden for security</p>
              </div>
              
              {/* Details Row */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs opacity-75 mb-1">Card Holder</p>
                  <p className="font-medium uppercase">{paymentMethod.bank_account_holder || 'Unknown'}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs opacity-75 mb-1">Status</p>
                  <p className="font-medium">{paymentMethod.is_verified ? 'Verified' : 'Unverified'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-75 mb-1">Default</p>
                  <p className="font-medium">{paymentMethod.is_default ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
            
            {/* Frozen Overlay */}
            {isFrozen && (
              <div className="absolute inset-0 bg-blue-900/80 flex items-center justify-center">
                <div className="text-center">
                  <Snowflake className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-lg font-semibold">Card Frozen</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Card Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Card Activity</h3>
              {transactionsData?.data && transactionsData.data.length > 0 && (
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  View All ({transactionsData.pagination.total}) →
                </button>
              )}
            </div>
            
            {transactionsLoading ? (
              <div className="px-6 py-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : transactionsData?.data && transactionsData.data.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {transactionsData.data.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Icon based on transaction type */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.type === 'purchase' ? 'bg-blue-100 dark:bg-blue-900/50' :
                          tx.type === 'refund' ? 'bg-green-100 dark:bg-green-900/50' :
                          tx.type === 'decline' ? 'bg-red-100 dark:bg-red-900/50' :
                          'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          {tx.type === 'purchase' ? <ShoppingBag className={`w-5 h-5 ${tx.status === 'completed' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} /> :
                           tx.type === 'refund' ? <RefreshCw className="w-5 h-5 text-green-600 dark:text-green-400" /> :
                           tx.type === 'decline' ? <Ban className="w-5 h-5 text-red-600 dark:text-red-400" /> :
                           <CreditCard className="w-5 h-5 text-gray-400" />
                          }
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {tx.merchant_name || 'Unknown Merchant'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(tx.transaction_time).toLocaleDateString()} • {new Date(tx.transaction_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {tx.merchant_category && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{tx.merchant_category}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <p className={`font-semibold font-mono ${
                          tx.type === 'purchase' ? 'text-gray-900 dark:text-white' :
                          tx.type === 'refund' ? 'text-green-600 dark:text-green-400' :
                          'text-gray-500 dark:text-gray-400'
                        }`}>
                          {tx.type === 'refund' ? '+' : tx.type === 'purchase' ? '-' : ''}${Math.abs(tx.amount).toFixed(2)}
                        </p>
                        <p className={`text-xs mt-0.5 ${
                          tx.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                          tx.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                          'text-amber-600 dark:text-amber-400'
                        }`}>
                          {tx.status === 'completed' ? '✓ Completed' :
                           tx.status === 'failed' ? '✗ Declined' :
                           tx.status === 'pending' ? '⏳ Pending' :
                           tx.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">No card activity yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  Transactions made with this card will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Right: Controls */}
        <div className="space-y-6">
          {/* Card Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Card Controls</h3>
            
            {/* Status Toggle */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Status</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isFrozen ? 'Card is frozen' : 'Card is active'}
                </p>
              </div>
              <button
                onClick={() => setIsFrozen(!isFrozen)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isFrozen ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  isFrozen ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
            
            {/* Limits */}
            <div className="py-4 space-y-4">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Spending Limits
              </h4>
              
              {/* Daily Limit */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">Daily</span>
                  <span className="text-gray-900 dark:text-white">
                    {paymentMethod.spending_limit_daily ? (
                      `$${(paymentMethod.spending_used_daily || 0).toLocaleString()} / $${paymentMethod.spending_limit_daily.toLocaleString()}`
                    ) : (
                      'No Limit'
                    )}
                  </span>
                </div>
                {paymentMethod.spending_limit_daily && (
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        ((paymentMethod.spending_used_daily || 0) / paymentMethod.spending_limit_daily) > 0.9 
                          ? 'bg-red-500' 
                          : ((paymentMethod.spending_used_daily || 0) / paymentMethod.spending_limit_daily) > 0.7 
                          ? 'bg-amber-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(((paymentMethod.spending_used_daily || 0) / paymentMethod.spending_limit_daily) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              
              {/* Monthly Limit */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">Monthly</span>
                  <span className="text-gray-900 dark:text-white">
                    {paymentMethod.spending_limit_monthly ? (
                      `$${(paymentMethod.spending_used_monthly || 0).toLocaleString()} / $${paymentMethod.spending_limit_monthly.toLocaleString()}`
                    ) : (
                      'No Limit'
                    )}
                  </span>
                </div>
                {paymentMethod.spending_limit_monthly && (
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        ((paymentMethod.spending_used_monthly || 0) / paymentMethod.spending_limit_monthly) > 0.9 
                          ? 'bg-red-500' 
                          : ((paymentMethod.spending_used_monthly || 0) / paymentMethod.spending_limit_monthly) > 0.7 
                          ? 'bg-amber-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(((paymentMethod.spending_used_monthly || 0) / paymentMethod.spending_limit_monthly) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              
              {/* Per Transaction Limit */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Per Transaction</span>
                <span className="text-gray-900 dark:text-white">
                  {paymentMethod.spending_limit_per_transaction 
                    ? `$${paymentMethod.spending_limit_per_transaction.toLocaleString()}` 
                    : 'No Limit'
                  }
                </span>
              </div>
              
              <button className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Edit Limits →
              </button>
              
              {!paymentMethod.spending_limit_daily && !paymentMethod.spending_limit_monthly && !paymentMethod.spending_limit_per_transaction && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                  No spending limits configured. Click "Edit Limits" to add protection.
                </p>
              )}
            </div>
          </div>
          
          {/* Account Info */}
          {paymentMethod.account_id && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Linked Account</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {paymentMethod.bank_account_holder || 'Account'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Payment Method
                  </p>
                </div>
              </div>
              <button 
                onClick={() => navigate(`/accounts/${paymentMethod.account_id}`)}
                className="mt-4 w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View Account →
              </button>
            </div>
          )}
          
          {/* Danger Zone */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-red-200 dark:border-red-900">
            <h3 className="font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</h3>
            <button className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
              <Trash2 className="w-4 h-4" />
              Cancel Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
