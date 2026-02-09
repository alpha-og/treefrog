import { useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { ArrowLeft, Zap, Palette, Check, Moon, Sun, Monitor } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import LatexCompilerSettings from "../components/LatexCompilerSettings";
import FramelessWindow from "../components/FramelessWindow";

type SettingsTab = "compiler" | "appearance";
type ThemeMode = "dark" | "light" | "system";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useAppStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("compiler");
  const [themeMode, setThemeMode] = useState<ThemeMode>(theme as ThemeMode);
  const latexCompilerSettingsRef = useRef<{ save: () => Promise<void> }>(null);
  const [isSaving, setIsSaving] = useState(false);

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "compiler", label: "LaTeX Compiler", icon: <Zap size={16} /> },
    { id: "appearance", label: "Appearance", icon: <Palette size={16} /> },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeTab === "compiler" && latexCompilerSettingsRef.current?.save) {
        await latexCompilerSettingsRef.current.save();
      } else if (activeTab === "appearance") {
        // Save theme preference
        setTheme(themeMode);
      }
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
        {/* Header with Title and Tabs */}
        <div className="border-b border-base-content/5 flex-shrink-0">
          <div className="flex items-center justify-between px-6 py-4 min-h-[60px]">
            <div className="flex items-center gap-3 w-1/4">
              <button
                onClick={() => navigate({ to: "/" })}
                className="btn btn-ghost btn-sm btn-circle hover:bg-primary/10 transition-all"
                title="Go back"
              >
                <ArrowLeft size={18} className="text-primary" />
              </button>
              <h1 className="text-lg font-bold">Settings</h1>
            </div>

            <div className="flex justify-center w-1/2">
              <div className="flex gap-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-2 py-2 text-sm font-medium transition-all duration-300 border-b-2 ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-base-content/70 hover:text-base-content"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

             <div className="w-1/4 flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn btn-sm btn-primary gap-1"
              >
                {isSaving ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl w-full mx-auto px-6 py-8 md:py-12">
            {/* LaTeX Compiler Tab */}
            {activeTab === "compiler" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">LaTeX Compiler</h2>
                  <p className="text-base-content/70 text-sm md:text-base">
                    Configure your local Docker environment or use a remote compiler
                  </p>
                </div>

                {/* Settings Card - Following Home.tsx pattern */}
                <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-base-100 border border-primary/20 rounded-2xl p-6 md:p-8 hover:border-primary/40 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1">
                  <LatexCompilerSettings ref={latexCompilerSettingsRef} />
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">Appearance</h2>
                  <p className="text-base-content/70 text-sm md:text-base">
                    Customize your visual experience
                  </p>
                </div>

                {/* Theme Selection Card */}
                <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-base-100 border border-primary/20 rounded-2xl p-6 md:p-8 hover:border-primary/40 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1">
                  <div>
                    <label className="label pb-4">
                      <span className="label-text font-semibold">Theme</span>
                    </label>
                    <div className="join grid grid-cols-3 w-full">
                      <button
                        className={`join-item btn ${
                          themeMode === "light"
                            ? "btn-primary"
                            : "btn-outline"
                        }`}
                        onClick={() => setThemeMode("light")}
                      >
                        <Sun size={16} />
                        Light
                      </button>
                      <button
                        className={`join-item btn ${
                          themeMode === "system"
                            ? "btn-primary"
                            : "btn-outline"
                        }`}
                        onClick={() => setThemeMode("system")}
                      >
                        <Monitor size={16} />
                        System
                      </button>
                      <button
                        className={`join-item btn ${
                          themeMode === "dark"
                            ? "btn-primary"
                            : "btn-outline"
                        }`}
                        onClick={() => setThemeMode("dark")}
                      >
                        <Moon size={16} />
                        Dark
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </FramelessWindow>
  );
}
