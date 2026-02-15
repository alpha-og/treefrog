import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { useAppStore } from "../stores/appStore";
import { useAuthStore } from "../stores/authStore";
import { rendererService } from "../services/rendererService";
import type { RendererMode, ImageSource } from "@/types";
import { createLogger } from "../utils/logger";
import { waitForWails } from "../utils/env";
import { toast } from "sonner";
import {
  ChevronDown,
  Play,
  Square,
  RefreshCw,
  Wrench,
  Globe,
  Check,
  X,
  Loader2,
  Shield,
  FileText,
  Trash2,
  HardDrive,
  Lock,
  Zap,
  Cloud,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/common";
import { Input } from "@/components/common";
import { Toggle } from "@/components/common";
import { Badge } from "@/components/common";
import {
  DropdownMenuWrapper,
  DropdownMenuTrigger,
  DropdownMenuContentWrapper,
  DropdownMenuRadioGroup,
  MenuRadioItem,
} from "@/components/common/Menu";
import { motion, AnimatePresence } from "motion/react";
import { useAnimation, useReducedMotion } from "@/utils/animation-context";
import { cn } from "@/lib/utils";

const log = createLogger("LatexCompilerSettings");

function LogsDisplay({
  logs,
  title = "Logs",
  shouldAnimate,
}: {
  logs: string;
  title?: string;
  shouldAnimate: boolean;
}) {
  const [showLogs, setShowLogs] = useState(false);

  return (
    <div className="border-t border-border bg-muted/20 rounded-b-lg overflow-hidden">
      <motion.button
        onClick={() => setShowLogs(!showLogs)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors"
        whileTap={shouldAnimate ? { scale: 0.995 } : undefined}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{title}</span>
          {logs && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {logs.split('\n').length} lines
            </span>
          )}
        </div>
        <motion.div
          animate={showLogs ? { rotate: 180 } : { rotate: 0 }}
          transition={shouldAnimate ? { duration: 0.2, ease: "easeOut" } : { duration: 0 }}
        >
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </motion.div>
      </motion.button>

      <AnimatePresence initial={false}>
        {showLogs && (
          <motion.div
            key="logs-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={shouldAnimate ? { height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.15 } } : { duration: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">
              <div className="bg-background/80 border border-border/50 rounded-md p-3 max-h-40 overflow-y-auto">
                <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-word leading-relaxed">
                  {logs || <span className="italic text-muted-foreground/60">No logs available</span>}
                </pre>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    running: {
      bg: "bg-emerald-500/15",
      border: "border-emerald-500/40",
      text: "text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-500",
    },
    stopped: {
      bg: "bg-slate-500/15",
      border: "border-slate-400/40",
      text: "text-slate-600 dark:text-slate-400",
      dot: "bg-slate-400",
    },
    building: {
      bg: "bg-blue-500/15",
      border: "border-blue-500/40",
      text: "text-blue-600 dark:text-blue-400",
      dot: "bg-blue-500",
    },
    error: {
      bg: "bg-red-500/15",
      border: "border-red-500/40",
      text: "text-red-600 dark:text-red-400",
      dot: "bg-red-500",
    },
    "not-installed": {
      bg: "bg-amber-500/15",
      border: "border-amber-500/40",
      text: "text-amber-600 dark:text-amber-400",
      dot: "bg-amber-500",
    },
  };

  const config = configs[status] || { bg: "bg-muted", border: "border-border", text: "text-muted-foreground", dot: "bg-muted-foreground" };
  const statusText = status === "building" ? "Starting..." : status.charAt(0).toUpperCase() + status.slice(1);
  const isBuilding = status === "building";
  const isRunning = status === "running";

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium",
      config.bg, config.border, config.text
    )}>
      <span className="relative flex h-2 w-2">
        {isRunning && (
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", config.dot)} />
        )}
        <motion.span
          className={cn("relative inline-flex rounded-full h-2 w-2", config.dot)}
          animate={isBuilding ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : {}}
          transition={isBuilding ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
        />
      </span>
      <span>{statusText}</span>
    </div>
  );
}

export default forwardRef(function LatexCompilerSettings(
  { onNavigateToAccount }: { onNavigateToAccount?: () => void },
  ref
) {
  const { animationsEnabled } = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animationsEnabled && !prefersReducedMotion;

  const { isGuest } = useAuthStore();
  const isGuestMode = isGuest();

  const {
    rendererMode,
    rendererPort,
    rendererAutoStart,
    rendererImageSource,
    rendererImageRef,
    rendererCustomRegistry,
    rendererCustomTarPath,
    rendererStatus,
    rendererLogs,
    setRendererMode,
    setRendererPort,
    setRendererAutoStart,
    setRendererImageSource,
    setRendererImageRef,
    setRendererCustomRegistry,
    setRendererCustomTarPath,
    setRendererStatus,
    setRendererLogs,
  } = useAppStore();

  const [portInput, setPortInput] = useState(rendererPort.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingImage, setIsVerifyingImage] = useState(false);
  const [imageVerificationStatus, setImageVerificationStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isDetectingPort, setIsDetectingPort] = useState(false);
  const [diskSpaceAvailable, setDiskSpaceAvailable] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      await waitForWails();
      await loadConfig();
      await loadStatus();
      await loadLogs();
    };
    init();
  }, []);

  useEffect(() => {
    const interval = setInterval(loadLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadDisk = async () => {
      try {
        setDiskSpaceAvailable(await rendererService.checkDiskSpace());
      } catch { /* ignore */ }
    };
    loadDisk();
    const interval = setInterval(loadDisk, 30000);
    return () => clearInterval(interval);
  }, []);

  useImperativeHandle(ref, () => ({ save: handleSave }));

  const handleNavigateToAccount = () => onNavigateToAccount?.();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (portInput !== rendererPort.toString()) {
        const newPort = parseInt(portInput, 10);
        if (isNaN(newPort) || newPort < 1024 || newPort > 65535) {
          toast.error("Port must be between 1024 and 65535");
          return;
        }
        await rendererService.setPort(newPort);
        setRendererPort(newPort);
      }
      toast.success("Settings saved");
    } catch (err) {
      toast.error(`Failed to save: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const config = await rendererService.getConfig();
      setRendererMode(config.mode as RendererMode);
      setRendererPort(config.port);
      setRendererAutoStart(config.autoStart);
      setRendererImageSource(config.imageSource as ImageSource);
      setRendererImageRef(config.imageRef);
      if (config.customRegistry) setRendererCustomRegistry(config.customRegistry);
      if (config.customTarPath) setRendererCustomTarPath(config.customTarPath);
      setPortInput(config.port.toString());
    } catch (err) {
      log.error("Failed to load config", err);
    }
  };

  const loadStatus = async () => {
    try {
      const status = await rendererService.getStatus();
      setRendererStatus(status.state);
      if (status.logs) setRendererLogs(status.logs);
    } catch {
      setRendererStatus("error");
    }
  };

  const loadLogs = async () => {
    try {
      const logs = await rendererService.getRendererLogs();
      if (logs) setRendererLogs(logs);
    } catch { /* ignore */ }
  };

  const handleModeChange = async (newMode: RendererMode) => {
    setIsLoading(true);
    try {
      await rendererService.setMode(newMode);
      setRendererMode(newMode);
      toast.success(`Mode: ${newMode}`);
    } catch (err) {
      toast.error(`Failed: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSourceChange = async (newSource: ImageSource) => {
    setIsLoading(true);
    try {
      await rendererService.setImageSource(newSource, rendererImageRef);
      setRendererImageSource(newSource);
      if (newSource === "ghcr") setRendererImageRef("ghcr.io/alpha-og/treefrog/local-latex-compiler:latest");
      toast.success(`Source: ${newSource}`);
    } catch (err) {
      toast.error(`Failed: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCustomImage = async () => {
    const path = rendererCustomRegistry || rendererCustomTarPath;
    if (!path) return toast.error("Enter a registry URL");
    
    setIsVerifyingImage(true);
    setImageVerificationStatus("idle");
    
    try {
      const valid = await rendererService.verifyCustomImage(path);
      setImageVerificationStatus(valid ? "valid" : "invalid");
      toast[valid ? "success" : "error"](valid ? "Image verified" : "Invalid image");
    } catch {
      setImageVerificationStatus("invalid");
      toast.error("Verification failed");
    } finally {
      setIsVerifyingImage(false);
    }
  };

  const handleAutoDetectPort = async () => {
    setIsDetectingPort(true);
    try {
      const port = Math.floor(Math.random() * (65535 - 49152) + 49152);
      const newPort = port;
      setPortInput(newPort.toString());
      await rendererService.setPort(newPort);
      setRendererPort(newPort);
      toast.success(`Using port ${newPort}`);
    } catch {
      toast.error("Could not find available port");
    } finally {
      setIsDetectingPort(false);
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    setRendererStatus("building");
    toast.info("Starting renderer...");
    
    try {
      await rendererService.startRenderer();
      setRendererStatus("running");
      const status = await rendererService.getStatus();
      if (status.port !== rendererPort) {
        toast.warning(`Using port ${status.port}`);
        setRendererPort(status.port);
        setPortInput(status.port.toString());
      }
      toast.success("Renderer started");
    } catch (err) {
      setRendererStatus("error");
      toast.error(`Failed: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await rendererService.stopRenderer();
      setRendererStatus("stopped");
      toast.success("Renderer stopped");
    } catch (err) {
      toast.error(`Failed: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = async () => {
    setIsLoading(true);
    setRendererStatus("building");
    toast.info("Restarting...");
    
    try {
      await rendererService.restartRenderer();
      setRendererStatus("running");
      toast.success("Restarted");
    } catch (err) {
      setRendererStatus("error");
      toast.error(`Failed: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoStartToggle = async () => {
    try {
      await rendererService.setAutoStart(!rendererAutoStart);
      setRendererAutoStart(!rendererAutoStart);
      toast.success(`Auto-start ${!rendererAutoStart ? "on" : "off"}`);
    } catch (err) {
      toast.error(`Failed: ${err}`);
    }
  };

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    try {
      await rendererService.cleanupDockerSystem();
      toast.success("Cleanup complete");
    } catch (err) {
      toast.error(`Failed: ${err}`);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 ** 3);
    const mb = bytes / (1024 ** 2);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : mb >= 1 ? `${mb.toFixed(0)} MB` : `${bytes} B`;
  };

  const isRunning = rendererStatus === "running";
  const showImageSource = rendererMode === "local" || rendererMode === "auto";

  return (
    <div className="h-full flex flex-col">
      {/* Header Bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-muted/10">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
            Rendering Mode
          </label>
          <DropdownMenuWrapper>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-48 justify-between h-8" disabled={isLoading || isRunning}>
                <span className="flex items-center gap-2">
                  {rendererMode === "auto" ? <Zap className="w-3.5 h-3.5 text-primary" /> : 
                   rendererMode === "local" ? <Wrench className="w-3.5 h-3.5" /> : 
                   <Cloud className="w-3.5 h-3.5" />}
                  {rendererMode === "auto" ? "Auto" : rendererMode === "local" ? "Local" : "Remote"}
                </span>
                <ChevronDown size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContentWrapper align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
              <DropdownMenuRadioGroup value={rendererMode} onValueChange={(v) => handleModeChange(v as RendererMode)}>
                <MenuRadioItem value="auto" className="gap-2">
                  <Zap className="w-3.5 h-3.5" /> Auto (Recommended)
                </MenuRadioItem>
                <MenuRadioItem value="local" className="gap-2">
                  <Wrench className="w-3.5 h-3.5" /> Local (Docker)
                </MenuRadioItem>
                <MenuRadioItem value="remote" className="gap-2">
                  <Cloud className="w-3.5 h-3.5" /> Remote
                </MenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContentWrapper>
          </DropdownMenuWrapper>
        </div>
        
        {isGuestMode && (rendererMode === "remote" || rendererMode === "auto") && (
          <Button size="sm" onClick={handleNavigateToAccount} className="self-end h-8">
            <Lock className="w-3.5 h-3.5 mr-1.5" />
            Sign In
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-2 gap-3 p-3 min-h-0 overflow-hidden">
        {/* Local Compiler */}
        {(rendererMode === "local" || rendererMode === "auto") && (
          <div className="flex flex-col border border-border/60 rounded-lg overflow-hidden bg-card">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">Local Compiler</span>
              </div>
              <StatusBadge status={rendererStatus} />
            </div>
            
            <div className="flex-1 flex flex-col gap-2.5 p-3 overflow-y-auto">
              {/* Controls */}
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={isRunning ? "outline" : "default"} 
                  onClick={handleStart} 
                  disabled={isLoading || isRunning}
                  className="flex-1 h-7 text-xs"
                >
                  {isRunning ? <Check className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                  {isRunning ? "Active" : "Start"}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleStop} disabled={isLoading || !isRunning} className="h-7 w-7 p-0">
                  <Square className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleRestart} disabled={isLoading || !isRunning} className="h-7 w-7 p-0">
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>

              {/* Settings Row */}
              <div className="flex items-end justify-between gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">Port</label>
                  <div className="flex gap-1.5">
                    <Input
                      type="number"
                      value={portInput}
                      onChange={(e) => setPortInput(e.target.value)}
                      disabled={isLoading || isRunning}
                      className="h-7 text-xs w-24"
                    />
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={handleAutoDetectPort} 
                      disabled={isLoading || isRunning || isDetectingPort}
                      className="h-7 px-2"
                      title="Auto-detect available port"
                    >
                      {isDetectingPort ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
                <Toggle label="Auto-start" checked={rendererAutoStart} onChange={handleAutoStartToggle} disabled={isLoading} />
              </div>

              {/* Image Source */}
              {showImageSource && (
                <div className="pt-2 border-t border-border/50">
                  <label className="text-[10px] font-medium text-muted-foreground block mb-1">Image Source</label>
                  <DropdownMenuWrapper>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-between h-7 text-xs" disabled={isLoading || isRunning}>
                        {rendererImageSource === "ghcr" ? "GitHub Registry" : rendererImageSource === "embedded" ? "From Source" : "Custom"}
                        <ChevronDown size={10} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContentWrapper align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                      <DropdownMenuRadioGroup value={rendererImageSource} onValueChange={(v) => handleImageSourceChange(v as ImageSource)}>
                        <MenuRadioItem value="ghcr">GitHub Registry</MenuRadioItem>
                        <MenuRadioItem value="embedded">Build from Source</MenuRadioItem>
                        <MenuRadioItem value="custom">Custom Image</MenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContentWrapper>
                  </DropdownMenuWrapper>
                  
                  <AnimatePresence>
                    {rendererImageSource === "custom" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="flex gap-1.5 mt-2">
                          <Input
                            type="text"
                            placeholder="registry/image:tag"
                            value={rendererCustomRegistry}
                            onChange={(e) => setRendererCustomRegistry(e.target.value)}
                            disabled={isLoading || isRunning}
                            className="h-7 text-xs flex-1"
                          />
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleVerifyCustomImage} 
                            disabled={isVerifyingImage || isLoading || isRunning}
                            className="h-7 w-7 p-0"
                          >
                            {isVerifyingImage ? <Loader2 className="w-3 h-3 animate-spin" /> :
                             imageVerificationStatus === "valid" ? <Check className="w-3 h-3 text-emerald-500" /> :
                             imageVerificationStatus === "invalid" ? <X className="w-3 h-3 text-red-500" /> :
                             <Shield className="w-3 h-3" />}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Disk Space */}
              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  {diskSpaceAvailable !== null ? formatBytes(diskSpaceAvailable) : "—"} free
                </span>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleCleanup} 
                  disabled={isCleaningUp || isLoading || isRunning}
                  className="h-6 text-[10px] px-2"
                >
                  {isCleaningUp ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                  Cleanup
                </Button>
              </div>
            </div>

            {/* Logs */}
            <LogsDisplay logs={rendererLogs} title="Logs" shouldAnimate={shouldAnimate} />
          </div>
        )}

        {/* Remote Compiler */}
        {(rendererMode === "remote" || rendererMode === "auto") && (
          <div className="flex flex-col border border-border/60 rounded-lg overflow-hidden bg-card">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">Remote Compiler</span>
              </div>
              {isGuestMode ? (
                <Badge variant="outline" className="text-[10px] h-5 bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400">
                  <Lock className="w-2.5 h-2.5 mr-1" />
                  Auth Required
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                  <Check className="w-2.5 h-2.5 mr-1" />
                  Connected
                </Badge>
              )}
            </div>
            
            <div className="flex-1 flex items-center justify-center p-4">
              {isGuestMode ? (
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Sign in for cloud compilation</p>
                  <Button size="sm" onClick={handleNavigateToAccount}>Sign In</Button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium mb-1">Ready</p>
                  <p className="text-xs text-muted-foreground">Remote compilation enabled</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
