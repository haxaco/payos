'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Badge,
} from '@sly/ui';
import { useApiConfig, useApiFetch } from '@/lib/api-client';
import { useEnvironment } from '@/lib/environment-context';
import { Key, Plus, Copy, Check, Trash2, RotateCcw, Eye, EyeOff, AlertTriangle, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { ScannerKeysSection } from '@/components/api-keys/scanner-keys-section';

interface ApiKeyRecord {
  id: string;
  name: string;
  description: string | null;
  environment: 'test' | 'live';
  prefix: string;
  status: 'active' | 'revoked';
  createdAt: string;
  lastUsedAt: string | null;
}

// The API can return ISO strings; never render "Invalid Date".
function fmtDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
}

export default function ApiKeysPage() {
  const { authToken, isConfigured, isLoading, apiUrl } = useApiConfig();
  const { apiEnvironment } = useEnvironment();
  const apiFetch = useApiFetch();

  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await apiFetch(`${apiUrl}/v1/api-keys`);
      const json = await res.json();
      // The API returns { apiKeys: [...] }; the response-wrapper nests that
      // under `data` ({ success, data: { apiKeys: [...] }, meta }). Be robust
      // to wrapped/flat and to the apiKeys-vs-data key so the list isn't
      // silently empty.
      const payload = json?.data ?? json;
      const list = Array.isArray(payload)
        ? payload
        : payload?.apiKeys ?? payload?.data ?? [];
      setKeys(Array.isArray(list) ? list : []);
    } catch {
      // Non-fatal
    }
    setLoading(false);
  }, [authToken, apiFetch, apiUrl]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async (env: 'test' | 'live') => {
    setCreating(true);
    try {
      const res = await apiFetch(`${apiUrl}/v1/api-keys`, {
        method: 'POST',
        body: JSON.stringify({
          name: newKeyName.trim() || `${env === 'test' ? 'Sandbox' : 'Production'} Key`,
          environment: env,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        // Structured errors return `error` as an object {code,message,...};
        // legacy ones as a string. Never toast "[object Object]".
        const msg =
          typeof json?.error === 'string'
            ? json.error
            : json?.error?.message || json?.message || 'Failed to create key';
        toast.error(msg);
        setCreating(false);
        return;
      }
      // Backend returns { apiKey: { ...fields, key }, warning }; the
      // response-wrapper nests it under `data`. The one-time secret is at
      // payload.apiKey.key — reading payload.key left it undefined so the
      // "save your key" panel never rendered and the secret was lost.
      const payload = json?.data ?? json;
      const created = payload?.apiKey ?? payload?.data ?? payload;
      const secret = created?.key ?? null;
      if (!secret) {
        toast.error('Key created but the secret was not returned — check the API keys list and recreate if needed.');
      }
      setNewlyCreatedKey(secret);
      setShowCreateForm(false);
      setNewKeyName('');
      toast.success(`${env === 'test' ? 'Sandbox' : 'Production'} API key created`);
      await fetchKeys();
    } catch {
      toast.error('Failed to create key');
    }
    setCreating(false);
  };

  const handleRevoke = async (id: string) => {
    try {
      // Backend route is DELETE /v1/api-keys/:id (there is no POST
      // /:id/revoke — that 404'd and surfaced as "Failed to revoke key").
      const res = await apiFetch(`${apiUrl}/v1/api-keys/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        let msg = 'Failed to revoke key';
        try {
          const j = await res.json();
          msg = typeof j?.error === 'string' ? j.error : j?.error?.message || msg;
        } catch { /* keep default */ }
        toast.error(msg);
        return;
      }
      toast.success('API key revoked');
      await fetchKeys();
    } catch {
      toast.error('Failed to revoke key');
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeKeys = keys.filter(k => k.status === 'active');
  const revokedKeys = keys.filter(k => k.status === 'revoked');

  if (isLoading || loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage API keys for programmatic access to Sly
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Key
        </Button>
      </div>

      {/* Newly created key banner */}
      {newlyCreatedKey && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Save your API key now — it won&apos;t be shown again
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-amber-100 dark:bg-amber-900/40 rounded px-3 py-2 text-xs font-mono text-amber-900 dark:text-amber-100 break-all">
                    {newlyCreatedKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(newlyCreatedKey, 'new')}
                  >
                    {copiedId === 'new' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-amber-700 dark:text-amber-300"
                  onClick={() => setNewlyCreatedKey(null)}
                >
                  I&apos;ve saved it, dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create New API Key</CardTitle>
            <CardDescription>Generate a new key for programmatic access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">Key Name (optional)</Label>
              <Input
                id="keyName"
                placeholder="e.g. CI/CD Pipeline, MCP Server"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => handleCreate('test')}
                disabled={creating}
                variant="outline"
                className="flex-1"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                Create Sandbox Key
              </Button>
              <Button
                onClick={() => handleCreate('live')}
                disabled={creating}
                className="flex-1"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                Create Production Key
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5" />
            Active Keys
          </CardTitle>
          <CardDescription>
            {activeKeys.length === 0
              ? 'No active API keys. Create one to get started.'
              : `${activeKeys.length} active key${activeKeys.length !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No API keys yet. Click &quot;Create Key&quot; to generate one.
            </div>
          ) : (
            <div className="space-y-3">
              {activeKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{key.name}</span>
                        <Badge variant={key.environment === 'live' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                          {key.environment === 'live' ? 'Production' : 'Sandbox'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <code className="font-mono">{key.prefix}••••</code>
                        {fmtDate(key.createdAt) && <span>Created {fmtDate(key.createdAt)}</span>}
                        {fmtDate(key.lastUsedAt) && (
                          <span>Last used {fmtDate(key.lastUsedAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(key.prefix, key.id)}
                      title="Copy prefix"
                    >
                      {copiedId === key.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(key.id)}
                      title="Revoke key"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-muted-foreground">Revoked Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {revokedKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-dashed opacity-60"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium line-through">{key.name}</span>
                      <Badge variant="destructive" className="text-[10px]">Revoked</Badge>
                    </div>
                    <code className="text-xs font-mono text-muted-foreground">{key.prefix}••••</code>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>API keys authenticate requests from your applications, scripts, and agent integrations.</p>
          <ul className="list-disc list-inside space-y-1.5">
            <li><strong className="text-foreground">Sandbox keys</strong> (pk_test_*) — for development and testing with test data</li>
            <li><strong className="text-foreground">Production keys</strong> (pk_live_*) — for real transactions with real funds</li>
          </ul>
          <p>Keys are shown only once when created. Store them securely and never commit them to version control.</p>
        </CardContent>
      </Card>

      {/* Scanner keys (separate keyspace — pk_* won't work on scanner, and vice versa) */}
      <ScannerKeysSection />
    </div>
  );
}
