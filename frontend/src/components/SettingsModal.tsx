import { X, Lock, Globe, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  compilerUrl: string;
  compilerToken: string;
  onSave: (url: string, token: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  compilerUrl,
  compilerToken,
  onSave,
}: SettingsModalProps) {
  const [tempUrl, setTempUrl] = useState(compilerUrl);
  const [tempToken, setTempToken] = useState(compilerToken);
  const [errors, setErrors] = useState<{ url?: string; token?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTempUrl(compilerUrl);
    setTempToken(compilerToken);
    setErrors({});
  }, [isOpen, compilerUrl, compilerToken]);

  const validateForm = () => {
    const newErrors: { url?: string; token?: string } = {};

    if (!tempUrl.trim()) {
      newErrors.url = "Compiler URL is required";
    } else if (!isValidUrl(tempUrl)) {
      newErrors.url = "Please enter a valid URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      onSave(tempUrl, tempToken);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <dialog className="modal modal-open z-50" onClick={onClose}>
        <div
          className="modal-box max-w-lg shadow-2xl rounded-2xl bg-base-100 border border-base-content/5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-linear-to-br from-primary to-secondary flex items-center justify-center">
                <Globe size={20} className="text-primary-content" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">Compiler Settings</h3>
                <p className="text-xs text-base-content/60 mt-1">
                  Configure your LaTeX compilation server
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Compiler URL Field */}
            <div>
              <label className="label pb-2">
                <span className="label-text font-semibold flex items-center gap-2">
                  <Globe size={16} className="text-primary" />
                  Compiler URL
                </span>
              </label>
              <input
                type="url"
                value={tempUrl}
                onChange={(e) => {
                  setTempUrl(e.target.value);
                  if (errors.url) setErrors({ ...errors, url: undefined });
                }}
                placeholder="https://treefrog-renderer.onrender.com"
                className={`input input-bordered w-full transition-colors ${errors.url ? "input-error" : "focus:border-primary"
                  }`}
              />
              {errors.url && (
                <div className="flex items-center gap-2 mt-2 text-error text-sm">
                  <AlertCircle size={14} />
                  {errors.url}
                </div>
              )}
              <p className="text-xs text-base-content/60 mt-2">
                The URL of your LaTeX compilation server. Make sure it&apos;s accessible
                and running.
              </p>
            </div>

            {/* Compiler Token Field */}
            <div>
              <label className="label pb-2">
                <span className="label-text font-semibold flex items-center gap-2">
                  <Lock size={16} className="text-primary" />
                  Compiler Token
                </span>
                <span className="label-text-alt text-xs text-base-content/50">
                  Optional
                </span>
              </label>
              <input
                type="password"
                value={tempToken}
                onChange={(e) => {
                  setTempToken(e.target.value);
                  if (errors.token) setErrors({ ...errors, token: undefined });
                }}
                placeholder="Enter authentication token (if required)"
                className="input input-bordered w-full focus:border-primary transition-colors"
              />
              <p className="text-xs text-base-content/60 mt-2">
                Authentication token for the compiler. Leave blank if not required.
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-info/10 border border-info/30 rounded-lg p-4">
              <p className="text-sm text-info flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  These settings are stored locally on your device and are not shared
                  with anyone.
                </span>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-action mt-8 gap-3">
            <button
              onClick={onClose}
              className="btn btn-ghost flex-1"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary flex-1 gap-2"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
