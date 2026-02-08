import { useState } from "react";
import { useAppStore } from "../stores/appStore";
import { initializeAPI, getAPI } from "../services/api";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { apiUrl, builderUrl, builderToken, setApiUrl, setBuilderUrl, setBuilderToken } = useAppStore();
  const [api, setApi] = useState(apiUrl);
  const [url, setUrl] = useState(builderUrl);
  const [token, setToken] = useState(builderToken);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const trimmedApi = api.trim() || "/api";
    const trimmedUrl = url.trim() || "https://treefrog-renderer.onrender.com";
    const trimmedToken = token.trim();

    // Initialize API with new URL
    initializeAPI(trimmedApi);

    // Update store
    setApiUrl(trimmedApi);
    setBuilderUrl(trimmedUrl);
    setBuilderToken(trimmedToken);

    // Send config to server using Axios
    try {
      await getAPI().post("/config", {
        builderUrl: trimmedUrl,
        builderToken: trimmedToken,
      });
    } catch (err) {
      console.warn("Could not send config to server:", err);
    }

    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-full max-w-md">
        <h3 className="font-bold text-lg mb-4">Settings</h3>

        <div className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Local Server URL</span>
            </label>
            <input
              type="text"
              placeholder="/api"
              value={api}
              onChange={(e) => setApi(e.target.value)}
              className="input input-bordered"
            />
            <label className="label">
              <span className="label-text-alt">
                The Treefrog server running on your machine
              </span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Builder URL</span>
            </label>
            <input
              type="text"
              placeholder="https://treefrog-renderer.onrender.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input input-bordered"
            />
            <label className="label">
              <span className="label-text-alt">
                Remote LaTeX builder for compilation
              </span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Builder Token (optional)</span>
            </label>
            <input
              type="password"
              placeholder="Leave empty if not required"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="input input-bordered"
            />
            <label className="label">
              <span className="label-text-alt">
                Authentication token for remote builder
              </span>
            </label>
          </div>

          {saved && (
            <div className="alert alert-success">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Settings saved successfully</span>
            </div>
          )}
        </div>

        <div className="modal-action">
          <button onClick={handleSave} className="btn btn-primary">
            Save
          </button>
          <button onClick={onClose} className="btn">
            Cancel
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

