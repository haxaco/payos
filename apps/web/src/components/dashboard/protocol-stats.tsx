import { PieChart, Activity, Zap, Layers } from 'lucide-react';

export function ProtocolStats() {
    const protocols = [
        { name: 'Circle (USDC)', value: 65, color: 'bg-blue-500', icon: Zap },
        { name: 'Ethereum', value: 25, color: 'bg-purple-500', icon: Layers },
        { name: 'Bitcoin', value: 10, color: 'bg-orange-500', icon: Activity },
    ];

    return (
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Protocol Distribution</h3>
                <PieChart className="w-5 h-5 text-gray-400" />
            </div>

            <div className="flex items-center justify-center py-4 mb-6 relative">
                {/* Simplified Donut Chart Representation using CSS Conic Gradient */}
                <div
                    className="w-40 h-40 rounded-full relative"
                    style={{
                        background: `conic-gradient(
              #3b82f6 0% 65%,
              #a855f7 65% 90%,
              #f97316 90% 100%
            )`
                    }}
                >
                    <div className="absolute inset-4 bg-white dark:bg-gray-950 rounded-full flex items-center justify-center flex-col">
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">3</span>
                        <span className="text-xs text-gray-500">Active Protocols</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {protocols.map((protocol) => (
                    <div key={protocol.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${protocol.color} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-center`}>
                                <protocol.icon className={`w-4 h-4 ${protocol.color.replace('bg-', 'text-')}`} />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {protocol.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-24 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${protocol.color}`}
                                    style={{ width: `${protocol.value}%` }}
                                />
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 w-8 text-right">
                                {protocol.value}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
