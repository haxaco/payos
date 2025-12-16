import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Clock, CheckCircle, XCircle, Search, Filter,
  ChevronRight, User, Building2, ArrowUpRight, FileText, MessageSquare,
  Calendar, DollarSign, AlertCircle, MoreHorizontal, X, Send, Upload,
  ExternalLink, Scale
} from 'lucide-react';
import { AISparkleButton } from '../components/ui/AISparkleButton';

// Mock disputes data
const mockDisputes = [
  {
    id: 'dsp_001',
    transferId: 'txn_abc123',
    status: 'open',
    reason: 'service_not_received',
    description: 'I paid for a service that was never delivered. Multiple attempts to contact the vendor have been unsuccessful.',
    claimant: {
      accountId: 'acc_person_001',
      accountName: 'Maria Garcia',
      accountType: 'person',
    },
    respondent: {
      accountId: 'acc_business_002',
      accountName: 'Digital Services LLC',
      accountType: 'business',
    },
    amountDisputed: 500.00,
    requestedResolution: 'full_refund',
    dueDate: '2025-12-28',
    createdAt: '2025-11-28',
    transfer: {
      amount: 500.00,
      currency: 'USDC',
      completedAt: '2025-11-20',
    },
  },
  {
    id: 'dsp_002',
    transferId: 'txn_def456',
    status: 'under_review',
    reason: 'amount_incorrect',
    description: 'I was charged $750 instead of the agreed $500. I have the original invoice showing the correct amount.',
    claimant: {
      accountId: 'acc_business_001',
      accountName: 'TechCorp Inc',
      accountType: 'business',
    },
    respondent: {
      accountId: 'acc_person_002',
      accountName: 'John Smith Consulting',
      accountType: 'person',
    },
    amountDisputed: 250.00,
    requestedResolution: 'partial_refund',
    requestedAmount: 250.00,
    dueDate: '2025-12-20',
    createdAt: '2025-11-20',
    respondentResponse: 'The additional $250 was for rush delivery as agreed via email.',
    transfer: {
      amount: 750.00,
      currency: 'USDC',
      completedAt: '2025-11-15',
    },
  },
  {
    id: 'dsp_003',
    transferId: 'txn_ghi789',
    status: 'escalated',
    reason: 'duplicate_charge',
    description: 'I was charged twice for the same service. Transaction IDs show identical amounts on consecutive days.',
    claimant: {
      accountId: 'acc_person_003',
      accountName: 'Ana Souza',
      accountType: 'person',
    },
    respondent: {
      accountId: 'acc_business_003',
      accountName: 'CloudSoft Inc',
      accountType: 'business',
    },
    amountDisputed: 1200.00,
    requestedResolution: 'full_refund',
    dueDate: '2025-12-15',
    createdAt: '2025-11-15',
    escalatedAt: '2025-12-01',
    transfer: {
      amount: 1200.00,
      currency: 'USDC',
      completedAt: '2025-11-10',
    },
  },
  {
    id: 'dsp_004',
    transferId: 'txn_jkl012',
    status: 'resolved',
    reason: 'quality_issue',
    description: 'The delivered product did not match the description. Quality was far below what was advertised.',
    claimant: {
      accountId: 'acc_person_004',
      accountName: 'Juan Perez',
      accountType: 'person',
    },
    respondent: {
      accountId: 'acc_business_001',
      accountName: 'TechCorp Inc',
      accountType: 'business',
    },
    amountDisputed: 350.00,
    requestedResolution: 'partial_refund',
    requestedAmount: 175.00,
    resolution: 'partial_refund',
    resolutionAmount: 175.00,
    resolutionNotes: 'Partial refund issued as agreed by both parties.',
    dueDate: '2025-12-10',
    resolvedAt: '2025-12-05',
    createdAt: '2025-11-10',
    transfer: {
      amount: 350.00,
      currency: 'USDC',
      completedAt: '2025-11-05',
    },
  },
];

const reasonLabels: Record<string, string> = {
  service_not_received: 'Service Not Received',
  duplicate_charge: 'Duplicate Charge',
  unauthorized: 'Unauthorized',
  amount_incorrect: 'Incorrect Amount',
  quality_issue: 'Quality Issue',
  other: 'Other',
};

const resolutionLabels: Record<string, string> = {
  full_refund: 'Full Refund',
  partial_refund: 'Partial Refund',
  credit_issued: 'Credit Issued',
  no_action: 'No Action',
};

