/**
 * In-app dashboard notifications.
 *
 * Backs the dashboard notifications drawer. Notifications are either
 * tenant-wide (`userId` null/omitted — visible to every user in the tenant)
 * or targeted to a single dashboard user (`userId` set).
 *
 * `createNotification` is fire-and-forget friendly: it NEVER throws into the
 * caller's critical path. Producers should still `.catch()` the returned
 * promise so an unhandled rejection can't surface. Uses the service-role
 * Supabase client (bypasses RLS); tenant isolation is enforced here and in
 * the route layer by explicit tenant + recipient filtering.
 */

import { createClient } from '../db/client.js';

export type NotificationType =
  | 'agent_action'
  | 'stream_alert'
  | 'compliance'
  | 'system';

export interface CreateNotificationInput {
  tenantId: string;
  /** null/undefined = tenant-wide; a user id = targeted to that user. */
  userId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  href?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Insert a notification row. Swallows all errors (logs them) so it is safe
 * to call from a host request's critical path without breaking it.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  try {
    // `notifications` is not yet in the generated database.types.ts, so the
    // client is cast to `any` for this table (same as other post-types tables).
    const supabase = createClient() as any;
    const { error } = await supabase.from('notifications').insert({
      tenant_id: input.tenantId,
      user_id: input.userId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href ?? null,
      metadata: input.metadata ?? {},
    });
    if (error) {
      console.error('[notifications] createNotification insert failed:', error);
    }
  } catch (err) {
    console.error('[notifications] createNotification threw:', err);
  }
}
