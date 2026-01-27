'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@sly/ui';
import {
    Key,
    Link2,
    Plus,
    Users,
    RefreshCw,
} from 'lucide-react';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import Link from 'next/link';
import { OAuthClientCard, type OAuthClient } from '@/components/ucp/oauth-client-card';
import { LinkedAccountCard, type LinkedAccount } from '@/components/ucp/linked-account-card';
import { toast } from 'sonner';

export default function IdentityPage() {
    const api = useApiClient();
    const queryClient = useQueryClient();
    const { isLoading: isAuthLoading } = useApiConfig();
    const [activeTab, setActiveTab] = useState<'clients' | 'linked'>('clients');

    // Fetch OAuth clients
    const { data: clientsData, isLoading: isLoadingClients, refetch: refetchClients } = useQuery({
        queryKey: ['ucp-oauth-clients'],
        queryFn: async () => {
            if (!api) return { data: [] };
            const result = await api.ucp.identity.listClients();
            // Ensure data is always an array
            return { data: Array.isArray(result?.data) ? result.data : [] };
        },
        enabled: !!api
    });

    // Note: Linked accounts listing requires buyer_id or platform_id filter
    // For now, show empty state with explanation - full listing not yet supported
    const { data: linkedData, isLoading: isLoadingLinked, refetch: refetchLinked } = useQuery({
        queryKey: ['ucp-linked-accounts'],
        queryFn: async () => {
            // Backend requires buyer_id or platform_id - return empty for dashboard view
            return { data: [] };
        },
        enabled: !!api
    });

    // Deactivate client mutation
    const deactivateMutation = useMutation({
        mutationFn: async (clientId: string) => {
            if (!api) throw new Error("API not initialized");
            return api.ucp.identity.deactivateClient(clientId);
        },
        onSuccess: () => {
            toast.success('OAuth client deactivated');
            queryClient.invalidateQueries({ queryKey: ['ucp-oauth-clients'] });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to deactivate client');
        },
    });

    // Unlink account mutation
    const unlinkMutation = useMutation({
        mutationFn: async ({ platformId, buyerId }: { platformId: string; buyerId: string }) => {
            if (!api) throw new Error("API not initialized");
            return api.ucp.identity.unlinkAccount(platformId, buyerId);
        },
        onSuccess: () => {
            toast.success('Account unlinked');
            queryClient.invalidateQueries({ queryKey: ['ucp-linked-accounts'] });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to unlink account');
        },
    });

    const clients: OAuthClient[] = clientsData?.data || [];
    const linkedAccounts: LinkedAccount[] = linkedData?.data || [];

    if (isAuthLoading) {
        return (
            <div className="p-8 max-w-[1400px] mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Identity & OAuth</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage OAuth clients and linked buyer accounts
                        </p>
                    </div>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="h-10 w-full bg-muted animate-pulse rounded" />
                            <div className="h-48 w-full bg-muted animate-pulse rounded" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Identity & OAuth</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage OAuth clients and linked buyer accounts
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/agentic-payments/ucp/identity/clients/create">
                        <Plus className="h-4 w-4 mr-2" />
                        Register Client
                    </Link>
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'clients' | 'linked')}>
                <TabsList>
                    <TabsTrigger value="clients" className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        OAuth Clients
                        {clients.length > 0 && (
                            <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">
                                {clients.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="linked" className="flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Linked Accounts
                        {linkedAccounts.length > 0 && (
                            <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded">
                                {linkedAccounts.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="clients" className="mt-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Key className="h-5 w-5" />
                                    Registered OAuth Clients
                                </CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => refetchClients()}>
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoadingClients ? (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {[1, 2].map((i) => (
                                        <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
                                    ))}
                                </div>
                            ) : clients.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Key className="h-12 w-12 mb-4 opacity-50" />
                                    <p className="font-medium">No OAuth clients registered</p>
                                    <p className="text-sm mt-1">Register a client to enable identity linking</p>
                                    <Button asChild className="mt-4">
                                        <Link href="/dashboard/agentic-payments/ucp/identity/clients/create">
                                            <Plus className="h-4 w-4 mr-2" />
                                            Register Client
                                        </Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {clients.map((client) => (
                                        <OAuthClientCard
                                            key={client.id}
                                            client={client}
                                            onDeactivate={(id) => deactivateMutation.mutate(id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="linked" className="mt-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    Linked Buyer Accounts
                                </CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => refetchLinked()}>
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoadingLinked ? (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {[1, 2].map((i) => (
                                        <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
                                    ))}
                                </div>
                            ) : linkedAccounts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Link2 className="h-12 w-12 mb-4 opacity-50" />
                                    <p className="font-medium">No linked accounts to display</p>
                                    <p className="text-sm mt-1 text-center max-w-md">
                                        Linked accounts can be viewed by buyer ID or platform ID via the API.
                                        Use the SDK to query linked accounts for specific users.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {linkedAccounts.map((account) => (
                                        <LinkedAccountCard
                                            key={account.id}
                                            account={account}
                                            onUnlink={(platformId, buyerId) =>
                                                unlinkMutation.mutate({ platformId, buyerId })
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
