import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import * as api from '@/features/auth/api';
import type { Role, User } from '@/features/auth/types';

const TOKEN_KEY = 'dynavolt.token';

type AuthValue = {
  token: string | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, role?: Role) => Promise<void>;
  signOut: () => Promise<void>;
  /** Replaces the cached account after the API returns an updated one. */
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restore() {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!stored) return;

        const found = await api.profile(stored);
        if (active) {
          setToken(stored);
          setUser(found);
        }
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } finally {
        if (active) setLoading(false);
      }
    }

    void restore();

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string, role?: Role) => {
    const result = await api.login(email, password, role);
    await SecureStore.setItemAsync(TOKEN_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ token, user, loading, signIn, signOut, setUser }),
    [token, user, loading, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
