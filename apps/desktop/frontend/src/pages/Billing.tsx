import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Zap, Gift, CloudOff, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/common";
import { PlanComparisonTable, type Plan } from "@/components/PlanComparisonTable";
import { SubscriptionStatusCard } from "@/components/SubscriptionStatusCard";
import { Input } from "@/components/common";
import { useCloudData } from "@/hooks/useCloudData";
import { useAuthStore } from "@/stores/authStore";
import { fadeInUp, staggerContainer, staggerItem } from "@/utils/animations";
import { supabase } from "@/lib/supabase";

const PLAN_FEATURES: Record<string, string[]> = {
  free: ["50 builds/month", "2 concurrent builds", "1 GB storage", "Community support"],
  pro: ["500 builds/month", "10 concurrent builds", "10 GB storage", "Priority support", "Early access features"],
  enterprise: ["Unlimited builds", "50 concurrent builds", "100 GB storage", "Dedicated support", "SLA guarantee"],
};

export default function Billing() {
  const navigate = useNavigate();
  const { isGuest } = useAuthStore();
  const { usageStats, userData, isLoading } = useCloudData();
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [invoices, setInvoices] = useState<Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    invoice_url: string | null;
  }>>([]);

  const currentTier = usageStats?.tier || "free";

  useEffect(() => {
    if (isGuest() || !supabase || !userData?.id) return;

    supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (!error && data) {
          setInvoices(data);
        }
      });
  }, [isGuest, userData?.id]);

  const plans: Plan[] = useMemo(() => [
    {
      id: "free",
      name: "Free",
      price: 0,
      description: "Perfect for trying out",
      features: [
        { name: "50 builds/month", included: true },
        { name: "2 concurrent builds", included: true },
        { name: "1 GB storage", included: true },
        { name: "Priority support", included: false },
        { name: "Shell-escape", included: false },
      ],
      actionLabel: currentTier === "free" ? "Current Plan" : "Downgrade",
      isCurrentPlan: currentTier === "free",
    },
    {
      id: "pro",
      name: "Pro",
      price: 9,
      description: "For serious projects",
      features: [
        { name: "500 builds/month", included: true },
        { name: "10 concurrent builds", included: true },
        { name: "10 GB storage", included: true },
        { name: "Priority support", included: true },
        { name: "Shell-escape", included: false },
      ],
      isPopular: currentTier === "free",
      actionLabel: currentTier === "pro" ? "Current Plan" : "Upgrade",
      isCurrentPlan: currentTier === "pro",
      onAction: currentTier !== "pro" ? () => {
        window.open("https://treefrog.vercel.app/billing", "_blank");
      } : undefined,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: null,
      description: "For large teams",
      features: [
        { name: "Unlimited builds", included: true },
        { name: "50 concurrent builds", included: true },
        { name: "100 GB storage", included: true },
        { name: "Dedicated support", included: true },
        { name: "Shell-escape enabled", included: true },
      ],
      actionLabel: currentTier === "enterprise" ? "Current Plan" : "Contact Sales",
      isCurrentPlan: currentTier === "enterprise",
      onAction: currentTier !== "enterprise" ? () => {
        window.open("mailto:support@treefrog.app?subject=Enterprise Plan Inquiry", "_blank");
      } : undefined,
    },
  ], [currentTier]);

  const handleApplyCoupon = () => {
    setCouponError("");
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    // Coupon validation would go through the backend
    setCouponError("Coupon redemption is handled through the website. Please visit treefrog.app/billing");
  };

  const planName = currentTier.charAt(0).toUpperCase() + currentTier.slice(1);
  const planPrice = currentTier === "pro" ? 9 : currentTier === "enterprise" ? 0 : 0;
  const planFeatures = PLAN_FEATURES[currentTier] || PLAN_FEATURES.free;

  if (isGuest()) {
    return (
      <motion.div
        className="min-h-screen bg-[var(--background)] flex items-center justify-center"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerItem} className="text-center max-w-md px-6">
          <CloudOff className="h-16 w-16 mx-auto mb-4 text-[var(--muted-foreground)]" />
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
            Cloud Features Unavailable
          </h1>
          <p className="text-[var(--muted-foreground)] mb-6">
            Sign in to manage your subscription and billing.
          </p>
          <Button onClick={() => navigate({ to: "/" })}>
            Go Home
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-[var(--background)]"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        className="border-b border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-sm sticky top-0 z-10"
        variants={staggerItem}
      >
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/dashboard" })}
              className="rounded-lg"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">
                Billing & Plans
              </h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Manage your subscription
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Current Plan */}
        <motion.div
          className="mb-12"
          variants={staggerItem}
        >
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Current Subscription
          </h2>
          <SubscriptionStatusCard
            planName={planName}
            price={planPrice}
            isActive={true}
            features={planFeatures}
            buildLimit={usageStats?.monthlyLimit || 50}
            storageLimit={usageStats?.storageLimitGB || 1}
            onManage={() => {
              window.open("https://treefrog.vercel.app/billing", "_blank");
            }}
          />
        </motion.div>

        {/* Coupon Section */}
        <motion.div
          className="mb-12 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6"
          variants={staggerItem}
        >
          <div className="flex items-center gap-2 mb-4">
            <Gift className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Have a coupon?
            </h2>
          </div>

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value);
                setCouponError("");
              }}
              className="flex-1"
            />
            <Button
              onClick={handleApplyCoupon}
              variant={couponApplied ? "outline" : "default"}
              disabled={couponApplied}
            >
              {couponApplied ? "Applied" : "Apply"}
            </Button>
          </div>

          {couponError && (
            <p className="text-sm text-[var(--muted-foreground)] mt-2">
              {couponError}
            </p>
          )}
        </motion.div>

        {/* Plans Comparison */}
        <motion.div
          className="mb-12"
          variants={staggerItem}
        >
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Choose Your Plan
          </h2>
          <PlanComparisonTable plans={plans} />
        </motion.div>

        {/* Billing Info */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
          variants={staggerContainer}
        >
          <motion.div
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6"
            variants={staggerItem}
          >
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">
              Billing History
            </h3>
            {invoices.length > 0 ? (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                    <div>
                      <p className="font-medium text-[var(--foreground)]">
                        {invoice.currency.toUpperCase()} {(invoice.amount / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        invoice.status === 'paid' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'
                      }`}>
                        {invoice.status}
                      </span>
                      {invoice.invoice_url && (
                        <a href={invoice.invoice_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 text-[var(--primary)]" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                No billing history yet.
              </p>
            )}
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => window.open("https://treefrog.vercel.app/billing", "_blank")}
            >
              Manage on Website
            </Button>
          </motion.div>

          <motion.div
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6"
            variants={staggerItem}
          >
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">
              Payment Method
            </h3>
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Payment methods are managed through the TreeFrog website.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open("https://treefrog.vercel.app/settings", "_blank")}
              >
                Manage on Website
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6"
          variants={staggerItem}
        >
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            <div>
              <p className="font-medium text-[var(--foreground)] mb-1">
                Can I cancel anytime?
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Yes, you can cancel your subscription at any time. You'll have access until the end of your billing period.
              </p>
            </div>
            <div className="border-t border-[var(--border)] pt-4">
              <p className="font-medium text-[var(--foreground)] mb-1">
                What payment methods do you accept?
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                We accept all major credit and debit cards via Razorpay. Apple Pay and Google Pay are also supported.
              </p>
            </div>
            <div className="border-t border-[var(--border)] pt-4">
              <p className="font-medium text-[var(--foreground)] mb-1">
                Do you offer annual billing discounts?
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Yes! Annual plans come with 2 months free. Contact our sales team for more details.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}