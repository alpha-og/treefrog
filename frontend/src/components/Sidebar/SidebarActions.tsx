import React, { useState } from "react";
import {
  MoreHorizontal,
  FilePlus,
  FolderPlus,
  Search,
  Filter,
  X,
} from "lucide-react";
import { Button } from "../common/Button";
import { cn } from "../../lib/utils";

interface SidebarActionsProps {
  onSearchToggle: () => void;
  onFilterToggle: () => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  isSearchOpen: boolean;
  isFilterOpen: boolean;
}

export function SidebarActions({
  onSearchToggle,
  onFilterToggle,
  onCreateFile,
  onCreateFolder,
  isSearchOpen,
  isFilterOpen,
}: SidebarActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        title="More actions"
        className={cn("h-7 w-7", isOpen && "bg-accent")}
      >
        <MoreHorizontal size={14} className="text-muted-foreground" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="absolute right-0 top-full mt-1 bg-popover border rounded-md shadow-md py-1 z-50 min-w-[160px]">
            <button
              onClick={() => handleAction(onSearchToggle)}
              className={cn(
                "w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent transition-colors",
                isSearchOpen && "bg-accent/50"
              )}
            >
              <Search size={14} />
              Search files
            </button>
            <button
              onClick={() => handleAction(onFilterToggle)}
              className={cn(
                "w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent transition-colors",
                isFilterOpen && "bg-accent/50"
              )}
            >
              <Filter size={14} />
              Filter & sort
            </button>
            <div className="border-t my-1" />
            <button
              onClick={() => handleAction(onCreateFile)}
              className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent transition-colors"
            >
              <FilePlus size={14} />
              New file
            </button>
            <button
              onClick={() => handleAction(onCreateFolder)}
              className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent transition-colors"
            >
              <FolderPlus size={14} />
              New folder
            </button>
          </div>
        </>
      )}
    </div>
  );
}