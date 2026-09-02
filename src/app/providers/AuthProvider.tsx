import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, IS_MOCK } from '@/constants';
import {
  login as apiLogin,
  register as apiRegister,
  type RegisterData,
} from '@/services/api/authService';
import { MOCK_USERS, mockDelay } from '@/services/mock';
import type { User, UserRole } from '@/types';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [loading, setLoading] = useState(true);

  const isAuthenticated = user !== null;

  useEffect(() => {
    let active = true;
    mockDelay(IS_MOCK ? 200 : 0).then(() => {
      if (active) {
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const persistSession = useCallback((nextUser: User, token: string) => {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (email: string, password: string, role?: UserRole) => {
      if (IS_MOCK) {
        await mockDelay();
        const normalized = email.trim().toLowerCase();
        const mockUser = MOCK_USERS.find(
          (u) =>
            u.email.toLowerCase() === normalized &&
            (!role || u.role === role),
        );
        if (!mockUser || mockUser.password !== password) {
          throw new Error('Invalid email or password.');
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _pw, ...safeUser } = mockUser;
        persistSession(safeUser, `${mockUser.id}:${Date.now()}:mock-token`);
        return;
      }
      const { user: authenticatedUser, token } = await apiLogin(
        email,
        password,
        role,
      );
      persistSession(authenticatedUser, token);
    },
    [persistSession],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setUser(null);
  }, []);

  const register = useCallback(
    async (data: RegisterData) => {
      if (IS_MOCK) {
        await mockDelay();
        const nextUser: User = {
          id: `usr-${Date.now()}`,
          name: data.name,
          email: data.email,
          role: data.role,
          createdAt: new Date().toISOString(),
        };
        persistSession(nextUser, `${nextUser.id}:${Date.now()}:mock-token`);
        return;
      }
      const { user: registeredUser } = await apiRegister(data);
      persistSession(registeredUser, `token-${registeredUser.id}`);
    },
    [persistSession],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated,
      loading,
      login,
      logout,
      register,
    }),
    [user, isAuthenticated, loading, login, logout, register],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;