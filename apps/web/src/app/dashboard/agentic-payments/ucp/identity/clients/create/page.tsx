'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    Button,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Checkbox,
    Alert,
    AlertDescription,
    AlertTitle,
} from '@sly/ui';
import {
    ArrowLeft,
    Key,
    Plus,
    X,
    Copy,
    AlertTriangle,
    CheckCircle2,
    Shield,
} from 'lucide-react';
import { useApiClient } from '@/lib/api-client';
import Link from 'next/link';
import { toast } from 'sonner';
import { type UCPScope } from '@/components/ucp/scope-badge';

const AVAILABLE_SCOPES: { value: UCPScope; label: string; description: string }[] = [
    { value: 'profile.read', label: 'Profile Read', description: 'Read buyer profile information' },
    { value: 'profile.write', label: 'Profile Write', description: 'Modify buyer profile information' },
    { value: 'addresses.read', label: 'Addresses Read', description: 'Read saved addresses' },
    { value: 'addresses.write', label: 'Addresses Write', description: 'Add and update addresses' },
    { value: 'payment_methods.read', label: 'Payment Methods Read', description: 'View saved payment methods' },
    { value: 'payment_methods.write', label: 'Payment Methods Write', description: 'Add or remove payment methods' },
    { value: 'orders.read', label: 'Orders Read', description: 'View order history' },
    { value: 'checkout.create', label: 'Checkout Create', description: 'Create checkouts on your behalf' },
    { value: 'checkout.complete', label: 'Checkout Complete', description: 'Complete purchases on your behalf' },
];

interface CreatedClient {
    id: string;
    client_id: string;
    client_secret: string;
    name: string;
}

