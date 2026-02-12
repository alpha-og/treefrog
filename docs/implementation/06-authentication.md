# Phase 6.2: Clerk OAuth Integration

## Goal

Add Clerk authentication with OAuth browser redirect flow.

---

## Clerk Integration Flow

```
1. User clicks "Sign In" button
2. Wails calls OpenExternalURL() → Browser opens to Clerk login
3. User completes OAuth → Clerk redirects to http://localhost:5173/auth/callback?code=...
4. React captures code → Exchanges for Clerk session token
5. JWT stored in Zustand authStore + localStorage
6. Auto-refresh token 5 min before expiry
7. All API calls include: Authorization: Bearer {jwt}
```

---

## Implementation

### New Stores

**File**: `frontend/src/stores/authStore.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
      
      setUser: (user) => set({ user, isLoggedIn: !!user }),
      setSessionToken: (token) => set({ sessionToken: token }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      logout: () => set({
        user: null,
        sessionToken: null,
        isLoggedIn: false,
        error: null
      })
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
```

**File**: `frontend/src/stores/cacheStore.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BuildCacheEntry, BuildCacheState } from '@treefrog/types'

interface CacheStore {
  projectCaches: Map<string, BuildCacheState>
  
  // Actions
  getProjectCache: (projectId: string) => BuildCacheState | null
  updateCache: (projectId: string, cache: BuildCacheState) => void
  getChangedFiles: (projectId: string, currentChecksums: Record<string, string>) => BuildCacheEntry[]
  clearProjectCache: (projectId: string) => void
  clearAll: () => void
}

export const useCacheStore = create<CacheStore>()(
  persist(
    (set, get) => ({
      projectCaches: new Map(),
      
      getProjectCache: (projectId: string) => {
        return get().projectCaches.get(projectId) || null
      },
      
      updateCache: (projectId: string, cache: BuildCacheState) => {
        const caches = new Map(get().projectCaches)
        caches.set(projectId, cache)
        set({ projectCaches: caches })
      },
      
      getChangedFiles: (projectId: string, currentChecksums: Record<string, string>) => {
        const cache = get().getProjectCache(projectId)
        if (!cache) {
          // No cache - all files are "new"
          return Object.entries(currentChecksums).map(([path, checksum]) => ({
            path,
            checksum,
            uploaded: false,
            size: 0
          }))
        }
        
        // Compare and identify changed
        const changed: BuildCacheEntry[] = []
        for (const [path, checksum] of Object.entries(currentChecksums)) {
          const cached = cache.entries.get(path)
          if (!cached || cached.checksum !== checksum) {
            changed.push({
              path,
              checksum,
              uploaded: false,
              size: 0
            })
          }
        }
        return changed
      },
      
      clearProjectCache: (projectId: string) => {
        const caches = new Map(get().projectCaches)
        caches.delete(projectId)
        set({ projectCaches: caches })
      },
      
      clearAll: () => set({ projectCaches: new Map() })
    }),
    {
      name: 'treefrog-build-cache',
      serialize: (state) => {
        return JSON.stringify({
          projectCaches: Array.from(state.projectCaches.entries())
        })
      },
      deserialize: (json) => {
        const data = JSON.parse(json as string)
        return {
          projectCaches: new Map(data.projectCaches),
          // ... include all required methods from (set, get) callback
        }
      }
    }
  )
)
```

### New Pages

**File**: `frontend/src/pages/Auth.tsx`

```typescript
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@clerk/clerk-react'
import { isWails, getWailsApp } from '@/utils/env'
import { createLogger } from '@/utils/logger'

const log = createLogger('Auth')

export default function AuthPage() {
  const navigate = useNavigate()
  const { isSignedIn } = useAuth()

  useEffect(() => {
    if (isSignedIn) {
      // Already logged in, redirect to dashboard
      navigate({ to: '/dashboard' })
      return
    }
  }, [isSignedIn, navigate])

  const handleSignIn = async () => {
    if (isWails()) {
      const app = getWailsApp()
      if (app?.OpenExternalURL) {
        // Open Clerk login in browser
        await app.OpenExternalURL('http://localhost:5173/auth/callback')
        log.debug('Opened Clerk login in external browser')
      }
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Sign In to Treefrog</h1>
        <p className="text-muted-foreground">LaTeX compilation made easy</p>
        <button
          onClick={handleSignIn}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Sign In with Clerk
        </button>
      </div>
    </div>
  )
}
```

