import { useState } from 'react';
import { 
  ChevronRight, CreditCard, Eye, EyeOff, Copy, Snowflake, 
  Trash2, ShoppingBag
} from 'lucide-react';
import { Page } from '../App';

interface CardData {
  id: string;
  accountId: string;
  accountName: string;
  accountType: 'person' | 'business';
  panMasked: string;
  panFull: string;
  expiry: string;
  cvv: string;
  type: 'virtual' | 'physical';
  status: 'active' | 'frozen' | 'cancelled';
  limits: {
    daily: number;
    monthly: number;
    perTransaction: number;
  };
  spent: {
    daily: number;
    monthly: number;
  };
  createdAt: string;
  transactions: Array<{
    id: string;
    date: string;
    merchant: string;
    category: string;
    amount: number;
    status: 'completed' | 'pending' | 'declined';
  }>;
}

const mockCard: CardData = {
  id: 'card_001',
  accountId: 'acc_person_001',
  accountName: 'Maria Garcia',
  accountType: 'person',
  panMasked: '•••• •••• •••• 4521',
  panFull: '4532 1234 5678 4521',
  expiry: '12/27',
  cvv: '847',
  type: 'virtual',
  status: 'active',
  limits: {
    daily: 500,
    monthly: 5000,
    perTransaction: 200
  },
  spent: {
    daily: 127.50,
    monthly: 847.20
  },
  createdAt: '2025-11-15T10:00:00Z',
  transactions: [
    { id: 'txn_c01', date: '2025-12-05', merchant: 'Supermercado Dia', category: 'Groceries', amount: 45.20, status: 'completed' },
    { id: 'txn_c02', date: '2025-12-04', merchant: 'MercadoLibre', category: 'Retail', amount: 127.80, status: 'completed' },
    { id: 'txn_c03', date: '2025-12-03', merchant: 'Uber', category: 'Transport', amount: 12.50, status: 'completed' },
    { id: 'txn_c04', date: '2025-12-02', merchant: 'Shell Gas Station', category: 'Gas', amount: 35.00, status: 'declined' },
    { id: 'txn_c05', date: '2025-12-01', merchant: 'Netflix', category: 'Entertainment', amount: 15.99, status: 'completed' }
  ]
};

interface Props {
  cardId: string;
  onNavigate: (page: Page) => void;
}

export function CardDetailPage({ cardId, onNavigate }: Props) {
  const card = mockCard; // In real app, fetch by cardId
  const [showPan, setShowPan] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [isFrozen, setIsFrozen] = useState(card.status === 'frozen');
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button 
          onClick={() => onNavigate('cards')}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          Cards
        </button>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 dark:text-white font-medium">{card.panMasked.slice(-8)}</span>
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
                <span className="text-sm opacity-75 uppercase">{card.type}</span>
              </div>
              
              {/* Card Number */}
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-mono tracking-wider">
                    {showPan ? card.panFull : card.panMasked}
                  </span>
                  <button 
                    onClick={() => setShowPan(!showPan)}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    {showPan ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={() => copyToClipboard(card.panFull)}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Details Row */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs opacity-75 mb-1">Card Holder</p>
                  <p className="font-medium uppercase">{card.accountName}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs opacity-75 mb-1">Expires</p>
                  <p className="font-medium">{card.expiry}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-75 mb-1">CVV</p>
                  <div className="flex items-center gap-2">
                    <span className="font-medium font-mono">
                      {showCvv ? card.cvv : '•••'}
                    </span>
                    <button 
                      onClick={() => setShowCvv(!showCvv)}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                View All →
              </button>
            </div>
            
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {card.transactions.map(txn => (
                <div key={txn.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/30">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      txn.status === 'declined' 
                        ? 'bg-red-100 dark:bg-red-900/50' 
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <ShoppingBag className={`w-5 h-5 ${
                        txn.status === 'declined'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{txn.merchant}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{txn.category} · {txn.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${
                      txn.status === 'declined' 
                        ? 'text-red-600 dark:text-red-400 line-through' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      -${txn.amount.toFixed(2)}
                    </p>
                    {txn.status === 'declined' && (
                      <p className="text-xs text-red-600 dark:text-red-400">Declined</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">Daily</span>
                  <span className="text-gray-900 dark:text-white">
                    ${card.spent.daily.toFixed(2)} / ${card.limits.daily}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${(card.spent.daily / card.limits.daily) * 100}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">Monthly</span>
                  <span className="text-gray-900 dark:text-white">
                    ${card.spent.monthly.toFixed(2)} / ${card.limits.monthly.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${(card.spent.monthly / card.limits.monthly) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Per Transaction</span>
                <span className="text-gray-900 dark:text-white">${card.limits.perTransaction}</span>
              </div>
              
              <button className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                Edit Limits →
              </button>
            </div>
          </div>
          
          {/* Account Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Linked Account</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{card.accountName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {card.accountType === 'person' ? 'Person' : 'Business'} Account
                </p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('account-detail')}
              className="mt-4 w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View Account →
            </button>
          </div>
          
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
