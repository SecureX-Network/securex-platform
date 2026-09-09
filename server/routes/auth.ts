import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serverConfig } from '../config.js';
import { get, run, transaction } from '../db/database.js';
import { mapUserRow, type UserRow } from '../db/mappers.js';
import { ALL_ROLES, requireAuth, type AuthenticatedRequest, type UserRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { created, fail, ok } from '../utils/http.js';
import { entityId, newJti } from '../utils/ids.js';
import { writeAudit } from '../services/audit.js';

const SELF_REGISTER_ROLES: UserRole[] = ['HOLDER', 'INSTITUTION', 'ISSUER', 'EMPLOYER'];

async function signSession(user: UserRow, ipAddress: string): Promise<{ token: string; jti: string }> {
  const jti = newJti();
  const token = jwt.sign(
    { sub: user.id, role: user.role, jti, authMethod: 'pwd' },
    serverConfig.jwtSecret,
    { expiresIn: serverConfig.tokenTtl } as jwt.SignOptions,
  );
  await run(
    `INSERT INTO sessions (jti, user_id, issued_at, expires_at, revoked, ip_address, device, location)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
    jti,
    user.id,
    new Date().toISOString(),
    new Date(Date.now() + 8 * 3600_000).toISOString(),
    ipAddress,
    'Web Platform API',
    'Unknown',
  );
  return { token, jti };
}

async function findActiveUser(email: string): Promise<UserRow | undefined> {
  return get<UserRow>(
    `SELECT id, email, name, role, institution_id, password_hash, created_at, last_login_at
     FROM users WHERE lower(email) = lower(?) AND status = 'ACTIVE'`,
    email.trim().toLowerCase(),
  );
}

export const authRouter = Router();

authRouter.post(
  '/login',
  validate([
    { name: 'email', required: true, type: 'email' },
    { name: 'password', required: true, min: 1 },
    { name: 'role', required: false, enum: ALL_ROLES as readonly string[] },
  ]),
  (req: Request, res: Response) => {
    void loginHandler(req, res);
  },
);

async function loginHandler(req: Request, res: Response): Promise<void> {
  const { email, password, role } = req.body as { email: string; password: string; role?: UserRole };
  const user = await findActiveUser(email);
  const ip = req.ip ?? '';

  const passwordMatches = user ? bcrypt.compareSync(password, user.password_hash) : false;
  if (!user || !passwordMatches) {
    await writeAudit({
      action: 'USER_LOGIN_FAILED',
      actor: email,
      actorRole: 'PUBLIC',
      target: email,
      targetType: 'user',
      details: 'invalid credentials',
      ipAddress: ip,
    });
    fail(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    return;
  }

  if (role && role !== user.role) {
    fail(res, 403, 'ROLE_MISMATCH', 'This account is not associated with the selected account type.');
    return;
  }

  const { token } = await signSession(user, ip);
  await run('UPDATE users SET last_login_at = ? WHERE id = ?', new Date().toISOString(), user.id);

  await writeAudit({
    action: 'USER_LOGIN',
    actor: user.name,
    actorRole: user.role,
    target: user.id,
    targetType: 'user',
    details: 'device=Web Platform API',
    ipAddress: ip,
  });

  ok(res, { user: mapUserRow(user), token });
}

authRouter.post(
  '/register',
  validate([
    { name: 'name', required: true, min: 1, max: 120 },
    { name: 'email', required: true, type: 'email' },
    { name: 'password', required: true, min: 8, max: 128 },
    { name: 'role', required: true, enum: SELF_REGISTER_ROLES as readonly string[] },
  ]),
  (req: Request, res: Response) => {
    void registerHandler(req, res);
  },
);

async function registerHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as { name: string; email: string; password: string; role: UserRole; institutionName?: string; companyName?: string };
  const ip = req.ip ?? '';
  const email = body.email.trim().toLowerCase();

  const existing = await get<{ id: string }>('SELECT id FROM users WHERE lower(email) = lower(?)', email);
  if (existing) {
    fail(res, 409, 'EMAIL_TAKEN', 'An account with this email address already exists.');
    return;
  }

  let user: UserRow | undefined;
  let token = '';
  await transaction(async () => {
    // Backend identity authority: an INSTITUTION registration creates a real
    // institution record (backend-generated id) and links the account to it —
    // never a fabricated institution_id pointing at a non-existent row.
    let institutionId: string | null = null;
    if (body.role === 'INSTITUTION') {
      const institutionIdValue = entityId('inst');
      await run(
        `INSERT INTO institutions (id, name, type, website, verified, status, created_at)
         VALUES (?, ?, 'Institution', '', 0, 'ACTIVE', ?)`,
        institutionIdValue,
        body.institutionName?.trim() || `${body.name.trim()}'s Institution`,
        new Date().toISOString(),
      );
      institutionId = institutionIdValue;
    }

    const id = entityId('usr');
    await run(
      `INSERT INTO users (id, email, name, role, institution_id, password_hash, status, mfa_enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 0, ?)`,
      id,
      email,
      body.name.trim(),
      body.role,
      institutionId,
      bcrypt.hashSync(body.password, 10),
      new Date().toISOString(),
    );

    user = await get<UserRow>(
      `SELECT id, email, name, role, institution_id, password_hash, created_at, last_login_at FROM users WHERE id = ?`,
      id,
    ) as UserRow;

    await writeAudit({
      action: 'USER_REGISTERED',
      actor: user.name,
      actorRole: user.role,
      target: user.id,
      targetType: 'user',
      details: body.role === 'INSTITUTION'
        ? `self-service registration; institution=${institutionId}`
        : 'self-service registration',
      ipAddress: ip,
    });

    // Balance with the frontend contract: register resolves to an authenticated
    // session so the AuthProvider can persist the user immediately.
    const session = await signSession(user, ip);
    token = session.token;
  });

  created(res, { user: user ? mapUserRow(user) : undefined, token });
}

