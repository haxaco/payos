import { AccountContext } from '@/types/context';
import { Badge } from 'lucide-react'; // Wait, Lucide doesn't export Badge. I should check if there is a Badge component or build one.
// Let's assume standard HTML/Tailwind for now as I didn't see a Badge component in ui/
// Actually I'll use a simple span for badges like in Sidebar.tsx

interface AccountHeaderProps {
    account: AccountContext['account'];
    lastUpdated: string;
    onRefresh: () => void;
    isLoading: boolean;
}

export function AccountHeader({ account, lastUpdated, onRefresh, isLoading }: AccountHeaderProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'suspended': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'closed': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {account.name}
                    </h1>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(account.status)}`}>
                        {account.status}
                    </span>
                </div>
                <div className="mt-1 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-mono">{account.id}</span>
                    <span>•</span>
                    <span>{account.type === 'business' ? 'Business' : 'Personal'} Account</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                        KYB Tier {account.verification_tier}
                        <span className={`w-2 h-2 rounded-full ${account.verification_tier >= 2 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                    Updated {new Date(lastUpdated).toLocaleTimeString()}
                </span>
                <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title="Refresh data"
                >
                    <svg
                        className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
