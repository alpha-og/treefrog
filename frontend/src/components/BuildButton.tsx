import { Zap } from "lucide-react";
import { Button } from "@/components/common/Button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenuWrapper,
  DropdownMenuTrigger,
  DropdownMenuContentWrapper,
  MenuItem,
  DropdownMenuRadioGroup,
  MenuRadioItem,
  DropdownMenuSeparator,
  MenuIcon,
  MenuShortcut,
} from "@/components/common/Menu";

interface BuildButtonProps {
  onBuild: () => void;
  engine: string;
  onEngineChange: (engine: string) => void;
  shell: boolean;
  onShellChange: (shell: boolean) => void;
}

const ENGINES = ["pdflatex", "xelatex", "lualatex"];

export default function BuildButton({
  onBuild,
  engine,
  onEngineChange,
  shell,
  onShellChange,
}: BuildButtonProps) {
  return (
    <div className="flex items-center gap-1" style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}>
      {/* Main Build Button */}
      <Button
        onClick={onBuild}
        className="gap-2"
        title="Build document (⌘B)"
      >
        <Zap size={16} />
        Build
      </Button>

      {/* Build Options Dropdown */}
      <DropdownMenuWrapper>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10"
            title="Build settings"
          >
            <span className="text-lg">⋮</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContentWrapper align="end" className="w-56">
          {/* Engine Selection */}
          <div className="px-3 py-2">
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              LaTeX Engine
            </div>
          </div>

          <DropdownMenuRadioGroup value={engine} onValueChange={onEngineChange}>
            {ENGINES.map((eng) => (
              <MenuRadioItem key={eng} value={eng}>
                <MenuIcon name="engine" size={16} />
                <span className="flex-1">{eng}</span>
              </MenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          {/* Shell Escape Option */}
          <MenuItem
            onClick={() => onShellChange(!shell)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <MenuIcon name="shell-escape" size={16} />
              <span>Shell-escape</span>
            </div>
            <span className="text-xs">{shell ? "On" : "Off"}</span>
          </MenuItem>

          <DropdownMenuSeparator />

          {/* Quick Build Action */}
          <MenuItem
            onClick={onBuild}
          >
            <MenuIcon name="build" size={16} />
            <span className="flex-1">Build Now</span>
            <MenuShortcut>⌘B</MenuShortcut>
          </MenuItem>
        </DropdownMenuContentWrapper>
      </DropdownMenuWrapper>
    </div>
  );
}
