import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Zap, Gift } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@treefrog/ui";
import { PlanComparisonTable, type Plan } from "@/components/PlanComparisonTable";
import { SubscriptionStatusCard } from "@/components/SubscriptionStatusCard";
import { Input } from "@treefrog/ui";
import { fadeInUp, staggerContainer, staggerItem } from "@treefrog/ui";

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    description: "Perfect for trying out",
    features: [
      { name: "Builds per month", included: true },
      { name: "Storage", included: true },
      { name: "Priority support", included: false },
      { name: "Advanced analytics", included: false },
      { name: "Custom domains", included: false },
    ],
    actionLabel: "Current Plan",
    isCurrentPlan: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    description: "For serious projects",
    features: [
      { name: "Unlimited builds", included: true },
      { name: "100 GB storage", included: true },
      { name: "Priority support", included: true },
      { name: "Advanced analytics", included: false },
      { name: "Custom domains", included: false },
    ],
    isPopular: true,
    actionLabel: "Upgrade",
    onAction: () => {
      // Handle upgrade
      alert("Upgrade to Pro plan");
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    description: "For large teams",
    features: [
      { name: "Unlimited builds", included: true },
      { name: "Unlimited storage", included: true },
      { name: "Priority support", included: true },
      { name: "Advanced analytics", included: true },
      { name: "Custom domains", included: true },
    ],
    actionLabel: "Contact Sales",
    onAction: () => {
      // Handle contact sales
      alert("Contact our sales team");
    },
  },
];

export default function Billing() {
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");

  const handleApplyCoupon = () => {
    setCouponError("");
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    // Simulate coupon validation
    if (couponCode.toLowerCase() === "welcome20") {
      setCouponApplied(true);
      alert("Coupon applied! 20% off");
    } else {
      setCouponError("Invalid coupon code");
    }
  };

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
            planName="Pro"
            price={29}
            isActive={true}
            features={[
              "Unlimited builds",
              "100 GB storage",
              "Priority support",
              "Advanced features",
            ]}
            buildLimit={-1}
            storageLimit={100}
            onManage={() => alert("Manage subscription")}
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
            <p className="text-sm text-[var(--destructive)] mt-2">
              {couponError}
            </p>
          )}
          {couponApplied && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              Coupon successfully applied!
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
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    Pro Plan
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Feb 12, 2025
                  </p>
                </div>
                <p className="font-semibold text-[var(--foreground)]">$29.00</p>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    Pro Plan
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Jan 12, 2025
                  </p>
                </div>
                <p className="font-semibold text-[var(--foreground)]">$29.00</p>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4">
              View Full History
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
              <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20">
                <Zap className="h-5 w-5 text-[var(--primary)]" />
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    Visa ending in 4242
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Expires 12/26
                  </p>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                Update Payment Method
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
