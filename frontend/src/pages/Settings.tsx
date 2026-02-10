import { useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Zap, Palette, Check, Moon, Sun, Monitor } from "lucide-react";
import { motion } from "motion/react";
import { useAppStore } from "@/stores/appStore";
import LatexCompilerSettings from "@/components/LatexCompilerSettings";
import FramelessWindow from "@/components/FramelessWindow";
import { Button } from "@/components/common/Button";
import { GlowCard } from "@/components/common/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animations";

type SettingsTab = "compiler" | "appearance";
type ThemeMode = "dark" | "light" | "system";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useAppStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("compiler");
  const [themeMode, setThemeMode] = useState<ThemeMode>(theme as ThemeMode);
  const [savedThemeMode, setSavedThemeMode] = useState<ThemeMode>(theme as ThemeMode);
  const latexCompilerSettingsRef = useRef<{ save: () => Promise<void> }>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync theme changes immediately to DOM for preview
  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  // Apply theme to DOM
  const applyTheme = (mode: ThemeMode) => {
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else if (mode === "light") {
      document.documentElement.classList.remove("dark");
    } else if (mode === "system") {
      // Check system preference
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  // Handle back navigation - restore saved theme if not saved
  const handleBack = () => {
    applyTheme(savedThemeMode);
    navigate({ to: "/" });
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "compiler", label: "LaTeX Compiler", icon: <Zap size={16} /> },
    { id: "appearance", label: "Appearance", icon: <Palette size={16} /> },
  ];

   const handleSave = async () => {
     setIsSaving(true);
     try {
       // Always attempt to save compiler settings
       if (latexCompilerSettingsRef.current?.save) {
         await latexCompilerSettingsRef.current.save();
       }
       
       // Always attempt to save appearance settings
       if (themeMode !== savedThemeMode) {
         setTheme(themeMode);
         setSavedThemeMode(themeMode);
       }

       // Small delay to ensure state updates are visible
       await new Promise(resolve => setTimeout(resolve, 300));
     } finally {
       setIsSaving(false);
     }
   };

  return (
    <FramelessWindow title="Treefrog" subtitle="Settings">
      <div
        className="flex-1 bg-gradient-to-br from-muted via-background to-muted flex flex-col overflow-hidden"
        style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}
      >
        {/* Header with Title and Tabs */}
        <div className="border-b flex-shrink-0">
          <div className="flex items-center justify-between px-6 py-4 min-h-[60px]">
            <div className="flex items-center gap-3 w-1/4">
              <motion.button
                onClick={handleBack}
                className="p-2 rounded-lg hover:bg-primary/10 transition-all"
                title="Go back"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft size={18} className="text-primary" />
              </motion.button>
              <h1 className="text-lg font-bold">Settings</h1>
            </div>

            <div className="flex justify-center w-1/2">
              <div className="flex gap-4">
                {tabs.map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-2 py-2 text-sm font-medium transition-all duration-300 border-b-2",
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                    whileHover={{ y: -1 }}
                  >
                    {tab.icon}
                    {tab.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="w-1/4 flex justify-end">
              <Button
                onClick={handleSave}
                loading={isSaving}
                size="sm"
                variant="default"
              >
                <Check size={16} />
                Save
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl w-full mx-auto px-6 py-8 md:py-12">
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
               {/* LaTeX Compiler Tab */}
               {activeTab === "compiler" && (
                 <motion.div 
                   className="space-y-6"
                   variants={staggerItem}
                 >
                   {/* Settings Card */}
                   <GlowCard>
                     <LatexCompilerSettings ref={latexCompilerSettingsRef} />
                   </GlowCard>
                 </motion.div>
               )}

               {/* Appearance Tab */}
               {activeTab === "appearance" && (
                 <motion.div 
                   className="space-y-6"
                   variants={staggerItem}
                 >
                   {/* Theme Selection Card */}
                   <GlowCard>
                     <div>
                       <label className="block text-sm font-semibold mb-4">Theme</label>
                       <div className="grid grid-cols-3 gap-3">
                         {[
                           { mode: "light" as ThemeMode, icon: Sun, label: "Light" },
                           { mode: "system" as ThemeMode, icon: Monitor, label: "System" },
                           { mode: "dark" as ThemeMode, icon: Moon, label: "Dark" },
                         ].map(({ mode, icon: Icon, label }) => (
                           <motion.button
                             key={mode}
                             className={cn(
                               "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                               themeMode === mode
                                 ? "border-primary bg-primary/5 text-primary"
                                 : "border-border bg-card text-muted-foreground hover:border-primary/50"
                             )}
                             onClick={() => setThemeMode(mode)}
                             whileHover={{ scale: 1.02 }}
                             whileTap={{ scale: 0.98 }}
                           >
                             <Icon size={20} />
                             <span className="text-sm font-medium">{label}</span>
                           </motion.button>
                         ))}
                       </div>
                     </div>
                   </GlowCard>
                 </motion.div>
               )}
            </motion.div>
          </div>
        </main>
      </div>
    </FramelessWindow>
  );
}
