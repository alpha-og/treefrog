import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createLogger } from '@/utils/logger'

const log = createLogger('AuthStore')

export type AuthMode = 'clerk' | 'guest'

export interface User {
  id: string
  email?: string
  name?: string
  imageUrl?: string
}

export interface AuthState {
  mode: AuthMode
  isFirstLaunch: boolean
  sessionToken: string | null
  user: User | null
  _hasHydrated: boolean

  isGuest: () => boolean
  isClerk: () => boolean
  
  setMode: (mode: AuthMode) => void
  setSessionToken: (token: string | null) => void
  setUser: (user: User | null) => void
  markFirstLaunchComplete: () => void
  setHasHydrated: (state: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      mode: 'guest',
      isFirstLaunch: true,
      sessionToken: null,
      user: null,
      _hasHydrated: false,

      isGuest: () => get().mode === 'guest',
      isClerk: () => get().mode === 'clerk',

      setMode: (mode) => {
        set({ mode })
        log.debug('Auth mode set', { mode })
      },

      setSessionToken: (token) => {
        set({ sessionToken: token })
        log.debug('Session token updated', { hasToken: !!token })
      },

      setUser: (user) => {
        set({ user })
        log.debug('User updated', { userId: user?.id })
      },

      markFirstLaunchComplete: () => {
        set({ isFirstLaunch: false })
        log.debug('First launch completed')
      },

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      reset: () => {
        set({
          mode: 'guest',
          isFirstLaunch: false,
          sessionToken: null,
          user: null,
        })
        log.debug('Auth store reset')
      },
    }),
    {
      name: 'treefrog-auth',
      partialize: (state) => ({
        mode: state.mode,
        isFirstLaunch: state.isFirstLaunch,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
        log.debug('Auth store hydrated from localStorage')
      },
    }
  )
)
