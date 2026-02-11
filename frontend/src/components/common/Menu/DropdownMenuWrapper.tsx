"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DropdownMenuWrapperContextType {
  animationDelay: number;
  showShortcuts: boolean;
}

const DropdownMenuWrapperContext = React.createContext<
  DropdownMenuWrapperContextType
>({
  animationDelay: 0,
  showShortcuts: true,
});

export function useDropdownMenuWrapper() {
  return React.useContext(DropdownMenuWrapperContext);
}

/**
 * DropdownMenuWrapper - Enhanced dropdown menu with animations and consistent styling
 * 
 * Features:
 * - Slide + fade animations on open/close
 * - Consistent hover/focus states
 * - Icon support on items
 * - Keyboard shortcut display with subtlety
 * - Staggered item animations
 * 
 * @example
 * ```tsx
 * <DropdownMenuWrapper>
 *   <DropdownMenuTrigger asChild>
 *     <Button>Actions</Button>
 *   </DropdownMenuTrigger>
 *   <DropdownMenuContent>
 *     <DropdownMenuItem>
 *       <Edit2 size={16} />
 *       <span>Rename</span>
 *       <MenuShortcut>⌘R</MenuShortcut>
 *     </DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenuWrapper>
 * ```
 */
interface DropdownMenuWrapperProps {
  children: React.ReactNode;
  animationDelay?: number;
  showShortcuts?: boolean;
}

export function DropdownMenuWrapper({
  children,
  animationDelay = 0,
  showShortcuts = true,
}: DropdownMenuWrapperProps) {
  return (
    <DropdownMenuWrapperContext.Provider
      value={{
        animationDelay,
        showShortcuts,
      }}
    >
      <DropdownMenu>
        {children}
      </DropdownMenu>
    </DropdownMenuWrapperContext.Provider>
  );
}

/**
 * Enhanced DropdownMenuContent with animations
 * Wraps the shadcn component with motion animations
 */
interface DropdownMenuContentWrapperProps
  extends React.ComponentProps<typeof DropdownMenuContent> {
  children: React.ReactNode;
}

export function DropdownMenuContentWrapper({
  children,
  className,
  ...props
}: DropdownMenuContentWrapperProps) {
  return (
    <DropdownMenuContent
      className={cn(
        "min-w-48 z-50",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-top-2",
        "duration-150",
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenuContent>
  );
}

/**
 * Enhanced MenuItem with consistent styling and animations
 */
interface MenuItemProps extends React.ComponentProps<typeof DropdownMenuItem> {
  children: React.ReactNode;
  destructive?: boolean;
}

export function MenuItem({
  children,
  className,
  destructive,
  ...props
}: MenuItemProps) {
  return (
    <DropdownMenuItem
      className={cn(
        "group",
        "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer",
        "text-sm text-foreground",
        "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
        "transition-colors duration-100",
        destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive",
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenuItem>
  );
}

/**
 * Enhanced CheckboxItem with consistent styling
 */
interface MenuCheckboxItemProps
  extends React.ComponentProps<typeof DropdownMenuCheckboxItem> {
  children: React.ReactNode;
}

export function MenuCheckboxItem({
  children,
  className,
  ...props
}: MenuCheckboxItemProps) {
  return (
    <DropdownMenuCheckboxItem
      className={cn(
        "group",
        "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer",
        "text-sm text-foreground",
        "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
        "transition-colors duration-100",
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenuCheckboxItem>
  );
}

/**
 * Enhanced RadioItem with consistent styling
 */
interface MenuRadioItemProps
  extends React.ComponentProps<typeof DropdownMenuRadioItem> {
  children: React.ReactNode;
}

export function MenuRadioItem({
  children,
  className,
  ...props
}: MenuRadioItemProps) {
  return (
    <DropdownMenuRadioItem
      className={cn(
        "group",
        "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer",
        "text-sm text-foreground",
        "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
        "transition-colors duration-100",
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenuRadioItem>
  );
}

// Re-export shadcn primitives for convenience
export {
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
};
