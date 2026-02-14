import { useState, useEffect } from "react";
import { isWails } from "../utils/env";
import { createLogger } from "../utils/logger";
import { FolderOpen } from "lucide-react";

const log = createLogger("ProjectPicker");

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

  // In Wails mode, automatically open native dialog when picker becomes visible
  useEffect(() => {
    if (visible && isWails()) {
      handleBrowse();
    }
  }, [visible]);

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

  const handleBrowse = async () => {
    if (isWails()) {
      try {
        setIsSubmitting(true);
        const { openProjectDialog } = await import("../services/projectService");
        const project = await openProjectDialog();
        if (project && project.root) {
          // Directly confirm the project instead of just setting input
          await confirm(project.root);
        }
       } catch (err) {
         // User cancelled or error occurred
         log.error("Failed to open directory dialog", err);
         setError(err instanceof Error ? err.message : "Failed to open folder dialog");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // In Wails mode, show a simpler dialog since native picker is primary
  if (isWails()) {
    return (
      <dialog className="modal modal-open">
        <div className="modal-box w-full max-w-md">
          <h3 className="font-bold text-lg mb-4">Select Project Folder</h3>
          
          {isSubmitting ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm text-foreground/70">Opening folder picker...</p>
            </div>
          ) : error ? (
            <div className="space-y-4">
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
              <div className="modal-action">
                <button
                  type="button"
                  onClick={handleBrowse}
                  className="btn btn-primary gap-2"
                >
                  <FolderOpen size={18} />
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4">
              <p className="text-sm text-foreground/70 text-center">
                Select a folder containing your LaTeX project.
              </p>
              <div className="modal-action">
                <button
                  type="button"
                  onClick={handleBrowse}
                  className="btn btn-primary gap-2"
                >
                  <FolderOpen size={18} />
                  Browse...
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={close}>close</button>
        </form>
      </dialog>
    );
  }

  // Web mode: show text input
  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-full max-w-md">
        <h3 className="font-bold text-lg mb-4">Select Project Folder</h3>
        <p className="text-sm text-foreground/70 mb-4">
          Enter an absolute path to your LaTeX project.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="/absolute/path/to/project"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || isSubmitting}
            className="input input-bordered w-full"
            autoFocus
          />

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
