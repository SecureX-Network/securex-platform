import { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { NotFoundPage } from '@/components/shared/NotFoundPage';
import { PageLoader } from '@/components/shared/PageLoader';
import { UnauthorizedPage } from '@/components/shared/UnauthorizedPage';
import { ExternalRedirect } from '@/components/shared/ExternalRedirect';
import {
  END_USER_ROLES,
  OPERATOR_ROLES,
  VERIFY_ROLES,
} from '@/app/config/navigation';
import type { UserRole } from '@/types';

// ---------------------------------------------------------------------------
// ROUTE MAP
//
// Three clearly separated parts:
//
//   PUBLIC          landing, authentication, and the public verifier. None of
//                   it requires an account.
//   WORKSPACE       the credential application. Canonical URLs are short and
//                   public-facing (/home, /credentials, /verify-credential)
//                   because they appear on screen during a demo and in shared
//                   links. Every role lands on /home and is shown the surface
//                   it is responsible for.
//   ADMINISTRATION  operational tooling, gated to operator roles. Deep
//                   operational control is conceptually owned by the separate
//                   Control Center; the routes are preserved here for internal
//                   roles but ordinary users can neither see nor reach them.
//
// The block explorer sits in the workspace rather than in administration
// because blocks, transactions and validator state are public ledger data —
// but the attack simulation and evidence tooling behind it do not, so those
// are gated separately below.
//
// The set of roles each route allows mirrors `navigationFor(role)` in
// @/app/config/navigation. A link that is not offered must not resolve, and a
// link that is offered must always resolve.
//
// Legacy /holder, /employer and /institution/dashboard paths are kept as
// redirects so existing bookmarks and deep links keep working.
//
// These route guards are a UX affordance only. Every route is independently
// authorized by the server, which is the sole security boundary.
// ---------------------------------------------------------------------------

const PUBLIC_SITE_URL = 'https://securex.sp-net.in';

const END_USERS = END_USER_ROLES;
const OPERATORS = OPERATOR_ROLES;
const EVERYONE: UserRole[] = [...END_USERS, ...OPERATORS];
const VERIFIERS = VERIFY_ROLES;

const AppEntryPage = lazy(() => import('@/features/auth/pages/AppEntryPage'));
const HomePage = lazy(() => import('@/features/home/pages/HomePage'));
const ActivityPage = lazy(() => import('@/features/activity/pages/ActivityPage'));

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const MfaPage = lazy(() => import('@/features/auth/pages/MfaPage'));
const AccountSettingsPage = lazy(() => import('@/features/auth/pages/AccountSettingsPage'));

const VerifyPage = lazy(() => import('@/features/public-verification/pages/VerifyPage'));
const VerifyCredentialPage = lazy(() => import('@/features/public-verification/pages/VerifyCredentialPage'));
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage'));

// Credential wallet
const HolderCredentialsPage = lazy(() => import('@/features/holder-admin/pages/HolderCredentialsPage'));
const HolderCredentialDetailPage = lazy(() => import('@/features/holder-admin/pages/HolderCredentialDetailPage'));
const HolderWalletPage = lazy(() => import('@/features/holder-admin/pages/HolderWalletPage'));
const HolderSharePage = lazy(() => import('@/features/holder-admin/pages/HolderSharePage'));

// Verification workspace
const VerifyCredentialFlowPage = lazy(() => import('@/features/verification/pages/VerifyCredentialFlowPage'));
const VerificationHistoryPage = lazy(() => import('@/features/verification/pages/VerificationHistoryPage'));

// Institution / issuer
const InstitutionCredentialsPage = lazy(() => import('@/features/institution-employer/pages/InstitutionCredentialsPage'));
const InstitutionHoldersPage = lazy(() => import('@/features/institution-employer/pages/InstitutionHoldersPage'));
const InstitutionIssuersPage = lazy(() => import('@/features/institution-employer/pages/InstitutionIssuersPage'));
const InstitutionIssuerDetailPage = lazy(() => import('@/features/institution-employer/pages/InstitutionIssuerDetailPage'));
const InstitutionIssuePage = lazy(() => import('@/features/institution-employer/pages/InstitutionIssuePage'));
const InstitutionTemplatesPage = lazy(() => import('@/features/institution-employer/pages/InstitutionTemplatesPage'));

// Administration
// The /admin index reuses `HomePage`, which already dispatches operator roles
// to the Operators home. One dispatcher, so the operator overview cannot drift
// between the two routes that render it.
const AdminInstitutionsPage = lazy(() => import('@/features/holder-admin/pages/AdminInstitutionsPage'));
const AdminIssuersPage = lazy(() => import('@/features/holder-admin/pages/AdminIssuersPage'));
const AdminUsersPage = lazy(() => import('@/features/holder-admin/pages/AdminUsersPage'));
const AdminSecurityPage = lazy(() => import('@/features/holder-admin/pages/AdminSecurityPage'));
const AdminSecurityAlertsPage = lazy(() => import('@/features/holder-admin/pages/AdminSecurityAlertsPage'));
const AdminSecurityAuditPage = lazy(() => import('@/features/holder-admin/pages/AdminSecurityAuditPage'));

// Network (operator-only; conceptually owned by the Control Center)
const ExplorerOverviewPage = lazy(() => import('@/features/explorer-simulation/pages/ExplorerOverviewPage'));
const ExplorerBlocksPage = lazy(() => import('@/features/explorer-simulation/pages/ExplorerBlocksPage'));
const ExplorerBlockDetailPage = lazy(() => import('@/features/explorer-simulation/pages/ExplorerBlockDetailPage'));
const ExplorerTransactionsPage = lazy(() => import('@/features/explorer-simulation/pages/ExplorerTransactionsPage'));
const ExplorerTransactionDetailPage = lazy(() => import('@/features/explorer-simulation/pages/ExplorerTransactionDetailPage'));
const ExplorerValidatorsPage = lazy(() => import('@/features/explorer-simulation/pages/ExplorerValidatorsPage'));
const ExplorerValidatorDetailPage = lazy(() => import('@/features/explorer-simulation/pages/ExplorerValidatorDetailPage'));
const ExplorerNetworkPage = lazy(() => import('@/features/explorer-simulation/pages/ExplorerNetworkPage'));
const AttackSimulationPage = lazy(() => import('@/features/explorer-simulation/pages/AttackSimulationPage'));
const AttackSimulationDetailPage = lazy(() => import('@/features/explorer-simulation/pages/AttackSimulationDetailPage'));
const SecurityEvidencePage = lazy(() => import('@/features/explorer-simulation/pages/SecurityEvidencePage'));

// Security operations
const SecurityOverviewPage = lazy(() => import('@/features/security-center/pages/SecurityOverviewPage'));
const SecurityAlertsPage = lazy(() => import('@/features/security-center/pages/SecurityAlertsPage'));
const SecurityEventsPage = lazy(() => import('@/features/security-center/pages/SecurityEventsPage'));
const SecuritySettingsPage = lazy(() => import('@/features/security-center/pages/SecuritySettingsPage'));
const FraudDashboardPage = lazy(() => import('@/features/fraud-tampering/pages/FraudDashboardPage'));

function withSuspense(element: ReactNode): ReactNode {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

/**
 * A shell layout guarded to a set of roles. `AppShell` renders the route
 * `Outlet`, so every child route below a `shell(...)` element is rendered
 * inside the authenticated chrome.
 */
function shell(allowedRoles: UserRole[]) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <AppShell />
    </ProtectedRoute>
  );
}

