import { useState } from "react";
import { useAppStore } from "../stores/appStore";
import { initializeAPI, getAPI } from "../services/api";
import { Settings, Server, Key, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { apiUrl, builderUrl, builderToken, setApiUrl, setBuilderUrl, setBuilderToken } = useAppStore();
  const [api, setApi] = useState(apiUrl);
  const [url, setUrl] = useState(builderUrl);
  const [token, setToken] = useState(builderToken);
  const [saved, setSaved] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
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
      setIsSaving(false);
      onClose();
    }, 1500);
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-base-300">
          <div className="p-2 rounded-lg bg-primary/10">
            <Settings size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Settings</h3>
            <p className="text-xs text-base-content/60">Configure server connections</p>
          </div>
        </div>

        <div className="space-y-6 py-6">
          {/* Local Server URL */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Server size={16} className="text-primary opacity-70" />
              <label className="label-text font-semibold text-sm">Local Server URL</label>
              <span className="badge badge-sm badge-ghost">Required</span>
            </div>
            <input
              type="text"
              placeholder="/api"
              value={api}
              onChange={(e) => setApi(e.target.value)}
              className="input input-bordered w-full text-sm"
              disabled={isSaving}
            />
            <p className="text-xs text-base-content/60 mt-2">
              The Treefrog server running on your machine (e.g., <code className="bg-base-300/50 px-1 rounded">http://localhost:3000/api</code>)
            </p>
          </div>

          {/* Builder URL */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Server size={16} className="text-primary opacity-70" />
              <label className="label-text font-semibold text-sm">Builder URL</label>
              <span className="badge badge-sm badge-ghost">Required</span>
            </div>
            <input
              type="text"
              placeholder="https://treefrog-renderer.onrender.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input input-bordered w-full text-sm"
              disabled={isSaving}
            />
            <p className="text-xs text-base-content/60 mt-2">
              Remote LaTeX compiler service (e.g., <code className="bg-base-300/50 px-1 rounded">https://builder.example.com</code>)
            </p>
          </div>

          {/* Builder Token */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Key size={16} className="text-primary opacity-70" />
              <label className="label-text font-semibold text-sm">Builder Token</label>
              <span className="badge badge-sm badge-neutral">Optional</span>
            </div>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                placeholder="Leave empty if not required"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="input input-bordered w-full text-sm pr-10"
                disabled={isSaving}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-base-300/30 rounded transition-colors"
                disabled={isSaving}
              >
                {showToken ? (
                  <EyeOff size={16} className="text-base-content/60" />
                ) : (
                  <Eye size={16} className="text-base-content/60" />
                )}
              </button>
            </div>
            <p className="text-xs text-base-content/60 mt-2">
              Authentication token for remote builder access (if required)
            </p>
          </div>

          {/* Success Message */}
          {saved && (
            <div className="p-3 rounded-lg bg-success/10 border border-success/20 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CheckCircle2 size={18} className="shrink-0 text-success" />
              <div>
                <p className="font-medium text-sm text-success">Settings saved</p>
                <p className="text-xs text-success/70">Configuration updated successfully</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 pt-6 border-t border-base-300">
          <button 
            onClick={handleSave} 
            disabled={isSaving || saved}
            className="btn btn-primary flex-1 gap-2"
          >
            {isSaving ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 size={16} />
                Saved
              </>
            ) : (
              "Save Settings"
            )}
          </button>
          <button 
            onClick={onClose} 
            disabled={isSaving}
            className="btn btn-ghost flex-1"
          >
            {saved ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

