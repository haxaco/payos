'use client';

/**
 * x402 Endpoints List Page
 * 
 * Manage all x402 endpoints - view, edit, create, and delete.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input
} from '@payos/ui';
import { TableSkeleton } from '@/components/ui/skeletons';
import {
  Plus,
  Search,
  ArrowUpRight,
  Zap,
  DollarSign,
  BarChart3,
  Filter
} from 'lucide-react';

export default function X402EndpointsPage() {
  const api = useApiClient();
  const { isConfigured, isLoading: isAuthLoading } = useApiConfig();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Fetch endpoints
  const { data: endpointsData, isLoading } = useQuery({
    queryKey: ['x402', 'endpoints'],
    queryFn: () => api!.x402Endpoints.list(),
    enabled: !!api,
  });

  const rawData = (endpointsData as any)?.data;
  const endpoints = Array.isArray(rawData)
    ? rawData
    : (Array.isArray((rawData as any)?.data)
      ? (rawData as any).data
      : []);

  // Filter endpoints
  const filteredEndpoints = endpoints.filter((endpoint: any) => {
    const matchesSearch = searchTerm === '' ||
      endpoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      endpoint.path.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || endpoint.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isAuthLoading) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">x402 Endpoints</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage your monetized API endpoints
            </p>
          </div>
        </div>
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">x402 Endpoints</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your monetized API endpoints
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/x402/endpoints/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Endpoint
        </Button>
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Endpoints</p>
                  <p className="text-2xl font-bold mt-1">{endpoints.length}</p>
                </div>
                <Zap className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">
                    {endpoints.filter((e: any) => e.status === 'active').length}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold mt-1">
                    ${endpoints.reduce((sum: number, e: any) => sum + parseFloat(e.totalRevenue || '0'), 0).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Calls</p>
                  <p className="text-2xl font-bold mt-1">
                    {endpoints.reduce((sum: number, e: any) => sum + (e.totalCalls || 0), 0).toLocaleString()}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search endpoints by name or path..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('active')}
                size="sm"
              >
                Active
              </Button>
              <Button
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('inactive')}
                size="sm"
              >
                Inactive
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Endpoints</CardTitle>
          <CardDescription>
            {filteredEndpoints.length} endpoint{filteredEndpoints.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : filteredEndpoints.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Zap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              {searchTerm || statusFilter !== 'all' ? (
                <>
                  <p>No endpoints match your filters</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <p>No x402 endpoints yet</p>
                  <p className="text-sm mt-1">Create your first monetized API endpoint</p>
                  <Button
                    className="mt-4"
                    onClick={() => router.push('/dashboard/x402/endpoints/new')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Endpoint
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Endpoint</th>
                    <th className="text-left p-3 font-medium">Price</th>
                    <th className="text-right p-3 font-medium">Calls</th>
                    <th className="text-right p-3 font-medium">Revenue</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEndpoints.map((endpoint: any) => (
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
                        <span className="font-mono text-sm">
                          {parseFloat(endpoint.basePrice).toFixed(4)} {endpoint.currency}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium">
                        {endpoint.totalCalls?.toLocaleString() || 0}
                      </td>
                      <td className="p-3 text-right">
                        <span className="font-medium text-green-600 dark:text-green-400">
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
    </div>
  );
}
