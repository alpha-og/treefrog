import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Copy, CloudOff } from "lucide-react";
import { motion } from "motion/react";
import { useAuthStore } from "@/stores/authStore";
import { useCloudData } from "@/hooks/useCloudData";
import { Button } from "@/components/common";
import { Input } from "@/components/common";
import { StorageUsageWidget } from "@/components/StorageUsageWidget";
import { staggerContainer, staggerItem } from "@/utils/animations";
import { supabase } from "@/lib/supabase";

export default function Account() {
  const navigate = useNavigate();
  const { user, isGuest, setMode, setUser } = useAuthStore();
  const { usageStats, userData } = useCloudData();
  
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const userEmail = user?.email || userData?.email || "user@example.com";
  const userName = user?.name || userData?.name || "User";

  const handleDeleteAccount = async () => {
    if (!supabase || !user?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);
      
      if (error) {
        alert("Failed to delete account: " + error.message);
      } else {
        setMode('guest');
        setUser(null);
        navigate({ to: "/" });
      }
    } catch {
      alert("Failed to delete account");
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  };

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
            Sign in to access your account settings and manage your profile.
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
        <div className="max-w-4xl mx-auto px-6 py-4">
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
                Account Settings
              </h1>
              <p className="text-sm text-[var(--muted-foreground)]">
                Manage your account and preferences
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Profile Section */}
        <motion.div
          className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6"
          variants={staggerItem}
        >
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-6">
            Profile Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Name
              </label>
              <Input
                type="text"
                value={userName}
                readOnly
                className="bg-[var(--muted)] cursor-not-allowed"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Managed via Supabase authentication
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Email
              </label>
              <Input
                type="email"
                value={userEmail}
                readOnly
                className="bg-[var(--muted)] cursor-not-allowed"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Verified ✓
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Account ID
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={user?.id || ""}
                  readOnly
                  className="bg-[var(--muted)] cursor-not-allowed font-mono text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(user?.id || "");
                  }}
                  className="px-2"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Tier
              </label>
              <Input
                type="text"
                value={usageStats?.tier ? usageStats.tier.charAt(0).toUpperCase() + usageStats.tier.slice(1) : "Free"}
                readOnly
                className="bg-[var(--muted)] cursor-not-allowed"
              />
            </div>
          </div>
        </motion.div>

        {/* Storage Section */}
        <motion.div
          className="mb-8"
          variants={staggerItem}
        >
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Storage Overview
          </h2>
          <StorageUsageWidget
            usedGB={usageStats?.storageUsedGB || 0}
            limitGB={usageStats?.storageLimitGB || 1}
          />
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          className="rounded-lg border border-[var(--destructive)]/30 bg-red-50 dark:bg-red-950 p-6"
          variants={staggerItem}
        >
          <h2 className="text-lg font-semibold text-[var(--destructive)] mb-4">
            Danger Zone
          </h2>

          <div className="space-y-4">
            <div>
              <p className="font-medium text-[var(--foreground)] mb-2">
                Delete Account
              </p>
              <p className="text-sm text-[var(--muted-foreground)] mb-3">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-3">
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isSaving}
                  >
                    {isSaving ? "Deleting..." : "Confirm Delete"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Account
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}