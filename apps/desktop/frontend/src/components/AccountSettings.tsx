import { motion } from "motion/react";
import { LogOut, Cloud, HardDrive, Check, ExternalLink, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/common";
import { createLogger } from "@/utils/logger";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";

const log = createLogger('AccountSettings');

export default function AccountSettings() {
  const { mode, user, setMode, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const refreshAuthState = useCallback(async () => {
    try {
      const getAuthState = (window as { go?: { main?: { App?: { GetAuthState?: () => Promise<{ isAuthenticated?: boolean; user?: { id: string; email: string; firstName: string } }> } } } }).go?.main?.App?.GetAuthState;
      if (getAuthState) {
        const state = await getAuthState();
        if (state?.isAuthenticated && state?.user) {
          setMode('supabase');
          setUser({
            id: state.user.id,
            email: state.user.email,
            name: state.user.firstName,
          });
        }
      }
    } catch (error) {
      log.warn("Could not refresh auth state", error);
    }
  }, [setMode, setUser]);

  useEffect(() => {
    const EventsOn = (window as { runtime?: { EventsOn?: (event: string, cb: (data: unknown) => void) => void } }).runtime?.EventsOn;
    if (EventsOn) {
      EventsOn("auth:callback", (data: unknown) => {
        const authData = data as { success?: boolean; user?: { id?: string; email?: string; name?: string }; error?: string } | undefined;
        log.info("Auth callback received", authData);
        if (authData?.success) {
          if (authData?.user) {
            setMode('supabase');
            setUser({
              id: authData.user.id || '',
              email: authData.user.email || '',
              name: authData.user.name || '',
            });
            toast.success("Signed in successfully");
          } else {
            refreshAuthState();
            toast.success("Signed in successfully");
          }
        } else if (authData?.error) {
          toast.error(`Sign in failed: ${authData.error}`);
        }
      });
    }
  }, [setMode, setUser, refreshAuthState]);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const openAuthURL = (window as { go?: { main?: { App?: { OpenAuthURL?: () => Promise<void> } } } }).go?.main?.App?.OpenAuthURL;
      if (openAuthURL) {
        await openAuthURL();
        toast.success("Browser opened for sign-in");
      } else {
        toast.error("Sign-in not available");
      }
    } catch (error) {
      log.error('Failed to open auth URL', error);
      toast.error("Could not open browser");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const signOut = (window as { go?: { main?: { App?: { SignOut?: () => Promise<void> } } } }).go?.main?.App?.SignOut;
      if (signOut) {
        await signOut();
        setMode('guest');
        setUser(null);
        toast.success("Signed out");
      }
    } catch (error) {
      log.error("Sign out error", error);
      toast.error("Failed to sign out");
    }
  };

  if (mode === 'guest') {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="text-center space-y-3 pb-6 border-b">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <HardDrive className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Local Mode</h3>
            <p className="text-sm text-muted-foreground">
              Sign in to access cloud features
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-primary">Local</p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-primary" />
                  Docker rendering
                </li>
                <li className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-primary" />
                  Full LaTeX
                </li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-semibold">Cloud</p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Remote builds
                </li>
                <li className="flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  History
                </li>
              </ul>
            </div>
          </div>

          <Button
            onClick={handleSignIn}
            className="w-full py-3 flex items-center justify-center gap-2"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <ExternalLink className="w-5 h-5" />
            )}
            Sign In for Cloud Features
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Opens browser for secure authentication
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3 pb-6 border-b">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-semibold">
            {user?.name?.charAt(0)?.toUpperCase() || <Cloud className="w-8 h-8" />}
          </div>
        </div>
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-lg font-semibold">{user?.name || "User"}</h3>
          <Cloud className="w-4 h-4 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Cloud Mode Active</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground">Email</span>
          <span className="text-sm font-medium">{user?.email || "—"}</span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground">Status</span>
          <span className="text-sm font-medium text-primary flex items-center gap-1">
            <Check className="w-3 h-3" />
            Authenticated
          </span>
        </div>

        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <ul className="text-xs text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3 text-primary" />
              Remote cloud compilation enabled
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3 text-primary" />
              Build history & analytics
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t pt-6">
        <Button
          onClick={handleSignOut}
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          Sign Out
        </Button>
        <p className="text-xs text-center text-muted-foreground mt-2">
          You'll be switched to local mode
        </p>
      </div>
    </div>
  );
}
