import { createEventBuffer } from './event-buffer.js';

export interface AuditLogRow {
  tenant_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  actor_type: string;
  actor_id: string | null;
  actor_name: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

const auditLogBuffer = createEventBuffer<AuditLogRow>({
  table: 'audit_log',
  flushIntervalMs: 5_000,
});

export function pushAuditLogRow(row: AuditLogRow): void {
  auditLogBuffer.push(row);
}

export function startAuditLogBuffer(): void {
  auditLogBuffer.start();
}

export async function stopAuditLogBuffer(): Promise<void> {
  await auditLogBuffer.stop();
}

export function getAuditLogBufferSize(): number {
  return auditLogBuffer.getSize();
}

export async function flushAuditLogBuffer(): Promise<number> {
  return auditLogBuffer.flush();
}
