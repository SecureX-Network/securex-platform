import { NextFunction, Request, Response } from 'express';
import { serverConfig } from '../config.js';

/**
 * Security headers for every response. Mirrors the Control Center server:
 * noinline CSP with self + data: for images/scripts so the frontend's inline
 * style attributes keep working, and no referrer leakage to downstream APIs.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'self'; frame-ancestors 'none'",
  );
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  // HSTS is only meaningful over TLS, and browsers ignore the header on a plain
  // HTTP response anyway, so it is restricted to production to keep local
  // development over http://localhost unaffected.
  if (serverConfig.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}