'use client';

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
    Badge,
} from '@sly/ui';
import {
    Key,
    Globe,
    Copy,
    Power,
    ExternalLink,
    Shield,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ScopesList, type UCPScope } from './scope-badge';

export interface OAuthClient {
    id: string;
    name: string;
    client_id: string;
    client_type: 'confidential' | 'public';
    redirect_uris: string[];
    allowed_scopes: UCPScope[];
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

interface OAuthClientCardProps {
    client: OAuthClient;
    onDeactivate?: (id: string) => void;
}

export function OAuthClientCard({ client, onDeactivate }: OAuthClientCardProps) {
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    return (
        <Card className={!client.is_active ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Key className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">{client.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge
                                    variant={client.is_active ? 'default' : 'secondary'}
                                    className={client.is_active ? 'bg-green-100 text-green-800' : ''}
                                >
                                    {client.is_active ? 'active' : 'inactive'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    <Shield className="h-3 w-3 mr-1" />
                                    {client.client_type}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    {client.is_active && onDeactivate && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeactivate(client.client_id)}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <Power className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Client ID */}
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Client ID</div>
                    <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                            {client.client_id}
                        </code>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(client.client_id, 'Client ID')}
                        >
                            <Copy className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                {/* Scopes */}
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Scopes</div>
                    <ScopesList scopes={client.allowed_scopes || []} maxDisplay={4} />
                </div>

                {/* Redirect URIs */}
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Redirect URIs</div>
                    <div className="space-y-1">
                        {client.redirect_uris.slice(0, 2).map((uri, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                                <Globe className="h-3 w-3" />
                                <span className="truncate max-w-[250px]">{uri}</span>
                            </div>
                        ))}
                        {client.redirect_uris.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                                +{client.redirect_uris.length - 2} more
                            </span>
                        )}
                    </div>
                </div>

                {/* Created */}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                    Created {format(new Date(client.created_at), 'MMM d, yyyy')}
                </div>
            </CardContent>
        </Card>
    );
}
