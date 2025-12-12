import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { createClient } from '../db/client.js';
import { calculateStreamedAmount, calculateRunway, getStreamHealth } from '../services/streams.js';

const events = new Hono();

/**
 * SSE endpoint for real-time stream updates
 * 
 * Sends updates for:
 * - Stream balance changes (every second for active streams)
 * - Stream health changes
 * - Stream status changes (pause/resume/cancel)
 * 
 * Query params:
 * - streamIds: Comma-separated list of stream IDs to subscribe to
 * - interval: Update interval in ms (default: 1000)
 */
events.get('/streams', async (c) => {
  const ctx = c.get('ctx');
  const streamIdsParam = c.req.query('streamIds');
  const interval = parseInt(c.req.query('interval') || '1000', 10);

  if (!streamIdsParam) {
    return c.json({ error: 'streamIds query parameter is required' }, 400);
  }

  const streamIds = streamIdsParam.split(',').map(id => id.trim());
  const supabase = createClient();

  return streamSSE(c, async (stream) => {
    // Initial data fetch
    const { data: streams, error } = await supabase
      .from('streams')
      .select('*')
      .in('id', streamIds)
      .eq('tenant_id', ctx.tenantId);

    if (error || !streams) {
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ error: 'Failed to fetch streams' }),
      });
      return;
    }

    // Send initial state
    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ 
        subscribedStreams: streams.map(s => s.id),
        interval,
      }),
    });

    let isActive = true;
    let lastStates = new Map<string, string>();

    const sendUpdates = async () => {
      if (!isActive) return;

      // Refetch streams
      const { data: currentStreams } = await supabase
        .from('streams')
        .select('*')
        .in('id', streamIds)
        .eq('tenant_id', ctx.tenantId);

      if (!currentStreams) return;

      const now = new Date();

      for (const stream of currentStreams) {
        const streamedTotal = stream.status === 'active' 
          ? calculateStreamedAmount(stream, now)
          : parseFloat(stream.streamed_total) || 0;

        const runway = calculateRunway(stream, now);
        const health = getStreamHealth(runway);

        const update = {
          id: stream.id,
          status: stream.status,
          health,
          streamed: {
            total: streamedTotal,
            withdrawn: parseFloat(stream.withdrawn_total) || 0,
            available: streamedTotal - (parseFloat(stream.withdrawn_total) || 0),
          },
          funding: {
            wrapped: parseFloat(stream.funding_wrapped) || 0,
            buffer: parseFloat(stream.funding_buffer) || 0,
            runway: {
              seconds: runway,
              display: formatRunway(runway),
            },
          },
          flowRate: {
            perSecond: parseFloat(stream.flow_rate_per_second) || 0,
            perMonth: (parseFloat(stream.flow_rate_per_second) || 0) * 2592000,
          },
          updatedAt: now.toISOString(),
        };

        const stateKey = JSON.stringify(update);
        const lastState = lastStates.get(stream.id);

        // Only send if state changed or it's an active stream (balance always changing)
        if (stream.status === 'active' || stateKey !== lastState) {
          await stream.writeSSE({
            event: 'stream_update',
            data: JSON.stringify(update),
            id: `${stream.id}-${Date.now()}`,
          });
          lastStates.set(stream.id, stateKey);
        }
      }
    };

    // Send initial updates
    await sendUpdates();

    // Set up interval for updates
    const intervalId = setInterval(sendUpdates, interval);

    // Handle disconnect
    stream.onAbort(() => {
      isActive = false;
      clearInterval(intervalId);
    });

    // Keep connection alive with heartbeat
    const heartbeatId = setInterval(async () => {
      if (!isActive) {
        clearInterval(heartbeatId);
        return;
      }
      await stream.writeSSE({
        event: 'heartbeat',
        data: JSON.stringify({ timestamp: new Date().toISOString() }),
      });
    }, 30000);

    // Wait indefinitely (connection stays open)
    await new Promise(() => {});
  });
});

/**
 * SSE endpoint for account balance updates
 */
events.get('/accounts', async (c) => {
  const ctx = c.get('ctx');
  const accountIdsParam = c.req.query('accountIds');
  const interval = parseInt(c.req.query('interval') || '5000', 10);

  if (!accountIdsParam) {
    return c.json({ error: 'accountIds query parameter is required' }, 400);
  }

  const accountIds = accountIdsParam.split(',').map(id => id.trim());
  const supabase = createClient();

  return streamSSE(c, async (stream) => {
    // Initial data fetch
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, name, balance_total, balance_available, balance_in_streams, balance_buffer')
      .in('id', accountIds)
      .eq('tenant_id', ctx.tenantId);

    if (error || !accounts) {
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ error: 'Failed to fetch accounts' }),
      });
      return;
    }

    // Send initial state
    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ 
        subscribedAccounts: accounts.map(a => a.id),
        interval,
      }),
    });

    let isActive = true;
    let lastStates = new Map<string, string>();

    const sendUpdates = async () => {
      if (!isActive) return;

      const { data: currentAccounts } = await supabase
        .from('accounts')
        .select('id, name, balance_total, balance_available, balance_in_streams, balance_buffer')
        .in('id', accountIds)
        .eq('tenant_id', ctx.tenantId);

      if (!currentAccounts) return;

      for (const account of currentAccounts) {
        const update = {
          id: account.id,
          name: account.name,
          balance: {
            total: parseFloat(account.balance_total) || 0,
            available: parseFloat(account.balance_available) || 0,
            inStreams: parseFloat(account.balance_in_streams) || 0,
            buffer: parseFloat(account.balance_buffer) || 0,
          },
          updatedAt: new Date().toISOString(),
        };

        const stateKey = JSON.stringify(update);
        const lastState = lastStates.get(account.id);

        if (stateKey !== lastState) {
          await stream.writeSSE({
            event: 'account_update',
            data: JSON.stringify(update),
            id: `${account.id}-${Date.now()}`,
          });
          lastStates.set(account.id, stateKey);
        }
      }
    };

    // Send initial updates
    await sendUpdates();

    // Set up interval for updates
    const intervalId = setInterval(sendUpdates, interval);

    // Handle disconnect
    stream.onAbort(() => {
      isActive = false;
      clearInterval(intervalId);
    });

    // Keep connection alive with heartbeat
    const heartbeatId = setInterval(async () => {
      if (!isActive) {
        clearInterval(heartbeatId);
        return;
      }
      await stream.writeSSE({
        event: 'heartbeat',
        data: JSON.stringify({ timestamp: new Date().toISOString() }),
      });
    }, 30000);

    // Wait indefinitely
    await new Promise(() => {});
  });
});

/**
 * Format runway seconds to human-readable string
 */
function formatRunway(seconds: number): string {
  if (seconds <= 0) return 'Depleted';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d`;
  return `${Math.floor(seconds / 2592000)}mo`;
}

export default events;

