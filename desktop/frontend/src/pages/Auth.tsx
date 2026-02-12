import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@clerk/clerk-react'
import { motion } from 'motion/react'
import { LogIn } from 'lucide-react'
import FramelessWindow from '@/components/FramelessWindow'
import { Button } from '@treefrog/ui'
import { GlowCard } from '@treefrog/ui'
import { createLogger } from '@/utils/logger'
import { isWails, getWailsApp } from '@/utils/env'
import { useAuthStore } from '@/stores/authStore'

const log = createLogger('Auth')

export default function AuthPage() {
  const navigate = useNavigate()
  const { isSignedIn } = useAuth()
  const { setUser, setSessionToken } = useAuthStore()

  useEffect(() => {
    if (isSignedIn) {
      // Already logged in, redirect to home
      log.debug('User already signed in, redirecting to home')
      navigate({ to: '/' })
      return
    }
  }, [isSignedIn, navigate])

  const handleSignIn = async () => {
    try {
      log.debug('Starting sign in flow with Clerk')
      if (isWails()) {
        const app = getWailsApp()
        if (app?.OpenExternalURL) {
          // Open Clerk login in external browser
          const authUrl = `http://localhost:5173/auth/callback`
          log.debug('Opening Clerk login in external browser', { authUrl })
          await app.OpenExternalURL(authUrl)
        }
      } else {
        // Web-only mode: redirect to Clerk login callback
        window.location.href = '/auth/callback'
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start sign in'
      log.error('Sign in error', { error: message })
    }
  }

  const handleContinueAsGuest = () => {
    log.debug('Continuing as guest user')
    // Set an anonymous user for guest access
    const guestUser = {
      id: 'guest',
      email: 'guest@treefrog.local',
      name: 'Guest User',
      profileImageUrl: undefined
    }
    setUser(guestUser)
    setSessionToken('guest-session')
    navigate({ to: '/' })
  }

  return (
    <FramelessWindow title="Treefrog - Sign In">
      <div className="h-screen bg-gradient-to-br from-muted via-background to-muted flex flex-col items-center justify-center p-4" style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <GlowCard className="p-8 sm:p-12 border border-border/50">
            <div className="space-y-8">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-center space-y-3"
              >
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
                  Treefrog
                </h1>
                <p className="text-lg text-muted-foreground">
                  LaTeX compilation made easy
                </p>
              </motion.div>

              {/* Sign In with Google Button */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <Button
                  onClick={handleSignIn}
                  className="w-full py-3 px-6 text-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-300"
                  size="lg"
                >
                  <LogIn className="w-5 h-5" />
                  Sign In with Google
                </Button>
              </motion.div>

              {/* Continue as Guest Button */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25, duration: 0.5 }}
              >
                <Button
                  onClick={handleContinueAsGuest}
                  variant="outline"
                  className="w-full py-3 px-6 text-lg font-semibold"
                  size="lg"
                >
                  Continue as Guest
                </Button>
              </motion.div>

              {/* Features List */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="space-y-3 pt-4 border-t border-border/30"
              >
                <p className="text-sm text-muted-foreground font-medium">What you can do:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Compile LaTeX projects in the cloud</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>View and preview PDF outputs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>Manage multiple projects efficiently</span>
                  </li>
                </ul>
              </motion.div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-center text-xs text-muted-foreground pt-2"
              >
                <p>Secure authentication powered by Clerk</p>
              </motion.div>
            </div>
          </GlowCard>
        </motion.div>
      </div>
    </FramelessWindow>
  )
}
