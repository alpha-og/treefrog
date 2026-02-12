import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createLogger } from '@/utils/logger'

const log = createLogger('AuthStore')

export interface AuthState {
  user: {
    id: string
    email: string
    name: string
    profileImageUrl?: string
  } | null
  sessionToken: string | null
  isLoggedIn: boolean
  isLoading: boolean
  error: string | null

  // Actions
  setUser: (user: AuthState['user']) => void
  setSessionToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      sessionToken: null,
      isLoggedIn: false,
      isLoading: false,
      error: null,

      setUser: (user) => {
        set({ user, isLoggedIn: !!user })
        log.debug('User set', { userId: user?.id })
      },

      setSessionToken: (token) => {
        set({ sessionToken: token })
        if (token) {
          log.debug('Session token stored')
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => {
        set({ error })
        if (error) {
          log.error('Auth error', { error })
        }
      },

      logout: () => {
        set({
          user: null,
          sessionToken: null,
          isLoggedIn: false,
          error: null
        })
        log.debug('User logged out')
      }
    }),
    {
      name: 'treefrog-auth',
      partialize: (state) => ({
        sessionToken: state.sessionToken,
        user: state.user
      })
    }
  )
)
