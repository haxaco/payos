import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { useComplianceFlags, useComplianceStats } from '../hooks/api';
import { useState } from 'react';

export function CompliancePage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  
  // Fetch compliance flags
  const filters = {
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(riskFilter !== 'all' && { risk_level: riskFilter }),
    limit: 50,
  };
  
  const { data: flagsData, loading: flagsLoading, error: flagsError } = useComplianceFlags(filters);
  const { data: statsData, loading: statsLoading } = useComplianceStats();
  
  const flags = flagsData?.data || [];
  const stats = statsData?.data;
  
  // Calculate active flags (not resolved/dismissed)
  const activeFlags = stats ? 
    stats.by_status.open + stats.by_status.pending_review + stats.by_status.under_investigation + stats.by_status.escalated
    : 0;
  
  if (flagsLoading && !flags.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">Compliance</h1>
        <p className="text-gray-600 dark:text-gray-400">Review flagged items and manage risk</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          label="Active Flags" 
          value={statsLoading ? '...' : activeFlags.toString()} 
          icon={AlertTriangle} 
        />
        <StatCard 
          label="High Risk" 
          value={statsLoading ? '...' : (stats?.by_risk_level.high || 0).toString()} 
        />
        <StatCard 
          label="Medium Risk" 
          value={statsLoading ? '...' : (stats?.by_risk_level.medium || 0).toString()} 
        />
        <StatCard 
          label="Resolved" 
          value={statsLoading ? '...' : (stats?.by_status.resolved || 0).toString()} 
        />
      </div>

      {/* Due Soon Alert */}
      {stats && stats.due_soon > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {stats.due_soon} flag{stats.due_soon > 1 ? 's' : ''} due within 7 days
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Review and respond to prevent automatic escalation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="pending_review">Pending Review</option>
          <option value="under_investigation">Under Investigation</option>
          <option value="escalated">Escalated</option>
        </select>
        
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Risk Levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Flags Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        {flagsError && (
          <div className="p-8 text-center text-red-600 dark:text-red-400">
            Failed to load compliance flags: {flagsError.message}
          </div>
        )}
        
        {!flagsError && flags.length === 0 && !flagsLoading && (
          <div className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No compliance flags found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {statusFilter !== 'all' || riskFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'All transactions are compliant'}
            </p>
          </div>
        )}
        
        {flags.length > 0 && (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Risk</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Details</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Age</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {flags.map((flag) => {
                // Build details string
                let details = '';
                if (flag.flag_type === 'transaction' && flag.transfers) {
                  details = `$${flag.transfers.amount.toLocaleString()} ${flag.transfers.from_account_name} → ${flag.transfers.to_account_name}`;
                } else if (flag.flag_type === 'account' && flag.accounts) {
                  details = `${flag.accounts.name}: ${flag.reasons[0] || flag.reason_code}`;
                } else {
                  details = flag.description || flag.reason_code;
                }
                
                // Calculate age
                const ageInHours = Math.floor((Date.now() - new Date(flag.created_at).getTime()) / (1000 * 60 * 60));
                const age = ageInHours < 24 ? `${ageInHours}h` : `${Math.floor(ageInHours / 24)}d`;
                
                // Risk badge
                const riskBadge = {
                  critical: { label: '🔴 CRIT', variant: 'error' as const },
                  high: { label: '🔴 HIGH', variant: 'error' as const },
                  medium: { label: '🟡 MED', variant: 'warning' as const },
                  low: { label: '🟢 LOW', variant: 'success' as const },
                }[flag.risk_level] || { label: flag.risk_level.toUpperCase(), variant: 'default' as const };
                
                return (
                  <tr 
                    key={flag.id}
                    onClick={() => navigate(`/compliance/${flag.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-4">
                      <Badge variant={riskBadge.variant} size="sm">
                        {riskBadge.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 dark:text-white capitalize">
                      {flag.flag_type.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {details}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {flag.ai_analysis?.risk_explanation?.substring(0, 60)}...
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                        {flag.status.replace(/_/g, ' ')}
                      </span>
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
        )}
      </div>
    </div>
  );
}