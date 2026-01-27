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
    Link2,
    Mail,
    Calendar,
    Unlink,
    Building,
} from 'lucide-react';
import { format } from 'date-fns';
import { ScopesList, type UCPScope } from './scope-badge';

export interface LinkedAccount {
    id: string;
    platform_id: string;
    platform_name: string;
    buyer_id: string;
    buyer_email?: string;
    scopes: UCPScope[];
    linked_at: string;
    last_used_at?: string;
    status: 'active' | 'revoked';
}

interface LinkedAccountCardProps {
    account: LinkedAccount;
    onUnlink?: (platformId: string, buyerId: string) => void;
}

export function LinkedAccountCard({ account, onUnlink }: LinkedAccountCardProps) {
    return (
        <Card className={account.status === 'revoked' ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <Building className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <CardTitle className="text-base">{account.platform_name}</CardTitle>
                            <Badge
                                variant={account.status === 'active' ? 'default' : 'secondary'}
                                className={`mt-1 ${account.status === 'active' ? 'bg-green-100 text-green-800' : ''}`}
                            >
                                <Link2 className="h-3 w-3 mr-1" />
                                {account.status === 'active' ? 'Linked' : 'Revoked'}
                            </Badge>
                        </div>
                    </div>
                    {account.status === 'active' && onUnlink && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onUnlink(account.platform_id, account.buyer_id)}
                            className="text-muted-foreground hover:text-destructive"
                        >
                            <Unlink className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Buyer Info */}
                {account.buyer_email && (
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Buyer Email</div>
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{account.buyer_email}</span>
                        </div>
                    </div>
                )}

                {/* Scopes Granted */}
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Scopes Granted</div>
                    <ScopesList scopes={account.scopes} maxDisplay={4} />
                </div>

                {/* Timestamps */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Linked {format(new Date(account.linked_at), 'MMM d, yyyy')}
                    </div>
                    {account.last_used_at && (
                        <div>
                            Last used {format(new Date(account.last_used_at), 'MMM d')}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
