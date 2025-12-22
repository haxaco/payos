'use client';

/**
 * x402 Endpoint Detail Page
 * 
 * Detailed view of a specific x402 endpoint with analytics, configuration, and transaction history.
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/lib/api-client';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Badge,
  Button,
  StatCard,
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger
} from '@payos/ui';
import { TableSkeleton } from '@/components/ui/skeletons';
import { 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  Users, 
  Settings, 
  Code,
  Webhook,
  ArrowLeft,
  Copy,
  CheckCircle2 
} from 'lucide-react';

export default function X402EndpointDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const api = useApiClient();
  const endpointId = params.id as string;
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch endpoint details
  const { data: endpointData, isLoading: endpointLoading } = useQuery({
    queryKey: ['x402', 'endpoint', endpointId],
    queryFn: () => api!.x402Endpoints.get(endpointId),
    enabled: !!api,
  });

  // Fetch endpoint analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['x402', 'analytics', 'endpoint', endpointId],
    queryFn: () => api!.x402Analytics.getEndpointAnalytics(endpointId),
    enabled: !!api,
  });

  // Fetch endpoint transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['x402', 'endpoint', endpointId, 'transactions'],
    queryFn: () => api!.transfers.list({ type: 'x402', endpointId, limit: 20 }),
    enabled: !!api,
  });

  const endpoint = endpointData;
  const analytics = analyticsData;
  const transactions = transactionsData?.data || [];

  // Generate SDK code samples
  const providerSdkSample = `import { X402Provider } from '@payos/x402-provider-sdk';

const provider = new X402Provider({
  apiUrl: 'https://api.payos.com',
  auth: 'your-api-key',
  accountId: 'your-account-id'
});

// Register this endpoint
await provider.registerEndpoint('${endpoint?.path || '/api/endpoint'}', '${endpoint?.method || 'GET'}', {
  name: '${endpoint?.name || 'My API'}',
  basePrice: ${endpoint?.basePrice || '0.001'},
  currency: '${endpoint?.currency || 'USDC'}'
});

// Add middleware to your API
app.use('${endpoint?.path || '/api/endpoint'}', provider.middleware());
`;

  const consumerSdkSample = `import { X402Client } from '@payos/x402-client-sdk';

const client = new X402Client({
  apiUrl: 'https://api.payos.com',
  walletId: 'your-wallet-id',
  auth: 'your-api-key',
  debug: true
});

// Make a request (payment handled automatically)
const response = await client.fetch('https://your-api.com${endpoint?.path || '/api/endpoint'}', {
  autoRetry: true,
  onPayment: (payment) => {
    console.log('Payment processed:', payment);
  }
});
`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (endpointLoading) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto">
        <TableSkeleton rows={8} columns={2} />
      </div>
    );
  }

  if (!endpoint) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto text-center">
        <p className="text-gray-500">Endpoint not found</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/x402')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{endpoint.name}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {endpoint.method} {endpoint.path}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={endpoint.status === 'active' ? 'default' : 'secondary'}>
            {endpoint.status}
          </Badge>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Analytics Stats */}
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
            title="Revenue"
            value={`$${analytics?.metrics?.revenue?.toFixed(2) || '0.00'}`}
            subtitle={`Net: $${analytics?.metrics?.netRevenue?.toFixed(2) || '0.00'}`}
            icon={<DollarSign className="h-5 w-5" />}
            trend={analytics?.metrics?.revenue > 0 ? 'up' : undefined}
          />
          <StatCard
            title="API Calls"
            value={analytics?.metrics?.calls?.toLocaleString() || '0'}
            subtitle={`${analytics?.metrics?.successRate?.toFixed(1) || '0'}% success`}
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <StatCard
            title="Unique Payers"
            value={analytics?.metrics?.uniquePayers?.toString() || '0'}
            subtitle="Consumers"
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="Avg Call Value"
            value={`$${analytics?.metrics?.averageCallValue?.toFixed(4) || '0.0000'}`}
            subtitle={`${endpoint.currency}`}
            icon={<TrendingUp className="h-5 w-5" />}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Endpoint Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>Endpoint settings and pricing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Base Price</span>
                  <p className="font-medium font-mono">
                    {parseFloat(endpoint.basePrice).toFixed(4)} {endpoint.currency}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Method</span>
                  <p className="font-medium">{endpoint.method}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Path</span>
                  <p className="font-medium font-mono">{endpoint.path}</p>
                </div>
                {endpoint.description && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Description</span>
                    <p className="text-sm">{endpoint.description}</p>
                  </div>
                )}
                {endpoint.webhookUrl && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Webhook className="h-4 w-4" />
                      Webhook URL
                    </span>
                    <p className="text-sm font-mono break-all">{endpoint.webhookUrl}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Gross Revenue</span>
                  <span className="font-medium">${analytics?.metrics?.revenue?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Platform Fees</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -${analytics?.metrics?.fees?.toFixed(2) || '0.00'}
                  </span>
                </div>
                <div className="h-px bg-gray-200 dark:bg-gray-800" />
                <div className="flex items-center justify-between">
                  <span className="font-medium">Net Revenue</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    ${analytics?.metrics?.netRevenue?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                Payment history for this endpoint
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <TableSkeleton rows={5} columns={5} />
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">From</th>
                        <th className="text-right p-3 font-medium">Amount</th>
                        <th className="text-right p-3 font-medium">Fee</th>
                        <th className="text-left p-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx: any) => (
                        <tr 
                          key={tx.id} 
                          className="border-b hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                          onClick={() => router.push(`/dashboard/transfers/${tx.id}`)}
                        >
                          <td className="p-3 text-sm">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3 text-sm font-mono">
                            {tx.fromAccountId.slice(0, 8)}...
                          </td>
                          <td className="p-3 text-right font-medium">
                            {parseFloat(tx.amount).toFixed(4)} {tx.currency}
                          </td>
                          <td className="p-3 text-right text-sm text-red-600 dark:text-red-400">
                            -{parseFloat(tx.feeAmount || '0').toFixed(4)}
                          </td>
                          <td className="p-3">
                            <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                              {tx.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Tab */}
        <TabsContent value="integration" className="space-y-6">
          {/* Provider SDK */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Provider SDK Integration</CardTitle>
                <CardDescription>
                  Add x402 payment middleware to your API
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(providerSdkSample)}
              >
                {copiedCode ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto">
                <code className="text-sm">{providerSdkSample}</code>
              </pre>
            </CardContent>
          </Card>

          {/* Consumer SDK */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Consumer SDK Integration</CardTitle>
                <CardDescription>
                  Call this endpoint with automatic payment handling
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(consumerSdkSample)}
              >
                {copiedCode ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto">
                <code className="text-sm">{consumerSdkSample}</code>
              </pre>
            </CardContent>
          </Card>

          {/* Installation */}
          <Card>
            <CardHeader>
              <CardTitle>Installation</CardTitle>
              <CardDescription>Install the x402 SDKs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Provider SDK:</p>
                <pre className="p-3 bg-gray-100 dark:bg-gray-900 rounded">
                  <code className="text-sm">npm install @payos/x402-provider-sdk</code>
                </pre>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Consumer SDK:</p>
                <pre className="p-3 bg-gray-100 dark:bg-gray-900 rounded">
                  <code className="text-sm">npm install @payos/x402-client-sdk</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

