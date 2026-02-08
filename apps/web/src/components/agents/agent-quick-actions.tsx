import { Settings } from 'lucide-react';

interface AgentQuickActionsProps {
  agent: {
    id: string;
    name: string;
    status: string;
  };
}

export function AgentQuickActions({ agent }: AgentQuickActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
        <Settings className="h-4 w-4" />
        Configure
      </button>
    </div>
  );
}
