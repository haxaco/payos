/**
 * AP2 protocol support (Google Agent-to-Agent Protocol)
 * 
 * Provides SDK methods for:
 * - Creating and managing mandates
 * - Executing payments against mandates
 * - Tracking mandate execution history
 */

export * from './types';
export { AP2Client } from './client';

// Re-export for backward compatibility
export type { Mandate, MandateExecution, CreateMandateRequest, ExecuteMandateRequest } from './types';