/**
 * A shell for pages that are readable both with and without an account.
 *
 * The block explorer is public ledger data and the public landing page links
 * straight to it, so it cannot sit behind a login. A signed-in visitor should
 * still get the application chrome, though, rather than a bare page in the
 * middle of a session. This renders the shell when there is a user and the
 * route outlet alone when there is not.
 */
function optionalShell() {
  return <OptionalShellLayout />;
}

function OptionalShellLayout() {
  const { user } = useAuth();
  return user ? <AppShell /> : <Outlet />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* ── Public ─────────────────────────────────────────────────────── */}
      <Route path="/" element={withSuspense(<AppEntryPage />)} />

      {/* Marketing routes belong to the public website (securex.sp-net.in) */}
      <Route path="/about" element={<ExternalRedirect to={`${PUBLIC_SITE_URL}/about`} />} />
      <Route path="/how-it-works" element={<ExternalRedirect to={`${PUBLIC_SITE_URL}/how-it-works`} />} />
      <Route path="/contact" element={<ExternalRedirect to={`${PUBLIC_SITE_URL}/contact`} />} />

      {/* Authentication. Unauthenticated by design; each page routes onward
          through `dashboardFor(role)` so the landing surface is decided in one
          place. */}
      <Route path="/auth/login" element={withSuspense(<LoginPage />)} />
      <Route path="/auth/register" element={withSuspense(<RegisterPage />)} />
      <Route path="/auth/forgot-password" element={withSuspense(<ForgotPasswordPage />)} />
      <Route path="/auth/mfa" element={withSuspense(<MfaPage />)} />

      {/* Verification is public: anyone may check a credential ID. */}
      <Route path="/verify" element={withSuspense(<VerifyPage />)} />
      <Route path="/verify/:credentialId" element={withSuspense(<VerifyCredentialPage />)} />

      {/* ── Authenticated workspace ────────────────────────────────────── */}
      {/* Every role lands on /home; the page renders the surface that role is
          responsible for. See `roleRouting.ts`. */}
      <Route path="/home" element={shell(EVERYONE)}>
        <Route index element={withSuspense(<HomePage />)} />
      </Route>

      {/* Credential wallet */}
      <Route path="/credentials" element={shell(['HOLDER'])}>
        <Route index element={withSuspense(<HolderCredentialsPage />)} />
      </Route>
      <Route path="/credentials/:credentialId" element={shell(['HOLDER'])}>
        <Route index element={withSuspense(<HolderCredentialDetailPage />)} />
      </Route>
      <Route path="/credentials/:credentialId/share" element={shell(['HOLDER'])}>
        <Route index element={withSuspense(<HolderSharePage />)} />
      </Route>
      <Route path="/share" element={shell(['HOLDER'])}>
        <Route index element={withSuspense(<HolderSharePage />)} />
      </Route>
      <Route path="/wallet" element={shell(['HOLDER'])}>
        <Route index element={withSuspense(<HolderWalletPage />)} />
      </Route>

      {/* Verification workspace (in-shell, role aware) */}
      <Route path="/verify-credential" element={shell(VERIFIERS)}>
        <Route index element={withSuspense(<VerifyCredentialFlowPage />)} />
      </Route>
      <Route path="/verification-history" element={shell(VERIFIERS)}>
        <Route index element={withSuspense(<VerificationHistoryPage />)} />
      </Route>

      {/* Institution / issuer */}
      <Route path="/institution" element={shell(['INSTITUTION', 'ISSUER', 'ADMIN'])}>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="credentials" element={withSuspense(<InstitutionCredentialsPage />)} />
        <Route path="holders" element={withSuspense(<InstitutionHoldersPage />)} />
        <Route path="issuers" element={withSuspense(<InstitutionIssuersPage />)} />
        <Route path="issuers/:issuerId" element={withSuspense(<InstitutionIssuerDetailPage />)} />
        <Route path="issue" element={withSuspense(<InstitutionIssuePage />)} />
        <Route path="templates" element={withSuspense(<InstitutionTemplatesPage />)} />
      </Route>

      {/* Shared account surfaces */}
      <Route path="/activity" element={shell(EVERYONE)}>
        <Route index element={withSuspense(<ActivityPage />)} />
      </Route>
      <Route path="/notifications" element={shell(EVERYONE)}>
        <Route index element={withSuspense(<NotificationsPage />)} />
      </Route>
      <Route path="/account" element={shell(EVERYONE)}>
        <Route index element={<Navigate to="/account/settings" replace />} />
        <Route path="settings" element={withSuspense(<AccountSettingsPage />)} />
      </Route>

      {/* ── Administration (operator roles only) ───────────────────────── */}
      <Route path="/admin" element={shell(OPERATORS)}>
        <Route index element={withSuspense(<HomePage />)} />
        <Route path="institutions" element={withSuspense(<AdminInstitutionsPage />)} />
        <Route path="issuers" element={withSuspense(<AdminIssuersPage />)} />
        <Route path="users" element={withSuspense(<AdminUsersPage />)} />
        <Route path="security" element={withSuspense(<AdminSecurityPage />)} />
        <Route path="security/alerts" element={withSuspense(<AdminSecurityAlertsPage />)} />
        <Route path="security/audit" element={withSuspense(<AdminSecurityAuditPage />)} />
      </Route>

      <Route path="/security" element={shell(OPERATORS)}>
        <Route index element={withSuspense(<SecurityOverviewPage />)} />
        <Route path="alerts" element={withSuspense(<SecurityAlertsPage />)} />
        <Route path="events" element={withSuspense(<SecurityEventsPage />)} />
        <Route path="settings" element={withSuspense(<SecuritySettingsPage />)} />
      </Route>

      <Route path="/fraud" element={shell(OPERATORS)}>
        <Route index element={withSuspense(<FraudDashboardPage />)} />
      </Route>

      {/* Block explorer. Blocks, transactions, validators and peer state are
          public ledger data, so they are readable without an account — the
          public landing page links straight here, and gating it behind a login
          turned that link into a dead end. The attack simulation and the
          security-evidence viewer are operational tooling and stay gated to
          operator roles, which is why they live in their own shell rather than
          under the public one. */}
      <Route path="/explorer" element={optionalShell()}>
        <Route index element={withSuspense(<ExplorerOverviewPage />)} />
        <Route path="blocks" element={withSuspense(<ExplorerBlocksPage />)} />
        <Route path="blocks/:height" element={withSuspense(<ExplorerBlockDetailPage />)} />
        <Route path="transactions" element={withSuspense(<ExplorerTransactionsPage />)} />
        <Route path="transactions/:txId" element={withSuspense(<ExplorerTransactionDetailPage />)} />
        <Route path="validators" element={withSuspense(<ExplorerValidatorsPage />)} />
        <Route path="validators/:id" element={withSuspense(<ExplorerValidatorDetailPage />)} />
        <Route path="network" element={withSuspense(<ExplorerNetworkPage />)} />
      </Route>

      <Route path="/explorer" element={shell(OPERATORS)}>
        <Route path="attack-simulation" element={withSuspense(<AttackSimulationPage />)} />
        <Route path="attack-simulation/:id" element={withSuspense(<AttackSimulationDetailPage />)} />
        <Route path="security/evidence/:id" element={withSuspense(<SecurityEvidencePage />)} />
      </Route>

      {/* ── Legacy paths ───────────────────────────────────────────────── */}
      {/* Kept so existing bookmarks and shared links keep resolving to the
          canonical user-facing URL. */}
      <Route path="/holder" element={<Navigate to="/home" replace />} />
      <Route path="/holder/dashboard" element={<Navigate to="/home" replace />} />
      <Route path="/holder/credentials" element={<Navigate to="/credentials" replace />} />
      <Route path="/holder/credentials/:credentialId" element={<Navigate to="/credentials/:credentialId" replace />} />
      <Route path="/holder/credentials/:credentialId/share" element={<Navigate to="/credentials/:credentialId/share" replace />} />
      <Route path="/holder/share" element={<Navigate to="/share" replace />} />
      <Route path="/holder/wallet" element={<Navigate to="/wallet" replace />} />
      <Route path="/holder/notifications" element={<Navigate to="/notifications" replace />} />
      <Route path="/holder/settings" element={<Navigate to="/account/settings" replace />} />

      <Route path="/employer" element={<Navigate to="/home" replace />} />
      <Route path="/employer/dashboard" element={<Navigate to="/home" replace />} />
      <Route path="/employer/verify" element={<Navigate to="/verify-credential" replace />} />
      <Route path="/employer/history" element={<Navigate to="/verification-history" replace />} />

      <Route path="/institution/dashboard" element={<Navigate to="/home" replace />} />
      <Route path="/admin/dashboard" element={<Navigate to="/home" replace />} />

      {/* ── Misc ───────────────────────────────────────────────────────── */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
