/**
 * Session Management Service
 * Handles secure session management with refresh token rotation
 * Story: 11.12 Session Security
 */

import { createClient } from '../db/client.js';
import { createAdminClient } from '../db/admin-client.js';
import { logSecurityEvent } from '../utils/auth.js';
import crypto from 'crypto';

// ============================================
// Types
// ============================================

export interface ClientInfo {
  ip: string;
  userAgent: string;
  deviceFingerprint?: string;
}

export interface SessionData {
  id: string;
  userId: string;
  refreshTokenHash: string;
  isUsed: boolean;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface RefreshSessionResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SessionAnomaly {
  type: 'new_ip' | 'new_device' | 'impossible_travel' | 'unusual_time';
  severity: 'low' | 'medium' | 'high';
  action: 'log' | 'step_up' | 'block';
  details?: any;
}

// ============================================
// Token Generation
// ============================================

/**
 * Hash a refresh token using SHA-256
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate a secure random refresh token
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// ============================================
// Session Creation
// ============================================

/**
 * Create a new session record in the database
 */
export async function createSession(
  userId: string,
  refreshToken: string,
  clientInfo: ClientInfo,
  expiresIn: number = 7 * 24 * 60 * 60 * 1000 // 7 days default
): Promise<string> {
  const supabase = createAdminClient();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  
  const expiresAt = new Date(Date.now() + expiresIn);

  const { data, error } = await supabase
    .from('user_sessions')
    .insert({
      user_id: userId,
      refresh_token_hash: refreshTokenHash,
      ip_address: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      device_fingerprint: clientInfo.deviceFingerprint,
      expires_at: expiresAt.toISOString(),
      is_used: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create session:', error);
    throw new Error('Failed to create session');
  }

  await logSecurityEvent('session_created', 'info', {
    userId,
    sessionId: data.id,
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
  });

  return data.id;
}

// ============================================
// Session Validation
// ============================================

/**
 * Validate a refresh token and return session data
 */
export async function validateRefreshToken(
  refreshToken: string
): Promise<SessionData | null> {
  const supabase = createAdminClient();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('refresh_token_hash', refreshTokenHash)
    .is('revoked_at', null)
    .single();

  if (error || !data) {
    return null;
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    refreshTokenHash: data.refresh_token_hash,
    isUsed: data.is_used,
    ipAddress: data.ip_address,
    userAgent: data.user_agent,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
    revokedAt: data.revoked_at,
  };
}

// ============================================
// Refresh Token Rotation
// ============================================

/**
 * Refresh a session with token rotation and reuse detection
 */
export async function refreshSession(
  refreshToken: string,
  clientInfo: ClientInfo
): Promise<RefreshSessionResult> {
  const supabase = createAdminClient();
  
  // Validate the refresh token
  const session = await validateRefreshToken(refreshToken);
  
  if (!session) {
    await logSecurityEvent('invalid_refresh_token', 'warning', {
      token: refreshToken.slice(0, 8) + '...',
      ip: clientInfo.ip,
    });
    throw new Error('Invalid refresh token');
  }

  // **CRITICAL: Detect token reuse (potential theft)**
  if (session.isUsed) {
    // Token was already used - possible theft!
    await revokeAllUserSessions(session.userId);
    
    await logSecurityEvent('refresh_token_reuse', 'critical', {
      userId: session.userId,
      sessionId: session.id,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
    });

    // TODO: Send security alert email/notification
    // await sendSecurityAlert(session.userId, 'All sessions revoked due to suspicious activity');

    throw new Error('Session invalidated due to security breach');
  }

  // Mark the old token as used
  const { error: markError } = await supabase
    .from('user_sessions')
    .update({
      is_used: true,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  if (markError) {
    console.error('Failed to mark token as used:', markError);
  }

  // Generate new tokens
  const newRefreshToken = generateRefreshToken();
  
  // Create new session record
  const sessionId = await createSession(
    session.userId,
    newRefreshToken,
    clientInfo
  );

  // Get new access token from Supabase Auth
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server configuration error');
  }

  // Get user's current auth session to generate new access token
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
    session.userId
  );

  if (userError || !userData) {
    throw new Error('Failed to get user data');
  }

  // Generate new access token (15 min expiry)
  const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email!,
  });

