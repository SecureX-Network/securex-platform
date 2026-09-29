import { get } from '../db/database.js';
import type { AuthUser, UserRole } from '../middleware/auth.js';

// ---------------------------------------------------------------------------
// OBJECT-LEVEL (TENANT) AUTHORIZATION FOR CREDENTIALS
//
// The Platform API roles are deliberately preserved, but role membership alone
// is not authorization: a role says "this kind of user MAY write", never
// "this user may write THIS record". Every credential write therefore resolves
// ownership from the AUTHENTICATED USER plus the credential's actual database
// ownership. A client-supplied institutionId/issuerId is never an authorization
// decision — it is only ever a *request* that must be checked against that
// resolved ownership.
//
// Role split:
//   PLATFORM_ROLES   — network/platform administrators. Deliberate cross-institution
//                      access (credential governance across the whole network).
//   INSTITUTION_ROLES— tenant-scoped issuers. May only act on credentials that
//                      belong to the institution recorded on their own user row.
//   AUDITOR          — read-only. Deliberately NOT a credential writer.
//
// For the ISSUER role we additionally resolve the caller's own issuer record by
// email: when one exists, the caller may only act on credentials issued by that
// exact issuer. That is a strictly narrower grant than institution scope, so it
// cannot weaken the boundary.
// ---------------------------------------------------------------------------

/** Deliberate cross-institution credential governance. */
export const PLATFORM_ADMIN_ROLES: UserRole[] = ['ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN'];

/** Tenant-scoped credential writers. */
export const INSTITUTION_WRITER_ROLES: UserRole[] = ['INSTITUTION', 'ISSUER'];

/** Every role permitted to write credentials. AUDITOR is intentionally excluded. */
export const CREDENTIAL_WRITER_ROLES: UserRole[] = [
  ...INSTITUTION_WRITER_ROLES,
  ...PLATFORM_ADMIN_ROLES,
];

export function isPlatformAdmin(user: Pick<AuthUser, 'role'>): boolean {
  return PLATFORM_ADMIN_ROLES.includes(user.role);
}

export type AuthorizationDecision =
  | { allowed: true }
  | { allowed: false; status: 403; code: string; message: string };

const DENY: AuthorizationDecision = {
  allowed: false,
  status: 403,
  code: 'CREDENTIAL_OUT_OF_SCOPE',
  message: 'You do not have permission to act on this credential.',
};

export interface CredentialOwnership {
  institution_id: string;
  issuer_id: string;
}

/** Resolve the issuer record that belongs to this user, when one exists. */
async function issuerIdForUser(user: AuthUser): Promise<string | null> {
  const row = await get<{ id: string }>(
    'SELECT id FROM issuers WHERE lower(email) = lower(?)',
    user.email,
  );
  return row?.id ?? null;
}

/**
 * May `user` write to the credential owned by `ownership`?
 *
 * `ownership` MUST come from the credential's own database row — never from the
 * request body.
 */
export async function authorizeCredentialWrite(
  user: AuthUser,
  ownership: CredentialOwnership,
): Promise<AuthorizationDecision> {
  // Platform administrators keep their deliberate cross-institution access.
  if (isPlatformAdmin(user)) return { allowed: true };

  if (!INSTITUTION_WRITER_ROLES.includes(user.role)) return DENY;

  // Tenant scope comes from the authenticated user's own organization context.
  if (!user.institutionId) return DENY;
  if (user.institutionId !== ownership.institution_id) return DENY;

  // ISSUER role: if this user has an issuer record, restrict to it. An issuer
  // with no linked record has no proven ownership of any credential.
  if (user.role === 'ISSUER') {
    const ownIssuerId = await issuerIdForUser(user);
    if (!ownIssuerId || ownIssuerId !== ownership.issuer_id) return DENY;
  }

  return { allowed: true };
}

export interface ResolvedInstitution {
  institutionId: string;
  institutionName: string;
  /** True when the caller is a platform admin that explicitly selected the tenant. */
  selectedByAdmin: boolean;
}

export type InstitutionResolution =
  | { ok: true; institution: ResolvedInstitution }
  | { ok: false; status: number; code: string; message: string };

/**
 * Resolve the AUTHORITATIVE institution for an issuance request.
 *
 *   authenticated user -> authorized institution -> authorized issuer -> credential
 *
 * For tenant-scoped roles the institution is taken exclusively from the
 * authenticated user's organization context. If the client also sent an
 * institutionId it is only used to REJECT the request when it disagrees — it is
 * never accepted as the answer.
 */
