import React from "react";
import { Upload, File, Folder } from "lucide-react";
import { cn } from "../../lib/utils";

interface ExternalDropZoneProps {
  isActive: boolean;
  targetPath: string | null;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function ExternalDropZone({
  isActive,
  targetPath,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
}: ExternalDropZoneProps) {
  if (!isActive) return null;

  return (
    <div
      data-drop-zone="external"
      className={cn(
        "absolute inset-0 z-50 flex items-center justify-center",
        "bg-background/80 backdrop-blur-sm",
        "border-2 border-dashed border-primary",
        "m-4 rounded-xl",
        "animate-in fade-in duration-200"
      )}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
          <Upload size={32} className="text-primary" />
        </div>
        <div>
          <p className="text-lg font-medium text-foreground">
            Drop files here
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {targetPath
              ? `Import into "${targetPath.split("/").pop()}"`
              : "Import into project root"}
          </p>
        </div>
      </div>
    </div>
  );
}