export function DisputesPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDispute, setSelectedDispute] = useState<typeof mockDisputes[0] | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);

  // Filter disputes
  const filteredDisputes = mockDisputes.filter(dispute => {
    const matchesSearch =
      dispute.claimant.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.respondent.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dispute.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || dispute.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    open: mockDisputes.filter(d => d.status === 'open').length,
    underReview: mockDisputes.filter(d => d.status === 'under_review').length,
    escalated: mockDisputes.filter(d => d.status === 'escalated').length,
    resolved: mockDisputes.filter(d => d.status === 'resolved').length,
    totalAmount: mockDisputes.filter(d => d.status !== 'resolved').reduce((sum, d) => sum + d.amountDisputed, 0),
  };

  // Check for due soon disputes
  const dueSoon = mockDisputes.filter(d => {
    if (d.status === 'resolved') return false;
    const dueDate = new Date(d.dueDate);
    const now = new Date();
    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 7;
  });

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Disputes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage and resolve payment disputes
          </p>
        </div>
        <AISparkleButton context="dispute management overview" label="AI Insights" />
      </div>

      {/* Due Soon Alert */}
      {dueSoon.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {dueSoon.length} dispute{dueSoon.length > 1 ? 's' : ''} due within 7 days
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Review and respond to prevent automatic escalation.
              </p>
            </div>
            <button className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">
              Review Now
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Open Disputes</p>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{stats.open}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Awaiting response</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Under Review</p>
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{stats.underReview}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Being investigated</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Escalated</p>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{stats.escalated}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {stats.resolved} resolved total
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">Amount at Risk</p>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
            ${stats.totalAmount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">In active disputes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ID, or transaction..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="under_review">Under Review</option>
          <option value="escalated">Escalated</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Disputes Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Dispute
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Parties
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Amount
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Reason
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Due Date
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredDisputes.map((dispute) => {
              const dueDate = new Date(dispute.dueDate);
              const now = new Date();
              const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysUntilDue < 0 && dispute.status !== 'resolved';
              const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0 && dispute.status !== 'resolved';

              return (
                <tr
                  key={dispute.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedDispute(dispute)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Scale className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {dispute.id.slice(0, 12)}...
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(dispute.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {dispute.claimant.accountType === 'person' ? (
                          <User className="w-3 h-3 text-gray-400" />
                        ) : (
                          <Building2 className="w-3 h-3 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-900 dark:text-white">
                          {dispute.claimant.accountName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <ArrowUpRight className="w-3 h-3" />
                        <span className="text-sm">{dispute.respondent.accountName}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      ${dispute.amountDisputed.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      of ${dispute.transfer.amount.toLocaleString()}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {reasonLabels[dispute.reason]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`text-sm ${isOverdue
                        ? 'text-red-600 dark:text-red-400 font-medium'
                        : isDueSoon
                          ? 'text-amber-600 dark:text-amber-400 font-medium'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}>
                      {dispute.status === 'resolved' ? (
                        <span className="text-gray-400">—</span>
                      ) : isOverdue ? (
                        `${Math.abs(daysUntilDue)} days overdue`
                      ) : (
                        `${daysUntilDue} days left`
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={dispute.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDispute(dispute);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredDisputes.length === 0 && (
          <div className="p-12 text-center">
            <Scale className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No disputes found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'All disputes have been resolved'}
            </p>
          </div>
        )}
      </div>

      {/* Dispute Detail Slide-over */}
      {selectedDispute && (
        <DisputeDetail
          dispute={selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onResolve={() => {
            setShowResolveModal(true);
          }}
        />
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedDispute && (
        <ResolveDisputeModal
          dispute={selectedDispute}
          onClose={() => setShowResolveModal(false)}
          onResolved={() => {
            setShowResolveModal(false);
            setSelectedDispute(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// STATUS BADGE
// ============================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    open: {
      bg: 'bg-amber-100 dark:bg-amber-900/50',
      text: 'text-amber-700 dark:text-amber-300',
      icon: Clock,
      label: 'Open',
    },
    under_review: {
      bg: 'bg-blue-100 dark:bg-blue-900/50',
      text: 'text-blue-700 dark:text-blue-300',
      icon: FileText,
      label: 'Under Review',
    },
    escalated: {
      bg: 'bg-red-100 dark:bg-red-900/50',
      text: 'text-red-700 dark:text-red-300',
      icon: AlertCircle,
      label: 'Escalated',
    },
    resolved: {
      bg: 'bg-green-100 dark:bg-green-900/50',
      text: 'text-green-700 dark:text-green-300',
      icon: CheckCircle,
      label: 'Resolved',
    },
  };

  const c = config[status] || config.open;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

// ============================================
// DISPUTE DETAIL SLIDE-OVER
// ============================================

interface DisputeDetailProps {
  dispute: typeof mockDisputes[0];
  onClose: () => void;
  onResolve: () => void;
}

function DisputeDetail({ dispute, onClose, onResolve }: DisputeDetailProps) {
  const navigate = useNavigate();
  const [response, setResponse] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Dispute Details
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {dispute.id}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={dispute.status} />
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Transaction Summary */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Original Transaction
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  ${dispute.transfer.amount.toLocaleString()} {dispute.transfer.currency}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Completed {new Date(dispute.transfer.completedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => navigate(`/transactions/${dispute.transferId}`)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
              >
                View Transaction
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Claimant
              </p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${dispute.claimant.accountType === 'person'
                    ? 'bg-blue-100 dark:bg-blue-900/50'
                    : 'bg-purple-100 dark:bg-purple-900/50'
                  }`}>
                  {dispute.claimant.accountType === 'person' ? (
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {dispute.claimant.accountName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Filed dispute
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Respondent
              </p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${dispute.respondent.accountType === 'person'
                    ? 'bg-blue-100 dark:bg-blue-900/50'
                    : 'bg-purple-100 dark:bg-purple-900/50'
                  }`}>
                  {dispute.respondent.accountType === 'person' ? (
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {dispute.respondent.accountName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Must respond
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dispute Details */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Claim Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Reason</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {reasonLabels[dispute.reason]}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Amount Disputed</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ${dispute.amountDisputed.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Requested Resolution</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {dispute.requestedResolution ? resolutionLabels[dispute.requestedResolution] : '—'}
                </span>
              </div>
              {dispute.requestedAmount && (
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Requested Amount</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ${dispute.requestedAmount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400">Due Date</span>
                <span className={`font-medium ${dispute.status !== 'resolved' && new Date(dispute.dueDate) < new Date()
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-white'
                  }`}>
                  {dispute.status === 'resolved' ? '—' : new Date(dispute.dueDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Claimant's Statement
            </h3>
            <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              {dispute.description}
            </p>
          </div>

          {/* Respondent Response (if exists) */}
          {dispute.respondentResponse && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Respondent's Response
              </h3>
              <p className="text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                {dispute.respondentResponse}
              </p>
            </div>
          )}

          {/* Resolution (if resolved) */}
          {dispute.status === 'resolved' && dispute.resolution && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="font-medium text-green-800 dark:text-green-200">Resolution</h3>
              </div>
              <p className="text-green-700 dark:text-green-300 mb-2">
                {resolutionLabels[dispute.resolution]}
                {dispute.resolutionAmount && ` — $${dispute.resolutionAmount.toLocaleString()}`}
              </p>
              {dispute.resolutionNotes && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  {dispute.resolutionNotes}
                </p>
              )}
            </div>
          )}

          {/* Admin Actions */}
          {dispute.status !== 'resolved' && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Admin Actions
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={onResolve}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                >
                  Resolve Dispute
                </button>
                {dispute.status !== 'escalated' && (
                  <button className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 font-medium text-sm transition-colors">
                    Escalate
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// RESOLVE DISPUTE MODAL
// ============================================

interface ResolveDisputeModalProps {
  dispute: typeof mockDisputes[0];
  onClose: () => void;
  onResolved: () => void;
}

function ResolveDisputeModal({ dispute, onClose, onResolved }: ResolveDisputeModalProps) {
  const [resolution, setResolution] = useState<string>('');
  const [resolutionAmount, setResolutionAmount] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [issueRefund, setIssueRefund] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Resolve dispute:', {
      resolution,
      resolutionAmount,
      notes,
      issueRefund,
    });
    onResolved();
  };

  const needsAmount = resolution === 'partial_refund' || resolution === 'refund_issued';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Resolve Dispute
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Resolution
            </label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select resolution...</option>
              <option value="refund_issued">Full Refund</option>
              <option value="partial_refund">Partial Refund</option>
              <option value="credit_issued">Credit Issued</option>
              <option value="no_action">No Action (Dismiss)</option>
            </select>
          </div>

          {needsAmount && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resolution Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={resolutionAmount}
                  onChange={(e) => setResolutionAmount(e.target.value)}
                  max={dispute.amountDisputed}
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Maximum: ${dispute.amountDisputed.toLocaleString()}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Explain the resolution decision..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {(resolution === 'refund_issued' || resolution === 'partial_refund') && (
            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={issueRefund}
                onChange={(e) => setIssueRefund(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Automatically issue refund
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Creates a refund transaction when resolved
                </p>
              </div>
            </label>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!resolution}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Resolve Dispute
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DisputesPage;

