import { useAuth } from '../lib/auth'
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { 
  User, 
  Shield, 
  HardDrive, 
  CreditCard,
  Download,
  Trash2,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useState } from 'react'
import { useUsageStats, useDeleteAccount } from '../hooks/useApi'
import { PLANS } from '../services/billingService'
import { staggerContainer, staggerItem, easeOutExpo, ANIMATION_DURATIONS } from '../lib/animations'

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }
  
  if (!user) {
    return <SignInPrompt />
  }
  
  return <SettingsContent />
}

function SignInPrompt() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Sign in required</h2>
        <p className="text-muted-foreground">Please sign in to access your settings</p>
      </div>
      <Link to="/sign-in" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium">
        Sign In
      </Link>
    </motion.div>
  )
}

function SettingsContent() {
  const { user, signOut } = useAuth()
  const { data: usage, isLoading } = useUsageStats()
  const deleteAccount = useDeleteAccount()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }
  
  const tier = usage?.tier || 'free'
  const plan = PLANS[tier as keyof typeof PLANS] || PLANS.free
  const storageUsedGB = usage?.storage_used_gb || 0
  const storageLimitGB = usage?.storage_limit_gb || plan.storageGB
  const storagePercent = (storageUsedGB / storageLimitGB) * 100
  
  const handleDeleteAccount = async () => {
    try {
      await deleteAccount.mutateAsync()
    } catch (error) {
      console.error('Failed to delete account:', error)
    }
  }
  
  return (
    <motion.div 
      className="container-width py-8"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={staggerItem} className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </motion.div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <motion.section variants={staggerItem} className="p-6 rounded-xl border bg-card">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Account</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-lg">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border/50 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Account ID</span>
                  <span className="font-mono text-sm text-muted-foreground">{user?.id?.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Member since</span>
                  <span className="text-sm">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</span>
                </div>
              </div>
            </div>
          </motion.section>
          
          <motion.section variants={staggerItem} className="p-6 rounded-xl border bg-card">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Security</h2>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Password and security settings are managed through Supabase authentication.
              </p>
            </div>
          </motion.section>
          
          <motion.section variants={staggerItem} className="p-6 rounded-xl border bg-card">
            <div className="flex items-center gap-3 mb-6">
              <HardDrive className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Data & Privacy</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Storage Used</span>
                  <span className="text-sm font-medium">{storageUsedGB.toFixed(2)} GB of {storageLimitGB} GB</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(storagePercent, 100)}%` }}
                    transition={{ duration: ANIMATION_DURATIONS.normal, ease: easeOutExpo }}
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t border-border/50 flex flex-wrap gap-3">
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleDeleteAccount}
                      disabled={deleteAccount.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {deleteAccount.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4" />
                          Confirm Delete
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </button>
                )}
              </div>
            </div>
          </motion.section>
          
          <motion.section variants={staggerItem} className="p-6 rounded-xl border bg-card">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Sign Out</h2>
            </div>
            
            <button 
              onClick={() => signOut()}
              className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
            >
              Sign out of all sessions
            </button>
          </motion.section>
        </div>
        
        <div className="space-y-6">
          <motion.div variants={staggerItem} className="p-6 rounded-xl border bg-card">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Subscription</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Current Plan</label>
                <p className="text-2xl font-bold">{plan.name}</p>
              </div>
              
              <div className="pt-4 border-t border-border/50">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.features.slice(0, 3).map((feature, i) => (
                    <li key={i}>• {feature}</li>
                  ))}
                </ul>
              </div>
              
              {tier === 'free' ? (
                <Link 
                  to="/billing"
                  className="block w-full py-2 rounded-lg bg-primary text-primary-foreground text-center font-medium mt-4"
                >
                  Upgrade Plan
                </Link>
              ) : (
                <Link 
                  to="/billing"
                  className="block text-primary hover:underline text-sm mt-4"
                >
                  Manage subscription →
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
