import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  ArrowUpDown,
  FileText,
  Image,
  Code,
  FolderOpen,
  ChevronDown,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface FilterBarProps {
  filterHidden: boolean;
  onToggleHidden: () => void;
  filterType: "all" | "latex" | "image" | "code";
  onFilterTypeChange: (type: "all" | "latex" | "image" | "code") => void;
  sortBy: "name" | "size" | "date";
  onSortByChange: (by: "name" | "size" | "date") => void;
  sortOrder: "asc" | "desc";
  onToggleSortOrder: () => void;
}

export function FilterBar({
  filterHidden,
  onToggleHidden,
  filterType,
  onFilterTypeChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onToggleSortOrder,
}: FilterBarProps) {
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  return (
    <div className="px-3 py-1.5 flex items-center gap-2 border-b bg-muted/30">
      {/* Hidden files toggle */}
      <button
        onClick={onToggleHidden}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
          filterHidden
            ? "bg-primary/20 text-primary"
            : "hover:bg-accent text-muted-foreground"
        )}
        title={filterHidden ? "Show hidden files" : "Hide hidden files"}
      >
        {filterHidden ? <EyeOff size={10} /> : <Eye size={10} />}
        <span>{filterHidden ? "Hidden" : "Visible"}</span>
      </button>

      <div className="w-px h-4 bg-border" />

      {/* Type filter */}
      <div className="flex items-center gap-1">
        {[
          { type: "all" as const, icon: FolderOpen, label: "All" },
          { type: "latex" as const, icon: FileText, label: "LaTeX" },
          { type: "image" as const, icon: Image, label: "Images" },
          { type: "code" as const, icon: Code, label: "Code" },
        ].map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => onFilterTypeChange(type)}
            className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs transition-colors",
              filterType === type
                ? "bg-primary/20 text-primary"
                : "hover:bg-accent text-muted-foreground"
            )}
            title={`Filter: ${label}`}
          >
            <Icon size={10} />
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-border" />

      {/* Sort controls with dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowSortDropdown(!showSortDropdown)}
          title="Change sort field"
          className={cn(
            "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs transition-colors",
            showSortDropdown
              ? "bg-primary/20 text-primary"
              : "hover:bg-accent text-muted-foreground"
          )}
        >
         <span className="capitalize text-[10px]">{sortBy}</span>
         <ChevronDown
           size={8}
           className={cn("transition-transform", showSortDropdown && "rotate-180")}
         />
       </button>

        {/* Sort dropdown */}
        {showSortDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-popover border rounded-md shadow-md py-1 z-50 min-w-[100px]">
            {(["name", "size", "date"] as const).map((field) => (
              <button
                key={field}
                onClick={() => {
                  onSortByChange(field);
                  setShowSortDropdown(false);
                }}
               className={cn(
                 "w-full px-3 py-1 text-xs text-left capitalize hover:bg-accent transition-colors",
                 sortBy === field && "bg-primary/10 text-primary"
               )}
             >
               {field}
             </button>
            ))}
          </div>
        )}
      </div>

      {/* Sort order toggle */}
        <button
          onClick={onToggleSortOrder}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs hover:bg-accent text-muted-foreground transition-colors"
          title={`Order: ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
        >
          <ArrowUpDown
            size={10}
            className={cn(sortOrder === "desc" && "rotate-180 transition-transform")}
          />
        </button>
    </div>
  );
}
