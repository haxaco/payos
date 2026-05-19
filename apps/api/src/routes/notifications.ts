/**
 * In-app dashboard notifications API (backs the notifications drawer).
 *
 * Every query is scoped to `ctx.tenantId` AND a recipient predicate so a
 * caller sees tenant-wide notifications (`user_id IS NULL`) plus, for JWT
 * users, their own targeted ones (`user_id = ctx.userId`). API-key actors
 * have no `ctx.userId`, so they see tenant-wide notifications only.
 *
 * Rows are mapped to the frontend `Notification` contract (created_at →
 * timestamp) so the drawer needs no transform.
 */

import { Hono } from 'hono';
import { createClient } from '../db/client.js';
import { getPaginationParams, paginationResponse, isValidUUID } from '../utils/helpers.js';
import { ValidationError, NotFoundError } from '../middleware/error.js';

const notifications = new Hono();

// ============================================
// ROW → CONTRACT MAPPING
// ============================================

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string | null;
  read: boolean;
  created_at: string;
}

function mapNotificationFromDb(row: NotificationRow) {
  return {
    id: row.id,
    type: row.type as 'agent_action' | 'stream_alert' | 'compliance' | 'system',
    title: row.title,
    message: row.message,
    timestamp: row.created_at,
    read: row.read,
    ...(row.href ? { href: row.href } : {}),
  };
}

/**
 * Apply the recipient predicate to a query: tenant-wide rows
 * (user_id IS NULL) OR — for JWT users — rows targeted to this user.
 */
function applyRecipientFilter<T>(query: T, userId: string | undefined): T {
  const q = query as any;
  if (userId) {
    return q.or(`user_id.is.null,user_id.eq.${userId}`);
  }
  return q.is('user_id', null);
}

// ============================================
// GET /v1/notifications - List (newest first)
// ============================================
notifications.get('/', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient() as any;

  const query = c.req.query();
  const { page, limit } = getPaginationParams(query);
  const unreadOnly = query.unread === 'true';

  let dbQuery: any = supabase
    .from('notifications')
    .select('id, type, title, message, href, read, created_at', { count: 'exact' })
    .eq('tenant_id', ctx.tenantId);

  dbQuery = applyRecipientFilter(dbQuery, ctx.userId);

  if (unreadOnly) {
    dbQuery = dbQuery.eq('read', false);
  }

  dbQuery = dbQuery
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  const { data, count, error } = await dbQuery;

  if (error) {
    console.error('Error fetching notifications:', error);
    throw new Error('Failed to fetch notifications from database');
  }

  const items = (data || []).map((row: NotificationRow) => mapNotificationFromDb(row));

  return c.json(paginationResponse(items, count || 0, { page, limit }));
});

// ============================================
// GET /v1/notifications/unread-count
// ============================================
notifications.get('/unread-count', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient() as any;

  let dbQuery: any = supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', ctx.tenantId)
    .eq('read', false);

  dbQuery = applyRecipientFilter(dbQuery, ctx.userId);

  const { count, error } = await dbQuery;

  if (error) {
    console.error('Error counting unread notifications:', error);
    throw new Error('Failed to count notifications');
  }

  return c.json({ data: { count: count || 0 } });
});

// ============================================
// POST /v1/notifications/read-all - Mark all unread read
// ============================================
notifications.post('/read-all', async (c) => {
  const ctx = c.get('ctx');
  const supabase = createClient() as any;

  let dbQuery: any = supabase.from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('tenant_id', ctx.tenantId)
    .eq('read', false);

  dbQuery = applyRecipientFilter(dbQuery, ctx.userId);

  const { error } = await dbQuery;

  if (error) {
    console.error('Error marking all notifications read:', error);
    throw new Error('Failed to mark notifications read');
  }

  return c.json({ data: { success: true } });
});

// ============================================
// POST /v1/notifications/:id/read - Mark one read
// ============================================
notifications.post('/:id/read', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient() as any;

  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid notification ID format');
  }

  // Verify it exists for this tenant + recipient before mutating.
  let findQuery: any = supabase
    .from('notifications')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId);
  findQuery = applyRecipientFilter(findQuery, ctx.userId);
  const { data: existing, error: findError } = await findQuery.single();

  if (findError || !existing) {
    throw new NotFoundError('Notification', id);
  }

  let updQuery: any = supabase.from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId);
  updQuery = applyRecipientFilter(updQuery, ctx.userId);
  const { error } = await updQuery;

  if (error) {
    console.error('Error marking notification read:', error);
    throw new Error('Failed to mark notification read');
  }

  return c.json({ data: { id, read: true } });
});

// ============================================
// DELETE /v1/notifications/:id - Dismiss
// ============================================
notifications.delete('/:id', async (c) => {
  const ctx = c.get('ctx');
  const id = c.req.param('id');
  const supabase = createClient() as any;

  if (!isValidUUID(id)) {
    throw new ValidationError('Invalid notification ID format');
  }

  // Verify it exists for this tenant + recipient before deleting.
  let findQuery: any = supabase
    .from('notifications')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId);
  findQuery = applyRecipientFilter(findQuery, ctx.userId);
  const { data: existing, error: findError } = await findQuery.single();

  if (findError || !existing) {
    throw new NotFoundError('Notification', id);
  }

  let delQuery: any = supabase.from('notifications')
    .delete()
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId);
  delQuery = applyRecipientFilter(delQuery, ctx.userId);
  const { error } = await delQuery;

  if (error) {
    console.error('Error deleting notification:', error);
    throw new Error('Failed to delete notification');
  }

  return c.json({ data: { id, deleted: true } });
});

export default notifications;