  if (sessionError) {
    throw new Error('Failed to generate access token');
  }

  await logSecurityEvent('session_refreshed', 'info', {
    userId: session.userId,
    oldSessionId: session.id,
    newSessionId: sessionId,
    ip: clientInfo.ip,
  });

  return {
    accessToken: sessionData.properties.access_token,
    refreshToken: newRefreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

// ============================================
// Session Revocation
// ============================================

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: string, userId?: string): Promise<boolean> {
  const supabase = createAdminClient();

  const query = supabase
    .from('user_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', sessionId)
    .is('revoked_at', null);

  if (userId) {
    query.eq('user_id', userId);
  }

  const { error } = await query;

  if (error) {
    console.error('Failed to revoke session:', error);
    return false;
  }

  await logSecurityEvent('session_revoked', 'info', {
    sessionId,
    userId,
  });

  return true;
}

/**
 * Revoke all sessions for a user (security breach response)
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('revoke_all_user_sessions', {
    target_user_id: userId,
  });

  if (error) {
    console.error('Failed to revoke all sessions:', error);
    throw new Error('Failed to revoke sessions');
  }

  await logSecurityEvent('all_sessions_revoked', 'critical', {
    userId,
    revokedCount: data,
  });

  return data as number;
}

// ============================================
// Session Queries
// ============================================

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<SessionData[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get user sessions:', error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    refreshTokenHash: row.refresh_token_hash,
    isUsed: row.is_used,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  }));
}

/**
 * Get recent sessions for anomaly detection
 */
export async function getRecentSessions(
  userId: string,
  days: number = 30
): Promise<SessionData[]> {
  const supabase = createAdminClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to get recent sessions:', error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    refreshTokenHash: row.refresh_token_hash,
    isUsed: row.is_used,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  }));
}

// ============================================
// Anomaly Detection
// ============================================

/**
 * Detect session anomalies for security monitoring
 */
export async function detectAnomalies(
  userId: string,
  clientInfo: ClientInfo
): Promise<SessionAnomaly[]> {
  const anomalies: SessionAnomaly[] = [];
  const recentSessions = await getRecentSessions(userId, 30);

  if (recentSessions.length === 0) {
    // First session ever - no anomalies
    return anomalies;
  }

  // Check for new IP address
  const knownIps = new Set(recentSessions.map((s) => s.ipAddress));
  if (!knownIps.has(clientInfo.ip)) {
    anomalies.push({
      type: 'new_ip',
      severity: 'low',
      action: 'log',
      details: { ip: clientInfo.ip, knownIps: Array.from(knownIps) },
    });

    await logSecurityEvent('new_ip_detected', 'info', {
      userId,
      newIp: clientInfo.ip,
      knownIps: Array.from(knownIps).slice(0, 5), // Log first 5
    });
  }

  // Check for new device/user agent
  const knownUserAgents = new Set(recentSessions.map((s) => s.userAgent));
  if (!knownUserAgents.has(clientInfo.userAgent)) {
    anomalies.push({
      type: 'new_device',
      severity: 'low',
      action: 'log',
      details: { userAgent: clientInfo.userAgent },
    });

    await logSecurityEvent('new_device_detected', 'info', {
      userId,
      newUserAgent: clientInfo.userAgent,
    });
  }

  // TODO: Implement impossible travel detection
  // Requires geolocation service and time-based distance calculation

  // TODO: Implement unusual time detection
  // Requires user's typical activity pattern analysis

  return anomalies;
}

// ============================================
// Cleanup
// ============================================

/**
 * Clean up expired sessions (call this via cron job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('cleanup_expired_sessions');

  if (error) {
    console.error('Failed to cleanup expired sessions:', error);
    return 0;
  }

  return data as number;
}






