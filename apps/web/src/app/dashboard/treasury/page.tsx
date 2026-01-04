'use client';

import { useState } from 'react';
import { RefreshCw, LayoutDashboard, List, Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@payos/ui';
import { toast } from 'sonner';
import { TreasuryStats } from './components/treasury-stats';
import { AccountsTable } from './components/accounts-table';
import { AlertsList } from './components/alerts-list';

export default function TreasuryPage() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('accounts');

  // Fetch Dashboard Stats
  const { data: dashboardData, isLoading: statsLoading } = useQuery({
    queryKey: ['treasury', 'dashboard'],
    queryFn: async () => {
      if (!api) throw new Error('API not initialized');
      return api.treasury.getDashboard();
    },
    enabled: !!api,
  });

  // Fetch Accounts
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['treasury', 'accounts'],
    queryFn: async () => {
      if (!api) throw new Error('API not initialized');
      return api.treasury.getAccounts();
    },
    enabled: !!api,
  });

  // Fetch Active Alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['treasury', 'alerts', 'open'],
    queryFn: async () => {
      if (!api) throw new Error('API not initialized');
      return api.treasury.getAlerts({ status: 'open' });
    },
    enabled: !!api,
  });

  // Sync Mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!api) throw new Error('API not initialized');
      return api.treasury.sync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury'] });
      toast.success('Treasury balances synchronized');
    },
    onError: () => {
      toast.error('Failed to sync treasury balances');
    }
  });

  // Resolved mutations (passed to AlertsList)
  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!api) throw new Error('API not initialized');
      return api.treasury.acknowledgeAlert(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['treasury', 'alerts'] })
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!api) throw new Error('API not initialized');
      return api.treasury.resolveAlert(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['treasury', 'alerts'] })
  });

  // Ensure data structure safety (handle potential nested data or missing data)
  const stats = (dashboardData as any)?.data || dashboardData;
  const accounts = Array.isArray(accountsData) ? accountsData : (accountsData as any)?.data || [];
  const alerts = Array.isArray(alertsData) ? alertsData : (alertsData as any)?.data || [];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Treasury</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage liquidity and float across rails</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync Balances
          </Button>
          <Button>
            Rebalance
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <TreasuryStats stats={stats} isLoading={statsLoading} />

      {/* Main Content Areas */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Main Table Area */}
        <div className="xl:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="accounts" className="gap-2"><LayoutDashboard className="w-4 h-4" /> Accounts</TabsTrigger>
                <TabsTrigger value="transactions" className="gap-2"><List className="w-4 h-4" /> Transactions</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="accounts" className="mt-0">
              <AccountsTable accounts={accounts} isLoading={accountsLoading} />
            </TabsContent>

            <TabsContent value="transactions" className="mt-0">
              {/* Placeholder for future implementation */}
              <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500">
                Transaction history view coming soon.
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Area */}
        <div className="space-y-6">
          {/* Alerts */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4" /> Active Alerts
            </h3>
            <AlertsList
              alerts={alerts}
              isLoading={alertsLoading}
              onAcknowledge={async (id) => { await acknowledgeMutation.mutateAsync(id); }}
              onResolve={async (id) => { await resolveMutation.mutateAsync(id); }}
            />
          </div>

          {/* Add more widgets here like Currency Exposure Pie Chart in Phase 2 */}
        </div>
      </div>
    </div>
  );
}
