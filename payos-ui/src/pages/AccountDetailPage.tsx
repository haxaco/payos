import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronRight, User, Building2, CreditCard, Wallet,
  ArrowDownLeft, ArrowUpRight, Sparkles, Edit2, MoreHorizontal,
  Ban, CheckCircle, Clock, Mail, Phone, MapPin, Zap, Play, Copy, Eye, Pause, X,
  AlertTriangle, AlertCircle, Bot, Plus, Activity, DollarSign, Landmark, Trash2, Star, Loader2
} from 'lucide-react';
import { useAccount } from '../hooks/api';
import { AISparkleButton } from '../components/ui/AISparkleButton';
import { mariaStreams, techcorpStreams } from '../data/mockStreams';
import { NewPaymentModal } from '../components/NewPaymentModal';
import { mockAgents } from '../data/mockAgents';
import { AgentsTab } from '../components/AgentsTab';
import { DocumentsTab } from '../components/DocumentsTab';

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Fetch account from API
  const { data: account, loading, error } = useAccount(id);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-500 dark:text-gray-400">Failed to load account</p>
        <p className="text-sm text-gray-400">{error.message}</p>
        <button 
          onClick={() => navigate('/accounts')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Accounts
        </button>
      </div>
    );
  }
  
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <User className="w-12 h-12 text-gray-400" />
        <p className="text-gray-500 dark:text-gray-400">Account not found</p>
        <button 
          onClick={() => navigate('/accounts')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Accounts
        </button>
      </div>
    );
  }
  
  if (account.type === 'person') {
    return <PersonAccountDetail account={account} navigate={navigate} />;
  }
  
  return <BusinessAccountDetail account={account} navigate={navigate} />;
}

// ============================================
// PERSON ACCOUNT DETAIL
// ============================================

