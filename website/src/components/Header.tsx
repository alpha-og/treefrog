import { motion, AnimatePresence } from 'motion/react'
import { Sun, Moon, Menu, X, User, LogOut } from 'lucide-react'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme-context'
import { buttonHover, easeOutExpo, ANIMATION_DURATIONS } from '../lib/animations'

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Download', href: '/#download' },
  { label: 'FAQ', href: '/#faq' },
]

export default function Header() {
  const { resolvedTheme, setTheme } = useTheme()
  const { user, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const handleSignOut = async () => {
    await signOut()
    setMobileMenuOpen(false)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: ANIMATION_DURATIONS.fast, ease: easeOutExpo }}>
            <Link to="/" className="flex items-center gap-3">
              <img 
                src="/appicon.png" 
                alt="TreeFrog" 
                className="w-8 h-8 rounded-lg"
              />
              <span className="text-lg font-semibold text-foreground">TreeFrog</span>
            </Link>
          </motion.div>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link, i) => (
              <motion.a
                key={link.label}
                href={link.href}
                className="relative px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: ANIMATION_DURATIONS.normal, ease: easeOutExpo }}
                whileHover={{ y: -1 }}
              >
                {link.label}
              </motion.a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-300"
              variants={buttonHover}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={resolvedTheme}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: ANIMATION_DURATIONS.fast, ease: easeOutExpo }}
                >
                  {resolvedTheme === 'dark' ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.button>

            {user ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/dashboard">
                  <motion.button
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <User className="w-4 h-4" />
                    Dashboard
                  </motion.button>
                </Link>
                <motion.button
                  onClick={handleSignOut}
                  className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </motion.button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/sign-in">
                  <motion.button
                    className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Sign In
                  </motion.button>
                </Link>
                <Link to="/sign-up">
                  <motion.button
                    className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Get Started
                  </motion.button>
                </Link>
              </div>
            )}

            <motion.button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={mobileMenuOpen ? 'close' : 'menu'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: ANIMATION_DURATIONS.fast, ease: easeOutExpo }}
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </motion.div>
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: ANIMATION_DURATIONS.normal, ease: easeOutExpo }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 border-t border-border/50">
                <div className="flex flex-col gap-1">
                  {navLinks.map((link, i) => (
                    <motion.a
                      key={link.label}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: ANIMATION_DURATIONS.normal, ease: easeOutExpo }}
                      className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-colors"
                    >
                      {link.label}
                    </motion.a>
                  ))}
                  
                  {user ? (
                    <>
                      <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2, duration: ANIMATION_DURATIONS.normal, ease: easeOutExpo }}
                          className="mt-2 mx-4 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium text-center"
                        >
                          Dashboard
                        </motion.div>
                      </Link>
                      <motion.button
                        onClick={handleSignOut}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25, duration: ANIMATION_DURATIONS.normal, ease: easeOutExpo }}
                        className="mx-4 px-4 py-3 text-sm text-muted-foreground hover:text-foreground text-center"
                      >
                        Sign Out
                      </motion.button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 mt-2 mx-4">
                      <Link to="/sign-in" onClick={() => setMobileMenuOpen(false)}>
                        <motion.button
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2, duration: ANIMATION_DURATIONS.normal, ease: easeOutExpo }}
                          className="w-full px-4 py-3 rounded-xl border text-sm font-medium text-center"
                        >
                          Sign In
                        </motion.button>
                      </Link>
                      <Link to="/sign-up" onClick={() => setMobileMenuOpen(false)}>
                        <motion.button
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.25, duration: ANIMATION_DURATIONS.normal, ease: easeOutExpo }}
                          className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium text-center"
                        >
                          Get Started
                        </motion.button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  )
}
