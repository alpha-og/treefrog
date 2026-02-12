import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession, User } from '@treefrog/types';
import { userService } from '@treefrog/services';

interface AuthState {
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;
  setSession: (session: AuthSession | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      isLoading: false,
      error: null,
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      logout: () => set({ session: null }),
    }),
    {
      name: 'treefrog-auth',
    }
  )
);

export const useAuth = () => {
  const { session, isLoading, error, setSession, setLoading, setError, logout } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

    const initAuth = async () => {
      setLoading(true);
      try {
        const user = await userService.getCurrentUser();
        if (user) {
          const stored = localStorage.getItem('treefrog-auth');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.state?.session?.token) {
              setSession({
                user,
                token: parsed.state.session.token,
                isAuthenticated: true,
              });
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auth initialization failed');
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initAuth();
  }, [initialized, setLoading, setSession, setError]);

  return {
    session,
    isAuthenticated: !!session?.isAuthenticated,
    user: session?.user,
    isLoading,
    error,
    logout: () => {
      userService.logout();
      logout();
    },
  };
};
