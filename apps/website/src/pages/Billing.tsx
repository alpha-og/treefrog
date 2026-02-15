import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { 
  Check, 
  Loader2, 
  CreditCard,
  Clock,
  Calendar,
  Sparkles,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { useUsageStats, useCreateSubscription, useSubscriptionStatus, usePlans, useCancelSubscription, useRedeemCoupon, useInvoices } from '../hooks/useApi'
import { staggerContainer, staggerItem, easeOutExpo, ANIMATION_DURATIONS } from '../lib/animations'

export default function BillingPage() {
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
  
  return <BillingContent />
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
        <p className="text-muted-foreground">Please sign in to manage your subscription</p>
      </div>
      <Link to="/sign-in" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium">
        Sign In
      </Link>
    </motion.div>
  )
}

function BillingContent() {
  const { data: usage, isLoading: usageLoading } = useUsageStats()
  const { data: subscription, isLoading: subLoading } = useSubscriptionStatus()
  const createSubscription = useCreateSubscription()
  const cancelSubscription = useCancelSubscription()
  const redeemCoupon = useRedeemCoupon()
  const { data: invoices } = useInvoices()
  const plans = usePlans()
  
  const [couponCode, setCouponCode] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  
  const isLoading = usageLoading || subLoading
  const tier = usage?.tier || 'free'
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }
  
  const handleUpgrade = async (planId: string) => {
    if (planId === 'enterprise') {
      window.open('mailto:support@treefrog.app?subject=Enterprise Plan Inquiry', '_blank')
      return
    }
    
    setSelectedPlan(planId)
    try {
      await createSubscription.mutateAsync(planId)
    } catch (error) {
      console.error('Failed to create subscription:', error)
      setSelectedPlan(null)
    }
  }
  
  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription.mutateAsync()
      setShowCancelConfirm(false)
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
    }
  }
  
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    
    setCouponError(null)
    const targetPlan = tier === 'free' ? 'pro' : tier
    
    try {
      await redeemCoupon.mutateAsync({ couponCode: couponCode.trim(), planId: targetPlan })
    } catch {
      setCouponError('Invalid coupon code or coupon not applicable')
    }
  }
  
  const handleUpdatePayment = () => {
    // Redirect to Supabase auth settings or payment management
    window.open('https://supabase.com/dashboard', '_blank', 'noopener,noreferrer')
  }
  
  return (
    <motion.div 
      className="container-width py-8"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={staggerItem} className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and billing</p>
      </motion.div>
      
      <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Object.entries(plans).map(([key, plan]) => (
          <PlanCard
            key={key}
            plan={plan}
            isCurrentPlan={tier === key}
            isUpgrading={selectedPlan === key && createSubscription.isPending}
            onUpgrade={() => handleUpgrade(key)}
          />
        ))}
      </motion.div>
      
      {tier !== 'free' && (
        <motion.div variants={staggerItem} className="p-6 rounded-xl border bg-card mb-8">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Subscription Details</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm text-muted-foreground">Status</label>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${
                  subscription?.status === 'active' ? 'bg-green-500' :
                  subscription?.status === 'paused' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
                <span className="font-medium capitalize">{subscription?.status || 'Active'}</span>
              </div>
            </div>
            
            {subscription?.current_end && (
              <div>
                <label className="text-sm text-muted-foreground">Next Billing Date</label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">
                    {new Date(subscription.current_end).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
            
            {subscription?.paid_count !== undefined && (
              <div>
                <label className="text-sm text-muted-foreground">Payments</label>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{subscription.paid_count} / {subscription.total_count}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 pt-6 border-t border-border/50 flex flex-wrap gap-3">
            <button 
              onClick={handleUpdatePayment}
              className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
            >
              Update Payment Method
            </button>
            {showCancelConfirm ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCancelSubscription}
                  disabled={cancelSubscription.isPending}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {cancelSubscription.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </span>
                  ) : 'Confirm Cancel'}
                </button>
                <button 
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors"
                >
                  Keep Plan
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowCancelConfirm(true)}
                className="px-4 py-2 rounded-lg border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </motion.div>
      )}
      
      <motion.div variants={staggerItem} className="p-6 rounded-xl border bg-card">
        <h2 className="text-xl font-semibold mb-4">Have a Coupon?</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="Enter coupon code"
            className="flex-1 px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button 
            onClick={handleApplyCoupon}
            disabled={redeemCoupon.isPending || !couponCode.trim()}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {redeemCoupon.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : 'Apply'}
          </button>
        </div>
        {couponError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="w-4 h-4" />
            {couponError}
          </div>
        )}
      </motion.div>
      
      <motion.div variants={staggerItem} className="p-6 rounded-xl border bg-card mt-8">
        <h2 className="text-xl font-semibold mb-4">Billing History</h2>
        {invoices && invoices.length > 0 ? (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">
                      {(invoice.amount / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    invoice.status === 'paid' ? 'bg-green-500/10 text-green-600' :
                    invoice.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' :
                    'bg-red-500/10 text-red-600'
                  }`}>
                    {invoice.status}
                  </span>
                  {invoice.invoice_url && (
                    <a 
                      href={invoice.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm flex items-center gap-1"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No billing history yet. Your invoices will appear here after you make a payment.
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

interface PlanCardProps {
  plan: {
    id: string
    name: string
    price: number | null
    monthlyBuilds: number
    concurrent: number
    storageGB: number
    features: string[]
  }
  isCurrentPlan: boolean
  isUpgrading: boolean
  onUpgrade: () => void
}

function PlanCard({ plan, isCurrentPlan, isUpgrading, onUpgrade }: PlanCardProps) {
  const isPopular = plan.id === 'pro'
  
  return (
    <motion.div 
      className={`
        relative p-6 rounded-xl border bg-card transition-all
        ${isPopular ? 'border-2 border-primary ring-1 ring-primary/20' : ''}
        ${isCurrentPlan ? 'opacity-75' : 'hover:border-primary/30'}
      `}
      whileHover={!isCurrentPlan ? { y: -4 } : undefined}
      transition={{ duration: ANIMATION_DURATIONS.fast, ease: easeOutExpo }}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Popular
          </span>
        </div>
      )}
      
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
        <div className="mt-2">
          {plan.price !== null ? (
            <>
              <span className="text-3xl font-bold text-foreground">${plan.price}</span>
              <span className="text-muted-foreground">/month</span>
            </>
          ) : (
            <span className="text-3xl font-bold text-foreground">Custom</span>
          )}
        </div>
      </div>
      
      <ul className="space-y-2 mb-6">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="w-4 h-4 text-primary flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      
      <button
        onClick={onUpgrade}
        disabled={isCurrentPlan || isUpgrading}
        className={`
          w-full py-2.5 rounded-xl font-medium transition-all
          ${isCurrentPlan 
            ? 'bg-muted text-muted-foreground cursor-not-allowed' 
            : 'bg-primary text-primary-foreground hover:opacity-90'
          }
        `}
      >
        {isUpgrading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </span>
        ) : isCurrentPlan ? (
          'Current Plan'
        ) : plan.price === null ? (
          'Contact Sales'
        ) : (
          'Upgrade'
        )}
      </button>
    </motion.div>
  )
}
