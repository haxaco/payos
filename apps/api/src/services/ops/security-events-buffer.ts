import { createEventBuffer } from './event-buffer.js';

export interface SecurityEventRow {
  event_type: string;
  severity: string;
  tenant_id: string | null;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown> | null;
}

const securityEventsBuffer = createEventBuffer<SecurityEventRow>({
  table: 'security_events',
  flushIntervalMs: 5_000,
});

export function pushSecurityEventRow(row: SecurityEventRow): void {
  securityEventsBuffer.push(row);
}

export function startSecurityEventsBuffer(): void {
  securityEventsBuffer.start();
}

export async function stopSecurityEventsBuffer(): Promise<void> {
  await securityEventsBuffer.stop();
}

export function getSecurityEventsBufferSize(): number {
  return securityEventsBuffer.getSize();
}
