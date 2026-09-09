import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { serverConfig } from '../config.js';
import { get } from '../db/database.js';
import { fail } from '../utils/http.js';

/** The nine roles from the frontend contract (src/types/index.ts). */
export const ALL_ROLES = [
  'PUBLIC',
  'HOLDER',
  'INSTITUTION',
  'ISSUER',
  'EMPLOYER',
  'ADMIN',
  'SECURITY_ADMIN',
  'NETWORK_ADMIN',
  'AUDITOR',
] as const;
export type UserRole = (typeof ALL_ROLES)[number];

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  institutionId: string | null;
  tokenId: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

interface SessionRow {
  user_id: string;
  revoked: number;
}

/**
 * JWT bearer auth. Verifies signature/expiry, then confirms the referenced
 * session row exists and has not been revoked (server-side session invalidation).
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    fail(res, 401, 'UNAUTHORIZED', 'Authentication required. Please sign in to continue.');
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, serverConfig.jwtSecret) as jwt.JwtPayload;
  } catch {
    fail(res, 401, 'UNAUTHORIZED', 'Your session is invalid or has expired. Please sign in again.');
    return;
  }

  const session = payload.jti
    ? await get<SessionRow>(`SELECT user_id, revoked FROM sessions WHERE jti = ?`, payload.jti)
    : undefined;
  if (!session || session.revoked === 1) {
    fail(res, 401, 'UNAUTHORIZED', 'Your session has been revoked. Please sign in again.');
    return;
  }

  const user = await get<{
    id: string;
    email: string;
    name: string;
    role: UserRole;
    institution_id: string | null;
  }>(
    'SELECT id, email, name, role, institution_id FROM users WHERE id = ? AND status = ?',
    payload.sub ?? session.user_id,
    'ACTIVE',
  );
  if (!user) {
    fail(res, 401, 'UNAUTHORIZED', 'Your account is no longer active. Please contact support.');
    return;
  }

  (req as AuthenticatedRequest).user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    institutionId: user.institution_id,
    tokenId: payload.jti as string,
  };
  next();
}

/** Require the authenticated user's role to be one of the allowed set. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return fail(res, 401, 'UNAUTHORIZED', 'Authentication required.');
    }
    if (!roles.includes(user.role)) {
      return fail(res, 403, 'FORBIDDEN', 'You do not have permission to perform this action.');
    }
    next();
  };
}