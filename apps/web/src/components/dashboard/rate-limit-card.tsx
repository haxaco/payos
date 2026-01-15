import { Activity, Zap, AlertTriangle } from 'lucide-react';

interface RateLimitCardProps {
    usagePercentage?: number;
    requestsPerMinute?: number;
    limit?: number;
}

export function RateLimitCard({
    usagePercentage = 45,
    requestsPerMinute = 135,
    limit = 300
}: RateLimitCardProps) {

    const getStatusColor = (percentage: number) => {
        if (percentage >= 90) return 'text-red-500 bg-red-500';
        if (percentage >= 75) return 'text-amber-500 bg-amber-500';
        return 'text-emerald-500 bg-emerald-500';
    };

    const statusColor = getStatusColor(usagePercentage);
    const textColor = statusColor.split(' ')[0];
    const bgColor = statusColor.split(' ')[1];

    return (
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">API Usage</h3>
                <div className={`px-2 py-1 rounded-full bg-opacity-10 dark:bg-opacity-20 flex items-center gap-1.5 ${bgColor.replace('bg-', 'bg-')} ${textColor}`}>
                    <Activity className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Healthy</span>
                </div>
            </div>

            <div className="mb-6">
                <div className="flex items-end justify-between mb-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {requestsPerMinute}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        / {limit} req/min
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${bgColor}`}
                        style={{ width: `${usagePercentage}%` }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Response</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        124ms
                    </div>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Errors</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        0.02%
                    </div>
                </div>
            </div>
        </div>
    );
}
