import express, { NextFunction, Request, Response } from 'express';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { credentialsRouter } from './routes/credentials.js';
import { explorersRouter } from './routes/explorer.js';
import { institutionsRouter } from './routes/institutions.js';
import { verificationsRouter } from './routes/verifications.js';
import { corsMiddleware } from './middleware/cors.js';
import { securityHeaders } from './middleware/security.js';
import { rateLimiters } from './middleware/rateLimit.js';
import { fail, serverError } from './utils/http.js';
import { serverConfig } from './config.js';

/**
 * Express application factory for the SecureX Platform API (port 4000).
 * Mounted under /api to match the frontend's API_BASE_URL contract.
 * All bodies are JSON; every response uses the { success, data | error } envelope.
 */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(corsMiddleware);
  app.use(securityHeaders);
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'securex-platform-api',
        version: '1.0.0',
        time: new Date().toISOString(),
        dataMode: serverConfig.dataMode,
      },
    });
  });

  const api = express.Router();
  if (serverConfig.environment !== 'test') {
    api.use(rateLimiters.default);
    api.use('/auth', rateLimiters.auth, authRouter);
    api.use('/institutions', institutionsRouter);
    api.use('/credentials', credentialsRouter);
    api.use('/verifications', rateLimiters.verify, verificationsRouter);
    api.use('/admin', adminRouter);
  } else {
    api.use('/auth', authRouter);
    api.use('/institutions', institutionsRouter);
    api.use('/credentials', credentialsRouter);
    api.use('/verifications', verificationsRouter);
    api.use('/admin', adminRouter);
  }
  // Explorer surfaces (blocks/transactions/network stats) are read-only.
  api.use('/', explorersRouter);

  api.use((_req: Request, res: Response) => {
    fail(res, 404, 'NOT_FOUND', 'Endpoint not found. Please check the URL and try again.');
  });

  app.use('/api', api);
  app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (
      err instanceof SyntaxError &&
      'body' in err &&
      typeof err === 'object'
    ) {
      return fail(res, 400, 'INVALID_JSON', 'Malformed JSON in request body.');
    }
    return serverError(res, err, 'api');
  });

  return app;
}