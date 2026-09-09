import { NextFunction, Request, Response } from 'express';
import { serverConfig } from '../config.js';

/**
 * Narrow CORS policy: only the configured origins may call the authenticated
 * platform API. Rejects credentials on disallowed origins and answers
 * preflight requests explicitly (no package dependency).
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (origin && serverConfig.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
  } else if (origin) {
    // Disallowed origin: reject preflight, allow regular requests through the
    // API's own auth layer (browsers will enforce the missing CORS headers).
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
  }
  next();
}