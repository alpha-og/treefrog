import { Settings } from "lucide-react";

export default function EmptyPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-base-content/50">
      <Settings size={48} className="opacity-30" />
      <div className="text-center">
        <div className="text-sm font-semibold mb-1">
          All panes hidden
        </div>
        <div className="text-xs opacity-70">
          Use the panel icons in the toolbar to show panes
        </div>
      </div>
    </div>
  );
}
