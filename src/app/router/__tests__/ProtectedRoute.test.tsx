import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { AUTH_USER_KEY, AUTH_TOKEN_KEY } from '@/constants';
import type { User, UserRole } from '@/types';

const baseUser: User = {
  id: 'usr-test-001',
  email: 'holder@example.com',
  name: 'Test User',
  role: 'HOLDER',
  createdAt: '2024-01-01T00:00:00Z',
};

function makeUser(overrides: Partial<User> = {}): User {
  return { ...baseUser, ...overrides };
}

function renderProtected(allowedRoles: UserRole[]) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <AuthProvider>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={allowedRoles}>
                <div>Protected content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth/login" element={<div>Login Page</div>} />
          <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  afterEach(() => {
    window.localStorage.removeItem(AUTH_USER_KEY);
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  });

  it('renders children when authenticated with correct role', async () => {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(makeUser({ role: 'HOLDER' })));
    window.localStorage.setItem(AUTH_TOKEN_KEY, 'token');
    renderProtected(['HOLDER']);
    expect(await screen.findByText('Protected content')).toBeInTheDocument();
  });

  it('redirects to /auth/login when not authenticated', async () => {
    renderProtected(['HOLDER']);
    expect(await screen.findByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to /unauthorized when wrong role', async () => {
    window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(makeUser({ role: 'HOLDER' })));
    window.localStorage.setItem(AUTH_TOKEN_KEY, 'token');
    renderProtected(['ADMIN']);
    expect(await screen.findByText('Unauthorized Page')).toBeInTheDocument();
  });
});
