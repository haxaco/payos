import React, { useState, useEffect } from 'react';
import { Key, Plus, Copy, Check, Trash2, RotateCw, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface APIKey {
  id: string;
  name: string;
  environment: 'test' | 'live';
  prefix: string;
  description?: string;
  status: string;
  expiresAt?: string;
  lastUsedAt?: string;
  lastUsedIp?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface NewKeyResponse {
  id: string;
  name: string;
  environment: 'test' | 'live';
  prefix: string;
  key: string;
  description?: string;
  createdAt: string;
}

export function ApiKeysManagement() {
  const { accessToken, user } = useAuth();
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create key modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnvironment, setNewKeyEnvironment] = useState<'test' | 'live'>('test');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Key display modal state
  const [keyDisplayModalOpen, setKeyDisplayModalOpen] = useState(false);
  const [displayedKey, setDisplayedKey] = useState<NewKeyResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  
  // Revoke modal state
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<APIKey | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/v1/api-keys`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load API keys');
      }

      const data = await response.json();
      setKeys(data.apiKeys || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      const response = await fetch(`${API_URL}/v1/api-keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newKeyName,
          environment: newKeyEnvironment,
          description: newKeyDescription,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create API key');
      }

      const data = await response.json();
      setDisplayedKey(data.apiKey);
      setCreateModalOpen(false);
      setKeyDisplayModalOpen(true);
      
      // Reset form
      setNewKeyName('');
      setNewKeyDescription('');
      setNewKeyEnvironment('test');
      
      // Reload keys
      loadKeys();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create API key');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleRevokeKey() {
    if (!keyToRevoke) return;
    
    setRevokeLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/v1/api-keys/${keyToRevoke.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke key');
      }

      setRevokeModalOpen(false);
      setKeyToRevoke(null);
      loadKeys();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke key');
    } finally {
      setRevokeLoading(false);
    }
  }

  async function handleRotateKey(keyId: string) {
    try {
      const response = await fetch(`${API_URL}/v1/api-keys/${keyId}/rotate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rotate key');
      }

      const data = await response.json();
      setDisplayedKey(data.newApiKey);
      setKeyDisplayModalOpen(true);
      loadKeys();
    } catch (err: any) {
      alert(err.message || 'Failed to rotate key');
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  const testKeys = keys.filter(k => k.environment === 'test');
  const liveKeys = keys.filter(k => k.environment === 'live');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  function KeysTable({ keys: envKeys }: { keys: APIKey[] }) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                Name
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                Key Prefix
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                Status
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                Last Used
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {envKeys.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  No API keys found. Create one to get started.
                </td>
              </tr>
            ) : (
              envKeys.map((key) => (
                <tr key={key.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{key.name}</p>
                      {key.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{key.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                      {key.prefix}...
                    </code>
                  </td>
                  <td className="py-4 px-4">
                    <Badge
                      variant={
                        key.status === 'active' ? 'default' :
                        key.status === 'grace_period' ? 'secondary' :
                        'outline'
                      }
                      className="capitalize"
                    >
                      {key.status === 'grace_period' ? 'Grace Period' : key.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                    {key.lastUsedAt ? (
                      <div>
                        <p>{new Date(key.lastUsedAt).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">{key.lastUsedIp || 'Unknown IP'}</p>
                      </div>
                    ) : (
                      'Never'
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRotateKey(key.id)}
                        disabled={key.status !== 'active'}
                        title="Rotate key"
                      >
                        <RotateCw className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setKeyToRevoke(key);
                          setRevokeModalOpen(true);
                        }}
                        disabled={key.status === 'revoked'}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage your API keys for programmatic access
              </CardDescription>
            </div>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="test" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="test">
                Test ({testKeys.length})
              </TabsTrigger>
              <TabsTrigger value="live">
                Live ({liveKeys.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="test" className="mt-6">
              <KeysTable keys={testKeys} />
            </TabsContent>
            <TabsContent value="live" className="mt-6">
              <KeysTable keys={liveKeys} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Key Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for programmatic access
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateKey}>
            <div className="space-y-4 py-4">
              {createError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="keyName">Key Name *</Label>
                <Input
                  id="keyName"
                  placeholder="Production Backend"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                  disabled={createLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="environment">Environment *</Label>
                <Select
                  value={newKeyEnvironment}
                  onValueChange={(value: any) => setNewKeyEnvironment(value)}
                  disabled={createLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">Test - For development and testing</SelectItem>
                    <SelectItem value="live">Live - For production transactions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of what this key is used for"
                  value={newKeyDescription}
                  onChange={(e) => setNewKeyDescription(e.target.value)}
                  disabled={createLoading}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                disabled={createLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {createLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Key'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Key Display Modal (shows key once) */}
      <Dialog open={keyDisplayModalOpen} onOpenChange={setKeyDisplayModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              API Key Created Successfully
            </DialogTitle>
            <DialogDescription>
              This key will only be shown once. Please copy and save it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> Store this key securely. You won't be able to see it again.
              </AlertDescription>
            </Alert>

            {displayedKey && (
              <>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      value={displayedKey.key}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(displayedKey.key)}
                    >
                      {copiedKey ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">{displayedKey.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Environment</p>
                    <Badge className="mt-1 capitalize">{displayedKey.environment}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Prefix</p>
                    <code className="text-sm font-mono">{displayedKey.prefix}</code>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
                    <p className="text-sm">{new Date(displayedKey.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setKeyDisplayModalOpen(false);
                setDisplayedKey(null);
                setCopiedKey(false);
              }}
              className="w-full"
            >
              I've saved this key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Modal */}
      <Dialog open={revokeModalOpen} onOpenChange={setRevokeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke "{keyToRevoke?.name}"? This will immediately invalidate the key.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Any applications using this key will lose access immediately. This action cannot be undone.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeModalOpen(false)}
              disabled={revokeLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeKey}
              disabled={revokeLoading}
            >
              {revokeLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Revoke Key
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

