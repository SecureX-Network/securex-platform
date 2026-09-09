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
import { getPool } from './db/database.js';

/**
 * Express application factory for the SecureX Platform API (port 4000).
 * Mounted under /api to match the frontend's API_BASE_URL contract.
 * All bodies are JSON; every response uses the { success, data | error } envelope.
 */
async function probeDatabase(): Promise<'connected' | 'unavailable'> {
  try {
    await Promise.race([
      getPool().query('SELECT 1'),
      new Promise<never>((_resolve, reject) =>
        setTimeout(() => reject(new Error('health probe timeout')), 1500).unref(),
      ),
    ]);
    return 'connected';
  } catch {
    return 'unavailable';
  }
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(corsMiddleware);
  app.use(securityHeaders);
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', async (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'securex-platform-api',
        version: '1.0.0',
        time: new Date().toISOString(),
        dataMode: serverConfig.dataMode,
        database: await probeDatabase(),
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

  function pgErrorCode(err: unknown): string | undefined {
    if (typeof err === 'object' && err !== null && 'code' in err) {
      const code = (err as { code?: unknown }).code;
      return typeof code === 'string' ? code : undefined;
    }
    return undefined;
  }

  /** PostgreSQL constraint violations -> safe, categorized REST responses. */
  const PG_CONSTRAINT_ERRORS: Record<string, [number, string, string]> = {
    '23505': [409, 'DUPLICATE_IDENTITY', 'A record with this identity already exists.'],
    '23503': [409, 'INVALID_REFERENCE', 'The request references an entity that does not exist.'],
    '23502': [400, 'REQUIRED_FIELD', 'A required field was not provided.'],
    '23514': [422, 'INVALID_VALUE', 'A field value violates an allowed constraint.'],
    '22P02': [400, 'INVALID_VALUE', 'A provided value has an invalid format.'],
  };

  app.use('/api', api);
  app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (
      err instanceof SyntaxError &&
      'body' in err &&
      typeof err === 'object'
    ) {
      return fail(res, 400, 'INVALID_JSON', 'Malformed JSON in request body.');
    }
    const code = pgErrorCode(err);
    if (code) {
      const [status, errorCode, message] =
        PG_CONSTRAINT_ERRORS[code] ?? [409, 'DATABASE_CONSTRAINT', 'The database rejected this operation.'];
      return fail(res, status, errorCode, message);
    }
    return serverError(res, err, 'api');
  });

  return app;
}