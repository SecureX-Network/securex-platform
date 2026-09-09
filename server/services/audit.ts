import { run } from '../db/database.js';
import { randomToken } from '../utils/ids.js';
import { logger } from './logger.js';
import type { AuthUser } from '../middleware/auth.js';

export interface AuditEntry {
  action: string;
  actor: string;
  actorRole: string;
  target: string;
  targetType: string;
  details?: string;
  ipAddress?: string;
}

/**
 * Append an audit event. Intentionally never rejects: auditing must never take
 * a business request down with it (same contract as the Control Center server).
 */
export function writeAudit(entry: AuditEntry): void {
  try {
    run(
      `INSERT INTO audit_events (id, action, actor, actor_role, target, target_type, details, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      `aud-${Date.now().toString(36)}-${randomToken(6)}`,
      entry.action,
      entry.actor,
      entry.actorRole,
      entry.target,
      entry.targetType,
      entry.details ?? null,
      entry.ipAddress ?? '',
      new Date().toISOString(),
    );
  } catch (err) {
    logger.warn('audit.write_failed', {
      action: entry.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Convenience for requests where the caller is an authenticated user. */
export function auditFor(
  req: { user: AuthUser; ip?: string },
  entry: Omit<AuditEntry, 'actor' | 'actorRole' | 'ipAddress'>,
): void {
  writeAudit({
    ...entry,
    actor: req.user.name,
    actorRole: req.user.role,
    ipAddress: req.ip ?? '',
  });
}