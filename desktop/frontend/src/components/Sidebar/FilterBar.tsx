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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@treefrog/ui";

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
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const filterOptions = [
    { type: "all" as const, icon: FolderOpen, label: "All" },
    { type: "latex" as const, icon: FileText, label: "LaTeX" },
    { type: "image" as const, icon: Image, label: "Images" },
    { type: "code" as const, icon: Code, label: "Code" },
  ];

  const sortOptions = [
    { field: "name" as const, label: "Name" },
    { field: "size" as const, label: "Size" },
    { field: "date" as const, label: "Date" },
  ];

  return (
    <div className="px-3 py-1.5 flex items-center gap-2 border-b bg-muted/30">
      {/* Hidden files toggle */}
      <Button
        variant="ghost"
        size="sm"
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
      </Button>

      <div className="w-px h-4 bg-border" />

      {/* Type filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title="Filter by type"
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
              filterType !== "all" && "bg-primary/20 text-primary"
            )}
          >
            <span className="capitalize text-[10px]">{filterType}</span>
            <ChevronDown
              size={8}
              className={cn("transition-transform", showTypeDropdown && "rotate-180")}
            />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="min-w-32">
          {filterOptions.map(({ type, icon: Icon, label }) => (
            <DropdownMenuItem
              key={type}
              onClick={() => {
                onFilterTypeChange(type);
                setShowTypeDropdown(false);
              }}
              className={cn(
                "w-full px-3 py-1.5 text-sm",
                filterType === type && "bg-accent/10 text-primary"
              )}
            >
              <Icon size={16} className="opacity-80" />
              <span>{label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-4 bg-border" />

      {/* Sort controls */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title="Change sort field"
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
              showSortDropdown && "bg-primary/20 text-primary"
            )}
          >
            <span className="capitalize text-[10px]">{sortBy}</span>
            <ChevronDown
              size={8}
              className={cn("transition-transform", showSortDropdown && "rotate-180")}
            />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="min-w-28">
          <DropdownMenuRadioGroup value={sortBy} onValueChange={onSortByChange}>
            {sortOptions.map((field) => (
              <DropdownMenuRadioItem
                key={field.field}
                value={field.field}
                className={cn(
                  "w-full px-3 py-1.5 text-sm capitalize",
                  sortBy === field.field && "bg-accent/10 text-primary"
                )}
              >
                {field.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort order toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleSortOrder}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-accent text-muted-foreground transition-colors"
        title={`Order: ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
      >
        <ArrowUpDown
          size={10}
          className={cn(sortOrder === "desc" && "rotate-180 transition-transform")}
        />
      </Button>
    </div>
  );
}