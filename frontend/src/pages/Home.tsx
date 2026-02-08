import { useState } from "react";
import { Plus } from "lucide-react";

interface HomeProps {
  onSelectProject: (path: string) => Promise<void>;
  loading?: boolean;
}

export default function Home({ onSelectProject, loading }: HomeProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!inputValue.trim()) {
      setError("Please enter a project path");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSelectProject(inputValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-200 to-base-300 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card bg-base-100 shadow-2xl">
          <div className="card-body">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Treefrog
              </h1>
              <p className="text-base-content/70 mt-2">LaTeX Editor</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Project Path</span>
                </label>
                <input
                  type="text"
                  placeholder="/absolute/path/to/project"
                  className="input input-bordered w-full"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={loading || isSubmitting}
                  autoFocus
                />
                <label className="label">
                  <span className="label-text-alt">
                    Enter the absolute path to your LaTeX project
                  </span>
                </label>
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

              <button
                type="submit"
                disabled={loading || isSubmitting}
                className="btn btn-primary w-full gap-2"
              >
                <Plus size={20} />
                {isSubmitting ? "Loading..." : "Open Project"}
              </button>
            </form>

            <div className="divider my-6"></div>

            <div className="space-y-2 text-sm text-base-content/70">
              <p className="font-semibold">Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Use absolute paths (e.g., /home/user/latex-project)</li>
                <li>Project must contain a main.tex file</li>
                <li>Git repository is optional</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center mt-8 text-sm text-base-content/50">
          <p>Need help? Check the documentation</p>
        </div>
      </div>
    </div>
  );
}
