/**
 * Unit tests for the require-tenant-scope middleware (Epic 82).
 *
 * Verifies the gate logic itself — method-mapping defaults, override
 * resolution, the self-scope shortcut, and the 403 envelope shape.
 * Does NOT exercise recordScopeUse (no elevatedGrantId in these
 * fixtures), so no Supabase client is invoked.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { requireTenantScope } from '../../../src/middleware/require-tenant-scope.js';
import type { RequestContext } from '../../../src/middleware/auth.js';

function setCtx(ctx: Partial<RequestContext>) {
  return async (c: any, next: any) => {
    c.set('ctx', { tenantId: 't_1', actorType: 'agent', ...ctx });
    return next();
  };
}

describe('requireTenantScope middleware', () => {
  describe('default method mapping', () => {
    let app: Hono;
    beforeEach(() => {
      app = new Hono();
      app.use('*', setCtx({ actorType: 'agent', actorId: 'a_self' }));
      app.use('/wallets/*', requireTenantScope());
      app.get('/wallets', (c) => c.json({ ok: true }));
      app.post('/wallets', (c) => c.json({ ok: true }));
    });

    it('agent without grant: GET → 403 with required_scope=tenant_read', async () => {
      const res = await app.request('/wallets', { method: 'GET' });
      expect(res.status).toBe(403);
      const body: any = await res.json();
      expect(body.code).toBe('SCOPE_REQUIRED');
      expect(body.required_scope).toBe('tenant_read');
      expect(body.current_scope).toBe('agent');
      expect(body.hint).toMatch(/request_scope/);
    });

    it('agent without grant: POST → 403 with required_scope=tenant_write', async () => {
      const res = await app.request('/wallets', { method: 'POST' });
      expect(res.status).toBe(403);
      const body: any = await res.json();
      expect(body.required_scope).toBe('tenant_write');
    });

    it('agent with tenant_read grant: GET → 200 (handler invoked)', async () => {
      const app2 = new Hono();
      app2.use('*', setCtx({
        actorType: 'agent',
        actorId: 'a_self',
        elevatedScope: 'tenant_read',
      }));
      app2.use('/wallets/*', requireTenantScope());
      app2.get('/wallets', (c) => c.json({ ok: true }));
      const res = await app2.request('/wallets', { method: 'GET' });
      expect(res.status).toBe(200);
    });

    it('agent with tenant_read grant: POST → 403 (insufficient)', async () => {
      const app2 = new Hono();
      app2.use('*', setCtx({
        actorType: 'agent',
        actorId: 'a_self',
        elevatedScope: 'tenant_read',
      }));
      app2.use('/wallets/*', requireTenantScope());
      app2.post('/wallets', (c) => c.json({ ok: true }));
      const res = await app2.request('/wallets', { method: 'POST' });
      expect(res.status).toBe(403);
    });

    it('api_key actor: GET → 200 (effectiveScope auto-grants tenant_write)', async () => {
      const app2 = new Hono();
      app2.use('*', setCtx({ actorType: 'api_key', apiKeyId: 'k_1' }));
      app2.use('/wallets/*', requireTenantScope());
      app2.get('/wallets', (c) => c.json({ ok: true }));
      const res = await app2.request('/wallets', { method: 'GET' });
      expect(res.status).toBe(200);
    });

    it('api_key actor: POST → 200 (covers tenant_write)', async () => {
      const app2 = new Hono();
      app2.use('*', setCtx({ actorType: 'api_key', apiKeyId: 'k_1' }));
      app2.use('/wallets/*', requireTenantScope());
      app2.post('/wallets', (c) => c.json({ ok: true }));
      const res = await app2.request('/wallets', { method: 'POST' });
      expect(res.status).toBe(200);
    });

    it('user JWT viewer: GET → 200, POST → 403', async () => {
      const get = new Hono();
      get.use('*', setCtx({ actorType: 'user', userId: 'u_1', userRole: 'viewer' }));
      get.use('/wallets/*', requireTenantScope());
      get.get('/wallets', (c) => c.json({ ok: true }));
      expect((await get.request('/wallets', { method: 'GET' })).status).toBe(200);

      const post = new Hono();
      post.use('*', setCtx({ actorType: 'user', userId: 'u_1', userRole: 'viewer' }));
      post.use('/wallets/*', requireTenantScope());
      post.post('/wallets', (c) => c.json({ ok: true }));
      expect((await post.request('/wallets', { method: 'POST' })).status).toBe(403);
    });
  });

  describe('overrides', () => {
    it('treasury override: api_key with tenant_write → 403', async () => {
      const app = new Hono();
      app.use('*', setCtx({ actorType: 'api_key', apiKeyId: 'k_1' }));
      app.use('/wallets/*', requireTenantScope({
        overrides: [{ method: 'POST', path: '/wallets/:id/withdraw', scope: 'treasury' }],
      }));
      app.post('/wallets/:id/withdraw', (c) => c.json({ ok: true }));
      const res = await app.request('/wallets/abc/withdraw', { method: 'POST' });
      expect(res.status).toBe(403);
      const body: any = await res.json();
      expect(body.required_scope).toBe('treasury');
      expect(body.current_scope).toBe('tenant_write');
    });

    it('treasury override: agent with treasury grant → 200', async () => {
      const app = new Hono();
      app.use('*', setCtx({
        actorType: 'agent',
        actorId: 'a_self',
        elevatedScope: 'treasury',
      }));
      app.use('/wallets/*', requireTenantScope({
        overrides: [{ method: 'POST', path: '/wallets/:id/withdraw', scope: 'treasury' }],
      }));
      app.post('/wallets/:id/withdraw', (c) => c.json({ ok: true }));
      const res = await app.request('/wallets/abc/withdraw', { method: 'POST' });
      expect(res.status).toBe(200);
    });

    it('agent-baseline override: unscoped agent → 200', async () => {
      const app = new Hono();
      app.use('*', setCtx({ actorType: 'agent', actorId: 'a_self' }));
      app.use('/x402/*', requireTenantScope({
        overrides: [{ method: 'POST', path: '/x402/endpoints/:id/rate-vendor', scope: 'agent' }],
      }));
      app.post('/x402/endpoints/:id/rate-vendor', (c) => c.json({ ok: true }));
      const res = await app.request('/x402/endpoints/abc/rate-vendor', { method: 'POST' });
      expect(res.status).toBe(200);
    });

    it('non-matching override falls through to method default', async () => {
      const app = new Hono();
      app.use('*', setCtx({ actorType: 'agent', actorId: 'a_self' }));
      app.use('/x402/*', requireTenantScope({
        overrides: [{ method: 'POST', path: '/x402/pay', scope: 'treasury' }],
      }));
      app.get('/x402/endpoints', (c) => c.json({ ok: true }));
      const res = await app.request('/x402/endpoints', { method: 'GET' });
      expect(res.status).toBe(403); // falls through to tenant_read default
      const body: any = await res.json();
      expect(body.required_scope).toBe('tenant_read');
    });
  });

  describe('selfScopeShortcut', () => {
    function buildApp(ctx: Partial<RequestContext>) {
      const app = new Hono();
      app.use('*', setCtx(ctx));
      app.use('/ap2/*', requireTenantScope({
        selfScopeShortcut: { paramName: 'agent_id' },
      }));
      app.get('/ap2/mandates', (c) => {
        const filter = c.req.query('agent_id') ?? null;
        return c.json({ ok: true, filtered_by: filter });
      });
      return app;
    }

    it('agent with no grant + ?agent_id=<self> → 200', async () => {
      const app = buildApp({ actorType: 'agent', actorId: 'a_self' });
      const res = await app.request('/ap2/mandates?agent_id=a_self');
      expect(res.status).toBe(200);
      const body: any = await res.json();
      expect(body.filtered_by).toBe('a_self');
    });

    it('agent with no grant + ?agent_id=<other> → 403', async () => {
      const app = buildApp({ actorType: 'agent', actorId: 'a_self' });
      const res = await app.request('/ap2/mandates?agent_id=a_other');
      expect(res.status).toBe(403);
    });

    it('agent with no grant + no agent_id param → 403', async () => {
      const app = buildApp({ actorType: 'agent', actorId: 'a_self' });
      const res = await app.request('/ap2/mandates');
      expect(res.status).toBe(403);
    });

    it('shortcut does not apply to write methods (no shortcut on POST)', async () => {
      const app = new Hono();
      app.use('*', setCtx({ actorType: 'agent', actorId: 'a_self' }));
      app.use('/ap2/*', requireTenantScope({
        selfScopeShortcut: { paramName: 'agent_id' },
      }));
      app.post('/ap2/mandates', (c) => c.json({ ok: true }));
      const res = await app.request('/ap2/mandates?agent_id=a_self', { method: 'POST' });
      expect(res.status).toBe(403); // POST → tenant_write, shortcut only for tenant_read
    });

    it('api_key callers: shortcut is irrelevant — 200 either way', async () => {
      const app = buildApp({ actorType: 'api_key', apiKeyId: 'k_1' });
      expect((await app.request('/ap2/mandates')).status).toBe(200);
      expect((await app.request('/ap2/mandates?agent_id=a_other')).status).toBe(200);
    });
  });

  describe('error envelope shape', () => {
    it('contains all SCOPE_REQUIRED fields', async () => {
      const app = new Hono();
      app.use('*', setCtx({ actorType: 'agent', actorId: 'a_self' }));
      app.use('/accounts/*', requireTenantScope());
      app.get('/accounts', (c) => c.json({ ok: true }));
      const res = await app.request('/accounts');
      expect(res.status).toBe(403);
      const body: any = await res.json();
      expect(body).toMatchObject({
        code: 'SCOPE_REQUIRED',
        required_scope: 'tenant_read',
        current_scope: 'agent',
      });
      expect(typeof body.error).toBe('string');
      expect(typeof body.hint).toBe('string');
    });
  });
});