export default function CreateOAuthClientPage() {
    const api = useApiClient();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [name, setName] = useState('');
    const [clientType, setClientType] = useState<'confidential' | 'public'>('confidential');
    const [redirectUris, setRedirectUris] = useState<string[]>(['']);
    const [selectedScopes, setSelectedScopes] = useState<UCPScope[]>([]);
    const [createdClient, setCreatedClient] = useState<CreatedClient | null>(null);
    const [secretCopied, setSecretCopied] = useState(false);

    const createMutation = useMutation({
        mutationFn: async () => {
            if (!api) throw new Error("API not initialized");
            const validUris = redirectUris.filter(uri => uri.trim() !== '');
            if (validUris.length === 0) {
                throw new Error("At least one redirect URI is required");
            }
            if (selectedScopes.length === 0) {
                throw new Error("At least one scope is required");
            }
            return api.ucp.identity.registerClient({
                name,
                client_type: clientType,
                redirect_uris: validUris,
                allowed_scopes: selectedScopes,
            });
        },
        onSuccess: (response: any) => {
            // API response is wrapped: { success, data: { client, client_secret }, meta }
            // Extract the actual data
            const payload = response.data || response;
            const client = payload.client || payload;
            const created: CreatedClient = {
                id: client.id || '',
                client_id: client.client_id || '',
                client_secret: payload.client_secret || '',
                name: client.name || '',
            };
            setCreatedClient(created);
            toast.success('OAuth client registered successfully');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to register client');
        },
    });

    const addRedirectUri = () => {
        setRedirectUris([...redirectUris, '']);
    };

    const removeRedirectUri = (index: number) => {
        if (redirectUris.length > 1) {
            setRedirectUris(redirectUris.filter((_, i) => i !== index));
        }
    };

    const updateRedirectUri = (index: number, value: string) => {
        const newUris = [...redirectUris];
        newUris[index] = value;
        setRedirectUris(newUris);
    };

    const toggleScope = (scope: UCPScope) => {
        if (selectedScopes.includes(scope)) {
            setSelectedScopes(selectedScopes.filter(s => s !== scope));
        } else {
            setSelectedScopes([...selectedScopes, scope]);
        }
    };

    const copySecret = () => {
        if (createdClient?.client_secret) {
            navigator.clipboard.writeText(createdClient.client_secret);
            setSecretCopied(true);
            toast.success('Client secret copied to clipboard');
        }
    };

    const copyClientId = () => {
        if (createdClient?.client_id) {
            navigator.clipboard.writeText(createdClient.client_id);
            toast.success('Client ID copied to clipboard');
        }
    };

    // Show success screen after creation
    if (createdClient) {
        return (
            <div className="p-8 max-w-[800px] mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Client Registered!</h1>
                        <p className="text-muted-foreground">
                            Your OAuth client has been created successfully
                        </p>
                    </div>
                </div>

                <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 [&>svg]:text-amber-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Save your client secret now!</AlertTitle>
                    <AlertDescription className="text-amber-600/90 dark:text-amber-400/90">
                        The client secret will only be shown once. Make sure to copy and store it securely.
                        You will not be able to retrieve it later.
                    </AlertDescription>
                </Alert>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5" />
                            {createdClient.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Client ID */}
                        <div>
                            <Label>Client ID</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 p-3 bg-muted rounded text-sm font-mono">
                                    {createdClient.client_id}
                                </code>
                                <Button variant="outline" size="icon" onClick={copyClientId}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Client Secret */}
                        <div>
                            <Label className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-amber-500" />
                                Client Secret (copy now!)
                            </Label>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-sm font-mono break-all">
                                    {createdClient.client_secret}
                                </code>
                                <Button
                                    variant={secretCopied ? "default" : "outline"}
                                    size="icon"
                                    onClick={copySecret}
                                    className={secretCopied ? "bg-green-600 hover:bg-green-700" : ""}
                                >
                                    {secretCopied ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="pt-4 border-t flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    queryClient.invalidateQueries({ queryKey: ['ucp-oauth-clients'] });
                                    router.push('/dashboard/agentic-payments/ucp/identity');
                                }}
                            >
                                View All Clients
                            </Button>
                            <Button
                                onClick={() => {
                                    setCreatedClient(null);
                                    setName('');
                                    setRedirectUris(['']);
                                    setSelectedScopes([]);
                                    setSecretCopied(false);
                                }}
                            >
                                Register Another
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[800px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/agentic-payments/ucp/identity">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Register OAuth Client</h1>
                    <p className="text-muted-foreground">
                        Create a new OAuth client for identity linking
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Client Configuration</CardTitle>
                    <CardDescription>
                        Configure the OAuth client settings for your application
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Client Name</Label>
                        <Input
                            id="name"
                            placeholder="My Application"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            A friendly name to identify this client
                        </p>
                    </div>

                    {/* Client Type */}
                    <div className="space-y-2">
                        <Label htmlFor="clientType">Client Type</Label>
                        <Select value={clientType} onValueChange={(v) => setClientType(v as 'confidential' | 'public')}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="confidential">
                                    Confidential (Server-side apps)
                                </SelectItem>
                                <SelectItem value="public">
                                    Public (Mobile/SPA apps)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {clientType === 'confidential'
                                ? 'For server-side applications that can securely store credentials'
                                : 'For mobile apps or SPAs that cannot securely store credentials'
                            }
                        </p>
                    </div>

                    {/* Redirect URIs */}
                    <div className="space-y-2">
                        <Label>Redirect URIs</Label>
                        <div className="space-y-2">
                            {redirectUris.map((uri, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input
                                        placeholder="https://myapp.com/callback"
                                        value={uri}
                                        onChange={(e) => updateRedirectUri(index, e.target.value)}
                                    />
                                    {redirectUris.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeRedirectUri(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={addRedirectUri}
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add URI
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Allowed callback URLs for OAuth redirects
                        </p>
                    </div>

                    {/* Scopes */}
                    <div className="space-y-2">
                        <Label>Allowed Scopes</Label>
                        <div className="grid gap-3 md:grid-cols-2">
                            {AVAILABLE_SCOPES.map((scope) => (
                                <div
                                    key={scope.value}
                                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                        selectedScopes.includes(scope.value)
                                            ? 'border-primary bg-primary/5'
                                            : 'hover:bg-muted/50'
                                    }`}
                                    onClick={() => toggleScope(scope.value)}
                                >
                                    <Checkbox
                                        checked={selectedScopes.includes(scope.value)}
                                        onCheckedChange={() => toggleScope(scope.value)}
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">{scope.label}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {scope.description}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t flex justify-end gap-3">
                        <Button variant="outline" asChild>
                            <Link href="/dashboard/agentic-payments/ucp/identity">
                                Cancel
                            </Link>
                        </Button>
                        <Button
                            onClick={() => createMutation.mutate()}
                            disabled={!name || selectedScopes.length === 0 || createMutation.isPending}
                        >
                            {createMutation.isPending ? (
                                <>Creating...</>
                            ) : (
                                <>
                                    <Key className="h-4 w-4 mr-2" />
                                    Register Client
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
