import { Response, Request } from 'express';
import { logger } from '../services/logger.js';

/**
 * HTTP helpers mirroring the SecureX Control Center server conventions.
 *
 * Success envelope:  { success: true, data }
 * Failure envelope:  { success: false, error: <human message>, errorCode: <code>, message }
 *
 * The browser client (src/services/api/client.ts) surfaces `error` to users
 * and keeps `errorCode` for programmatic handling, so `error` is always a
 * human-readable message here.
 */
export function ok<T>(res: Response, data: T) {
  return res.json({ success: true, data });
}

export function created<T>(res: Response, data: T) {
  return res.status(201).json({ success: true, data });
}

export function fail(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ success: false, error: message, errorCode: code, message });
}

/** Generic 500: real error is logged server-side; clients never see internals. */
export function serverError(res: Response, err: unknown, context?: string): Response {
  logger.error('http.internal_error', {
    context,
    error: err instanceof Error ? err.message : String(err),
  });
  return fail(res, 500, 'INTERNAL', 'An unexpected error occurred');
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function pageParams(query: Request['query']): { offset: number; limit: number } {
  const offset = Math.max(0, Number(query.offset) || 0);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { offset, limit };
}

/**
 * Route param extraction. Express 5 typings (with noUncheckedIndexedAccess)
 * model `req.params` as possibly-missing arrays, so coerce to a plain string.
 */
export function param(req: Request, name: string): string {
  const value: unknown = req.params[name];
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : '';
  return '';
}

/** 1-based pagination envelope used by the /blocks and /transactions clients. */
export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): { data: T[]; total: number; page: number; pageSize: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { data: items, total, page: Math.min(Math.max(page, 1), totalPages), pageSize, totalPages };
}