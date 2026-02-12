import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Copy, Check } from "lucide-react";
import { motion } from "motion/react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { Button } from "@/components/common";
import { Input } from "@/components/common";
import { StorageUsageWidget } from "@/components/StorageUsageWidget";
import { fadeInUp, staggerContainer, staggerItem } from "@/utils/animations";

export default function Account() {
  const navigate = useNavigate();
  const { user: clerkUser } = useClerkAuth();
  const [showApiToken, setShowApiToken] = useState(false);
  const [apiTokenCopied, setApiTokenCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const mockApiToken =
    "sk_live_51234567890abcdefghijklmnopqrstuvwxyz";

  const userEmail =
    clerkUser?.emailAddresses[0]?.emailAddress || "user@example.com";
  const userName = clerkUser?.firstName || "User";
  const userPhone = clerkUser?.phoneNumbers[0]?.phoneNumber || "Not provided";

  const copyApiToken = () => {
    navigator.clipboard.writeText(mockApiToken);
    setApiTokenCopied(true);
    setTimeout(() => setApiTokenCopied(false), 2000);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert("Settings saved successfully!");
    } catch (error) {
      alert("Failed to save settings");
    } finally {
      setIsSaving(false);
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
                Managed by Clerk
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
                Phone
              </label>
              <Input
                type="tel"
                value={userPhone}
                readOnly
                className="bg-[var(--muted)] cursor-not-allowed"
              />
            </div>

            <div className="pt-4 border-t border-[var(--border)]">
              <Button
                variant="outline"
                onClick={() => alert("Edit profile in Clerk dashboard")}
              >
                Edit Profile
              </Button>
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
            usedGB={45.2}
            limitGB={100}
          />
        </motion.div>

        {/* API Token Section */}
        <motion.div
          className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6"
          variants={staggerItem}
        >
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            API Token
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Use your API token to authenticate requests from your applications.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3 font-mono text-sm flex items-center">
                {showApiToken ? mockApiToken : "••••••••••••••••••••••••••••••"}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowApiToken(!showApiToken)}
                className="px-2"
              >
                {showApiToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyApiToken}
                className="px-2"
              >
                {apiTokenCopied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {apiTokenCopied && (
              <p className="text-xs text-green-600 dark:text-green-400">
                API token copied to clipboard!
              </p>
            )}

            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
              <p className="text-xs text-orange-800 dark:text-orange-200">
                ⚠️ Keep your API token secret. Anyone with this token can access your account.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => alert("Regenerate API token")}
            >
              Regenerate Token
            </Button>
          </div>
        </motion.div>

        {/* Preferences Section */}
        <motion.div
          className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--card)] p-6"
          variants={staggerItem}
        >
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-6">
            Preferences
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--foreground)]">
                  Email Notifications
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Receive updates about your builds
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-5 w-5 rounded border-[var(--border)] cursor-pointer"
              />
            </div>

            <div className="border-t border-[var(--border)] pt-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--foreground)]">
                  Build Summaries
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Weekly digest of your activity
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-5 w-5 rounded border-[var(--border)] cursor-pointer"
              />
            </div>

            <div className="border-t border-[var(--border)] pt-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--foreground)]">
                  Product Updates
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Get notified about new features
                </p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-[var(--border)] cursor-pointer"
              />
            </div>

            <div className="pt-4 border-t border-[var(--border)]">
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </div>
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
              <Button
                variant="destructive"
                onClick={() => {
                  if (
                    confirm(
                      "Are you sure? This will permanently delete your account."
                    )
                  ) {
                    alert("Account deletion requested");
                  }
                }}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
