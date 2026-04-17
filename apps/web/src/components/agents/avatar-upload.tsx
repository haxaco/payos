'use client';

import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiConfig, useApiFetch } from '@/lib/api-client';
import { Upload, X, Loader2 } from 'lucide-react';
import { AgentAvatar } from './agent-avatar';

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;

type Props = {
  agentId?: string | null;
  agentName?: string;
  currentUrl?: string | null;
  size?: 'md' | 'lg' | 'xl';
  /** Called with the pending File when no agentId exists yet (create flow). */
  onFileStaged?: (file: File, previewUrl: string) => void;
  /** Called after a successful upload when agentId is provided. */
  onUploaded?: (url: string) => void;
};

export function AvatarUpload({
  agentId,
  agentName,
  currentUrl,
  size = 'lg',
  onFileStaged,
  onUploaded,
}: Props) {
  const { apiUrl } = useApiConfig();
  const apiFetch = useApiFetch();
  const queryClient = useQueryClient();

  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayUrl = preview ?? currentUrl ?? null;

  const validate = (file: File): string | null => {
    if (!ALLOWED.includes(file.type)) return 'Use PNG, JPEG, or WebP';
    if (file.size > MAX_BYTES) return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 2 MB.`;
    return null;
  };

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      const v = validate(file);
      if (v) {
        setError(v);
        return;
      }
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);

      if (!agentId) {
        onFileStaged?.(file, localUrl);
        return;
      }

      try {
        setBusy(true);
        const fd = new FormData();
        fd.append('file', file);
        const res = await apiFetch(`${apiUrl}/v1/agents/${agentId}/avatar`, {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => null);
          throw new Error(j?.error?.message ?? j?.error ?? 'Upload failed');
        }
        const j = await res.json();
        const url: string = j?.data?.avatarUrl ?? j?.data?.avatar_url ?? '';
        onUploaded?.(url);
        queryClient.invalidateQueries({ queryKey: ['agents'] });
        queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
      } catch (e: any) {
        setError(e?.message ?? 'Upload failed');
        setPreview(null);
      } finally {
        setBusy(false);
      }
    },
    [agentId, apiUrl, apiFetch, onFileStaged, onUploaded, queryClient]
  );

  const clear = async () => {
    setPreview(null);
    setError(null);
    if (!agentId) return;
    try {
      setBusy(true);
      const res = await apiFetch(`${apiUrl}/v1/agents/${agentId}/avatar`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      onUploaded?.('');
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
    } catch (e: any) {
      setError(e?.message ?? 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <AgentAvatar agent={{ name: agentName, avatarUrl: displayUrl }} size={size} />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {displayUrl ? 'Replace' : 'Upload'}
          </button>
          {displayUrl && (
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Remove
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED.join(',')}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPEG, or WebP · max 2 MB</p>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
