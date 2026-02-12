import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/clerk-react'
import { motion } from 'motion/react'
import { AlertCircle, CheckCircle } from 'lucide-react'
import FramelessWindow from '@/components/FramelessWindow'
import { GlowCard } from '@treefrog/ui'
import { Button } from '@treefrog/ui'
import { Alert } from '@treefrog/ui'
import { useAuthStore } from '@/stores/authStore'
import { apiClient } from '@treefrog/services'
import { createLogger } from '@/utils/logger'

const log = createLogger('AuthCallback')

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { isSignedIn, getToken } = useAuth()
  const { user: clerkUser } = useUser()
  const { setUser, setSessionToken, setError: setAuthError } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setIsProcessing(true)
        log.debug('Processing authentication callback')

        if (!isSignedIn) {
          log.warn('User not signed in at callback')
          setError('Please sign in to continue')
          setIsProcessing(false)
          return
        }

        if (!clerkUser) {
          log.warn('No Clerk user data at callback')
          setError('Unable to load user data')
          setIsProcessing(false)
          return
        }

        // Get JWT token from Clerk
        log.debug('Requesting JWT token from Clerk')
        const token = await getToken()
        if (!token) {
          log.error('Failed to get authentication token from Clerk')
          setError('Failed to get authentication token')
          setIsProcessing(false)
          return
        }

        // Store token in auth store and API client
        setSessionToken(token)
        apiClient.setAuthToken(token)
        log.debug('Session token stored')

        // Store user info
        const userData = {
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          name: clerkUser.fullName || clerkUser.username || 'User',
          profileImageUrl: clerkUser.profileImageUrl
        }
        setUser(userData)
        log.debug('User data stored', { userId: userData.id, email: userData.email })

        // Clear any existing errors
        setAuthError(null)

        // Wait a moment for state to update, then redirect
        await new Promise(resolve => setTimeout(resolve, 800))
        log.debug('Authentication successful, redirecting to home')
        navigate({ to: '/' })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Authentication failed'
        log.error('Auth callback error', { error: message })
        setAuthError(message)
        setError(message)
        setIsProcessing(false)
      }
    }

    handleCallback()
  }, [isSignedIn, clerkUser, getToken, setUser, setSessionToken, setAuthError, navigate])

  if (error) {
    return (
      <FramelessWindow title="Treefrog - Authentication Error">
        <div className="h-screen bg-gradient-to-br from-muted via-background to-muted flex flex-col items-center justify-center p-4" style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            <GlowCard className="p-8 sm:p-12 border border-destructive/30">
              <div className="space-y-6">
                {/* Error Icon */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="flex justify-center"
                >
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  </div>
                </motion.div>

                {/* Error Message */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="text-center space-y-3"
                >
                  <h2 className="text-2xl font-bold text-destructive">Authentication Error</h2>
                  <p className="text-muted-foreground">{error}</p>
                </motion.div>

                {/* Alert */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
                    <AlertCircle className="h-4 w-4" />
                    <span>Please try signing in again. If the problem persists, contact support.</span>
                  </Alert>
                </motion.div>

                {/* Try Again Button */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <Button
                    onClick={() => navigate({ to: '/auth' })}
                    className="w-full py-3"
                    size="lg"
                  >
                    Back to Sign In
                  </Button>
                </motion.div>
              </div>
            </GlowCard>
          </motion.div>
        </div>
      </FramelessWindow>
    )
  }

  return (
    <FramelessWindow title="Treefrog - Signing In">
      <div className="h-screen bg-gradient-to-br from-muted via-background to-muted flex flex-col items-center justify-center p-4" style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <GlowCard className="p-8 sm:p-12 border border-border/50">
            <div className="space-y-8">
              {/* Loading Animation */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="flex justify-center"
              >
                <div className="relative w-16 h-16">
                  {/* Outer rotating ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  />
                  {/* Inner pulsing circle */}
                  <motion.div
                    className="absolute inset-2 rounded-full bg-primary/10"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </motion.div>

              {/* Status Message */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-center space-y-2"
              >
                <h2 className="text-2xl font-bold text-foreground">Signing you in...</h2>
                <p className="text-muted-foreground">Please wait while we set up your account</p>
              </motion.div>

              {/* Progress Steps */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="space-y-3 pt-4 border-t border-border/30"
              >
                {[
                  'Verifying your identity',
                  'Securing your session',
                  'Loading your projects'
                ].map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.1, duration: 0.5 }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ delay: 0.4 + idx * 0.1, duration: 0.5 }}
                    >
                      <CheckCircle className="w-4 h-4 text-primary/60" />
                    </motion.div>
                    <span className="text-muted-foreground">{step}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </GlowCard>
        </motion.div>
      </div>
    </FramelessWindow>
  )
}
