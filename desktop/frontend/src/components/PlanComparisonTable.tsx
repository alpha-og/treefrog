import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import { Button } from "@treefrog/ui";
import { cn } from "@/lib/utils";

export interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: {
    name: string;
    included: boolean;
  }[];
  isPopular?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  isCurrentPlan?: boolean;
}

interface PlanComparisonTableProps {
  plans: Plan[];
  className?: string;
}

export function PlanComparisonTable({
  plans,
  className,
}: PlanComparisonTableProps) {
  // Get all unique features
  const allFeatures = Array.from(
    new Set(plans.flatMap((p) => p.features.map((f) => f.name)))
  );

  return (
    <motion.div
      className={cn("overflow-hidden rounded-lg border border-[var(--border)]", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Plan Cards (Desktop) */}
      <div className="hidden lg:grid gap-0" style={{ gridTemplateColumns: `1fr ${plans.map(() => "1fr").join(" ")}` }}>
        {/* Feature column header */}
        <div className="bg-[var(--muted)] p-4 border-r border-[var(--border)]">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            Features
          </p>
        </div>

        {/* Plan headers */}
        {plans.map((plan, idx) => (
          <motion.div
            key={plan.id}
            className={cn(
              "p-4 border-r border-[var(--border)]",
              plan.isPopular
                ? "bg-gradient-to-b from-[var(--primary)]/10 to-transparent relative"
                : "bg-[var(--muted)]",
              idx === plans.length - 1 && "border-r-0"
            )}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.2 }}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-[var(--primary)] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  POPULAR
                </span>
              </div>
            )}
            <div className="text-center pt-2">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                {plan.name}
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {plan.description}
              </p>
              <div className="mt-3">
                <span className="text-3xl font-bold text-[var(--foreground)]">
                  ${plan.price}
                </span>
                <span className="text-sm text-[var(--muted-foreground)]">
                  /month
                </span>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Feature rows */}
        {allFeatures.map((feature, featureIdx) => (
          <motion.div
            key={feature}
            className="contents"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: (plans.length + featureIdx) * 0.05 }}
          >
            {/* Feature name */}
            <div className="bg-[var(--card)] p-4 border-r border-b border-[var(--border)] text-sm font-medium text-[var(--foreground)]">
              {feature}
            </div>

            {/* Feature checkmarks */}
            {plans.map((plan, planIdx) => {
              const feature_data = plan.features.find((f) => f.name === feature);
              const included = feature_data?.included ?? false;

              return (
                <div
                  key={`${plan.id}-${feature}`}
                  className={cn(
                    "p-4 border-r border-b border-[var(--border)] flex items-center justify-center",
                    planIdx === plans.length - 1 && "border-r-0",
                    included ? "bg-[var(--card)]" : "bg-[var(--muted)]"
                  )}
                >
                  {included ? (
                    <Check className="h-5 w-5 text-[var(--primary)]" />
                  ) : (
                    <X className="h-5 w-5 text-[var(--muted-foreground)]" />
                  )}
                </div>
              );
            })}
          </motion.div>
        ))}

        {/* Action buttons */}
        {plans.map((plan, planIdx) => (
          <div
            key={`action-${plan.id}`}
            className={cn(
              "bg-[var(--card)] p-4 border-r border-[var(--border)]",
              planIdx === plans.length - 1 && "border-r-0"
            )}
          >
            <Button
              onClick={plan.onAction}
              variant={plan.isCurrentPlan ? "outline" : "default"}
              disabled={plan.isCurrentPlan}
              className="w-full"
            >
              {plan.isCurrentPlan ? "Current Plan" : (plan.actionLabel || "Select")}
            </Button>
          </div>
        ))}
      </div>

      {/* Mobile view (Stacked cards) */}
      <div className="lg:hidden space-y-4 p-4">
        {plans.map((plan, idx) => (
          <motion.div
            key={plan.id}
            className={cn(
              "rounded-lg border p-6",
              plan.isPopular
                ? "border-[var(--primary)] bg-gradient-to-br from-[var(--primary)]/10 to-transparent"
                : "border-[var(--border)] bg-[var(--card)]"
            )}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.2 }}
          >
            {plan.isPopular && (
              <div className="mb-3">
                <span className="bg-[var(--primary)] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  POPULAR
                </span>
              </div>
            )}

            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {plan.name}
            </h3>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {plan.description}
            </p>

            <div className="mt-4">
              <span className="text-3xl font-bold text-[var(--foreground)]">
                ${plan.price}
              </span>
              <span className="text-sm text-[var(--muted-foreground)]">
                /month
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <div
                  key={feature.name}
                  className="flex items-center gap-2 text-sm"
                >
                  {feature.included ? (
                    <Check className="h-4 w-4 text-[var(--primary)] flex-shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                  )}
                  <span
                    className={
                      feature.included
                        ? "text-[var(--foreground)]"
                        : "text-[var(--muted-foreground)]"
                    }
                  >
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>

            <Button
              onClick={plan.onAction}
              variant={plan.isCurrentPlan ? "outline" : "default"}
              disabled={plan.isCurrentPlan}
              className="w-full mt-6"
            >
              {plan.isCurrentPlan ? "Current Plan" : (plan.actionLabel || "Select")}
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
