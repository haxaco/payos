import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { X, CheckCircle2, Download, Copy, Bot, Building2, CreditCard } from 'lucide-react';

interface TransactionDetailProps {
  onClose: () => void;
  transaction?: {
    type: 'payout' | 'card' | 'agent' | 'p2p' | 'withdrawal';
    amount: string;
    date: string;
    status: string;
  };
}

export function TransactionDetail({ onClose, transaction }: TransactionDetailProps) {
  // Agent payment example
  const isAgentPayment = transaction?.type === 'agent';
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end">
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-4 flex items-center justify-between">
          <h3 className="text-gray-900 dark:text-gray-100">Transaction Details</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Success Icon & Amount */}
          <div className="text-center py-6">
            <div className="inline-flex p-4 bg-success-100 dark:bg-success-950 rounded-full mb-4">
              <CheckCircle2 className="w-12 h-12 text-success-600 dark:text-success-400" />
            </div>
            <div className="mb-2">
              <span className={`${
                isAgentPayment 
                  ? 'text-gray-900 dark:text-gray-100' 
                  : 'text-success-600 dark:text-success-400'
              }`}>
                {isAgentPayment ? '-$120.00' : '+$2,500.00'}
              </span>
            </div>
            <Badge variant="success">Completed</Badge>
          </div>

          {/* Agent Payment Notice */}
          {isAgentPayment && (
            <div className="bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary-600 rounded-lg">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-gray-900 dark:text-gray-100 mb-1">AI Agent Payment</h4>
                  <p className="text-gray-700 dark:text-gray-300">
                    This payment was sent by an AI agent on behalf of <strong>TechCorp Inc</strong>
                  </p>
                  <div className="mt-2 text-gray-600 dark:text-gray-400">
                    Agent: Utility Payment Agent v2.1
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transaction Info */}
          <div className="space-y-4">
            <div className="flex items-start justify-between py-3 border-b border-gray-200 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">Type</span>
              <div className="flex items-center gap-2">
                {isAgentPayment ? (
                  <>
                    <Bot className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    <span className="text-gray-900 dark:text-gray-100">Agent Payment</span>
                  </>
                ) : transaction?.type === 'payout' ? (
                  <>
                    <Building2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-gray-900 dark:text-gray-100">Payout</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-gray-900 dark:text-gray-100">Card Purchase</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-start justify-between py-3 border-b border-gray-200 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">
                {isAgentPayment ? 'Service' : 'From'}
              </span>
              <div className="text-right">
                <div className="text-gray-900 dark:text-gray-100 mb-1">
                  {isAgentPayment ? 'Electricity Bill Payment' : 'TechCorp Inc'}
                </div>
                {isAgentPayment && (
                  <div className="text-gray-600 dark:text-gray-400">
                    Provider: ConEd New York
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start justify-between py-3 border-b border-gray-200 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">Date & Time</span>
              <div className="text-right">
                <div className="text-gray-900 dark:text-gray-100">Dec 4, 2024</div>
                <div className="text-gray-600 dark:text-gray-400">2:30 PM EST</div>
              </div>
            </div>

            <div className="flex items-start justify-between py-3 border-b border-gray-200 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">Status</span>
              <Badge variant="success">Completed</Badge>
            </div>

            {!isAgentPayment && (
              <div className="flex items-start justify-between py-3 border-b border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Payment Method</span>
                <div className="text-right">
                  <div className="text-gray-900 dark:text-gray-100">USDC</div>
                  <div className="text-gray-600 dark:text-gray-400">Polygon Network</div>
                </div>
              </div>
            )}

            <div className="flex items-start justify-between py-3 border-b border-gray-200 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">Description</span>
              <span className="text-gray-900 dark:text-gray-100 text-right max-w-xs">
                {isAgentPayment 
                  ? 'Automated utility payment processed by AI agent' 
                  : 'Monthly payment - June 2024'}
              </span>
            </div>

            <div className="flex items-start justify-between py-3 border-b border-gray-200 dark:border-gray-800">
              <span className="text-gray-600 dark:text-gray-400">Reference ID</span>
              <div className="flex items-center gap-2">
                <code className="text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                  {isAgentPayment ? 'AGT-2024-1847' : 'TXN-2024-0521'}
                </code>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                  <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {isAgentPayment && (
              <div className="flex items-start justify-between py-3 border-b border-gray-200 dark:border-gray-800">
                <span className="text-gray-600 dark:text-gray-400">Agent ID</span>
                <div className="flex items-center gap-2">
                  <code className="text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                    AGENT-UTL-2024
                  </code>
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                    <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            )}

            {/* Fee Breakdown */}
            {!isAgentPayment && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
                <h4 className="text-gray-900 dark:text-gray-100 mb-3">Fee Breakdown</h4>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Amount</span>
                  <span className="text-gray-900 dark:text-gray-100">$2,500.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Network Fee</span>
                  <span className="text-gray-900 dark:text-gray-100">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">FX Rate</span>
                  <span className="text-gray-900 dark:text-gray-100">1 USDC = $1.00</span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                  <span className="text-gray-900 dark:text-gray-100">Total Received</span>
                  <span className="text-gray-900 dark:text-gray-100">$2,500.00</span>
                </div>
              </div>
            )}

            {isAgentPayment && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
                <h4 className="text-gray-900 dark:text-gray-100 mb-3">Payment Details</h4>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Bill Amount</span>
                  <span className="text-gray-900 dark:text-gray-100">$115.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Agent Fee</span>
                  <span className="text-gray-900 dark:text-gray-100">$5.00</span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                  <span className="text-gray-900 dark:text-gray-100">Total Paid</span>
                  <span className="text-gray-900 dark:text-gray-100">$120.00</span>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" size="md" className="flex-1">
              <Download className="w-4 h-4" />
              Download Receipt
            </Button>
            <Button variant="ghost" size="md" className="flex-1">
              Report Issue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
