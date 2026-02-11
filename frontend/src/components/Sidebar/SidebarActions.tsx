import React, { useState } from "react";
import {
  MoreHorizontal,
  FilePlus,
  FolderPlus,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "../common/Button";
import { cn } from "../../lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          title="More actions"
          className={cn("h-7 w-7", isOpen && "bg-accent")}
        >
          <MoreHorizontal size={14} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem 
          onClick={() => {
            onSearchToggle();
            setIsOpen(false);
          }}
          className={cn(isSearchOpen && "bg-accent/50")}
        >
          <Search size={16} />
          <span>Search files</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => {
            onFilterToggle();
            setIsOpen(false);
          }}
          className={cn(isFilterOpen && "bg-accent/50")}
        >
          <Filter size={16} />
          <span>Filter & sort</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => {
            onCreateFile();
            setIsOpen(false);
          }}
        >
          <FilePlus size={16} />
          <span>New file</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => {
            onCreateFolder();
            setIsOpen(false);
          }}
        >
          <FolderPlus size={16} />
          <span>New folder</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}