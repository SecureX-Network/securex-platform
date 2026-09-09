import { NextFunction, Request, Response } from 'express';
import { fail } from '../utils/http.js';

export interface FieldRule {
  name: string;
  required?: boolean;
  type?: 'string' | 'email' | 'object' | 'number' | 'boolean';
  min?: number;
  max?: number;
  enum?: readonly string[];
}

export type FieldValues = Record<string, unknown>;

/**
 * Dependency-free field validation (same convention as the Control Center
 * server): returns the parsed/sanitized values or hands the error message
 * format expected by the client's ApiError handling.
 */
export function validateFields(
  rules: FieldRule[],
  body: FieldValues,
): { ok: true; values: FieldValues } | { ok: false; error: string } {
  const values: FieldValues = {};

  for (const rule of rules) {
    const raw = body[rule.name];
    const missing = raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '');

    if (missing && rule.required) {
      return { ok: false, error: `Missing required field: ${rule.name}` };
    }
    if (missing) {
      values[rule.name] = undefined;
      continue;
    }

    if (typeof raw === 'string') {
      const value = raw.trim();
      if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return { ok: false, error: `Invalid value for ${rule.name}: must be a valid email address` };
      }
      if (rule.min !== undefined && value.length < rule.min) {
        return { ok: false, error: `Invalid value for ${rule.name}: must be at least ${rule.min} characters` };
      }
      if (rule.max !== undefined && value.length > rule.max) {
        return { ok: false, error: `Invalid value for ${rule.name}: must be at most ${rule.max} characters` };
      }
      if (rule.enum && !rule.enum.includes(value)) {
        return { ok: false, error: `Invalid value for ${rule.name}: must be one of ${rule.enum.join(', ')}` };
      }
      values[rule.name] = value;
      continue;
    }

    if (rule.type === 'number' && typeof raw === 'number' && Number.isFinite(raw)) {
      values[rule.name] = raw;
      continue;
    }
    if (rule.type === 'boolean' && typeof raw === 'boolean') {
      values[rule.name] = raw;
      continue;
    }
    if (rule.type === 'object' && typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
      values[rule.name] = raw;
      continue;
    }

    return { ok: false, error: `Invalid value for ${rule.name}` };
  }

  return { ok: true, values };
}

/** Express middleware wrapping validateFields: 400 + error on failure. */
export function validate(rules: FieldRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = validateFields(rules, (req.body ?? {}) as FieldValues);
    if (!result.ok) {
      return fail(res, 400, 'VALIDATION', result.error);
    }
    req.body = result.values;
    next();
  };
}