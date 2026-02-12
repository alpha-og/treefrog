import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, TrendingUp } from "lucide-react";
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
import { cn } from "@/lib/utils";

// Mock data - replace with real API calls
const mockBuilds: BuildHistoryItem[] = [
  {
    id: "bld_abc123_1",
    projectName: "My Project",
    status: "completed",
    engine: "pdflatex",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    duration: 180,
    artifacts: 3,
  },
  {
    id: "bld_def456_2",
    projectName: "Research Paper",
    status: "completed",
    engine: "xelatex",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    duration: 300,
    artifacts: 2,
  },
  {
    id: "bld_ghi789_3",
    projectName: "Thesis Draft",
    status: "failed",
    engine: "lualatex",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    duration: 45,
  },
  {
    id: "bld_jkl012_4",
    projectName: "Presentation Slides",
    status: "completed",
    engine: "pdflatex",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 + 120000).toISOString(),
    duration: 120,
    artifacts: 1,
  },
];

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [builds, setBuilds] = useState<BuildHistoryItem[]>(mockBuilds);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<StatCard[]>([
    {
      label: "Total Builds",
      value: 42,
      icon: <TrendingUp className="h-5 w-5" />,
      trend: 12,
    },
    {
      label: "Success Rate",
      value: "95%",
      icon: <TrendingUp className="h-5 w-5" />,
      trend: 2,
    },
    {
      label: "Avg Duration",
      value: "2m 15s",
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      label: "This Month",
      value: 18,
      icon: <TrendingUp className="h-5 w-5" />,
      trend: 5,
    },
  ]);

  // In a real app, fetch from API
  useEffect(() => {
    // setIsLoading(true);
    // const timer = setTimeout(() => setIsLoading(false), 500);
    // return () => clearTimeout(timer);
  }, []);

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
                  {stat.trend && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      +{stat.trend}% this month
                    </p>
                  )}
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
              usedGB={45.2}
              limitGB={100}
              className="h-full"
            />
          </motion.div>

          {/* Subscription Card */}
          <motion.div variants={staggerItem} className="lg:col-span-2">
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
              // Handle build click
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
