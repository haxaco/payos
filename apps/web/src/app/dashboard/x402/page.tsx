'use client';

/**
 * x402 Gateway Overview Page
 * 
 * Provides a unified view of x402 provider and consumer activity.
 * Users can toggle between provider view (endpoints & revenue) and consumer view (payments & spending).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger,
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Badge,
  Button,
  StatCard
} from '@payos/ui';
import { TableSkeleton } from '@/components/ui/skeletons';
import { 
  Zap, 
  DollarSign, 
  TrendingUp, 
  Users, 
  CreditCard, 
  ArrowUpRight, 
  Plus,
  BarChart3 
} from 'lucide-react';

type ViewMode = 'provider' | 'consumer';

export default function X402OverviewPage() {
  const api = useAPIClient();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('provider');

  // Fetch analytics summary
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['x402', 'analytics', 'summary'],
    queryFn: () => api!.x402Analytics.getSummary(),
    enabled: !!api && viewMode === 'provider',
  });

  // Fetch provider endpoints
  const { data: endpointsData, isLoading: endpointsLoading } = useQuery({
    queryKey: ['x402', 'endpoints'],
    queryFn: () => api!.x402Endpoints.list(),
    enabled: !!api && viewMode === 'provider',
  });

  // Fetch consumer transfers (x402 payments)
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['x402', 'payments'],
    queryFn: () => api!.transfers.list({ 
      type: 'x402',
      limit: 10 
    }),
    enabled: !!api && viewMode === 'consumer',
  });

  const analytics = analyticsData;
  const endpoints = endpointsData?.data || [];
  const payments = paymentsData?.data || [];

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">x402 Gateway</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monetize and consume HTTP APIs with automatic payments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={viewMode === 'provider' ? 'default' : 'outline'}
            onClick={() => setViewMode('provider')}
          >
            <Zap className="h-4 w-4 mr-2" />
            Provider View
          </Button>
          <Button
            variant={viewMode === 'consumer' ? 'default' : 'outline'}
            onClick={() => setViewMode('consumer')}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Consumer View
          </Button>
        </div>
      </div>

      {/* Provider View */}
      {viewMode === 'provider' && (
        <div className="space-y-6">
          {/* Stats */}
          {analyticsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <TableSkeleton rows={1} columns={1} />
              <TableSkeleton rows={1} columns={1} />
              <TableSkeleton rows={1} columns={1} />
              <TableSkeleton rows={1} columns={1} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Revenue"
                value={`$${analytics?.totalRevenue?.toFixed(2) || '0.00'}`}
                subtitle="Last 30 days"
                icon={<DollarSign className="h-5 w-5" />}
                trend={analytics?.totalRevenue > 0 ? 'up' : undefined}
              />
              <StatCard
                title="Net Revenue"
                value={`$${analytics?.netRevenue?.toFixed(2) || '0.00'}`}
                subtitle={`${analytics?.totalFees?.toFixed(2) || '0.00'} in fees`}
                icon={<TrendingUp className="h-5 w-5" />}
                trend={analytics?.netRevenue > 0 ? 'up' : undefined}
              />
              <StatCard
                title="API Calls"
                value={analytics?.transactionCount?.toLocaleString() || '0'}
                subtitle={`Avg $${analytics?.averageTransactionSize?.toFixed(4) || '0'}`}
                icon={<BarChart3 className="h-5 w-5" />}
              />
              <StatCard
                title="Active Endpoints"
                value={analytics?.activeEndpoints || '0'}
                subtitle={`${analytics?.uniquePayers || '0'} unique payers`}
                icon={<Zap className="h-5 w-5" />}
              />
            </div>
          )}

          {/* Endpoints Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Your x402 Endpoints</CardTitle>
                <CardDescription>
                  APIs you're monetizing with automatic payments
                </CardDescription>
              </div>
              <Button onClick={() => router.push('/dashboard/x402/endpoints/new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Endpoint
              </Button>
            </CardHeader>
            <CardContent>
              {endpointsLoading ? (
                <TableSkeleton rows={3} columns={6} />
              ) : endpoints.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No x402 endpoints yet</p>
                  <p className="text-sm mt-1">Create your first monetized API endpoint</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Endpoint</th>
                        <th className="text-left p-3 font-medium">Price</th>
                        <th className="text-left p-3 font-medium">Calls</th>
                        <th className="text-left p-3 font-medium">Revenue</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-right p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {endpoints.map((endpoint: any) => (
                        <tr 
                          key={endpoint.id} 
                          className="border-b hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                          onClick={() => router.push(`/dashboard/x402/endpoints/${endpoint.id}`)}
                        >
                          <td className="p-3">
                            <div>
                              <div className="font-medium">{endpoint.name}</div>
                              <div className="text-sm text-gray-500">
                                {endpoint.method} {endpoint.path}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-mono">
                              {parseFloat(endpoint.basePrice).toFixed(4)} {endpoint.currency}
                            </span>
                          </td>
                          <td className="p-3">{endpoint.totalCalls?.toLocaleString() || 0}</td>
                          <td className="p-3">
                            <span className="font-medium">
                              ${parseFloat(endpoint.totalRevenue || '0').toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge variant={endpoint.status === 'active' ? 'default' : 'secondary'}>
                              {endpoint.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/x402/endpoints/${endpoint.id}`);
                              }}
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => router.push('/dashboard/x402/analytics')}>
              <CardHeader>
                <CardTitle className="text-lg">View Analytics</CardTitle>
                <CardDescription>
                  Detailed revenue charts and performance metrics
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => router.push('/dashboard/x402/endpoints')}>
              <CardHeader>
                <CardTitle className="text-lg">Manage Endpoints</CardTitle>
                <CardDescription>
                  Configure pricing, webhooks, and volume discounts
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => router.push('/dashboard/x402/integration')}>
              <CardHeader>
                <CardTitle className="text-lg">Integration Guide</CardTitle>
                <CardDescription>
                  SDKs, code samples, and API documentation
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      )}

      {/* Consumer View */}
      {viewMode === 'consumer' && (
        <div className="space-y-6">
          {/* Consumer Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Spent"
              value={`$${payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0).toFixed(2)}`}
              subtitle="All x402 payments"
              icon={<DollarSign className="h-5 w-5" />}
            />
            <StatCard
              title="API Calls Made"
              value={payments.length.toString()}
              subtitle="Last 30 days"
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <StatCard
              title="Unique Endpoints"
              value={new Set(payments.map((p: any) => p.x402Metadata?.endpointId)).size.toString()}
              subtitle="APIs you're using"
              icon={<Zap className="h-5 w-5" />}
            />
          </div>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                Your x402 payments for API calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <TableSkeleton rows={5} columns={5} />
              ) : payments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No payments yet</p>
                  <p className="text-sm mt-1">Payments will appear here when you use x402-enabled APIs</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Endpoint</th>
                        <th className="text-left p-3 font-medium">Amount</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-right p-3 font-medium">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment: any) => (
                        <tr 
                          key={payment.id} 
                          className="border-b hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                          onClick={() => router.push(`/dashboard/transfers/${payment.id}`)}
                        >
                          <td className="p-3">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <div>
                              <div className="font-medium">
                                {payment.x402Metadata?.endpoint_path || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {payment.x402Metadata?.endpoint_method || 'GET'}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-mono">
                              {parseFloat(payment.amount).toFixed(4)} {payment.currency}
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                              {payment.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/dashboard/transfers/${payment.id}`);
                              }}
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