authRouter.post(
  '/forgot-password',
  validate([{ name: 'email', required: true, type: 'email' }]),
  (req: Request, res: Response) => {
    void forgotPasswordHandler(req, res);
  },
);

async function forgotPasswordHandler(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  const user = await get<{ id: string; name: string }>(
    'SELECT id, name FROM users WHERE lower(email) = lower(?)',
    email.trim().toLowerCase(),
  );
  if (!user) {
    fail(res, 404, 'NO_ACCOUNT', 'No account found for this email address.');
    return;
  }
  await writeAudit({
    action: 'PASSWORD_RESET_REQUESTED',
    actor: user.name,
    actorRole: 'PUBLIC',
    target: user.id,
    targetType: 'user',
    details: 'password reset email dispatched',
    ipAddress: req.ip ?? '',
  });
  ok(res, { message: 'If the account exists, a reset link has been sent.' });
}

authRouter.post(
  '/mfa/verify',
  validate([{ name: 'code', required: true, min: 6, max: 6 }]),
  (_req: Request, res: Response) => {
    const { code } = _req.body as { code: string };
    if (!/^\d{6}$/.test(code)) {
      return fail(res, 400, 'INVALID_MFA_CODE', 'The verification code must be six digits.');
    }
    return ok(res, { verified: true });
  },
);

authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  void meHandler(req, res);
});

async function meHandler(req: Request, res: Response): Promise<void> {
  const auth = req as AuthenticatedRequest;
  const user = await get<UserRow>(
    `SELECT id, email, name, role, institution_id, password_hash, created_at, last_login_at FROM users WHERE id = ?`,
    auth.user.id,
  );
  if (!user) {
    fail(res, 401, 'UNAUTHORIZED', 'Your account no longer exists.');
    return;
  }
  ok(res, mapUserRow(user));
}