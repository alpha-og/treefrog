import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { ArrowLeft, Plus, TrendingUp, CloudOff } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/common";
import { BuildHistoryTable, type BuildHistoryItem } from "@/components/BuildHistoryTable";
import { StorageUsageWidget } from "@/components/StorageUsageWidget";
import { SubscriptionStatusCard } from "@/components/SubscriptionStatusCard";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
} from "@/utils/animations";
import { useCloudData } from "@/hooks/useCloudData";
import { useAuthStore } from "@/stores/authStore";

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: ["50 builds/month", "2 concurrent builds", "1 GB storage", "Community support"],
  pro: ["500 builds/month", "10 concurrent builds", "10 GB storage", "Priority support", "Early access features"],
  enterprise: ["Unlimited builds", "50 concurrent builds", "100 GB storage", "Dedicated support", "SLA guarantee"],
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { isGuest } = useAuthStore();
  const { isLoading, usageStats, recentBuilds, userData } = useCloudData();

  const builds: BuildHistoryItem[] = useMemo(() => {
    return recentBuilds.map(b => ({
      id: b.id,
      projectName: b.main_file || "Untitled",
      status: b.status as "completed" | "failed" | "running" | "pending",
      engine: b.engine,
      createdAt: b.created_at,
      completedAt: b.status === "completed" ? b.created_at : undefined,
      duration: undefined,
      artifacts: b.status === "completed" ? 1 : undefined,
    }));
  }, [recentBuilds]);

  const stats: StatCard[] = useMemo(() => {
    if (!usageStats) {
      return [
        { label: "Plan", value: "Free", icon: <TrendingUp className="h-5 w-5" /> },
        { label: "Builds", value: 0, icon: <TrendingUp className="h-5 w-5" /> },
        { label: "Storage", value: "0 GB", icon: <TrendingUp className="h-5 w-5" /> },
        { label: "Active", value: "0/2", icon: <TrendingUp className="h-5 w-5" /> },
      ];
    }

    return [
      {
        label: "Plan",
        value: usageStats.tier.charAt(0).toUpperCase() + usageStats.tier.slice(1),
        icon: <TrendingUp className="h-5 w-5" />,
      },
      {
        label: "Builds",
        value: usageStats.monthlyLimit > 0 ? `${usageStats.monthlyUsed}/${usageStats.monthlyLimit}` : `${usageStats.monthlyUsed}`,
        icon: <TrendingUp className="h-5 w-5" />,
      },
      {
        label: "Storage",
        value: `${usageStats.storageUsedGB.toFixed(1)}/${usageStats.storageLimitGB} GB`,
        icon: <TrendingUp className="h-5 w-5" />,
      },
      {
        label: "Active",
        value: `${usageStats.concurrentUsed}/${usageStats.concurrentLimit}`,
        icon: <TrendingUp className="h-5 w-5" />,
      },
    ];
  }, [usageStats]);

  const planName = usageStats?.tier ? usageStats.tier.charAt(0).toUpperCase() + usageStats.tier.slice(1) : "Free";
  const planFeatures = PLAN_FEATURES[usageStats?.tier || "free"] || PLAN_FEATURES.free;

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
            Sign in to access your dashboard, view build history, and manage your subscription.
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
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/" })}
                className="rounded-lg"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-[var(--foreground)]">
                  Dashboard
                </h1>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Build history & account overview
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate({ to: "/editor" })}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Build
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          variants={staggerContainer}
        >
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6"
              variants={staggerItem}
              whileHover={{ translateY: -2 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-sm font-medium text-[var(--muted-foreground)]">
                  {stat.label}
                </div>
                <div className="text-[var(--primary)]">{stat.icon}</div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-[var(--foreground)]">
                    {stat.value}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main grid */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
          variants={staggerContainer}
        >
          {/* Storage Widget */}
          <motion.div variants={staggerItem}>
            <StorageUsageWidget
              usedGB={usageStats?.storageUsedGB || 0}
              limitGB={usageStats?.storageLimitGB || 1}
              className="h-full"
            />
          </motion.div>

          {/* Subscription Card */}
          <motion.div variants={staggerItem} className="lg:col-span-2">
            <SubscriptionStatusCard
              planName={planName}
              price={usageStats?.tier === "pro" ? 9 : usageStats?.tier === "enterprise" ? 0 : 0}
              isActive={true}
              features={planFeatures}
              buildLimit={usageStats?.monthlyLimit || 50}
              storageLimit={usageStats?.storageLimitGB || 1}
              onManage={() => navigate({ to: "/billing" })}
              className="h-full"
            />
          </motion.div>
        </motion.div>

        {/* Build History */}
        <motion.div variants={staggerItem}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Recent Builds
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Your last 30 builds
            </p>
          </div>
          <BuildHistoryTable
            builds={builds}
            isLoading={isLoading}
            onBuildClick={(buildId) => {
              navigate({ to: "/build", search: { id: buildId } });
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}