import { createContext, useContext, useEffect, useState, type ReactNode, useRef, useMemo } from 'react'
import { supabase } from './supabase'
import type { User, Session, AuthError, Provider } from '@supabase/supabase-js'
import { useNavigate } from '@tanstack/react-router'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, options?: { data?: Record<string, unknown> }) => Promise<{ error: AuthError | null; needsConfirmation?: boolean }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithOAuth: (provider: Provider, redirectUrl?: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const REDIRECT_URL_KEY = 'auth_redirect_url'

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
    const redirectUrl = sessionStorage.getItem(REDIRECT_URL_KEY)
    const emailRedirectTo = redirectUrl && redirectUrl.startsWith('treefrog://')
      ? `${window.location.origin}/auth/callback`
      : `${window.location.origin}/auth/callback`

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        ...options,
        emailRedirectTo,
      },
    })
    const needsConfirmation = !!(data.user && !data.session)
    return { error, needsConfirmation: needsConfirmation || undefined }
  }

  const signIn = async (email: string, password: string) => {
    const redirectUrl = sessionStorage.getItem(REDIRECT_URL_KEY)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error }
    }

    // Handle custom protocol redirect for desktop app
    if (redirectUrl && redirectUrl.startsWith('treefrog://') && data.session) {
      const callbackUrl = new URL(redirectUrl)
      callbackUrl.searchParams.set('access_token', data.session.access_token)
      callbackUrl.searchParams.set('refresh_token', data.session.refresh_token)
      window.location.href = callbackUrl.toString()
    }

    return { error: null }
  }

  const signInWithOAuth = async (provider: Provider, redirectUrl?: string) => {
    const callbackUrl = redirectUrl || sessionStorage.getItem(REDIRECT_URL_KEY) || undefined

    // Always use website callback as intermediate - Supabase needs to exchange code for tokens
    // The website will then redirect to the custom protocol with the tokens
    let redirectTarget = `${window.location.origin}/auth/callback`
    if (callbackUrl) {
      sessionStorage.setItem(REDIRECT_URL_KEY, callbackUrl)
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTarget,
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

function isCustomProtocolUrl(url: string): boolean {
  return url.startsWith('treefrog://')
}

export function AuthCallback() {
  const navigate = useNavigate()
  const { error: errorParam, description: errorDescription, redirectUrlParam } = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return {
      error: params.get('error'),
      description: params.get('error_description'),
      redirectUrlParam: params.get('redirect_url'),
    }
  }, [])
  
  const [status, setStatus] = useState<'loading' | 'error' | 'redirecting'>(() => 
    errorParam ? 'error' : 'loading'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(() => 
    errorParam ? (errorDescription || errorParam) : null
  )
  const handledRef = useRef(false)

  useEffect(() => {
    if (errorParam) {
      console.error('OAuth error:', errorParam, errorDescription)
      return
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const handleSuccess = (session: Session) => {
      if (handledRef.current) return
      handledRef.current = true

      const redirectUrl = redirectUrlParam || sessionStorage.getItem(REDIRECT_URL_KEY)
      sessionStorage.removeItem(REDIRECT_URL_KEY)

      if (redirectUrl && isCustomProtocolUrl(redirectUrl)) {
        setStatus('redirecting')
        const callbackUrl = new URL(redirectUrl)
        callbackUrl.searchParams.set('access_token', session.access_token)
        callbackUrl.searchParams.set('refresh_token', session.refresh_token)
        window.location.href = callbackUrl.toString()
        return
      }

      window.history.replaceState({}, '', window.location.pathname)
      navigate({ to: redirectUrl || '/dashboard' })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        handleSuccess(session)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleSuccess(session)
      }
    })

    timeoutId = setTimeout(() => {
      if (!handledRef.current) {
        console.error('Auth callback timeout')
        setErrorMessage('Authentication timed out. Please try again.')
        setStatus('error')
        subscription.unsubscribe()
      }
    }, 10000)

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [navigate, errorParam, errorDescription, redirectUrlParam])

  if (status === 'redirecting') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Returning to Treefrog...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{errorMessage}</p>
          <button
            onClick={() => navigate({ to: '/sign-in' })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}
