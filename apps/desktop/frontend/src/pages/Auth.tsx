import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { createLogger } from '@/utils/logger'
import { useAuthStore } from '@/stores/authStore'
import { motion } from 'motion/react'
import { User, HardDrive, Check, ExternalLink, RefreshCw } from 'lucide-react'
import FramelessWindow from '@/components/FramelessWindow'
import { Button } from '@/components/common'
import { GlowCard } from '@/components/common'
import { toast } from 'sonner'
import { getWailsApp } from '@/services/api'

const log = createLogger('Auth')

export default function AuthPage() {
  const navigate = useNavigate()
  const { markFirstLaunchComplete, setMode, isFirstLaunch, mode } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const handleContinueAsGuest = () => {
    log.debug('Continuing in local mode')
    markFirstLaunchComplete()
    setMode('guest')
    navigate({ to: '/' })
  }

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      const app = getWailsApp()
      if (app?.OpenAuthURL) {
        await app.OpenAuthURL()
        toast.success("Browser opened for sign-in. Complete authentication and return to Treefrog.")
      } else {
        toast.error("Sign-in not available. Please try again.")
      }
    } catch (error) {
      log.error('Failed to open auth URL', error)
      toast.error("Could not open browser. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isFirstLaunch && mode) {
      navigate({ to: '/' })
    }
  }, [isFirstLaunch, mode, navigate])

  useEffect(() => {
    const EventsOn = (window as { runtime?: { EventsOn?: (event: string, cb: (data: unknown) => void) => void } }).runtime?.EventsOn;
    if (EventsOn) {
      EventsOn("auth:callback", (data: unknown) => {
        log.info("Auth callback received", data);
        if ((data as { success?: boolean })?.success) {
          markFirstLaunchComplete();
          setMode('supabase');
          toast.success("Signed in successfully!");
          setTimeout(() => navigate({ to: '/' }), 500);
        }
      });
    }
  }, [markFirstLaunchComplete, setMode, navigate]);

  return (
    <FramelessWindow title="Treefrog">
      <div 
        className="h-screen bg-gradient-to-br from-muted via-background to-muted flex flex-col items-center justify-center p-4" 
        style={{ '--wails-draggable': 'no-drag' } as React.CSSProperties}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <GlowCard className="p-8 sm:p-10 border border-border/50">
            <div className="space-y-6">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-center space-y-3"
              >
                <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
                  Treefrog
                </h1>
                <p className="text-base text-muted-foreground">
                  LaTeX compilation made easy
                </p>
              </motion.div>

              {/* Desktop Notice */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="p-3 bg-primary/5 border border-primary/20 rounded-lg"
              >
                <div className="flex items-start gap-2">
                  <HardDrive className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Desktop App</span>
                    <span className="block mt-0.5">
                      Sign in with browser for cloud features, or continue locally.
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="space-y-3"
              >
                <Button
                  onClick={handleSignIn}
                  className="w-full py-3 px-6 text-base font-semibold flex items-center justify-center gap-2"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <ExternalLink className="w-5 h-5" />
                  )}
                  Sign In with Browser
                </Button>

                <Button
                  onClick={handleContinueAsGuest}
                  variant="outline"
                  className="w-full py-3 px-6 text-base font-semibold flex items-center justify-center gap-2"
                  size="lg"
                >
                  <User className="w-5 h-5" />
                  Continue with Local Mode
                </Button>
              </motion.div>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="space-y-3 pt-4 border-t border-border/30"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="w-4 h-4 text-primary" />
                      <p className="text-xs font-semibold text-primary">Local</p>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-primary" />
                        Docker rendering
                      </li>
                      <li className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-primary" />
                        Full LaTeX
                      </li>
                      <li className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-primary" />
                        No account
                      </li>
                    </ul>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs font-semibold">Cloud</p>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className="flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Remote builds
                      </li>
                      <li className="flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        History
                      </li>
                      <li className="flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Sync devices
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-center text-xs text-muted-foreground"
              >
                <p>Secure authentication via browser</p>
              </motion.div>
            </div>
          </GlowCard>
        </motion.div>
      </div>
    </FramelessWindow>
  )
}
