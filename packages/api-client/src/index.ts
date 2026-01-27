// Sly API Client
// A typed SDK for communicating with the Sly API

// Primary exports (Sly naming)
export { SlyClient, type SlyClientConfig, createSlyClient } from './client';
export { SlyError, isSlyError } from './errors';
export * from './types';

// Backward compatibility exports (PayOS naming)
export { PayOSClient, type PayOSClientConfig, createPayOSClient } from './client';
export { PayOSError, isPayOSError } from './errors';

