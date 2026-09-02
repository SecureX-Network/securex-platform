import { Navigate, useLocation } from 'react-router-dom';
import { PageLoader } from '@/components/shared/PageLoader';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader label="Checking session…" />;
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}