**File**: `frontend/src/pages/AuthCallback.tsx`

```typescript
import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@treefrog/services'
import { createLogger } from '@/utils/logger'

const log = createLogger('AuthCallback')

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { isSignedIn, getToken } = useAuth()
  const { user: clerkUser } = useUser()
  const { setUser, setSessionToken } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        if (!isSignedIn || !clerkUser) {
          setError('Not authenticated')
          return
        }

        // Get JWT token from Clerk
        const token = await getToken()
        if (!token) {
          setError('Failed to get authentication token')
          return
        }

        // Store token in auth store
        setSessionToken(token)
        apiClient.setAuthToken(token)

        // Store user info
        setUser({
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          name: clerkUser.fullName || clerkUser.username || 'User',
          profileImageUrl: clerkUser.profileImageUrl
        })

        log.debug('Authentication successful')

        // Redirect to dashboard
        setTimeout(() => {
          navigate({ to: '/dashboard' })
        }, 500)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed'
        log.error('Auth callback error', { error: message })
        setError(message)
      }
    }

    handleCallback()
  }, [isSignedIn, clerkUser, getToken, setUser, setSessionToken, navigate])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-destructive">Authentication Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.href = '/auth'}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Signing you in...</h2>
        <p className="text-muted-foreground">Please wait</p>
      </div>
    </div>
  )
}
```

### New Hooks

**File**: `packages/hooks/src/useAuth.ts`

```typescript
import { useAuthStore } from '@/stores/authStore'
import { useAuth as useClerkAuth } from '@clerk/clerk-react'

export function useAuth() {
  const { sessionToken, user, isLoggedIn } = useAuthStore()
  const { isSignedIn, getToken, signOut } = useClerkAuth()

  return {
    isLoggedIn,
    isSignedIn,
    user,
    sessionToken,
    getToken,
    signOut
  }
}
```

### Update Router

**File**: `frontend/src/router.tsx` (Add auth routes)

```typescript
import { RootRoute, Router, Route } from '@tanstack/react-router'
import { useAuth } from '@/hooks/useAuth'
import RootLayout from './pages/RootLayout'
import AuthPage from './pages/Auth'
import AuthCallbackPage from './pages/AuthCallback'
import DashboardPage from './pages/Dashboard'
// ... other imports

const rootRoute = new RootRoute({
  component: RootLayout
})

const authRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/auth',
  component: AuthPage
})

const authCallbackRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: AuthCallbackPage
})

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) {
    return <Navigate to="/auth" />
  }
  return <>{children}</>
}

const dashboardRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: () => (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  )
})

// ... more routes
```

### Update main.tsx

**File**: `frontend/src/main.tsx` (Add ClerkProvider)

```typescript
import React from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { router } from './router'
import './globals.css'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={clerkPubKey}>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors closeButton />
      </ClerkProvider>
    </React.StrictMode>
  )
}
```

### Update API Client

**File**: `frontend/src/services/api.ts` (Add auth headers)

```typescript
import { apiClient } from '@treefrog/services'
import { useAuthStore } from '@/stores/authStore'

// On app init, set the token if available
export function initializeAPI() {
  const { sessionToken } = useAuthStore()
  if (sessionToken) {
    apiClient.setAuthToken(sessionToken)
  }
}
```

---

## Environment Setup

**File**: `.env.local`

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_... # Get from Clerk dashboard
VITE_API_URL=http://localhost:9000/api
```

---

## Testing

```bash
pnpm -F frontend dev

# 1. Navigate to localhost:5173
# 2. Should see Auth page
# 3. Click "Sign In with Clerk"
# 4. Browser opens Clerk login (or redirect if already logged in)
# 5. Complete OAuth or wait for callback
# 6. Should redirect to /auth/callback
# 7. Check localStorage for sessionToken
# 8. Verify API calls have Authorization header
```

---

## Troubleshooting

**Clerk login not opening**: Verify `VITE_CLERK_PUBLISHABLE_KEY` is set and Clerk dashboard allows localhost:5173

**Callback not working**: Check Clerk redirect URL includes http://localhost:5173/auth/callback

**Token not persisting**: Verify localStorage is enabled and cacheStore serialization works

---

## Next Step

→ Continue to [06-build-caching.md](06-build-caching.md) (Phase 6.3: Delta-Sync Caching)
