import type { Request, Response, Router } from 'express';
import { SandboxFacilitator } from './sandbox-facilitator';
import type { SandboxFacilitatorConfig } from './types';

/**
 * Create an Express router for the Sandbox Facilitator
 * 
 * This can be mounted at any path, typically /v1/x402/facilitator
 * 
 * @example
 * ```typescript
 * import express from 'express';
 * import { createSandboxFacilitatorRouter } from '@sly/sdk/facilitator';
 * 
 * const app = express();
 * const facilitator = createSandboxFacilitatorRouter({
 *   apiUrl: 'http://localhost:4000',
 *   apiKey: 'payos_...',
 * });
 * 
 * app.use('/v1/x402/facilitator', facilitator);
 * ```
 */
export function createSandboxFacilitatorRouter(
  config: SandboxFacilitatorConfig
): Router {
  // Dynamic import to avoid bundling express in the SDK
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const express = require('express');
  const router = express.Router();

  const facilitator = new SandboxFacilitator(config);

  // POST /verify - Verify payment payload
  router.post('/verify', async (req: Request, res: Response) => {
    try {
      const result = await facilitator.verify(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        valid: false,
        reason: error.message || 'Verification failed',
      });
    }
  });

  // POST /settle - Settle payment
  router.post('/settle', async (req: Request, res: Response) => {
    try {
      const result = await facilitator.settle(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        error: error.message || 'Settlement failed',
      });
    }
  });

  // GET /supported - Get supported schemes
  router.get('/supported', async (_req: Request, res: Response) => {
    try {
      const result = await facilitator.supported();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        error: error.message || 'Failed to get supported schemes',
      });
    }
  });

  return router;
}

