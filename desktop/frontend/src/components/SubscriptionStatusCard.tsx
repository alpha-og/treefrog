import { motion } from "motion/react";
import { Check, Crown, Zap } from "lucide-react";
import { Button } from "@treefrog/ui";
import { cn } from "@/lib/utils";

interface SubscriptionStatusCardProps {
  planName: string;
  price?: number;
  isActive: boolean;
  features: string[];
  buildLimit?: number;
  storageLimit?: number;
  onUpgrade?: () => void;
  onManage?: () => void;
  className?: string;
}

export function SubscriptionStatusCard({
  planName,
  price,
  isActive,
  features,
  buildLimit,
  storageLimit,
  onUpgrade,
  onManage,
  className,
}: SubscriptionStatusCardProps) {
  const isPremium = planName.toLowerCase().includes("pro") ||
    planName.toLowerCase().includes("premium");

  return (
    <motion.div
      className={cn(
        "rounded-lg border p-6",
        isPremium
          ? "border-[var(--accent)] bg-gradient-to-br from-[var(--card)] to-[var(--accent)]/5"
          : "border-[var(--border)] bg-[var(--card)]",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {isPremium && (
            <Crown className="h-5 w-5 text-[var(--accent)]" />
          )}
          {!isPremium && <Zap className="h-5 w-5 text-[var(--primary)]" />}
          <div>
            <h3 className="text-lg font-semibold">{planName}</h3>
            {price !== undefined && (
              <p className="text-sm text-[var(--muted-foreground)]">
                ${price}/month
              </p>
            )}
          </div>
        </div>
        {isActive && (
          <div className="px-2 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-medium">
            Active
          </div>
        )}
      </div>

      {/* Features */}
      <div className="space-y-2 mb-6">
        {features.map((feature, idx) => (
          <motion.div
            key={idx}
            className="flex items-center gap-2 text-sm"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.2 }}
          >
            <Check className="h-4 w-4 text-[var(--primary)] flex-shrink-0" />
            <span className="text-[var(--foreground)]">{feature}</span>
          </motion.div>
        ))}
      </div>

      {/* Limits */}
      {(buildLimit !== undefined || storageLimit !== undefined) && (
        <div className="border-t border-[var(--border)] pt-4 mb-4">
          <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">
            Limits
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {buildLimit !== undefined && (
              <div>
                <p className="text-[var(--muted-foreground)]">
                  Builds/month
                </p>
                <p className="font-semibold text-[var(--foreground)]">
                  {buildLimit === -1 ? "Unlimited" : buildLimit}
                </p>
              </div>
            )}
            {storageLimit !== undefined && (
              <div>
                <p className="text-[var(--muted-foreground)]">Storage</p>
                <p className="font-semibold text-[var(--foreground)]">
                  {storageLimit} GB
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {onManage && isActive && (
          <Button variant="outline" size="sm" onClick={onManage} className="flex-1">
            Manage Plan
          </Button>
        )}
        {onUpgrade && !isActive && (
          <Button size="sm" onClick={onUpgrade} className="flex-1">
            Upgrade
          </Button>
        )}
      </div>
    </motion.div>
  );
}
