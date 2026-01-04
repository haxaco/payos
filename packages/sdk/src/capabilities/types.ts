/**
 * Types for PayOS Capabilities API
 * Re-exports from main types + additional client-specific types
 */

export type { 
  Capability, 
  CapabilitiesResponse 
} from '../types';

export interface CapabilitiesFilter {
  category?: string;
  name?: string;
}

