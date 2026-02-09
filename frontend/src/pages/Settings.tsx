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
import LatexCompilerSettings from "../components/LatexCompilerSettings";
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
      newErrors.url = "Remote Builder URL is required";
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
      await syncConfig(tempUrl, tempToken);
      setBuilderUrl(tempUrl);
      setBuilderToken(tempToken);
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
            <div className="flex items-center gap-3">
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
                    Save
                  </>
                )}
              </button>
            </div>
          </div>

          {errors.url && (
            <div className="px-6 pb-4">
              <div className="bg-error/10 border border-error/30 rounded-lg p-3 flex items-start gap-3">
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
          <div className="max-w-4xl w-full mx-auto px-6 py-8">
            <div className="space-y-6">
              {/* Remote Builder Settings */}
              <section>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b border-base-content/10">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <Globe size={18} className="text-primary" />
                    </div>
                    <h2 className="text-lg font-bold">Remote Builder</h2>
                    <span className="text-xs text-base-content/50 ml-auto">Remote Compilation Server</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="label pb-2">
                        <span className="label-text font-semibold text-sm">Builder URL</span>
                      </label>
                      <input
                        type="url"
                        value={tempUrl}
                        onChange={(e) => {
                          setTempUrl(e.target.value);
                          if (errors.url) setErrors({ ...errors, url: undefined });
                        }}
                        placeholder="https://treefrog-renderer.onrender.com"
                        className={`input input-bordered input-sm w-full transition-colors ${
                          errors.url ? "input-error" : ""
                        }`}
                      />
                      <p className="text-xs text-base-content/60 mt-2">
                        URL of your remote LaTeX compilation server
                      </p>
                    </div>

                    <div>
                      <label className="label pb-2">
                        <span className="label-text font-semibold text-sm">Authentication Token</span>
                        <span className="label-text-alt text-xs">Optional</span>
                      </label>
                      <input
                        type="password"
                        value={tempToken}
                        onChange={(e) => {
                          setTempToken(e.target.value);
                          if (errors.token)
                            setErrors({ ...errors, token: undefined });
                        }}
                        placeholder="Enter token if required"
                        className="input input-bordered input-sm w-full transition-colors"
                      />
                      <p className="text-xs text-base-content/60 mt-2">
                        Leave blank if authentication is not required
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* LaTeX Compiler Settings */}
              <section>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b border-base-content/10">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-success/20 to-info/20 flex items-center justify-center">
                      <Zap size={18} className="text-success" />
                    </div>
                    <h2 className="text-lg font-bold">LaTeX Compiler</h2>
                    <span className="text-xs text-base-content/50 ml-auto">Local Docker Environment</span>
                  </div>

                  <LatexCompilerSettings />
                </div>
              </section>

              {/* Appearance Settings */}
              <section>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b border-base-content/10">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-warning/20 flex items-center justify-center">
                      <Palette size={18} className="text-accent" />
                    </div>
                    <h2 className="text-lg font-bold">Appearance</h2>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-base-100 border border-base-content/10 rounded-lg">
                    <div>
                      <label className="font-semibold text-sm">Dark Mode</label>
                      <p className="text-xs text-base-content/60 mt-1">
                        Enable dark theme for comfortable viewing
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary toggle-sm"
                      checked={tempTheme === "dark"}
                      onChange={(e) =>
                        setTempTheme(e.target.checked ? "dark" : "light")
                      }
                    />
                  </div>
                </div>
              </section>

              <div className="h-4" />
            </div>
          </div>
        </main>
      </div>
    </FramelessWindow>
  );
}
