import { AUTH_USER_KEY, IS_MOCK } from '@/constants';
import { MOCK_USERS, mockDelay } from '@/services/mock';
import type { User, UserRole } from '@/types';
import { fetchAPI, unwrapResponse } from './client';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  institutionName?: string;
  companyName?: string;
}

export interface AuthResult {
  user: User;
  token: string;
}

export async function login(
  email: string,
  password: string,
  role?: UserRole,
): Promise<AuthResult> {
  if (IS_MOCK) {
    await mockDelay();
    const match = MOCK_USERS.find(
      (u) =>
        u.email.toLowerCase() === email.trim().toLowerCase() &&
        (!role || u.role === role),
    );
    if (!match || match.password !== password) {
      throw new Error('Invalid email or password.');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...user } = match;
    return { user, token: `${match.id}:${Date.now()}:mock-token` };
  }
  const response = await fetchAPI<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
  return unwrapResponse(response);
}

export async function register(data: RegisterData): Promise<{ user: User }> {
  if (IS_MOCK) {
    await mockDelay();
    const user: User = {
      id: `usr-${Date.now()}`,
      name: data.name,
      email: data.email,
      role: data.role,
      createdAt: new Date().toISOString(),
    };
    return { user };
  }
  const response = await fetchAPI<{ user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return unwrapResponse(response);
}

export async function forgotPassword(email: string): Promise<void> {
  if (IS_MOCK) {
    await mockDelay();
    const exists = MOCK_USERS.some(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!exists) {
      throw new Error('No account found for this email address.');
    }
    return;
  }
  await fetchAPI<void>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyMFA(code: string): Promise<{ verified: boolean }> {
  if (IS_MOCK) {
    await mockDelay();
    return { verified: /^\d{6}$/.test(code.trim()) };
  }
  const response = await fetchAPI<{ verified: boolean }>('/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  return unwrapResponse(response);
}

export async function getProfile(): Promise<User> {
  if (IS_MOCK) {
    await mockDelay(200);
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) {
      throw new Error('No authenticated session found.');
    }
    return JSON.parse(raw) as User;
  }
  const response = await fetchAPI<User>('/auth/me');
  return unwrapResponse(response);
}