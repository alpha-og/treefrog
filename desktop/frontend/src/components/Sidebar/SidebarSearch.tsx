import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@treefrog/ui";

interface SidebarSearchProps {
  query: string;
  onChange: (query: string) => void;
  resultCount: number;
  isOpen: boolean;
  onClose: () => void;
}

export function SidebarSearch({
  query,
  onChange,
  resultCount,
  isOpen,
  onClose,
}: SidebarSearchProps) {
  if (!isOpen) return null;

  return (
    <div className="px-3 pb-2 animate-in slide-in-from-top-2 duration-200">
      <div className="relative">
        <Search
          size={12}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search files..."
          className="pl-7 pr-16 h-7 text-xs"
          autoFocus
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <>
              <span className="text-[10px] text-muted-foreground">
                {resultCount}
              </span>
              <button
                onClick={() => onChange("")}
                className="p-0.5 rounded hover:bg-accent text-muted-foreground"
              >
                <X size={10} />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-0.5 rounded hover:bg-accent text-muted-foreground"
          >
            <span className="text-[9px]">ESC</span>
          </button>
        </div>
      </div>
    </div>
  );
}
