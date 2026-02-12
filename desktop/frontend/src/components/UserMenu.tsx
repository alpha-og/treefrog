import { useNavigate } from "@tanstack/react-router";
import { useAuth as useClerkAuth, SignOutButton } from "@clerk/clerk-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui";
import { Button } from "@/components/common";
import { useAuthStore } from "@/stores/authStore";
import {
  User,
  BarChart3,
  CreditCard,
  LogOut,
  Settings,
} from "lucide-react";

export function UserMenu() {
  const navigate = useNavigate();
  const { user: clerkUser } = useClerkAuth();
  const { user: storedUser } = useAuthStore();

  // Get email from Clerk or stored auth
  const userEmail = clerkUser?.emailAddresses[0]?.emailAddress || storedUser?.email || "User";
  const userName = clerkUser?.firstName || "Account";

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
      </Button>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => navigate({ to: "/dashboard" })}
          className="cursor-pointer"
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          <span>Build History</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate({ to: "/billing" })}
          className="cursor-pointer"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          <span>Billing</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => navigate({ to: "/account" })}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Account Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <SignOutButton redirectUrl="/auth">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </SignOutButton>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
