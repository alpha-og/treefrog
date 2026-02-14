"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuRadioGroup,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

/**
 * ContextMenuWrapper - Enhanced context menu with consistent styling and animations
 * 
 * Features:
 * - Radix-based context menu with full Radix capabilities
 * - Consistent hover/focus states across all items
 * - Icon support on items
 * - Keyboard shortcut display with subtlety
 * - Groups and separators for organization
 * 
 * @example
 * ```tsx
 * <ContextMenuWrapper>
 *   <ContextMenuTrigger>
 *     <div>Right-click me</div>
 *   </ContextMenuTrigger>
 *   <ContextMenuContent>
 *     <MenuItem onClick={handleRename}>
 *       <Edit2 size={16} />
 *       <span>Rename</span>
 *     </MenuItem>
 *   </ContextMenuContent>
 * </ContextMenuWrapper>
 * ```
 */
interface ContextMenuWrapperProps {
  children: React.ReactNode;
}

export function ContextMenuWrapper({ children }: ContextMenuWrapperProps) {
  return (
    <ContextMenu>
      {children}
    </ContextMenu>
  );
}

/**
 * Enhanced ContextMenuContent with consistent styling
 */
interface ContextMenuContentWrapperProps
  extends React.ComponentProps<typeof ContextMenuContent> {
  children: React.ReactNode;
}

export function ContextMenuContentWrapper({
  children,
  className,
  ...props
}: ContextMenuContentWrapperProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <AnimatePresence mode="wait">
      {isOpen ? (
        <motion.div
          key="context-content"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            duration: 0.2,
            ease: "easeOut",
          }}
        >
          <ContextMenuContent
            className={cn(
              "min-w-48 z-50",
              className
            )}
            onOpenChange={setIsOpen}
            {...props}
          >
            {children}
          </ContextMenuContent>
        </motion.div>
      ) : (
        <ContextMenuContent
          className={cn(
            "min-w-48 z-50",
            className
          )}
          onOpenChange={setIsOpen}
          {...props}
        >
          {children}
        </ContextMenuContent>
      )}
    </AnimatePresence>
  );
}

/**
 * Enhanced MenuItem with consistent styling
 */
interface MenuItemProps extends React.ComponentProps<typeof ContextMenuItem> {
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
    <ContextMenuItem
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
    </ContextMenuItem>
  );
}

/**
 * Enhanced CheckboxItem with consistent styling
 */
interface MenuCheckboxItemProps
  extends React.ComponentProps<typeof ContextMenuCheckboxItem> {
  children: React.ReactNode;
}

export function MenuCheckboxItem({
  children,
  className,
  ...props
}: MenuCheckboxItemProps) {
  return (
    <ContextMenuCheckboxItem
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
    </ContextMenuCheckboxItem>
  );
}

/**
 * Enhanced RadioItem with consistent styling
 */
interface MenuRadioItemProps
  extends React.ComponentProps<typeof ContextMenuRadioItem> {
  children: React.ReactNode;
}

export function MenuRadioItem({
  children,
  className,
  ...props
}: MenuRadioItemProps) {
  return (
    <ContextMenuRadioItem
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
    </ContextMenuRadioItem>
  );
}

// Re-export shadcn primitives for convenience
export {
  ContextMenuTrigger,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuRadioGroup,
};
