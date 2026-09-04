import { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  FileCode,
  History,
  IdCard,
  LayoutDashboard,
  PlusCircle,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';
import { ProtectedRoute } from './ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { HolderLayout } from '@/components/layout/HolderLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { NotFoundPage } from '@/components/shared/NotFoundPage';
import { PageLoader } from '@/components/shared/PageLoader';
import { UnauthorizedPage } from '@/components/shared/UnauthorizedPage';
import type { NavItem } from '@/components/layout/Sidebar';

const HomePage = lazy(() => import('@/features/public-verification/pages/HomePage'));
const AboutPage = lazy(() => import('@/features/public-verification/pages/AboutPage'));
const HowItWorksPage = lazy(() => import('@/features/public-verification/pages/HowItWorksPage'));
const ContactPage = lazy(() => import('@/features/public-verification/pages/ContactPage'));

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const MfaPage = lazy(() => import('@/features/auth/pages/MfaPage'));

const VerifyPage = lazy(() => import('@/features/public-verification/pages/VerifyPage'));
const VerifyCredentialPage = lazy(() => import('@/features/public-verification/pages/VerifyCredentialPage'));

const InstitutionDashboardPage = lazy(() => import('@/features/institution-employer/pages/InstitutionDashboardPage'));
const InstitutionCredentialsPage = lazy(() => import('@/features/institution-employer/pages/InstitutionCredentialsPage'));
const InstitutionIssuersPage = lazy(() => import('@/features/institution-employer/pages/InstitutionIssuersPage'));
const InstitutionIssuerDetailPage = lazy(() => import('@/features/institution-employer/pages/InstitutionIssuerDetailPage'));
const InstitutionIssuePage = lazy(() => import('@/features/institution-employer/pages/InstitutionIssuePage'));
const InstitutionTemplatesPage = lazy(() => import('@/features/institution-employer/pages/InstitutionTemplatesPage'));

const HolderDashboardPage = lazy(() => import('@/features/holder-admin/pages/HolderDashboardPage'));
const HolderCredentialsPage = lazy(() => import('@/features/holder-admin/pages/HolderCredentialsPage'));
const HolderCredentialDetailPage = lazy(() => import('@/features/holder-admin/pages/HolderCredentialDetailPage'));
const HolderSharePage = lazy(() => import('@/features/holder-admin/pages/HolderSharePage'));
const HolderNotificationsPage = lazy(() => import('@/features/holder-admin/pages/HolderNotificationsPage'));
const HolderSettingsPage = lazy(() => import('@/features/holder-admin/pages/HolderSettingsPage'));

const EmployerDashboardPage = lazy(() => import('@/features/institution-employer/pages/EmployerDashboardPage'));
const EmployerVerifyPage = lazy(() => import('@/features/institution-employer/pages/EmployerVerifyPage'));
const EmployerHistoryPage = lazy(() => import('@/features/institution-employer/pages/EmployerHistoryPage'));

const AdminDashboardPage = lazy(() => import('@/features/holder-admin/pages/AdminDashboardPage'));
const AdminInstitutionsPage = lazy(() => import('@/features/holder-admin/pages/AdminInstitutionsPage'));
const AdminIssuersPage = lazy(() => import('@/features/holder-admin/pages/AdminIssuersPage'));
const AdminUsersPage = lazy(() => import('@/features/holder-admin/pages/AdminUsersPage'));
const AdminSecurityPage = lazy(() => import('@/features/holder-admin/pages/AdminSecurityPage'));
const AdminSecurityAlertsPage = lazy(() => import('@/features/holder-admin/pages/AdminSecurityAlertsPage'));
const AdminSecurityAuditPage = lazy(() => import('@/features/holder-admin/pages/AdminSecurityAuditPage'));
const AdminSettingsPage = lazy(() => import('@/features/holder-admin/pages/AdminSettingsPage'));

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

const institutionNavigation: NavItem[] = [
  { label: 'Dashboard', path: '/institution/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Credentials', path: '/institution/credentials', icon: IdCard },
  { label: 'Issuers', path: '/institution/issuers', icon: Users },
  { label: 'Templates', path: '/institution/templates', icon: FileCode },
  { label: 'Issue Credential', path: '/institution/issue', icon: PlusCircle },
];

const employerNavigation: NavItem[] = [
  { label: 'Dashboard', path: '/employer/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Verify Credential', path: '/employer/verify', icon: ShieldCheck },
  { label: 'Verification History', path: '/employer/history', icon: History },
];

const adminNavigation: NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Institutions', path: '/admin/institutions', icon: Building2 },
  { label: 'Issuers', path: '/admin/issuers', icon: Users },
  { label: 'Users', path: '/admin/users', icon: UserCog },
  { label: 'Security', path: '/admin/security', icon: ShieldAlert },
  { label: 'Security Alerts', path: '/admin/security/alerts', icon: AlertTriangle, badge: '2' },
  { label: 'Audit Log', path: '/admin/security/audit', icon: ScrollText },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

function withSuspense(element: ReactNode): ReactNode {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public website */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={withSuspense(<HomePage />)} />
        <Route path="/about" element={withSuspense(<AboutPage />)} />
        <Route path="/how-it-works" element={withSuspense(<HowItWorksPage />)} />
        <Route path="/contact" element={withSuspense(<ContactPage />)} />
      </Route>

      {/* Authentication */}
      <Route path="/auth/login" element={withSuspense(<LoginPage />)} />
      <Route path="/auth/register" element={withSuspense(<RegisterPage />)} />
      <Route path="/auth/forgot-password" element={withSuspense(<ForgotPasswordPage />)} />
      <Route path="/auth/mfa" element={withSuspense(<MfaPage />)} />

      {/* Verification */}
      <Route path="/verify" element={withSuspense(<VerifyPage />)} />
      <Route path="/verify/:credentialId" element={withSuspense(<VerifyCredentialPage />)} />

      {/* Institution */}
      <Route
        path="/institution"
        element={
          <ProtectedRoute allowedRoles={['INSTITUTION', 'ADMIN']}>
            <DashboardLayout navigation={institutionNavigation} title="Institution" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/institution/dashboard" replace />} />
        <Route path="dashboard" element={withSuspense(<InstitutionDashboardPage />)} />
        <Route path="credentials" element={withSuspense(<InstitutionCredentialsPage />)} />
        <Route path="issuers" element={withSuspense(<InstitutionIssuersPage />)} />
        <Route path="issuers/:issuerId" element={withSuspense(<InstitutionIssuerDetailPage />)} />
        <Route path="issue" element={withSuspense(<InstitutionIssuePage />)} />
        <Route path="templates" element={withSuspense(<InstitutionTemplatesPage />)} />
      </Route>

      {/* Holder */}
      <Route
        path="/holder"
        element={
          <ProtectedRoute allowedRoles={['HOLDER']}>
            <HolderLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/holder/credentials" replace />} />
        <Route path="dashboard" element={withSuspense(<HolderDashboardPage />)} />
        <Route path="credentials" element={withSuspense(<HolderCredentialsPage />)} />
        <Route path="credentials/:credentialId" element={withSuspense(<HolderCredentialDetailPage />)} />
        <Route path="share" element={withSuspense(<HolderSharePage />)} />
        <Route path="notifications" element={withSuspense(<HolderNotificationsPage />)} />
        <Route path="settings" element={withSuspense(<HolderSettingsPage />)} />
      </Route>

      {/* Employer */}
      <Route
        path="/employer"
        element={
          <ProtectedRoute allowedRoles={['EMPLOYER', 'ADMIN']}>
            <DashboardLayout navigation={employerNavigation} title="Employer" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/employer/dashboard" replace />} />
        <Route path="dashboard" element={withSuspense(<EmployerDashboardPage />)} />
        <Route path="verify" element={withSuspense(<EmployerVerifyPage />)} />
        <Route path="history" element={withSuspense(<EmployerHistoryPage />)} />
      </Route>

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'SECURITY_ADMIN', 'NETWORK_ADMIN', 'AUDITOR']}>
            <DashboardLayout navigation={adminNavigation} title="Admin Console" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={withSuspense(<AdminDashboardPage />)} />
        <Route path="institutions" element={withSuspense(<AdminInstitutionsPage />)} />
        <Route path="issuers" element={withSuspense(<AdminIssuersPage />)} />
        <Route path="users" element={withSuspense(<AdminUsersPage />)} />
        <Route path="security" element={withSuspense(<AdminSecurityPage />)} />
        <Route path="security/alerts" element={withSuspense(<AdminSecurityAlertsPage />)} />
        <Route path="security/audit" element={withSuspense(<AdminSecurityAuditPage />)} />
        <Route path="settings" element={withSuspense(<AdminSettingsPage />)} />
      </Route>

      {/* Explorer */}
      <Route path="/explorer" element={withSuspense(<ExplorerOverviewPage />)} />
      <Route path="/explorer/blocks" element={withSuspense(<ExplorerBlocksPage />)} />
      <Route path="/explorer/blocks/:height" element={withSuspense(<ExplorerBlockDetailPage />)} />
      <Route path="/explorer/transactions" element={withSuspense(<ExplorerTransactionsPage />)} />
      <Route path="/explorer/transactions/:txId" element={withSuspense(<ExplorerTransactionDetailPage />)} />
      <Route path="/explorer/validators" element={withSuspense(<ExplorerValidatorsPage />)} />
      <Route path="/explorer/validators/:id" element={withSuspense(<ExplorerValidatorDetailPage />)} />
      <Route path="/explorer/network" element={withSuspense(<ExplorerNetworkPage />)} />
      <Route path="/explorer/attack-simulation" element={withSuspense(<AttackSimulationPage />)} />
      <Route path="/explorer/attack-simulation/:id" element={withSuspense(<AttackSimulationDetailPage />)} />
      <Route path="/explorer/security/evidence/:id" element={withSuspense(<SecurityEvidencePage />)} />

      {/* Misc */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;