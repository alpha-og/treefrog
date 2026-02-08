import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Globe,
  Lock,
  Palette,
  AlertCircle,
  CheckCircle,
  Zap,
  Save,
} from "lucide-react";
import { useAppStore } from "../stores/appStore";
import { syncConfig } from "../services/configService";
import RendererSettings from "../components/RendererSettings";
import FramelessWindow from "../components/FramelessWindow";

export default function Settings() {
  const navigate = useNavigate();
  const {
    builderUrl,
    builderToken,
    theme,
    setBuilderUrl,
    setBuilderToken,
    setTheme,
  } = useAppStore();

  const [tempUrl, setTempUrl] = useState(builderUrl);
  const [tempToken, setTempToken] = useState(builderToken);
  const [tempTheme, setTempTheme] = useState(theme);
  const [errors, setErrors] = useState<{ url?: string; token?: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setTempUrl(builderUrl);
    setTempToken(builderToken);
    setTempTheme(theme);
  }, [builderUrl, builderToken, theme]);

  // Track if there are unsaved changes
  useEffect(() => {
    const changed =
      tempUrl !== builderUrl ||
      tempToken !== builderToken ||
      tempTheme !== theme;
    setHasChanges(changed);
  }, [tempUrl, tempToken, tempTheme, builderUrl, builderToken, theme]);

  const validateForm = () => {
    const newErrors: { url?: string; token?: string } = {};

    if (!tempUrl.trim()) {
      newErrors.url = "Builder URL is required";
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

  const handleSaveAll = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      // Save builder config
      await syncConfig(tempUrl, tempToken);
      setBuilderUrl(tempUrl);
      setBuilderToken(tempToken);

      // Save theme
      setTheme(tempTheme);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setErrors({
        url: `Failed to save settings: ${err}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FramelessWindow title="Treefrog" subtitle="Settings">
      <div
        className="flex-1 bg-gradient-to-br from-base-200 via-base-100 to-base-200 flex flex-col overflow-hidden"
        style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 border-b border-base-content/10 bg-base-100/95 backdrop-blur-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate({ to: "/" })}
                className="btn btn-ghost btn-sm btn-circle hover:bg-primary/10 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-sm text-base-content/60">
                  Customize your Treefrog experience
                </p>
              </div>
            </div>

            {/* Save Button and Status */}
            <div className="flex items-center gap-3">
              {saveSuccess && (
                <div className="flex items-center gap-2 text-success text-sm font-medium animate-in fade-in">
                  <CheckCircle className="w-4 h-4" />
                  Saved
                </div>
              )}
              <button
                onClick={handleSaveAll}
                disabled={!hasChanges || isSaving}
                className="btn btn-primary btn-sm gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                {isSaving ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errors.url && (
            <div className="px-6 pb-4">
              <div className="bg-error/10 border border-error/30 rounded-xl p-3 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                <span className="text-error text-sm font-medium">
                  {errors.url}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Main Content - Scrollable */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl w-full mx-auto px-6 py-8 md:py-12">
            <div className="space-y-12">
              {/* Section 1: Builder Configuration */}
              <section>
                <div className="space-y-6">
                  {/* Section Header */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <Globe size={20} className="text-primary" />
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold">
                        Builder Settings
                      </h2>
                    </div>
                    <p className="text-base-content/70 text-sm md:text-base ml-13">
                      Configure your LaTeX compilation server and authentication
                    </p>
                  </div>

                  {/* Builder URL Field */}
                  <div className="bg-gradient-to-br from-base-100 to-base-100/50 border border-base-content/10 rounded-2xl p-6 md:p-8 hover:border-base-content/20 transition-all duration-300">
                    <label className="label pb-3">
                      <span className="label-text font-bold text-base flex items-center gap-2">
                        <Globe size={16} className="text-primary" />
                        Builder URL
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
                      className={`input input-bordered w-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                        errors.url ? "input-error" : ""
                      }`}
                    />
                    {errors.url && (
                      <div className="flex items-center gap-2 mt-3 text-error text-sm">
                        <AlertCircle size={14} />
                        {errors.url}
                      </div>
                    )}
                    <p className="text-xs text-base-content/60 mt-3 leading-relaxed">
                      The URL of your LaTeX compilation server. Make sure it's
                      accessible and running. You can use the local renderer or a
                      remote service.
                    </p>
                  </div>

                  {/* Builder Token Field */}
                  <div className="bg-gradient-to-br from-base-100 to-base-100/50 border border-base-content/10 rounded-2xl p-6 md:p-8 hover:border-base-content/20 transition-all duration-300">
                    <label className="label pb-3">
                      <span className="label-text font-bold text-base flex items-center gap-2">
                        <Lock size={16} className="text-primary" />
                        Builder Token
                      </span>
                      <span className="label-text-alt text-xs text-base-content/50 font-medium">
                        Optional
                      </span>
                    </label>
                    <input
                      type="password"
                      value={tempToken}
                      onChange={(e) => {
                        setTempToken(e.target.value);
                        if (errors.token)
                          setErrors({ ...errors, token: undefined });
                      }}
                      placeholder="Enter authentication token (if required)"
                      className="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
                    />
                    <p className="text-xs text-base-content/60 mt-3 leading-relaxed">
                      Authentication token for the builder server. Leave blank if
                      authentication is not required. Your token is stored securely
                      on your device.
                    </p>
                  </div>

                  {/* Info Box */}
                  <div className="bg-info/10 border border-info/30 rounded-2xl p-6 flex items-start gap-4">
                    <AlertCircle
                      size={20}
                      className="text-info flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <h3 className="font-bold text-info mb-2 text-sm">
                        Privacy & Security
                      </h3>
                      <p className="text-sm text-info/90 leading-relaxed">
                        All settings are stored locally on your device and are never
                        shared with anyone. Your authentication tokens are encrypted
                        and secure.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-base-content/10 to-transparent" />
                <span className="text-xs text-base-content/60 font-medium uppercase tracking-wider">
                  Appearance
                </span>
                <div className="flex-1 h-px bg-gradient-to-l from-base-content/10 to-transparent" />
              </div>

              {/* Section 2: Appearance */}
              <section>
                <div className="space-y-6">
                  {/* Section Header */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-warning/20 flex items-center justify-center">
                        <Palette size={20} className="text-accent" />
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold">
                        Appearance
                      </h2>
                    </div>
                    <p className="text-base-content/70 text-sm md:text-base ml-13">
                      Customize the look and feel of your editor
                    </p>
                  </div>

                  {/* Theme Toggle */}
                  <div className="bg-gradient-to-br from-base-100 to-base-100/50 border border-base-content/10 rounded-2xl p-6 md:p-8 hover:border-base-content/20 transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="font-bold text-base flex items-center gap-2 mb-2">
                          <Palette size={18} className="text-accent" />
                          Dark Mode
                        </label>
                        <p className="text-xs text-base-content/60 leading-relaxed">
                          Enable dark mode for a more comfortable viewing experience
                          in low-light environments
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-lg ml-4"
                        checked={tempTheme === "dark"}
                        onChange={(e) =>
                          setTempTheme(e.target.checked ? "dark" : "light")
                        }
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-base-content/10 to-transparent" />
                <span className="text-xs text-base-content/60 font-medium uppercase tracking-wider">
                  Renderer
                </span>
                <div className="flex-1 h-px bg-gradient-to-l from-base-content/10 to-transparent" />
              </div>

              {/* Section 3: Renderer Settings */}
              <section>
                <div className="space-y-6">
                  {/* Section Header */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-success/20 to-info/20 flex items-center justify-center">
                        <Zap size={20} className="text-success" />
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold">
                        Renderer Settings
                      </h2>
                    </div>
                    <p className="text-base-content/70 text-sm md:text-base ml-13">
                      Manage your local Docker LaTeX compilation environment
                    </p>
                  </div>

                  {/* Renderer Settings Component */}
                  <div className="space-y-6">
                    <RendererSettings />
                  </div>
                </div>
              </section>

              {/* Footer Spacing */}
              <div className="h-12" />
            </div>
          </div>
        </main>
      </div>
    </FramelessWindow>
  );
}
