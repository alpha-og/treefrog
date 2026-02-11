import React from "react";
import {
  Folder,
  X,
  ChevronRight,
  Home,
} from "lucide-react";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { SidebarActions } from "./SidebarActions";
import { cn } from "../../lib/utils";

interface SidebarHeaderProps {
  projectRoot: string;
  projectName: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onToggleSearch: () => void;
  onToggleFilter: () => void;
  isSearchOpen: boolean;
  isFilterOpen: boolean;
  selectionCount: number;
  onClearSelection: () => void;
  breadcrumbs?: string[];
  onBreadcrumbClick?: (index: number) => void;
}

export function SidebarHeader({
  projectRoot,
  projectName,
  searchQuery,
  onSearchChange,
  onCreateFile,
  onCreateFolder,
  onToggleSearch,
  onToggleFilter,
  isSearchOpen,
  isFilterOpen,
  selectionCount,
  onClearSelection,
  breadcrumbs = [],
  onBreadcrumbClick,
}: SidebarHeaderProps) {
  return (
    <div className="flex flex-col border-b bg-gradient-to-br from-card/50 to-transparent">
      {/* Project info and actions */}
      <div className="p-3 flex justify-between items-center">
        {/* Project info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Folder size={14} className="text-muted-foreground shrink-0" />
          <div className="flex flex-col min-w-0">
            <p
              className="text-xs text-muted-foreground truncate font-medium"
              title={projectRoot}
            >
              {projectName}
            </p>
            {breadcrumbs.length > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 mt-0.5">
                <button
                  onClick={() => onBreadcrumbClick?.(-1)}
                  className="hover:text-primary transition-colors"
                  title="Go to root"
                >
                  <Home size={10} />
                </button>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <ChevronRight size={10} />
                    <button
                      onClick={() => onBreadcrumbClick?.(index)}
                      className="hover:text-primary transition-colors truncate max-w-[80px]"
                      title={crumb}
                    >
                      {crumb}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Consolidated actions */}
        <SidebarActions
          onSearchToggle={onToggleSearch}
          onFilterToggle={onToggleFilter}
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
          isSearchOpen={isSearchOpen}
          isFilterOpen={isFilterOpen}
        />
      </div>

      {/* Search bar */}
      {isSearchOpen && (
        <div className="px-3 pb-2">
          <div className="relative">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search files..."
              className="pl-7 pr-7 h-7 text-xs"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selection indicator */}
      {selectionCount > 0 && (
        <div className="px-3 pb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {selectionCount} selected
          </span>
          <button
            onClick={onClearSelection}
            className="text-xs text-primary hover:underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
