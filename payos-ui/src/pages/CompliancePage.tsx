import { Page } from '../App';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { mockFlags } from '../data/mockFlags';

interface CompliancePageProps {
  onNavigate: (page: Page) => void;
}

export function CompliancePage({ onNavigate }: CompliancePageProps) {
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">Compliance</h1>
        <p className="text-gray-600 dark:text-gray-400">Review flagged items and manage risk</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Pending Flags" value="23" icon={AlertTriangle} />
        <StatCard label="High Risk" value="3" />
        <StatCard label="Medium Risk" value="12" />
        <StatCard label="Resolved This Month" value="1,847" />
      </div>

      {/* AI Summary */}
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200 dark:border-violet-900 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">✨ AI Summary</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              3 high-risk flags require immediate review. 2 appear to be structuring attempts. 1 is new corridor.
            </p>
            <button 
              onClick={() => onNavigate('transaction-detail')}
              className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors"
            >
              Review High Risk First
            </button>
          </div>
        </div>
      </div>

      {/* Flags Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Risk</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Details</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Age</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {mockFlags.map((flag) => {
              const details = flag.type === 'transaction' && flag.transaction
                ? `$${flag.transaction.amount.toLocaleString()} ${flag.transaction.fromAccount} → ${flag.transaction.toAccount}`
                : flag.account
                ? `${flag.account.name}: ${flag.aiAnalysis.reasons[0]}`
                : 'N/A';
              
              const ageInHours = Math.floor((Date.now() - new Date(flag.createdAt).getTime()) / (1000 * 60 * 60));
              const age = ageInHours < 24 ? `${ageInHours}h` : `${Math.floor(ageInHours / 24)}d`;
              
              return (
                <tr 
                  key={flag.id}
                  onClick={() => onNavigate('compliance-flag-detail')}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-4">
                    <Badge variant={flag.riskLevel === 'high' ? 'error' : 'warning'} size="sm">
                      {flag.riskLevel === 'high' ? '🔴 HIGH' : '🟡 MED'}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900 dark:text-white capitalize">{flag.type}</td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{details}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{flag.aiAnalysis.riskExplanation.substring(0, 60)}...</div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{age}</td>
                  <td className="px-4 py-4 text-right">
                    <button className="px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-md transition-colors">
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}