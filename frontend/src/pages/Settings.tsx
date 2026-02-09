import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Zap, Palette } from "lucide-react";
import { useAppStore } from "../stores/appStore";
import LatexCompilerSettings from "../components/LatexCompilerSettings";
import FramelessWindow from "../components/FramelessWindow";

type SettingsTab = "compiler" | "appearance";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useAppStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("compiler");

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "compiler", label: "LaTeX Compiler", icon: <Zap size={16} /> },
    { id: "appearance", label: "Appearance", icon: <Palette size={16} /> },
  ];

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

            <div className="w-1/4" />
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
                  <LatexCompilerSettings />
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
                  <div className="space-y-6">
                    {/* Dark Mode Toggle */}
                    <div className="flex items-center justify-between p-4 bg-base-100/30 border border-base-content/10 rounded-xl hover:border-primary/20 transition-all duration-200">
                      <div>
                        <label className="font-semibold text-sm cursor-pointer">Dark Mode</label>
                        <p className="text-xs text-base-content/70 mt-1">
                          Switch between light and dark themes
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary toggle-sm"
                        checked={theme === "dark"}
                        onChange={(e) =>
                          setTheme(e.target.checked ? "dark" : "light")
                        }
                      />
                    </div>

                    {/* Theme Preview */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold">Theme Colors</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl p-4 bg-primary text-primary-content text-xs font-medium text-center border-2 border-primary/20 hover:border-primary/40 transition-all">
                          Primary
                        </div>
                        <div className="rounded-xl p-4 bg-secondary text-secondary-content text-xs font-medium text-center border-2 border-secondary/20 hover:border-secondary/40 transition-all">
                          Secondary
                        </div>
                        <div className="rounded-xl p-4 bg-accent text-accent-content text-xs font-medium text-center border-2 border-accent/20 hover:border-accent/40 transition-all">
                          Accent
                        </div>
                      </div>
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
