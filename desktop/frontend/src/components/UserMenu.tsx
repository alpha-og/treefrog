import { useNavigate } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui";
import { Button } from "@/components/common";
import {
  User,
  BarChart3,
  CreditCard,
  LogOut,
  Settings,
  Cloud,
  HardDrive,
} from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    go?: {
      main?: {
        App?: {
          SignOut: () => Promise<void>
        }
      }
    }
  }
}

export function UserMenu() {
  const navigate = useNavigate();
  const { mode, user } = useAuthStore();
  const isGuest = mode === 'guest';

  const userName = isGuest ? "Guest" : (user?.name || "User");
  const userEmail = isGuest ? "Local Mode" : (user?.email || "");

  const handleSignOut = async () => {
    try {
      const signOut = window.go?.main?.App?.SignOut;
      if (signOut) {
        await signOut();
        toast.success("Signed out");
      }
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  return (
    <DropdownMenu>
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 rounded-full"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white text-sm font-semibold">
          {userName.charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:inline text-sm">{userName}</span>
        {isGuest && (
          <span className="text-xs text-muted-foreground">(Guest)</span>
        )}
      </Button>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{userName}</p>
              {isGuest ? (
                <HardDrive className="w-3 h-3 text-muted-foreground" />
              ) : (
                <Cloud className="w-3 h-3 text-primary" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
            <p className="text-xs text-muted-foreground">
              {isGuest ? "Local Mode" : "Cloud Mode"}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {!isGuest && (
          <>
            <DropdownMenuItem
              onClick={() => navigate({ to: "/dashboard" })}
              className="cursor-pointer"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Build History
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => navigate({ to: "/billing" })}
              className="cursor-pointer"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuItem
          onClick={() => navigate({ to: "/settings" })}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate({ to: "/account" })}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          Account
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {isGuest ? (
          <DropdownMenuItem 
            onClick={() => navigate({ to: "/account" })} 
            className="cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign In
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
