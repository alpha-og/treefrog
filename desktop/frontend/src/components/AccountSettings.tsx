import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, LogIn } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/common";
import { motion } from "motion/react";
import { createLogger } from "@/utils/logger";

const log = createLogger('AccountSettings');

export default function AccountSettings() {
  const navigate = useNavigate();
  const { user: clerkUser, signOut, isSignedIn } = useClerkAuth();
  const { markFirstLaunchComplete } = useAuthStore();

  const handleSignIn = () => {
    log.debug('Navigating to auth page to sign in');
    markFirstLaunchComplete();
    navigate({ to: '/auth' });
  };

  const handleSignOut = async () => {
    try {
      log.debug('Signing out');
      await signOut();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign out';
      log.error('Sign out error', { error: message });
    }
  };

  // If not logged in, show sign in UI
  if (!isSignedIn) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="text-center space-y-3 pb-6 border-b">
            <h3 className="text-lg font-semibold">Sign In to Treefrog</h3>
            <p className="text-sm text-muted-foreground">
              Sign in to your account to access remote compiler features and sync your projects.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Button
              onClick={handleSignIn}
              className="w-full py-3 px-6 text-base font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
              size="lg"
            >
              <LogIn size={18} />
              Sign In with Google
            </Button>
          </motion.div>

          <div className="space-y-2 text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
            <p className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>Sign in with your Google account</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>Access remote compilation in the cloud</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span>No account creation needed - just sign in</span>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // If logged in, show account info and sign out option
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Account Information</h3>
        <div className="space-y-4">
          {clerkUser?.imageUrl && (
            <div className="flex justify-center mb-4">
              <img 
                src={clerkUser.imageUrl} 
                alt="Profile" 
                className="w-16 h-16 rounded-full"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">Name</label>
            <p className="text-foreground">{clerkUser?.fullName || "—"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">Email</label>
            <p className="text-foreground">{clerkUser?.emailAddresses[0]?.emailAddress || "—"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">User ID</label>
            <p className="text-foreground font-mono text-sm">{clerkUser?.id || "—"}</p>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Session</h3>
        <Button
          onClick={handleSignOut}
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          size="sm"
        >
          <LogOut size={16} />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

