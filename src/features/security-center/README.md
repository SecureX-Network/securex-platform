# Workspace: security-center

## Ownership

- Owner branch: `frontend/security-center`
- Scope: Security Center frontend.

## Purpose

The Security Center is the central security and monitoring area of SecureX. It
surfaces security posture, alerts, audit activity, credential integrity, and
system/authentication status for security administrators.

## Routes

Implemented (all lazy-loaded and reachable via the `DashboardLayout` sidebar):

| Route | Page | Roles |
| ----- | ---- | ----- |
| `/security` | Security Overview dashboard | ADMIN, SECURITY_ADMIN, NETWORK_ADMIN, AUDITOR |
| `/security/alerts` | Alert triage (severity/status filters, search, acknowledge/investigate/resolve) | ADMIN, SECURITY_ADMIN, AUDITOR |
| `/security/events` | Security activity timeline/table (filterable, paginated) | ADMIN, SECURITY_ADMIN, NETWORK_ADMIN, AUDITOR |
| `/security/settings` | System status (service health, active sessions, security config) | ADMIN, SECURITY_ADMIN, NETWORK_ADMIN, AUDITOR |

The Security Center sidebar also links to `/fraud` (Fraud & Tampering module) so
operators can jump to the detailed fraud/tampering experience.

An entry point was added to the Admin Console sidebar (`/admin/*`) under
"Security Center" so authenticated security roles can reach it naturally.

## Architecture

```
SecurityCenter pages (features/security-center/pages)
        │
        ▼
securityCenterService (features/security-center/services)
        ├─ IS_MOCK ? services/mock/data.ts  (alerts, audit, credentials, risks)
        └─ REAL  ? services/api/adminService.ts (existing admin endpoints, reused)
```

- Types: `features/security-center/types/security.ts`
- All data access goes through the service layer — no `fetch()` in UI components.
- Shared UI: `components/ui/*` (Card, Badge, Table, Input, Select, Pagination,
  Skeleton, EmptyState). No duplicated components.
- Shared conventions: `constants/badges.ts`, `constants/index.ts` (ROUTES),
  `utils/format.ts`, `hooks/useApi` pattern.

## API usage

Existing real-mode endpoints are reused from the shared admin service layer —
no new endpoints are invented for data that already has a backend:

| Service method | Real source |
| -------------- | ----------- |
| `getSecurityAlerts` | `getSecurityAlerts()` → `GET /admin/security/alerts` |
| `getSecurityEvents` | `getAuditEvents()` → `GET /admin/security/audit` |
| `getRiskAssessments` | `getFraudAlerts()` → `GET /admin/security/fraud` |

### Missing backend capabilities (honest behavior)

Aggregates with **no verified backend contract** in this repository deliberately
throw a documented `ApiError` in REAL mode instead of inventing a fake endpoint
or presenting fabricated numbers (matching the `fraud-tampering` module's
convention):

- `getSecurityOverview` → needs a posture-summary aggregate endpoint
- `getServiceHealth` → needs a per-service health endpoint
- `getActiveSessions` → needs a sessions endpoint
- `getCredentialIntegrityStats` → needs a credential-integrity aggregate endpoint
- `updateAlertStatus` → needs an alert lifecycle mutation endpoint

### Demo / fallback behavior

In mock mode (`VITE_USE_MOCK !== 'false'`), the service layer derives data from
the existing mock dataset (`services/mock/data.ts`):

- Alerts ← `MOCK_SECURITY_ALERTS`
- Events ← `MOCK_AUDIT_EVENTS` (mapped to security actions with severities)
- Risk assessments ← `MOCK_RISK_ASSESSMENTS`
- Credential integrity ← `MOCK_CREDENTIALS` status counts
- Service health / active sessions ← curated DEMO data clearly labeled via the
  existing `ModeIndicator` and service status dots (OPERATIONAL/DEGRADED/etc.)

The security score is computed deterministically from active alerts and severity,
matching the existing Admin Security page convention. No fake "100% secure"
claims are made; degraded/unknown states are rendered honestly.

### Backend endpoints still required

The following real backend endpoints do not exist yet and must be implemented by
the backend team before REAL mode can surface these Security Center sections:

- `GET .../security/overview` → posture summary numbers
- `GET .../security/health` → per-service health
- `GET .../security/sessions` → active sessions
- `GET .../security/credential-integrity` → integrity counts
- `PATCH .../security/alerts/:id` → alert lifecycle mutations

## Security notes

- No secrets, tokens, passwords, or private keys are rendered. Session rows
  show user, role, IP, device, and location — never credential material.
- The pages respect the existing `ProtectedRoute` role guards; no auth
  bypass is introduced.
- Never store production secrets in frontend source.

## What is NOT here

- Admin console pages under `/admin/security*` — owned by
  `src/features/holder-admin/` and intentionally not duplicated.
- The Fraud / Tampering implementation — lives in
  `src/features/fraud-tampering/`. Security Center only summarizes/composites
  from shared mock data and links to `/fraud` for detail.
- Direct `fetch()` calls — everything goes through the service layer.