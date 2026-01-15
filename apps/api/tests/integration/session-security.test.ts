/**
 * Integration tests for Story 11.12: Session Security
 * Tests refresh token rotation, reuse detection, and session management
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const API_URL = process.env.VITE_API_URL || 'http://localhost:4000';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Test user credentials
const TEST_EMAIL = `test-session-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!@#';
const TEST_ORG = 'Test Session Org';

let testUserId: string;
let testAccessToken: string;
let testRefreshToken: string;

describe('Session Security (Story 11.12)', () => {
  // Cleanup test user after all tests
  afterAll(async () => {
    if (testUserId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  describe('Authentication Flow', () => {
    it('should signup and receive tokens', async () => {
      const response = await fetch(`${API_URL}/v1/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          organizationName: TEST_ORG,
          userName: 'Test User',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(TEST_EMAIL);
      expect(data.session.accessToken).toBeDefined();
      expect(data.session.refreshToken).toBeDefined();

      // Save for next tests
      testUserId = data.user.id;
      testAccessToken = data.session.accessToken;
      testRefreshToken = data.session.refreshToken;
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Wait a moment to ensure different token generation
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: testRefreshToken,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.session.accessToken).toBeDefined();
      expect(data.session.refreshToken).toBeDefined();
      expect(data.session.expiresIn).toBe(15 * 60); // 15 minutes

      // Tokens should be different (rotation)
      expect(data.session.accessToken).not.toBe(testAccessToken);
      expect(data.session.refreshToken).not.toBe(testRefreshToken);

      // Update for next tests
      const oldRefreshToken = testRefreshToken;
      testAccessToken = data.session.accessToken;
      testRefreshToken = data.session.refreshToken;

      // CRITICAL: Try to reuse the old refresh token (should fail)
      const reuseResponse = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: oldRefreshToken,
        }),
      });

      // Should fail with 401 and revoke all sessions
      expect(reuseResponse.status).toBe(401);
      const reuseData = await reuseResponse.json();
      expect(reuseData.error).toContain('suspicious activity');
    });

    it('should reject invalid refresh token', async () => {
      const response = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: 'invalid-token-12345',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should require refresh token in request', async () => {
      const response = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });
  });

  describe('Session Management', () => {
    beforeAll(async () => {
      // Re-login since we revoked all sessions in token reuse test
      const response = await fetch(`${API_URL}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      testAccessToken = data.session.accessToken;
      testRefreshToken = data.session.refreshToken;
    });

    it('should list active sessions for authenticated user', async () => {
      const response = await fetch(`${API_URL}/v1/auth/sessions`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);

      // Check session structure
      const session = data.data[0];
      expect(session.id).toBeDefined();
      expect(session.ipAddress).toBeDefined();
      expect(session.userAgent).toBeDefined();
      expect(session.createdAt).toBeDefined();
    });

    it('should revoke all sessions', async () => {
      const response = await fetch(`${API_URL}/v1/auth/sessions/revoke-all`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.message).toContain('revoked');
      expect(data.revokedCount).toBeGreaterThan(0);

      // Try to use the old access token - should fail
      const meResponse = await fetch(`${API_URL}/v1/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${testAccessToken}`,
        },
      });

      // Note: Access tokens might still work until they expire
      // But refresh should fail
      const refreshResponse = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: testRefreshToken,
        }),
      });

      expect(refreshResponse.status).toBe(401);
    });
  });

  describe('Security Events', () => {
    it('should log security events for session operations', async () => {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.log('Skipping: Supabase credentials not available');
        return;
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Query security events for our test user
      const { data: events, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('user_id', testUserId)
        .order('created_at', { ascending: false })
        .limit(10);

      expect(error).toBeNull();
      expect(events).toBeDefined();
      expect(events!.length).toBeGreaterThan(0);

      // Should have events like: signup_success, session_created, session_refreshed, etc.
      const eventTypes = events!.map((e) => e.event_type);
      expect(eventTypes).toContain('signup_success');
      expect(eventTypes).toContain('session_created');
    });
  });
});

describe('Frontend Token Refresh Flow', () => {
  it('should simulate frontend auto-refresh behavior', async () => {
    // Signup
    const signupResponse = await fetch(`${API_URL}/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-frontend-${Date.now()}@example.com`,
        password: TEST_PASSWORD,
        organizationName: 'Frontend Test Org',
      }),
    });

    expect(signupResponse.status).toBe(201);
    const signupData = await signupResponse.json();
    let accessToken = signupData.session.accessToken;
    let refreshToken = signupData.session.refreshToken;

    // Make an API call (simulate user activity)
    const meResponse1 = await fetch(`${API_URL}/v1/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(meResponse1.status).toBe(200);

    // Simulate token refresh (happens every 14 min in frontend)
    const refreshResponse = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    expect(refreshResponse.status).toBe(200);
    const refreshData = await refreshResponse.json();
    accessToken = refreshData.session.accessToken;
    refreshToken = refreshData.session.refreshToken;

    // Make another API call with new token
    const meResponse2 = await fetch(`${API_URL}/v1/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(meResponse2.status).toBe(200);

    // Simulate 401 handling (old token expired, auto-retry with refresh)
    // In real frontend, this would be handled by useApi hook

    // Clean up
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await supabase.auth.admin.deleteUser(signupData.user.id);
    }
  });
});






