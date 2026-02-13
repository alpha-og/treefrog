import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createLogger } from '@/utils/logger'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

const log = createLogger('AuthStore')

export type AuthMode = 'supabase' | 'guest'

export interface User {
  id: string
  email?: string
  name?: string
  imageUrl?: string
}

export interface AuthState {
  mode: AuthMode
  isFirstLaunch: boolean
  session: Session | null
  sessionToken: string | null
  user: User | null
  _hasHydrated: boolean

  isGuest: () => boolean
  isAuthenticated: () => boolean
  
  setMode: (mode: AuthMode) => void
  setSession: (session: Session | null) => void
  setSessionToken: (token: string | null) => void
  setUser: (user: User | null) => void
  setUserFromSupabase: (user: SupabaseUser | null) => void
  markFirstLaunchComplete: () => void
  setHasHydrated: (state: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      mode: 'guest',
      isFirstLaunch: true,
      session: null,
      sessionToken: null,
      user: null,
      _hasHydrated: false,

      isGuest: () => get().mode === 'guest',
      isAuthenticated: () => get().mode === 'supabase' && !!get().sessionToken && !!get().user,

      setMode: (mode) => {
        set({ mode })
        log.debug('Auth mode set', { mode })
      },

      setSession: (session) => {
        set({ 
          session,
          sessionToken: session?.access_token || null,
        })
        log.debug('Session updated', { hasSession: !!session })
      },

      setSessionToken: (token) => {
        set({ sessionToken: token })
        log.debug('Session token updated', { hasToken: !!token })
      },

      setUser: (user) => {
        set({ user })
        log.debug('User updated', { userId: user?.id })
      },

      setUserFromSupabase: (supabaseUser) => {
        if (!supabaseUser) {
          set({ user: null })
          return
        }
        const user: User = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name,
          imageUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
        }
        set({ user })
        log.debug('User set from Supabase', { userId: user.id })
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
          session: null,
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
      onRehydrationStorage: () => (state) => {
        state?.setHasHydrated(true)
        log.debug('Auth store hydrated from localStorage')
      },
    }
  )
)
)