function PersonAccountDetail({ account, navigate }: any) {
  const [activeTab, setActiveTab] = useState('overview');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentModalType, setPaymentModalType] = useState<'transaction' | 'stream'>('transaction');
  
  // Mock recent transactions for this account
  const recentTransactions = [
    { id: 'txn_001', type: 'credit', from: 'TechCorp Inc', amount: 2000, date: '2025-12-05', status: 'completed' },
    { id: 'txn_002', type: 'debit', to: 'ATM Withdrawal', amount: 200, date: '2025-12-04', status: 'completed' },
    { id: 'txn_003', type: 'debit', to: 'MercadoLibre', amount: 127.80, date: '2025-12-03', status: 'completed' },
    { id: 'txn_004', type: 'credit', from: 'TechCorp Inc', amount: 2000, date: '2025-11-05', status: 'completed' },
  ];
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button 
          onClick={() => navigate('/accounts')}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Accounts
        </button>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 dark:text-white font-medium">
          {account.firstName} {account.lastName}
        </span>
      </div>
      
      {/* Header Section */}
      <div className="flex gap-6">
        {/* Profile Card */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {account.firstName} {account.lastName}
              </h1>
              <div className="mt-2 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {account.email}
                </div>
                {account.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {account.phone}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {getCountryName(account.country)}
                </div>
              </div>
              
              <div className="mt-3 flex items-center gap-2 text-sm">
                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-300">
                  {account.id}
                </code>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500 dark:text-gray-400">
                  Created {formatDate(account.createdAt)}
                </span>
              </div>
              
              <div className="mt-4 flex items-center gap-3">
                <StatusBadge status={account.status} />
                <VerificationBadge tier={account.verificationTier} type="person" />
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex gap-2">
            <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium">
              Edit
            </button>
            <button 
              onClick={() => {
                setPaymentModalType('transaction');
                setPaymentModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Send Funds
            </button>
            <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium">
              {account.status === 'active' ? 'Suspend' : 'Activate'}
            </button>
            <button className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Balance Card */}
        <div className="w-64 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Balance</h3>
            </div>
            <AISparkleButton context={`treasury balance for ${account.firstName} ${account.lastName}`} />
          </div>
          <p className="text-3xl font-semibold text-gray-900 dark:text-white">
            ${(account.balance.usd + account.balance.usdc).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">USD</span>
              <span className="text-gray-900 dark:text-white font-medium">
                ${account.balance.usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">USDC</span>
              <span className="text-gray-900 dark:text-white font-medium">
                ${account.balance.usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <button className="mt-4 w-full text-sm text-blue-600 dark:text-blue-400 hover:underline text-left">
            View Wallet →
          </button>
        </div>
        
        {/* Card Summary (if exists) */}
        {account.cardId && (
          <div className="w-64 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Card</h3>
            </div>
            <p className="text-lg font-mono text-gray-900 dark:text-white">•••• 4521</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Virtual · Active</p>
            <div className="mt-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">This month</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">$847.20</p>
            </div>
            <button 
              onClick={() => navigate(`/cards/${account.cards?.[0]?.id || 'card_001'}`)}
              className="mt-4 w-full text-sm text-blue-600 dark:text-blue-400 hover:underline text-left"
            >
              Manage Card →
            </button>
          </div>
        )}
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {['Overview', 'Transactions', 'Payment Methods', 'Streams', 'Agents', 'Relationships', 'Documents', 'Logs'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.toLowerCase().replace(' ', '-')
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="col-span-2 space-y-6">
            {/* AI Summary */}
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-violet-200 dark:border-violet-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Summary</h3>
                </div>
                <AISparkleButton context={`full analysis of ${account.firstName} ${account.lastName}`} label="Deep dive" />
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                This contractor shows typical payment patterns: regular monthly income from a single employer (TechCorp Inc), 
                moderate card spending on retail and utilities, and periodic bank withdrawals. Account has been active for 
                21 days with no compliance flags raised. Verification is at Tier 2 (ID verified, selfie match complete).
              </p>
              <div className="mt-4 flex gap-6 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Avg monthly income:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">$2,000</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Avg card spend:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">$450/mo</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Risk signals:</span>
                  <span className="ml-2 font-medium text-green-600 dark:text-green-400">None</span>
                </div>
              </div>
            </div>
            
            {/* Recent Transactions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
                <button 
                  onClick={() => setActiveTab('transactions')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View All →
                </button>
              </div>
              
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {recentTransactions.map(txn => (
                  <div key={txn.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/30">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        txn.type === 'credit' 
                          ? 'bg-green-100 dark:bg-green-900/50' 
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        {txn.type === 'credit' ? (
                          <ArrowDownLeft className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {txn.type === 'credit' ? `From ${txn.from}` : `To ${txn.to}`}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{txn.date}</p>
                      </div>
                    </div>
                    <p className={`font-medium ${
                      txn.type === 'credit' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {txn.type === 'credit' ? '+' : '-'}${txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="space-y-6">
            {/* Relationships */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Relationships</h3>
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  + Add
                </button>
              </div>
              
              {account.relationships && account.relationships.length > 0 ? (
                <div className="space-y-3">
                  {account.relationships.map((rel: any) => (
                    <div 
                      key={rel.id}
                      className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => navigate(`/accounts/${rel.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          rel.relatedAccountType === 'business'
                            ? 'bg-purple-100 dark:bg-purple-900/50'
                            : 'bg-blue-100 dark:bg-blue-900/50'
                        }`}>
                          {rel.relatedAccountType === 'business' ? (
                            <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {rel.relatedAccountName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {rel.relationshipType.charAt(0).toUpperCase() + rel.relationshipType.slice(1)} · Since {rel.since}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No relationships yet.</p>
              )}
            </div>
            
            {/* Verification Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Verification</h3>
              <div className="space-y-3">
                <VerificationItem label="Email" status="verified" />
                <VerificationItem label="Phone" status="verified" />
                <VerificationItem label="Identity (ID)" status={account.verificationTier >= 2 ? 'verified' : 'pending'} />
                <VerificationItem label="Selfie Match" status={account.verificationTier >= 2 ? 'verified' : 'pending'} />
                <VerificationItem label="Proof of Address" status={account.verificationTier >= 3 ? 'verified' : 'not_started'} />
              </div>
              {account.verificationTier < 3 && (
                <button className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
                  Request Upgrade to T{account.verificationTier + 1}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Transaction History</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              All transactions for this account
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentTransactions.map((txn) => (
                  <tr 
                    key={txn.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer"
                    onClick={() => navigate(`/transactions/${txn.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(txn.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {txn.type === 'credit' ? txn.from : txn.to}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {txn.type === 'credit' ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                          <ArrowDownLeft className="w-4 h-4" />
                          Credit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                          <ArrowUpRight className="w-4 h-4" />
                          Debit
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <span className={txn.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}>
                        {txn.type === 'credit' ? '+' : '-'}${txn.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 capitalize">
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {activeTab === 'payment-methods' && (
        <PaymentMethodsTab accountId={account.id} accountName={`${account.firstName} ${account.lastName}`} />
      )}
      
      {activeTab === 'streams' && (
        <div className="space-y-6">
          {/* Active Stream Card — THE HERO ELEMENT */}
          {mariaStreams.length > 0 && mariaStreams.map(stream => (
            <div key={stream.id} className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Salary Stream</h3>
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        Live
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">From {stream.sender.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Flow Rate</p>
                  <p className="font-mono text-lg text-gray-900 dark:text-white">${stream.flowRate.perSecond.toFixed(6)}/sec</p>
                  <p className="text-sm text-green-600 dark:text-green-400">≈ ${stream.flowRate.perMonth.toLocaleString()}/month</p>
                </div>
              </div>
              
              {/* Real-Time Balance */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Streamed Balance</span>
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    updating live
                  </span>
                </div>
                
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-semibold text-gray-900 dark:text-white">
                    ${Math.floor(stream.streamed.available)}
                  </span>
                  <span className="text-2xl text-gray-400 dark:text-gray-500 font-mono">
                    .{(stream.streamed.available % 1).toFixed(2).slice(2)}
                  </span>
                  <span className="text-green-600 dark:text-green-400 text-sm ml-2">
                    +$0.05 just now
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Monthly Progress</span>
                    <span className="text-gray-900 dark:text-white">
                      ${stream.streamed.total.toLocaleString()} / ${stream.flowRate.perMonth.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-1000"
                      style={{ width: `${(stream.streamed.total / stream.flowRate.perMonth) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors">
                    Withdraw ${stream.streamed.available.toFixed(2)}
                  </button>
                  <button className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    Auto-withdraw
                  </button>
                </div>
              </div>
              
              {/* Stream Details */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Started</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(stream.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Total Streamed</p>
                  <p className="font-medium text-gray-900 dark:text-white">${stream.streamed.total.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Buffer Held</p>
                  <p className="font-medium text-gray-900 dark:text-white">$6.43</p>
                </div>
              </div>
            </div>
          ))}
          
          {/* Stream History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Stream History</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Withdrew from stream</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nov 30, 2025</p>
                  </div>
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">$1,200.00</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <Play className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Stream started</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Dec 1, 2025</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">$2,000/mo</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'agents' && (
        <AgentsTab account={account} />
      )}
      
      {activeTab === 'relationships' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Manage relationships between this account and other accounts.
          </p>
        </div>
      )}
      
      {activeTab === 'documents' && (
        <DocumentsTab account={account} />
      )}
      
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Activity logs and audit trail for this account.
          </p>
        </div>
      )}
      
      {/* New Payment Modal */}
      <NewPaymentModal 
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        defaultType={paymentModalType}
        fromAccount={{
          id: account.id,
          name: `${account.firstName} ${account.lastName}`,
          type: 'person'
        }}
      />
    </div>
  );
}

// ============================================
// BUSINESS ACCOUNT DETAIL
// ============================================

function BusinessAccountDetail({ account, navigate }: any) {
  const [activeTab, setActiveTab] = useState('overview');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentModalType, setPaymentModalType] = useState<'transaction' | 'stream'>('transaction');
  
  // Mock contractors for this business
  const contractors = [
    { id: 'acc_person_001', name: 'Maria Garcia', country: 'ARG', amount: 2000, frequency: 'monthly', nextPayout: 'Dec 15', status: 'active' },
    { id: 'acc_person_003', name: 'Ana Souza', country: 'BRA', amount: 2500, frequency: 'monthly', nextPayout: 'Dec 15', status: 'active' },
    { id: 'acc_person_004', name: 'Juan Perez', country: 'MEX', amount: 1800, frequency: 'monthly', nextPayout: 'Dec 15', status: 'pending' },
  ];
  
  // Mock payout summary
  const payoutSummary = {
    thisMonth: 24500,
    scheduled: 18000,
    scheduledDate: 'Dec 15',
    avgPerContractor: 2041,
    contractorCount: 12
  };
  
  // Mock recent transactions for business account
  const businessTransactions = [
    { id: 'txn_101', type: 'debit', to: 'Maria Garcia (ARG)', amount: 2000, date: '2025-12-05', status: 'completed' },
    { id: 'txn_102', type: 'debit', to: 'Ana Souza (BRA)', amount: 2500, date: '2025-12-05', status: 'completed' },
    { id: 'txn_103', type: 'credit', from: 'Client Payment - Invoice #1234', amount: 15000, date: '2025-12-03', status: 'completed' },
    { id: 'txn_104', type: 'debit', to: 'Juan Perez (MEX)', amount: 1800, date: '2025-12-01', status: 'completed' },
    { id: 'txn_105', type: 'credit', from: 'Client Payment - Invoice #1230', amount: 12000, date: '2025-11-28', status: 'completed' },
  ];
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button 
          onClick={() => navigate('/accounts')}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Accounts
        </button>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 dark:text-white font-medium">
          {account.businessName}
        </span>
      </div>
      
      {/* Header Section */}
      <div className="flex gap-6">
        {/* Profile Card */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {account.businessName}
              </h1>
              <p className="text-gray-500 dark:text-gray-400">{account.legalName}</p>
              <p className="text-gray-500 dark:text-gray-400">{account.email}</p>
              <p className="text-gray-500 dark:text-gray-400">
                {account.industry} · {getCountryName(account.country)}
              </p>
              
              <div className="mt-3 flex items-center gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Tax ID:</span>
                  <code className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                    {account.registrationNumber}
                  </code>
                </div>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500 dark:text-gray-400">
                  Created {formatDate(account.createdAt)}
                </span>
              </div>
              
              <div className="mt-4 flex items-center gap-3">
                <StatusBadge status={account.status} />
                <VerificationBadge tier={account.verificationTier} type="business" />
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex gap-2">
            <button 
              onClick={() => {
                setPaymentModalType('transaction');
                setPaymentModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Create Payout
            </button>
            <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium">
              Add Contractor
            </button>
            <button className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium">
              Edit
            </button>
            <button className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Balance Card with Breakdown */}
        <div className="w-64 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Balance</h3>
            </div>
            <AISparkleButton context={`treasury balance for ${account.businessName}`} />
          </div>
          <p className="text-3xl font-semibold text-gray-900 dark:text-white">
            ${(account.balance.usd + account.balance.usdc).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          
          {/* Visual Breakdown Bar */}
          {account.balance.breakdown && (
            <div className="mt-4 mb-3">
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                <div 
                  className="bg-blue-500 h-full" 
                  style={{ width: `${(account.balance.breakdown.available / (account.balance.usd + account.balance.usdc)) * 100}%` }}
                  title="Available"
                />
                <div 
                  className="bg-green-500 h-full" 
                  style={{ width: `${(account.balance.breakdown.inStreams.total / (account.balance.usd + account.balance.usdc)) * 100}%` }}
                  title="In Streams"
                />
              </div>
            </div>
          )}
          
          {/* Balance Breakdown */}
          {account.balance.breakdown ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-gray-600 dark:text-gray-300">Available</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${account.balance.breakdown.available.toLocaleString()}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-gray-600 dark:text-gray-300">In Streams</span>
                  <Zap className="w-3 h-3 text-green-500" />
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${account.balance.breakdown.inStreams.total.toLocaleString()}
                </span>
              </div>
              
              {/* Expandable Stream Details */}
              <div className="pl-4 border-l-2 border-green-200 dark:border-green-800 space-y-1.5 text-xs pt-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Buffer held</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    ${account.balance.breakdown.inStreams.buffer.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Streaming out</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    ${account.balance.breakdown.inStreams.streaming.toFixed(2)}
                  </span>
                </div>
              </div>
              
              {/* Net Flow */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Net Flow</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    ${account.balance.breakdown.netFlow.perMonth.toLocaleString()}/mo
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {techcorpStreams.filter(s => s.status === 'active').length} outgoing streams
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">USD</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  ${account.balance.usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">USDC</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  ${account.balance.usdc.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
          
          <button className="mt-4 w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium transition-colors">
            Fund Account
          </button>
        </div>
        
        {/* Payout Summary */}
        <div className="w-64 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Payout Summary</h3>
            <AISparkleButton context={`payout activity for ${account.businessName}`} />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">This Month</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${payoutSummary.thisMonth.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Scheduled ({payoutSummary.scheduledDate})</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                ${payoutSummary.scheduled.toLocaleString()}
              </p>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {payoutSummary.contractorCount} contractors · ${payoutSummary.avgPerContractor.toLocaleString()} avg
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {['Overview', 'Contractors', 'Payment Methods', 'Streams', 'Agents', 'Owners', 'Documents', 'Logs'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.toLowerCase().replace(' ', '-')
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="col-span-2 space-y-6">
            {/* AI Summary */}
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-violet-200 dark:border-violet-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Summary</h3>
                </div>
                <AISparkleButton context={`full analysis of ${account.businessName}`} label="Deep dive" />
              </div>
              <p className="text-gray-700 dark:text-gray-300">
                This employer account shows consistent payroll activity across {payoutSummary.contractorCount} contractors 
                in Argentina, Brazil, and Mexico. Monthly payout volume is stable at ~$25K. All beneficial owners verified. 
                The account maintains sufficient USDC balance for scheduled payouts with a 2-week buffer.
              </p>
              <div className="mt-4 flex gap-6 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Monthly volume:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">~$25,000</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Active contractors:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">{payoutSummary.contractorCount}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Risk signals:</span>
                  <span className="ml-2 font-medium text-green-600 dark:text-green-400">None</span>
                </div>
              </div>
            </div>
            
            {/* Contractors List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Contractors</h3>
                <div className="flex gap-2">
                  <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    + Add
                  </button>
                  <button 
                    onClick={() => setActiveTab('contractors')}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:underline"
                  >
                    View All →
                  </button>
                </div>
              </div>
              
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    <th className="px-6 py-3">Contractor</th>
                    <th className="px-6 py-3">Country</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Next Payout</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {contractors.map(c => (
                    <tr 
                      key={c.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer"
                      onClick={() => navigate(`/accounts/${c.id}`)}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900 dark:text-white">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                        {getCountryFlag(c.country)} {c.country}
                      </td>
                      <td className="px-6 py-3 text-gray-900 dark:text-white">
                        ${c.amount.toLocaleString()}/{c.frequency.slice(0, 2)}
                      </td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{c.nextPayout}</td>
                      <td className="px-6 py-3">
                        <span className={`w-2 h-2 rounded-full inline-block ${
                          c.status === 'active' ? 'bg-green-500' : 'bg-amber-500'
                        }`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing 3 of {payoutSummary.contractorCount} contractors
                </p>
              </div>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="space-y-6">
            {/* Beneficial Owners */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Beneficial Owners</h3>
              <div className="space-y-3">
                {account.beneficialOwners?.map((owner: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className="text-gray-900 dark:text-white">{owner.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{owner.ownershipPercent}%</span>
                      {owner.verified ? (
                        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full">
                          Verified
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* KYB Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">KYB Verification</h3>
              <div className="space-y-3">
                <VerificationItem label="Business Registration" status="verified" />
                <VerificationItem label="Tax ID (EIN)" status="verified" />
                <VerificationItem label="Beneficial Owners" status={
                  account.beneficialOwners?.every((o: any) => o.verified) ? 'verified' : 'pending'
                } />
                <VerificationItem label="Bank Statement" status={account.verificationTier >= 2 ? 'verified' : 'pending'} />
                <VerificationItem label="Audited Financials" status={account.verificationTier >= 3 ? 'verified' : 'not_started'} />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'contractors' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Full contractor management view with bulk actions.
          </p>
        </div>
      )}
      
      {activeTab === 'payment-methods' && (
        <PaymentMethodsTab accountId={account.id} accountName={account.businessName} />
      )}
      
      {activeTab === 'streams' && (
        <div className="space-y-6">
          {/* Critical Banner - show if any stream is critical (takes priority) */}
          {techcorpStreams.some(s => s.health === 'critical' && s.status === 'active') && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-800 dark:text-red-200">
                    Critical: Streams Will Pause Soon
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {techcorpStreams.filter(s => s.health === 'critical' && s.status === 'active').length} stream(s) have less than 24 hours of runway. Top up immediately to avoid interruption.
                  </p>
                </div>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                  Top Up Now
                </button>
              </div>
            </div>
          )}
          
          {/* Warning Banner - show if any stream is in warning state (only if no critical) */}
          {!techcorpStreams.some(s => s.health === 'critical' && s.status === 'active') && 
           techcorpStreams.some(s => s.health === 'warning') && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Stream Balance Low
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {techcorpStreams.filter(s => s.health === 'warning').length} stream(s) have less than 7 days of runway remaining.
                  </p>
                </div>
                <button className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">
                  Review Streams
                </button>
              </div>
            </div>
          )}
          
          {/* Summary Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Outgoing Streams</h3>
                <span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded text-xs font-medium">
                  Beta
                </span>
              </div>
              <button 
                onClick={() => {
                  setPaymentModalType('stream');
                  setPaymentModalOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                + New Stream
              </button>
            </div>
            
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Streams</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{techcorpStreams.filter(s => s.status === 'active').length}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Outflow</p>
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  ${techcorpStreams.reduce((sum, s) => sum + (s.status === 'active' ? s.flowRate.perMonth : 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Streamed</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  ${techcorpStreams.reduce((sum, s) => sum + s.streamed.total, 0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-sm text-gray-500 dark:text-gray-400">Buffer Locked</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  ${techcorpStreams.reduce((sum, s) => sum + (s.funding?.buffer || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
            
            {/* Streams Table */}
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">Recipient</th>
                  <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">Flow Rate</th>
                  <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">Streamed</th>
                  <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">Runway</th>
                  <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-right py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {techcorpStreams.map((stream, i) => (
                  <tr key={stream.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          stream.receiver.type === 'person' ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-gray-200 dark:bg-gray-700'
                        }`}>
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {stream.receiver.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{stream.receiver.name}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="font-mono text-gray-900 dark:text-white">${stream.flowRate.perMonth.toLocaleString()}/mo</span>
                    </td>
                    <td className="py-4">
                      <span className="text-gray-900 dark:text-white">${stream.streamed.total.toLocaleString()}</span>
                    </td>
                    <td className="py-4">
                      <span className={`font-medium ${
                        stream.status === 'paused' ? 'text-gray-400 dark:text-gray-500' :
                        stream.health === 'healthy' ? 'text-gray-900 dark:text-white' :
                        stream.health === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {stream.funding?.runway.display || 'N/A'}
                      </span>
                    </td>
                    <td className="py-4">
                      {stream.status === 'paused' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium">
                          <Pause className="w-3 h-3" />
                          Paused
                        </span>
                      ) : stream.health === 'critical' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                          <AlertCircle className="w-3 h-3" />
                          Critical
                        </span>
                      ) : stream.health === 'warning' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          Low Balance
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          Streaming
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Top Up - show prominently for warning/critical */}
                        {stream.status === 'active' && (
                          <button className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            stream.health === 'critical' 
                              ? 'bg-red-600 text-white hover:bg-red-700' 
                              : stream.health === 'warning'
                                ? 'bg-amber-600 text-white hover:bg-amber-700'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}>
                            Top Up
                          </button>
                        )}
                        
                        {/* Pause/Play */}
                        {stream.status === 'active' ? (
                          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400">
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : (
                          <button className="p-2 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg text-green-600">
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        
                        {/* Edit */}
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        
                        {/* Cancel */}
                        <button className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Transaction History</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              All transactions for this business account
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {businessTransactions.map((txn) => (
                  <tr 
                    key={txn.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer"
                    onClick={() => navigate(`/transactions/${txn.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(txn.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {txn.type === 'credit' ? txn.from : txn.to}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {txn.type === 'credit' ? (
                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                          <ArrowDownLeft className="w-4 h-4" />
                          Credit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                          <ArrowUpRight className="w-4 h-4" />
                          Debit
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                      <span className={txn.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}>
                        {txn.type === 'credit' ? '+' : '-'}${txn.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 capitalize">
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {activeTab === 'relationships' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage relationships between this account and other accounts.
          </p>
        </div>
      )}
      
      {activeTab === 'agents' && (
        <AgentsTab account={account} />
      )}
      
      {activeTab === 'owners' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Beneficial Owners</h3>
          <div className="space-y-3">
            {account.beneficialOwners?.map((owner: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{owner.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{owner.ownershipPercent}% ownership</p>
                </div>
                {owner.verified ? (
                  <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full">
                    Verified
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full">
                    Pending
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeTab === 'documents' && (
        <DocumentsTab account={account} />
      )}
      
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Activity logs and audit trail for this business account.
          </p>
        </div>
      )}
      
      {/* New Payment Modal */}
      <NewPaymentModal 
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        defaultType={paymentModalType}
        fromAccount={{
          id: account.id,
          name: account.businessName || account.legalName,
          type: 'business'
        }}
      />
    </div>
  );
}

// ============================================
// PAYMENT METHODS TAB (Story 10.9)
// ============================================

interface PaymentMethodsTabProps {
  accountId: string;
  accountName: string;
}

function PaymentMethodsTab({ accountId, accountName }: PaymentMethodsTabProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Mock payment methods data
  const paymentMethods = [
    {
      id: 'pm_001',
      type: 'bank_account',
      label: 'Primary Checking',
      bankName: 'Wells Fargo',
      bankAccountLastFour: '4521',
      bankRoutingLastFour: '6789',
      bankCountry: 'USA',
      bankCurrency: 'USD',
      isDefault: true,
      isVerified: true,
      verifiedAt: '2025-11-15',
      createdAt: '2025-11-10',
    },
    {
      id: 'pm_002',
      type: 'wallet',
      label: 'USDC Wallet',
      walletNetwork: 'base',
      walletAddress: '0x1234...abcd',
      isDefault: false,
      isVerified: true,
      verifiedAt: '2025-11-20',
      createdAt: '2025-11-18',
    },
    {
      id: 'pm_003',
      type: 'bank_account',
      label: 'Savings Account',
      bankName: 'Chase',
      bankAccountLastFour: '8765',
      bankRoutingLastFour: '1234',
      bankCountry: 'USA',
      bankCurrency: 'USD',
      isDefault: false,
      isVerified: false,
      verifiedAt: null,
      createdAt: '2025-12-01',
    },
  ];
  
  const handleSetDefault = (methodId: string) => {
    console.log('Set default:', methodId);
  };
  
  const handleDelete = (methodId: string) => {
    console.log('Delete:', methodId);
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Methods</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage saved bank accounts and wallets for {accountName}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Payment Method
        </button>
      </div>
      
      {/* Payment Methods List */}
      <div className="grid gap-4">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  method.type === 'bank_account'
                    ? 'bg-blue-100 dark:bg-blue-900/50'
                    : 'bg-purple-100 dark:bg-purple-900/50'
                }`}>
                  {method.type === 'bank_account' ? (
                    <Landmark className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Wallet className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                
                {/* Details */}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {method.label}
                    </h4>
                    {method.isDefault && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                        <Star className="w-3 h-3" />
                        Default
                      </span>
                    )}
                    {method.isVerified ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                  </div>
                  
                  {method.type === 'bank_account' && (
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium">{method.bankName}</span>
                      <span className="mx-2">·</span>
                      <span>Account ending in {method.bankAccountLastFour}</span>
                      <span className="mx-2">·</span>
                      <span>{method.bankCurrency}</span>
                    </div>
                  )}
                  
                  {method.type === 'wallet' && (
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="capitalize font-medium">{method.walletNetwork}</span>
                      <span className="mx-2">·</span>
                      <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        {method.walletAddress}
                      </code>
                    </div>
                  )}
                  
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Added {formatDate(method.createdAt)}
                    {method.verifiedAt && ` · Verified ${formatDate(method.verifiedAt)}`}
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                {!method.isDefault && method.isVerified && (
                  <button
                    onClick={() => handleSetDefault(method.id)}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(method.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Empty State */}
      {paymentMethods.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Payment Methods
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Add a bank account or wallet to enable payouts and transfers.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Add Payment Method
          </button>
        </div>
      )}
      
      {/* Add Payment Method Modal */}
      {showAddModal && (
        <AddPaymentMethodModal
          accountId={accountId}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

// ============================================
// ADD PAYMENT METHOD MODAL
// ============================================

interface AddPaymentMethodModalProps {
  accountId: string;
  onClose: () => void;
}

function AddPaymentMethodModal({ accountId, onClose }: AddPaymentMethodModalProps) {
  const [methodType, setMethodType] = useState<'bank_account' | 'wallet' | null>(null);
  const [label, setLabel] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  
  // Bank account fields
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  
  // Wallet fields
  const [walletNetwork, setWalletNetwork] = useState('base');
  const [walletAddress, setWalletAddress] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Add payment method:', {
      methodType,
      label,
      isDefault,
      bankName,
      accountNumber,
      routingNumber,
      accountHolder,
      walletNetwork,
      walletAddress,
    });
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Add Payment Method
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type Selection */}
          {!methodType && (
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMethodType('bank_account')}
                className="p-6 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center mb-3">
                  <Landmark className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Bank Account</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Add a US bank account for ACH transfers
                </p>
              </button>
              
              <button
                type="button"
                onClick={() => setMethodType('wallet')}
                className="p-6 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-purple-500 dark:hover:border-purple-400 transition-colors text-left"
              >
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-xl flex items-center justify-center mb-3">
                  <Wallet className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Crypto Wallet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Add a wallet address for USDC transfers
                </p>
              </button>
            </div>
          )}
          
          {/* Bank Account Form */}
          {methodType === 'bank_account' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setMethodType(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ← Back
                </button>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Bank Account</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., Primary Checking"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g., Wells Fargo"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter account number"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Routing Number
                </label>
                <input
                  type="text"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  placeholder="9 digits"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Name as it appears on the account"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Set as default payment method
                </span>
              </label>
            </div>
          )}
          
          {/* Wallet Form */}
          {methodType === 'wallet' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setMethodType(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  ← Back
                </button>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Crypto Wallet</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g., My USDC Wallet"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Network
                </label>
                <select
                  value={walletNetwork}
                  onChange={(e) => setWalletNetwork(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="base">Base</option>
                  <option value="polygon">Polygon</option>
                  <option value="ethereum">Ethereum</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Set as default payment method
                </span>
              </label>
            </div>
          )}
          
          {/* Submit Button */}
          {methodType && (
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Payment Method
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// ============================================
// SHARED COMPONENTS
// ============================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    active: {
      bg: 'bg-green-100 dark:bg-green-900/50',
      text: 'text-green-700 dark:text-green-300',
      icon: CheckCircle,
      label: 'Active'
    },
    pending_verification: {
      bg: 'bg-amber-100 dark:bg-amber-900/50',
      text: 'text-amber-700 dark:text-amber-300',
      icon: Clock,
      label: 'Pending KYC'
    },
    suspended: {
      bg: 'bg-red-100 dark:bg-red-900/50',
      text: 'text-red-700 dark:text-red-300',
      icon: Ban,
      label: 'Suspended'
    },
    closed: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-700 dark:text-gray-300',
      icon: Ban,
      label: 'Closed'
    }
  };
  
  const c = config[status] || config.active;
  const Icon = c.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

function VerificationBadge({ tier, type }: { tier: number; type: 'person' | 'business' }) {
  const tierNames: Record<string, Record<number, string>> = {
    person: { 0: 'Basic', 1: 'Standard', 2: 'Verified', 3: 'Enhanced' },
    business: { 0: 'Unverified', 1: 'Basic KYB', 2: 'Standard KYB', 3: 'Enhanced KYB' }
  };
  
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
      T{tier} · {tierNames[type][tier]}
    </span>
  );
}

function VerificationItem({ label, status }: { label: string; status: 'verified' | 'pending' | 'not_started' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      {status === 'verified' && (
        <CheckCircle className="w-4 h-4 text-green-500" />
      )}
      {status === 'pending' && (
        <Clock className="w-4 h-4 text-amber-500" />
      )}
      {status === 'not_started' && (
        <span className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
      )}
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getCountryName(code: string): string {
  const countries: Record<string, string> = {
    USA: 'United States',
    ARG: 'Argentina',
    BRA: 'Brazil',
    MEX: 'Mexico',
    COL: 'Colombia',
    PER: 'Peru',
    CHL: 'Chile'
  };
  return countries[code] || code;
}

function getCountryFlag(code: string): string {
  const flags: Record<string, string> = {
    USA: '🇺🇸',
    ARG: '🇦🇷',
    BRA: '🇧🇷',
    MEX: '🇲🇽',
    COL: '🇨🇴',
    PER: '🇵🇪',
    CHL: '🇨🇱'
  };
  return flags[code] || '🌎';
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}