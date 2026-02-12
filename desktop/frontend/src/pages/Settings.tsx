import { useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Zap, Palette, User, Moon, Sun, Monitor, Check, Save } from "lucide-react";
import { motion } from "motion/react";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import LatexCompilerSettings from "@/components/LatexCompilerSettings";
import AccountSettings from "@/components/AccountSettings";
import FramelessWindow from "@/components/FramelessWindow";
import { Button } from "@/components/common";
import { GlowCard } from "@/components/common";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/utils/animations";
import { toast } from "sonner";

type SettingsTab = "compiler" | "appearance" | "account";
type ThemeMode = "dark" | "light" | "system";

export default function Settings() {
  const navigate = useNavigate();
  const { isGuest } = useAuthStore();
  const { theme, setTheme } = useAppStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("compiler");
  const [themeMode, setThemeMode] = useState<ThemeMode>(theme as ThemeMode);
  const [savedThemeMode, setSavedThemeMode] = useState<ThemeMode>(theme as ThemeMode);
  const latexCompilerSettingsRef = useRef<{ save: () => Promise<void> }>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  useEffect(() => {
    setHasUnsavedChanges(themeMode !== savedThemeMode);
  }, [themeMode, savedThemeMode]);

  const applyTheme = (mode: ThemeMode) => {
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else if (mode === "light") {
      document.documentElement.classList.remove("dark");
    } else if (mode === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", isDark);
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      applyTheme(savedThemeMode);
    }
    navigate({ to: "/" });
  };

  const handleNavigateToAccount = () => {
    setActiveTab("account");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (latexCompilerSettingsRef.current?.save) {
        await latexCompilerSettingsRef.current.save();
      }
      
      if (themeMode !== savedThemeMode) {
        setTheme(themeMode);
        setSavedThemeMode(themeMode);
        setHasUnsavedChanges(false);
      }

      toast.success("Settings saved");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "compiler", label: "Compiler", icon: <Zap size={16} /> },
    { id: "appearance", label: "Appearance", icon: <Palette size={16} /> },
    { id: "account", label: "Account", icon: <User size={16} />, badge: isGuest() ? "Guest" : undefined },
  ];

  return (
    <FramelessWindow title="Treefrog" subtitle="Settings">
      <div
        className="flex-1 bg-gradient-to-br from-muted via-background to-muted flex flex-col overflow-hidden"
        style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}
      >
        <div className="border-b flex-shrink-0 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4 min-h-[60px]">
            <div className="flex items-center gap-3 w-1/4">
              <motion.button
                onClick={handleBack}
                className="p-2 rounded-lg hover:bg-primary/10 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft size={18} className="text-primary" />
              </motion.button>
              <div>
                <h1 className="text-lg font-bold">Settings</h1>
                {hasUnsavedChanges && (
                  <p className="text-xs text-amber-600">Unsaved changes</p>
                )}
              </div>
            </div>

            <div className="flex justify-center w-1/2">
              <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
                      activeTab === tab.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                    {tab.badge && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-1/4 flex justify-end">
              <Button
                onClick={handleSave}
                loading={isSaving}
                size="sm"
                variant={hasUnsavedChanges ? "default" : "outline"}
                className="gap-2"
              >
                <Save size={16} />
                Save
              </Button>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-hidden">
          <div className="h-full max-w-5xl w-full mx-auto px-6 py-4">
            {activeTab === "compiler" && (
              <LatexCompilerSettings 
                ref={latexCompilerSettingsRef}
                onNavigateToAccount={handleNavigateToAccount}
              />
            )}

            {activeTab === "appearance" && (
              <GlowCard className="h-full">
                <div className="space-y-6 p-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Appearance</h3>
                    <p className="text-sm text-muted-foreground">Customize how Treefrog looks</p>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold">Theme</label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { mode: "light" as ThemeMode, icon: Sun, label: "Light" },
                        { mode: "system" as ThemeMode, icon: Monitor, label: "System" },
                        { mode: "dark" as ThemeMode, icon: Moon, label: "Dark" },
                      ].map(({ mode, icon: Icon, label }) => (
                        <button
                          key={mode}
                          className={cn(
                            "relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all",
                            themeMode === mode
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40"
                          )}
                          onClick={() => setThemeMode(mode)}
                        >
                          {themeMode === mode && (
                            <Check size={14} className="absolute top-2 right-2" />
                          )}
                          <Icon size={24} />
                          <span className="text-sm font-medium">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </GlowCard>
            )}

            {activeTab === "account" && (
              <GlowCard className="h-full overflow-y-auto">
                <div className="p-6">
                  <div className="space-y-1 mb-6">
                    <h3 className="text-lg font-semibold">Account</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage your account and authentication
                    </p>
                  </div>
                  <AccountSettings />
                </div>
              </GlowCard>
            )}
          </div>
        </main>
      </div>
    </FramelessWindow>
  );
}
