import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from './supabase'
import type { User, Session, AuthError, Provider } from '@supabase/supabase-js'
import { useNavigate } from '@tanstack/react-router'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, options?: { data?: Record<string, unknown> }) => Promise<{ error: AuthError | null; needsConfirmation?: boolean }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithOAuth: (provider: Provider) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, options?: { data?: Record<string, unknown> }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...options,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    const needsConfirmation = data.user && !data.session
    return { error, needsConfirmation }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signInWithOAuth = async (provider: Provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithOAuth, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.search)
      if (error) {
        console.error('Auth callback error:', error)
        navigate({ to: '/sign-in', search: { error: error.message } })
      } else {
        navigate({ to: '/dashboard' })
      }
    }
    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}