export async function resolveIssuanceInstitution(
  user: AuthUser,
  requestedInstitutionId: string | undefined,
): Promise<InstitutionResolution> {
  const institutionId = isPlatformAdmin(user)
    ? requestedInstitutionId ?? user.institutionId
    : user.institutionId;

  if (!institutionId) {
    return {
      ok: false,
      status: 403,
      code: 'INSTITUTION_CONTEXT_REQUIRED',
      message:
        'Your account is not associated with an institution, so it cannot issue credentials.',
    };
  }

  if (
    !isPlatformAdmin(user) &&
    requestedInstitutionId !== undefined &&
    requestedInstitutionId !== user.institutionId
  ) {
    return {
      ok: false,
      status: 403,
      code: 'INSTITUTION_SCOPE_VIOLATION',
      message: 'You may only issue credentials for your own institution.',
    };
  }

  const institution = await get<{ id: string; name: string; status: string }>(
    'SELECT id, name, status FROM institutions WHERE id = ?',
    institutionId,
  );
  if (!institution) {
    return {
      ok: false,
      status: 400,
      code: 'UNKNOWN_INSTITUTION',
      message: 'Institution not found.',
    };
  }
  if (institution.status !== 'ACTIVE') {
    return {
      ok: false,
      status: 403,
      code: 'INSTITUTION_NOT_ACTIVE',
      message: 'This institution is not currently permitted to issue credentials.',
    };
  }

  return {
    ok: true,
    institution: {
      institutionId: institution.id,
      institutionName: institution.name,
      selectedByAdmin: isPlatformAdmin(user),
    },
  };
}

export interface ResolvedIssuer {
  issuerId: string;
  issuerName: string;
}

export type IssuerResolution =
  | { ok: true; issuer: ResolvedIssuer }
  | { ok: false; status: number; code: string; message: string };

/**
 * Resolve the AUTHORITATIVE issuer for an issuance request and prove the
 * issuer/institution combination is valid. The issuer's name is read from the
 * database, never taken from the request.
 */
export async function resolveIssuanceIssuer(
  user: AuthUser,
  requestedIssuerId: string | undefined,
  institutionId: string,
): Promise<IssuerResolution> {
  if (!requestedIssuerId) {
    return {
      ok: false,
      status: 400,
      code: 'UNKNOWN_ISSUER',
      message: 'Issuer not found.',
    };
  }

  const issuer = await get<{ id: string; name: string; institution_id: string; status: string }>(
    'SELECT id, name, institution_id, status FROM issuers WHERE id = ?',
    requestedIssuerId,
  );
  if (!issuer) {
    return {
      ok: false,
      status: 400,
      code: 'UNKNOWN_ISSUER',
      message: 'Issuer not found.',
    };
  }

  // The issuer must belong to the AUTHORITATIVE institution.
  if (issuer.institution_id !== institutionId) {
    return {
      ok: false,
      status: 403,
      code: 'ISSUER_INSTITUTION_MISMATCH',
      message: 'The selected issuer does not belong to this institution.',
    };
  }

  if (issuer.status !== 'ACTIVE') {
    return {
      ok: false,
      status: 403,
      code: 'ISSUER_NOT_ACTIVE',
      message: 'This issuer is not currently permitted to issue credentials.',
    };
  }

  // An ISSUER may only issue as itself.
  if (user.role === 'ISSUER') {
    const ownIssuerId = await issuerIdForUser(user);
    if (ownIssuerId !== issuer.id) {
      return {
        ok: false,
        status: 403,
        code: 'ISSUER_SCOPE_VIOLATION',
        message: 'You may only issue credentials as your own issuer account.',
      };
    }
  }

  return { ok: true, issuer: { issuerId: issuer.id, issuerName: issuer.name } };
}

/**
 * Can `user` READ the credential owned by `ownership`?
 *
 * Holders may read their own credentials; tenant roles may read their
 * institution's credentials; platform admins may read any. AUDITOR is
 * deliberately read-only and therefore permitted here.
 */
export function authorizeCredentialRead(
  user: AuthUser,
  ownership: CredentialOwnership & { holder_id?: string },
): AuthorizationDecision {
  if (isPlatformAdmin(user)) return { allowed: true };
  if (user.role === 'AUDITOR') return { allowed: true };

  if (user.role === 'HOLDER') {
    return ownership.holder_id === user.id ? { allowed: true } : DENY;
  }

  if (INSTITUTION_WRITER_ROLES.includes(user.role) || user.role === 'EMPLOYER') {
    if (!user.institutionId || user.institutionId !== ownership.institution_id) return DENY;
    return { allowed: true };
  }

  return DENY;
}

export type CredentialListScope =
  | { kind: 'all' }
  | { kind: 'holder'; holderId: string }
  | { kind: 'institution'; institutionId: string }
  | { kind: 'none' };

/**
 * The set of credentials `user` may list — the list-level equivalent of
 * authorizeCredentialRead, so a list can never be broader than the per-record
 * read rule it is composed from.
 *
 * A role that authorizes no read at all resolves to `none` (an empty list)
 * rather than `all`: a listing endpoint is a bulk read and must be scoped by the
 * same tenant boundary as a single fetch.
 */
export function credentialListScope(user: AuthUser): CredentialListScope {
  if (isPlatformAdmin(user) || user.role === 'AUDITOR') return { kind: 'all' };
  if (user.role === 'HOLDER') return { kind: 'holder', holderId: user.id };
  if (INSTITUTION_WRITER_ROLES.includes(user.role) || user.role === 'EMPLOYER') {
    if (user.institutionId) return { kind: 'institution', institutionId: user.institutionId };
  }
  return { kind: 'none' };
}
