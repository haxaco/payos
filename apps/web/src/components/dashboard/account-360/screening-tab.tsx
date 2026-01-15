import { Shield, CheckCircle, AlertTriangle, XCircle, Clock, Search } from 'lucide-react';
import { useLocale } from '@/lib/locale';

interface ScreeningCheck {
    id: string;
    type: 'AML' | 'PEP' | 'Sanctions' | 'Adverse Media';
    status: 'cleared' | 'flagged' | 'pending' | 'failed';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    createdAt: string;
    reference: string;
    matches: number;
}

// Mock data for screening history since API doesn't support filtering by entity yet
const MOCK_CHECKS: ScreeningCheck[] = [
    {
        id: 'scr_1',
        type: 'AML',
        status: 'cleared',
        riskLevel: 'low',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        reference: 'REF-2024-001',
        matches: 0,
    },
    {
        id: 'scr_2',
        type: 'PEP',
        status: 'cleared',
        riskLevel: 'low',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
        reference: 'REF-2024-002',
        matches: 0,
    },
    {
        id: 'scr_3',
        type: 'Sanctions',
        status: 'flagged',
        riskLevel: 'medium',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
        reference: 'REF-2024-003',
        matches: 1,
    },
];

export function ScreeningTab() {
    const { formatDate } = useLocale();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'cleared': return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400';
            case 'flagged': return 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400';
            case 'failed': return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400';
            default: return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400';
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'low': return 'text-emerald-600 dark:text-emerald-400';
            case 'medium': return 'text-amber-600 dark:text-amber-400';
            case 'high':
            case 'critical': return 'text-red-600 dark:text-red-400';
            default: return 'text-gray-600 dark:text-gray-400';
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Latest Screening</span>
                        <Clock className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatDate(MOCK_CHECKS[0].createdAt)}
                    </div>
                    <div className="text-xs text-emerald-600 mt-1">Passed</div>
                </div>

                <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Checks</span>
                        <Search className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        24
                    </div>
                    <div className="text-xs text-gray-500 mt-1">All time</div>
                </div>

                <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Risk Profile</span>
                        <Shield className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        Low Risk
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Based on recent activity</div>
                </div>
            </div>

            {/* Checks List */}
            <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Screening History</h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {MOCK_CHECKS.map((check) => (
                        <div key={check.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1 p-2 rounded-lg ${check.status === 'cleared' ? 'bg-emerald-100 dark:bg-emerald-950/50' :
                                            check.status === 'flagged' ? 'bg-amber-100 dark:bg-amber-950/50' :
                                                'bg-gray-100 dark:bg-gray-800'
                                        }`}>
                                        {check.status === 'cleared' ? (
                                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                        ) : check.status === 'flagged' ? (
                                            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                        ) : (
                                            <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                {check.type} Check
                                            </h4>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(check.status)}`}>
                                                {check.status}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                            Ref: {check.reference} • {formatDate(check.createdAt)}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs">
                                            <span className="flex items-center gap-1.5 font-medium">
                                                Risk Level: <span className={getRiskColor(check.riskLevel)}>{check.riskLevel.toUpperCase()}</span>
                                            </span>
                                            <span className="text-gray-400">|</span>
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {check.matches} potential matches found
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <button className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                                    View Report
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
