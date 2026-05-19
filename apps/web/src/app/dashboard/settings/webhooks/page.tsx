'use client';

import { useMemo, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Inbox,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Webhook as WebhookIcon,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Separator,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  formatRelativeTime,
} from '@sly/ui';
import { useApiClient, useApiConfig } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import type {
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEventType,
} from '@sly/api-client';

const QK = {
  list: ['webhooks', 'list'] as const,
  events: ['webhooks', 'events'] as const,
  stats: ['webhooks', 'stats'] as const,
  dlq: (page: number) => ['webhooks', 'dlq', page] as const,
};

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') return <Badge variant="success">Active</Badge>;
  if (status === 'disabled') return <Badge variant="secondary">Disabled</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function DeliveryStatusBadge({ status }: { status: string }) {
  if (status === 'delivered') return <Badge variant="success">Delivered</Badge>;
  if (status === 'failed') return <Badge variant="error">Failed</Badge>;
  if (status === 'dlq') return <Badge variant="warning">Dead-letter</Badge>;
  if (status === 'pending' || status === 'processing')
    return <Badge variant="secondary">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function ErrorState({
  error,
  fallback,
  onRetry,
}: {
  error: unknown;
  fallback: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <AlertCircle className="mb-3 h-10 w-10 text-destructive" />
      <p className="text-sm text-destructive">
        {getApiErrorMessage(error, fallback)}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verifying signatures helper (collapsible)
// ---------------------------------------------------------------------------

function VerifyingSignaturesNote() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-muted/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground"
      >
        Verifying signatures
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="space-y-2 px-4 pb-4 text-sm text-muted-foreground">
          <p>
            Every request includes a{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              X-PayOS-Signature: t=&lt;ts&gt;,v1=&lt;hmac&gt;
            </code>{' '}
            header.
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Derive the signing key:{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                key = sha256(secret)
              </code>
            </li>
            <li>
              Build the signed string:{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                &quot;&lt;t&gt;.&lt;rawBody&gt;&quot;
              </code>{' '}
              (timestamp from the header, then the raw request body)
            </li>
            <li>
              Compute{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                HMAC-SHA256(key, signedString)
              </code>{' '}
              and constant-time compare it against{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                v1
              </code>
              .
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create endpoint dialog (incl. one-time secret reveal)
// ---------------------------------------------------------------------------

function CreateEndpointDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  // One-time secret state — when set, the dialog locks into "save your
  // secret" mode and cannot be dismissed until acknowledged.
  const [created, setCreated] = useState<{
    secret: string;
    message?: string;
    url: string;
  } | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    data: eventTypes,
    isLoading: eventsLoading,
    isError: eventsError,
    error: eventsErr,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: QK.events,
    queryFn: () => api!.webhooks.events(),
    enabled: !!api && open,
  });

  const reset = () => {
    setUrl('');
    setName('');
    setDescription('');
    setSelectedEvents([]);
    setCreated(null);
    setAcknowledged(false);
    setCopied(false);
  };

  const create = useMutation({
    mutationFn: () =>
      api!.webhooks.create({
        url: url.trim(),
        name: name.trim() || undefined,
        description: description.trim() || undefined,
        events: selectedEvents,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: QK.list });
      queryClient.invalidateQueries({ queryKey: QK.stats });
      setCreated({
        secret: res.endpoint.secret,
        message: res.message,
        url: res.endpoint.url,
      });
      toast.success('Webhook endpoint created');
    },
    onError: (e) =>
      toast.error(getApiErrorMessage(e, 'Failed to create webhook endpoint')),
  });

  const handleOpenChange = (next: boolean) => {
    // Block dismissal while the one-time secret is still on screen and
    // unacknowledged.
    if (!next && created && !acknowledged) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const toggleEvent = (type: string) => {
    setSelectedEvents((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type],
    );
  };

  const copySecret = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.secret);
      setCopied(true);
      toast.success('Secret copied to clipboard');
    } catch {
      toast.error('Could not copy — select and copy the secret manually');
    }
  };

  const canSubmit =
    isValidHttpUrl(url.trim()) &&
    selectedEvents.length > 0 &&
    !create.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Save your signing secret</DialogTitle>
              <DialogDescription>
                This is the only time the secret will be shown. Store it
                securely — you cannot retrieve it again.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  Save this now — it won&apos;t be shown again. If you lose
                  it you&apos;ll need to recreate the endpoint.
                </span>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Endpoint URL
                </Label>
                <p className="break-all font-mono text-sm">{created.url}</p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">
                  Signing secret
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg border border-border bg-muted px-3 py-2 font-mono text-sm">
                    {created.secret}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copySecret}
                    aria-label="Copy signing secret"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {created.message && (
                <p className="text-sm text-muted-foreground">
                  {created.message}
                </p>
              )}

              <VerifyingSignaturesNote />

              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={acknowledged}
                  onCheckedChange={(v) => setAcknowledged(v === true)}
                  aria-label="Confirm secret saved"
                />
                I have copied and stored this secret securely.
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                disabled={!acknowledged}
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create webhook endpoint</DialogTitle>
              <DialogDescription>
                We&apos;ll POST event payloads to this URL and sign every
                request.
              </DialogDescription>
            </DialogHeader>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmit) create.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="wh-url">
                  Endpoint URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="wh-url"
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/webhooks/sly"
                />
                {url.trim() !== '' && !isValidHttpUrl(url.trim()) && (
                  <p className="text-xs text-destructive">
                    Enter a valid http(s) URL.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wh-name">Name</Label>
                <Input
                  id="wh-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Production payments listener"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wh-desc">Description</Label>
                <Input
                  id="wh-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes about this endpoint"
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Events <span className="text-destructive">*</span>
                </Label>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                  {eventsLoading ? (
                    <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading event types…
                    </div>
                  ) : eventsError ? (
                    <ErrorState
                      error={eventsErr}
                      fallback="Couldn't load event types"
                      onRetry={() => refetchEvents()}
                    />
                  ) : (eventTypes ?? []).length === 0 ? (
                    <p className="p-2 text-sm text-muted-foreground">
                      No event types available.
                    </p>
                  ) : (
                    (eventTypes as WebhookEventType[]).map((ev) => (
                      <label
                        key={ev.type}
                        className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-muted"
                      >
                        <Checkbox
                          checked={selectedEvents.includes(ev.type)}
                          onCheckedChange={() => toggleEvent(ev.type)}
                          aria-label={`Subscribe to ${ev.type}`}
                        />
                        <span className="min-w-0">
                          <span className="block font-mono text-sm text-foreground">
                            {ev.type}
                          </span>
                          {ev.description && (
                            <span className="block text-xs text-muted-foreground">
                              {ev.description}
                            </span>
                          )}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {selectedEvents.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedEvents.length} event
                    {selectedEvents.length === 1 ? '' : 's'} selected
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  {create.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create endpoint
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------

function DeleteEndpointDialog({
  endpoint,
  onClose,
}: {
  endpoint: WebhookEndpoint | null;
  onClose: () => void;
}) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: (id: string) => api!.webhooks.remove(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: QK.list });
      queryClient.invalidateQueries({ queryKey: QK.stats });
      toast.success(res.message ?? 'Webhook endpoint deleted');
      onClose();
    },
    onError: (e) =>
      toast.error(getApiErrorMessage(e, 'Failed to delete webhook endpoint')),
  });

  return (
    <Dialog open={!!endpoint} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete webhook endpoint?</DialogTitle>
          <DialogDescription>
            This permanently removes{' '}
            <span className="font-mono">{endpoint?.url}</span>. We&apos;ll stop
            delivering events to it. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => endpoint && remove.mutate(endpoint.id)}
          >
            {remove.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Delete endpoint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Endpoints tab
// ---------------------------------------------------------------------------

function EndpointsTab({ onCreate }: { onCreate: () => void }) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState<WebhookEndpoint | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QK.list,
    queryFn: () => api!.webhooks.list(),
    enabled: !!api,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' }) =>
      api!.webhooks.update(id, { status }),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: QK.list });
      queryClient.invalidateQueries({ queryKey: QK.stats });
      toast.success(
        vars.status === 'active' ? 'Endpoint enabled' : 'Endpoint disabled',
      );
    },
    onError: (e) =>
      toast.error(getApiErrorMessage(e, 'Failed to update endpoint')),
  });

  const endpoints = data ?? [];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="pt-6">
            <ErrorState
              error={error}
              fallback="Couldn't load webhook endpoints"
              onRetry={() => refetch()}
            />
          </CardContent>
        </Card>
      ) : endpoints.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<WebhookIcon className="h-8 w-8" />}
              title="No webhook endpoints yet"
              description="Create an endpoint to receive real-time events like transfers, stream updates, and agent actions."
              action={{ label: 'Create your first webhook', onClick: onCreate }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {endpoints.map((ep) => {
            const failing = (ep.consecutive_failures ?? 0) > 0;
            return (
              <Card key={ep.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-all font-mono text-sm font-medium text-foreground">
                          {ep.url}
                        </span>
                        <StatusBadge status={ep.status} />
                        {failing && (
                          <Badge variant="error">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            {ep.consecutive_failures} consecutive failure
                            {ep.consecutive_failures === 1 ? '' : 's'}
                          </Badge>
                        )}
                      </div>
                      {ep.name && (
                        <p className="text-sm text-foreground">{ep.name}</p>
                      )}
                      {ep.description && (
                        <p className="text-sm text-muted-foreground">
                          {ep.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {ep.events.slice(0, 6).map((e) => (
                          <Badge key={e} variant="outline" className="font-mono">
                            {e}
                          </Badge>
                        ))}
                        {ep.events.length > 6 && (
                          <Badge variant="outline">
                            +{ep.events.length - 6} more
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {ep.last_success_at && (
                          <span>
                            Last success{' '}
                            {formatRelativeTime(ep.last_success_at)}
                          </span>
                        )}
                        {ep.last_failure_at && (
                          <span className="text-destructive">
                            Last failure{' '}
                            {formatRelativeTime(ep.last_failure_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch
                          checked={ep.status === 'active'}
                          disabled={toggleStatus.isPending}
                          onCheckedChange={(checked) =>
                            toggleStatus.mutate({
                              id: ep.id,
                              status: checked ? 'active' : 'disabled',
                            })
                          }
                          aria-label={
                            ep.status === 'active'
                              ? `Disable endpoint ${ep.url}`
                              : `Enable endpoint ${ep.url}`
                          }
                        />
                        {ep.status === 'active' ? 'Enabled' : 'Disabled'}
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setToDelete(ep)}
                        aria-label={`Delete endpoint ${ep.url}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <DeleteEndpointDialog
        endpoint={toDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity (stats) tab
// ---------------------------------------------------------------------------

function FailuresTable({ rows }: { rows: WebhookDelivery[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event</TableHead>
          <TableHead>Endpoint</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Code</TableHead>
          <TableHead>Attempts</TableHead>
          <TableHead>Last attempt</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="font-mono text-xs">{d.event_type}</TableCell>
            <TableCell className="max-w-[220px] truncate font-mono text-xs">
              {d.endpoint_url}
            </TableCell>
            <TableCell>
              <DeliveryStatusBadge status={d.status} />
            </TableCell>
            <TableCell className="text-sm">
              {d.last_response_code ?? '—'}
            </TableCell>
            <TableCell className="text-sm">{d.attempts}</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {d.last_attempt_at
                ? formatRelativeTime(d.last_attempt_at)
                : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ActivityTab() {
  const api = useApiClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QK.stats,
    queryFn: () => api!.webhooks.stats({ hours: 24 }),
    enabled: !!api,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorState
            error={error}
            fallback="Couldn't load delivery stats"
            onRetry={() => refetch()}
          />
        </CardContent>
      </Card>
    );
  }

  const summary = data?.summary;
  const failures = data?.recentFailures ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Delivered (24h)</CardDescription>
            <CardTitle className="text-2xl">
              {summary?.delivered ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Success rate</CardDescription>
            <CardTitle className="text-2xl">
              {summary?.successRate ?? '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Health</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              {summary?.healthy ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-base font-medium text-green-600">
                    Healthy
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span className="text-base font-medium text-destructive">
                    Degraded
                  </span>
                </>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {summary && (
        <Card>
          <CardContent className="flex flex-wrap gap-x-6 gap-y-2 pt-6 text-sm text-muted-foreground">
            <span>Total: {summary.total}</span>
            <span>Pending: {summary.pending}</span>
            <span>Processing: {summary.processing}</span>
            <span className="text-destructive">Failed: {summary.failed}</span>
            <span className="text-yellow-700 dark:text-yellow-400">
              Dead-letter: {summary.dlq}
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent failures</CardTitle>
          <CardDescription>
            The latest failed and dead-lettered delivery attempts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {failures.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-8 w-8" />}
              title="No recent failures"
              description="All recent webhook deliveries succeeded."
            />
          ) : (
            <FailuresTable rows={failures} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dead-letter tab
// ---------------------------------------------------------------------------

function DeadLetterTab() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [confirmPurge, setConfirmPurge] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: QK.dlq(page),
    queryFn: () => api!.webhooks.listDlq({ page, limit: 20 }),
    enabled: !!api,
  });

  const invalidateDlq = () => {
    queryClient.invalidateQueries({ queryKey: ['webhooks', 'dlq'] });
    queryClient.invalidateQueries({ queryKey: QK.stats });
  };

  const replay = useMutation({
    mutationFn: () => api!.webhooks.replay({ status: 'dlq' }),
    onSuccess: (res) => {
      invalidateDlq();
      toast.success(
        res.message ?? `Replayed ${res.replayed} delivery(ies)`,
      );
    },
    onError: (e) =>
      toast.error(getApiErrorMessage(e, 'Failed to replay deliveries')),
  });

  const purge = useMutation({
    mutationFn: () => api!.webhooks.purgeDlq(),
    onSuccess: (res) => {
      invalidateDlq();
      setConfirmPurge(false);
      toast.success(res.message ?? `Purged ${res.purged} item(s)`);
    },
    onError: (e) => {
      setConfirmPurge(false);
      toast.error(getApiErrorMessage(e, 'Failed to purge dead-letter queue'));
    },
  });

  const rows = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Dead-letter queue</CardTitle>
            <CardDescription>
              Deliveries that exhausted all retry attempts. Replay them after
              fixing your endpoint, or purge old items.
            </CardDescription>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={replay.isPending || rows.length === 0}
              onClick={() => replay.mutate()}
            >
              {replay.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Replay all
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={purge.isPending}
              onClick={() => setConfirmPurge(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Purge DLQ
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : isError ? (
            <ErrorState
              error={error}
              fallback="Couldn't load the dead-letter queue"
              onRetry={() => refetch()}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              title="Dead-letter queue is empty"
              description="No deliveries have exhausted their retries."
            />
          ) : (
            <>
              <FailuresTable rows={rows} />
              {pagination && pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Page {pagination.page} of {pagination.totalPages} ·{' '}
                    {pagination.total} items
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={confirmPurge}
        onOpenChange={(o) => !o && setConfirmPurge(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Purge the dead-letter queue?</DialogTitle>
            <DialogDescription>
              This permanently deletes dead-lettered deliveries older than 7
              days. They cannot be replayed afterwards. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmPurge(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={purge.isPending}
              onClick={() => purge.mutate()}
            >
              {purge.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Purge queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WebhooksSettingsPage() {
  const { isConfigured, isLoading: authLoading } = useApiConfig();
  const [createOpen, setCreateOpen] = useState(false);

  const header = useMemo(
    () => (
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <WebhookIcon className="h-5 w-5" />
            Webhooks
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Receive real-time, signed event notifications at your own
            endpoints.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create endpoint
        </Button>
      </div>
    ),
    [],
  );

  if (authLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={<WebhookIcon className="h-8 w-8" />}
            title="Sign in to manage webhooks"
            description="Your session or API key is required to configure webhook endpoints."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <Tabs defaultValue="endpoints">
        <TabsList>
          <TabsTrigger value="endpoints">
            <WebhookIcon className="mr-2 h-4 w-4" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="mr-2 h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="dlq">
            <Inbox className="mr-2 h-4 w-4" />
            Dead-letter
          </TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="mt-6">
          <EndpointsTab onCreate={() => setCreateOpen(true)} />
        </TabsContent>
        <TabsContent value="activity" className="mt-6">
          <ActivityTab />
        </TabsContent>
        <TabsContent value="dlq" className="mt-6">
          <DeadLetterTab />
        </TabsContent>
      </Tabs>

      <Separator />
      <VerifyingSignaturesNote />

      <CreateEndpointDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
