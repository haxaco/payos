import { createEventBuffer } from './event-buffer.js';

export interface A2AAuditRow {
  tenant_id: string;
  task_id: string | null;
  agent_id: string | null;
  event_type: string;
  from_state: string | null;
  to_state: string | null;
  actor_type: string;
  actor_id: string | null;
  data: Record<string, unknown> | null;
  duration_ms: number | null;
  environment?: string | null;
}

const a2aAuditBuffer = createEventBuffer<A2AAuditRow>({
  table: 'a2a_audit_events',
  flushIntervalMs: 2_000,
});

export function pushA2AAuditRow(row: A2AAuditRow): void {
  a2aAuditBuffer.push(row);
}

export function startA2AAuditBuffer(): void {
  a2aAuditBuffer.start();
}

export async function stopA2AAuditBuffer(): Promise<void> {
  await a2aAuditBuffer.stop();
}

export function getA2AAuditBufferSize(): number {
  return a2aAuditBuffer.getSize();
}
