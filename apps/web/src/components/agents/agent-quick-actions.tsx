'use client';

import { useState } from 'react';
import { Play, Settings, Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface AgentQuickActionsProps {
  agent: {
    id: string;
    name: string;
    status: string;
  };
  onActionComplete?: () => void;
}

export function AgentQuickActions({ agent, onActionComplete }: AgentQuickActionsProps) {
  const [isRunning, setIsRunning] = useState(false);

  const handleRunNow = async () => {
    if (agent.status !== 'active') {
      toast.error('Agent must be active to run');
      return;
    }

    setIsRunning(true);
    
    // Simulate agent processing (mock for demo)
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Mock results
    const results = {
      processed: Math.floor(Math.random() * 5) + 1,
      totalAmount: Math.floor(Math.random() * 8000) + 2000,
      failed: Math.random() > 0.9 ? 1 : 0,
    };
    
    setIsRunning(false);
    
    if (results.failed > 0) {
      toast.warning(`${agent.name} completed with warnings`, {
        description: `Processed ${results.processed} payments ($${results.totalAmount.toLocaleString()}), ${results.failed} failed`,
      });
    } else {
      toast.success(`${agent.name} completed`, {
        description: `Processed ${results.processed} payments ($${results.totalAmount.toLocaleString()})`,
      });
    }
    
    onActionComplete?.();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRunNow}
        disabled={isRunning || agent.status !== 'active'}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Run Now
          </>
        )}
      </button>
      
      <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
        <Settings className="h-4 w-4" />
        Configure
      </button>
    </div>
  );
}

