import { AccountContext } from '@/types/context';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

interface ComplianceCardProps {
    compliance: AccountContext['compliance'];
}

export function ComplianceCard({ compliance }: ComplianceCardProps) {
    const getRiskColor = (level: string) => {
        switch (level) {
            case 'low': return 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400';
            case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'high': return 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-gray-500" />
                Compliance
            </h3>

            <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Risk Level</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${getRiskColor(compliance.risk_level)}`}>
                        {compliance.risk_level}
                    </span>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-600 dark:text-gray-400">KYB Tier</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">Tier {compliance.kyb_tier}</span>
                </div>

                {compliance.flags.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-3">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-400 mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            Active Flags
                        </h4>
                        <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-300 space-y-1">
                            {compliance.flags.map((flag, idx) => (
                                <li key={idx} className="capitalize">{flag.replace(/_/g, ' ')}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {compliance.flags.length === 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 p-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span>No active compliance flags</span>
                    </div>
                )}
            </div>
        </div>
    );
}
