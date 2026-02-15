import { useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { 
  FileText, 
  HardDrive, 
  Zap, 
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import { useUsageStats, useBuilds } from '../hooks/useApi'
import { PLANS } from '../services/billingService'
import { useUserStore, useUsageStore, useBuildStore } from '../stores'
import { staggerContainer, staggerItem, easeOutExpo, ANIMATION_DURATIONS } from '../lib/animations'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }
  
  if (!user) {
    return <SignInPrompt />
  }
  
  return <DashboardContent />
}

function SignInPrompt() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Welcome to TreeFrog</h2>
        <p className="text-muted-foreground">Sign in to view your dashboard and manage your builds</p>
      </div>
      <Link to="/sign-in" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium">
        Sign In
      </Link>
    </motion.div>
  )
}

function DashboardContent() {
  const { user } = useAuth()
  const { data: usage, isLoading: usageLoading } = useUsageStats()
  const { data: buildsData, isLoading: buildsLoading } = useBuilds(1, 5)
  
  const { tier, setUser } = useUserStore()
  const { 
    monthlyUsed, 
    monthlyLimit, 
    concurrentUsed, 
    concurrentLimit,
    storageUsedGB,
    storageLimitGB,
    monthlyResetAt,
    setUsage 
  } = useUsageStore()
  const { recentBuilds, setRecentBuilds } = useBuildStore()
  
  const isLoading = usageLoading || buildsLoading
  
  useEffect(() => {
    if (user) {
      setUser({
        email: user.email || null,
        name: user.user_metadata?.full_name || null,
        userId: user.id,
      })
    }
  }, [user, setUser])
  
  useEffect(() => {
    if (usage) {
      setUser({ tier: usage.tier as 'free' | 'pro' | 'enterprise' })
      setUsage({
        monthlyUsed: usage.monthly_used,
        monthlyLimit: usage.monthly_limit,
        concurrentUsed: usage.concurrent_used,
        concurrentLimit: usage.concurrent_limit,
        storageUsedGB: usage.storage_used_gb,
        storageLimitGB: usage.storage_limit_gb,
        monthlyResetAt: usage.monthly_reset_at || null,
      })
    }
  }, [usage, setUser, setUsage])
  
  useEffect(() => {
    if (buildsData?.builds) {
      setRecentBuilds(
        buildsData.builds.map((b) => ({
          id: b.id,
          status: b.status,
          engine: b.engine,
          mainFile: b.main_file,
          createdAt: b.created_at,
        }))
      )
    }
  }, [buildsData, setRecentBuilds])
  
  if (isLoading && !monthlyUsed && recentBuilds.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }
  
  const plan = PLANS[tier] || PLANS.free
  const usagePercent = monthlyLimit > 0 ? (monthlyUsed / monthlyLimit) * 100 : 0
  const storagePercent = (storageUsedGB / storageLimitGB) * 100
  
  return (
    <motion.div 
      className="container-width py-8"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={staggerItem} className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.user_metadata?.full_name || user?.email}
        </p>
      </motion.div>
      
      <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Plan"
          value={plan.name}
          subtitle={plan.price ? `$${plan.price}/mo` : 'Free'}
          icon={<Zap className="w-5 h-5" />}
          accent={tier !== 'free'}
        />
        <StatCard
          title="Builds"
          value={monthlyLimit > 0 ? `${monthlyUsed}/${monthlyLimit}` : `${monthlyUsed}`}
          subtitle="this month"
          icon={<FileText className="w-5 h-5" />}
          progress={usagePercent}
        />
        <StatCard
          title="Storage"
          value={`${storageUsedGB.toFixed(1)}/${storageLimitGB}GB`}
          subtitle="used"
          icon={<HardDrive className="w-5 h-5" />}
          progress={storagePercent}
        />
        <StatCard
          title="Active"
          value={`${concurrentUsed}/${concurrentLimit}`}
          subtitle="building"
          icon={<Clock className="w-5 h-5" />}
          accent={concurrentUsed > 0}
        />
      </motion.div>
      
      {monthlyResetAt && (
        <motion.div variants={staggerItem} className="mb-8 p-4 rounded-xl bg-muted/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Builds reset on {new Date(monthlyResetAt).toLocaleDateString()}</span>
          </div>
        </motion.div>
      )}
      
      <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="p-6 rounded-xl border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Builds</h2>
              {recentBuilds.length > 0 && (
                <Link to="/dashboard" className="text-sm text-primary hover:underline flex items-center gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
            
            {recentBuilds.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">No builds yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first build from the desktop app
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBuilds.map((build) => (
                  <BuildItem key={build.id} build={build} />
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          <motion.div variants={staggerItem} className="p-6 rounded-xl border bg-card">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link 
                to="/billing" 
                className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <Zap className="w-5 h-5 text-primary" />
                <span>Upgrade Plan</span>
              </Link>
              <Link 
                to="/settings" 
                className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <HardDrive className="w-5 h-5" />
                <span>Account Settings</span>
              </Link>
            </div>
          </motion.div>
          
          {tier === 'free' && (
            <motion.div variants={staggerItem} className="p-6 rounded-xl border-2 border-primary/20 bg-primary/5">
              <h3 className="font-semibold mb-2">Upgrade to Pro</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get 500 builds/month, 10 GB storage, and priority support.
              </p>
              <Link 
                to="/billing"
                className="block w-full py-2 rounded-lg bg-primary text-primary-foreground text-center font-medium"
              >
                Upgrade Now - $9/mo
              </Link>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

interface StatCardProps {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  progress?: number
  accent?: boolean
}

function StatCard({ title, value, subtitle, icon, progress, accent }: StatCardProps) {
  return (
    <motion.div 
      className={`p-6 rounded-xl border bg-card ${accent ? 'border-primary/30' : ''}`}
      whileHover={{ y: -2 }}
      transition={{ duration: ANIMATION_DURATIONS.fast, ease: easeOutExpo }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        <span className={accent ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-primary' : ''}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: ANIMATION_DURATIONS.normal, ease: easeOutExpo, delay: 0.2 }}
          />
        </div>
      )}
    </motion.div>
  )
}

interface BuildItemProps {
  build: {
    id: string
    status: string
    engine: string
    mainFile: string
    createdAt: string
  }
}

function BuildItem({ build }: BuildItemProps) {
  const statusIcon = {
    completed: <CheckCircle className="w-5 h-5 text-green-500" />,
    failed: <XCircle className="w-5 h-5 text-red-500" />,
    pending: <Clock className="w-5 h-5 text-yellow-500" />,
    compiling: <Loader2 className="w-5 h-5 text-primary animate-spin" />,
  }[build.status] || <Clock className="w-5 h-5 text-muted-foreground" />
  
  const timeAgo = getTimeAgo(new Date(build.createdAt))
  
  return (
    <motion.div 
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
      whileHover={{ x: 4 }}
      transition={{ duration: ANIMATION_DURATIONS.fast, ease: easeOutExpo }}
    >
      <div className="flex-shrink-0">{statusIcon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{build.mainFile || 'Unknown'}</p>
        <p className="text-sm text-muted-foreground">
          {build.engine} • {timeAgo}
        </p>
      </div>
      <span className={`px-2 py-1 rounded-full text-xs ${
        build.status === 'completed' ? 'bg-green-500/10 text-green-600' :
        build.status === 'failed' ? 'bg-red-500/10 text-red-600' :
        'bg-yellow-500/10 text-yellow-600'
      }`}>
        {build.status}
      </span>
    </motion.div>
  )
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}
