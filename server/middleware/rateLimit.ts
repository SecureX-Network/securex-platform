import { NextFunction, Request, Response } from 'express';
import { serverConfig } from '../config.js';
import { fail } from '../utils/http.js';
import { logger } from '../services/logger.js';

/**
 * In-memory sliding-window rate limiter (per bucket). Mirrors the Control
 * Center convention: keyed by client IP plus an optional scope, with
 * configurable window/max. Restart clears counters, which is acceptable for
 * the local/edge deployment model shared with the reference server.
 */
type Bucket = { windowStart: number; count: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(options: {
  windowMs: number;
  max: number;
  scope: string;
}): (req: Request, res: Response, next: NextFunction) => void {
  const { windowMs, max, scope } = options;
  return (req, res, next) => {
    const ip = req.ip ?? 'unknown';
    const key = `${scope}:${ip}`;
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || current.windowStart + windowMs <= now) {
      buckets.set(key, { windowStart: now, count: 1 });
      next();
      return;
    }
    current.count += 1;
    if (current.count > max) {
      const resetAt = current.windowStart + windowMs;
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((resetAt - now) / 1000))));
      const rate = Math.ceil(current.count / (windowMs / 1000));
      logger.warn('rate_limit.exceeded', { scope, ip, rate });
      fail(res, 429, 'RATE_LIMITED', 'Too many requests. Please slow down and try again in a moment.');
      return;
    }
    next();
  };
}

export const rateLimiters = {
  default: rateLimit({
    windowMs: serverConfig.rateLimit.defaultWindowMs,
    max: serverConfig.rateLimit.defaultMax,
    scope: 'default',
  }),
  auth: rateLimit({
    windowMs: serverConfig.rateLimit.authWindowMs,
    max: serverConfig.rateLimit.authMax,
    scope: 'auth',
  }),
  verify: rateLimit({
    windowMs: serverConfig.rateLimit.verifyWindowMs,
    max: serverConfig.rateLimit.verifyMax,
    scope: 'verify',
  }),
};

/** Bounded map so long-running instances do not grow without limit. */
export function trimRateLimitBuckets(maxEntries = 10_000): void {
  if (buckets.size <= maxEntries) return;
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (b.windowStart + serverConfig.rateLimit.defaultWindowMs * 2 <= now) {
      buckets.delete(k);
    }
  }
}
setInterval(() => trimRateLimitBuckets(), 60_000).unref();