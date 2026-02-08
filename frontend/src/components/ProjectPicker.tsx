import { useState } from "react";
import { isWails } from "../utils/env";
import { FolderOpen } from "lucide-react";

interface ProjectPickerProps {
  visible: boolean;
  confirm: (path: string) => Promise<void>;
  close: () => void;
  loading?: boolean;
}

export default function ProjectPicker({
  visible,
  confirm,
  close,
  loading,
}: ProjectPickerProps) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!visible) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!input.trim()) {
      setError("Please enter a project path");
      return;
    }

    try {
      setIsSubmitting(true);
      await confirm(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set project");
    } finally {
      setIsSubmitting(false);
    }
  };

  // In Wails mode, we could trigger the native dialog
  // But for now, we'll keep the same UI for consistency
  const handleBrowse = async () => {
    if (isWails()) {
      try {
        const { openProjectDialog } = await import("../services/projectService");
        const project = await openProjectDialog();
        if (project && project.root) {
          setInput(project.root);
        }
      } catch (err) {
        console.error("Failed to open dialog:", err);
      }
    }
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-full max-w-md">
        <h3 className="font-bold text-lg mb-4">Select Project Folder</h3>
        <p className="text-sm text-base-content/70 mb-4">
          {isWails() 
            ? "Select your LaTeX project folder."
            : "Enter an absolute path to your LaTeX project."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={isWails() ? "/path/to/project" : "/absolute/path/to/project"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || isSubmitting}
              className="input input-bordered w-full"
              autoFocus
            />
            {isWails() && (
              <button
                type="button"
                onClick={handleBrowse}
                disabled={loading || isSubmitting}
                className="btn btn-outline"
                title="Browse..."
              >
                <FolderOpen size={20} />
              </button>
            )}
          </div>

          {error && (
            <div className="alert alert-error">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l-2 2m2-2l2 2m1-11a9 9 0 110 18 9 9 0 010-18z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="modal-action">
            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? "Loading..." : "Set Project"}
            </button>
            <button
              type="button"
              onClick={close}
              disabled={loading || isSubmitting}
              className="btn"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={close}>close</button>
      </form>
    </dialog>
  );
}
