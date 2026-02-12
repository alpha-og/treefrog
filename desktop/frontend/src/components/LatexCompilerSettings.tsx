import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useAppStore } from "../stores/appStore";
import { useAuthStore } from "../stores/authStore";
import { rendererService, type RendererMode, type ImageSource } from "../services/rendererService";
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
  AlertTriangle,
  Lock,
  LogIn,
  ArrowRight,
  CircleDot,
} from "lucide-react";
import { Button } from "@/components/common";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common";
import { Input } from "@/components/common";
import { Select } from "@/components/common";
import { Toggle } from "@/components/common";
import { Badge } from "@/components/common";
import {
  DropdownMenuWrapper,
  DropdownMenuTrigger,
  DropdownMenuContentWrapper,
  MenuItem,
  DropdownMenuRadioGroup,
  MenuRadioItem,
  DropdownMenuSeparator,
  MenuIcon,
} from "@/components/common/Menu";
import { motion, AnimatePresence } from "motion/react";
import { ANIMATION_DURATIONS, fadeInUp } from "@/utils/animations";
import { useAnimation, useReducedMotion } from "@/utils/animation-context";
import { cn } from "@/lib/utils";

const log = createLogger("LatexCompilerSettings");

// Enhanced Logs Display Component with layout-based smooth animations
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
  const logsId = `logs-${title}`;

  return (
    <motion.div layout layoutId={`${logsId}-container`}>
      <motion.button
        onClick={() => setShowLogs(!showLogs)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors border-t border-border"
        layoutId={`${logsId}-header`}
        whileHover={shouldAnimate ? { backgroundColor: "rgba(0,0,0,0.05)" } : undefined}
        whileTap={shouldAnimate ? { scale: 0.98 } : undefined}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <motion.div
          animate={showLogs ? { rotate: 180 } : { rotate: 0 }}
          transition={shouldAnimate ? { duration: ANIMATION_DURATIONS.normal } : undefined}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </motion.button>

      <AnimatePresence mode="sync">
        {showLogs && (
          <motion.div
            layoutId={`${logsId}-content`}
            className="p-4 bg-muted/20 overflow-hidden"
            initial={shouldAnimate ? { opacity: 0 } : { opacity: 0 }}
            animate={shouldAnimate ? { opacity: 1 } : { opacity: 1 }}
            exit={shouldAnimate ? { opacity: 0 } : { opacity: 0 }}
            transition={
              shouldAnimate
                ? { duration: ANIMATION_DURATIONS.fast }
                : { duration: ANIMATION_DURATIONS.fast }
            }
          >
            <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-word max-h-64 overflow-y-auto">
              {logs || "No logs available yet"}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Status Badge Component with better styling
function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = () => {
    switch (status) {
      case "running":
        return {
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          text: "text-emerald-700 dark:text-emerald-400",
          icon: "text-emerald-500",
        };
      case "stopped":
        return {
          bg: "bg-slate-500/10",
          border: "border-slate-500/30",
          text: "text-slate-700 dark:text-slate-400",
          icon: "text-slate-500",
        };
      case "building":
        return {
          bg: "bg-blue-500/10",
          border: "border-blue-500/30",
          text: "text-blue-700 dark:text-blue-400",
          icon: "text-blue-500",
        };
      case "error":
        return {
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          text: "text-red-700 dark:text-red-400",
          icon: "text-red-500",
        };
      case "not-installed":
        return {
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          text: "text-amber-700 dark:text-amber-400",
          icon: "text-amber-500",
        };
      default:
        return {
          bg: "bg-muted/50",
          border: "border-border",
          text: "text-muted-foreground",
          icon: "text-muted-foreground",
        };
    }
  };

  const config = getStatusConfig();
  const statusText = status === "building" ? "Starting..." : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className={`${config.bg} ${config.border} ${config.text} border rounded-full px-3 py-1.5 inline-flex items-center gap-2`}>
      <motion.div
        animate={status === "building" ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 1, repeat: status === "building" ? Infinity : 0 }}
      >
        <CircleDot className={`w-2 h-2 ${config.icon}`} fill="currentColor" />
      </motion.div>
      <span className="text-xs font-semibold">{statusText}</span>
    </div>
  );
}

// Authentication Required Banner for Remote Compiler
function AuthenticationBanner({ onNavigateToAccount }: { onNavigateToAccount: () => void }) {
  const { shouldAnimate } = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  const canAnimate = shouldAnimate && !prefersReducedMotion;

  return (
    <motion.div
      initial={canAnimate ? { opacity: 0, y: 10 } : undefined}
      animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
      transition={canAnimate ? { duration: ANIMATION_DURATIONS.normal } : undefined}
      className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-3"
    >
      <div className="flex items-start gap-3">
        <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100">
            Authentication Required
          </h4>
          <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
            Remote compiler features require authentication. Sign in to your account to access remote compilation.
          </p>
        </div>
      </div>
      <Button
        onClick={onNavigateToAccount}
        size="sm"
        className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white"
      >
        <LogIn size={16} />
        Go to Account Tab
        <ArrowRight size={16} />
      </Button>
    </motion.div>
  );
}

export default forwardRef(function LatexCompilerSettings(
  { onNavigateToAccount }: { onNavigateToAccount?: () => void },
  ref
) {
  const { animationsEnabled } = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animationsEnabled && !prefersReducedMotion;

  const { isLoggedIn, markFirstLaunchComplete } = useAuthStore();

  const {
    rendererMode,
    rendererPort,
    rendererAutoStart,
    rendererImageSource,
    rendererImageRef,
    rendererRemoteUrl,
    rendererRemoteToken,
    rendererCustomRegistry,
    rendererCustomTarPath,
    rendererStatus,
    rendererLogs,
    buildLog,
    setRendererMode,
    setRendererPort,
    setRendererAutoStart,
    setRendererImageSource,
    setRendererImageRef,
    setRendererRemoteUrl,
    setRendererRemoteToken,
    setRendererCustomRegistry,
    setRendererCustomTarPath,
    setRendererStatus,
    setRendererLogs,
    setBuildLog,
  } = useAppStore();

  const [portInput, setPortInput] = useState(rendererPort.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomTabs, setShowCustomTabs] = useState<"registry" | "tar">("registry");
  const [isVerifyingImage, setIsVerifyingImage] = useState(false);
  const [imageVerificationStatus, setImageVerificationStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [diskSpaceAvailable, setDiskSpaceAvailable] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const initializeSettings = async () => {
      await waitForWails();
      await loadConfig();
      await loadStatus();
      await loadLogs();
    };
    initializeSettings();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadLogs();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadDiskSpace = async () => {
      try {
        const space = await rendererService.checkDiskSpace();
        setDiskSpaceAvailable(space);
      } catch (err) {
        console.warn("Failed to load disk space:", err);
      }
    };

    loadDiskSpace();
    const interval = setInterval(loadDiskSpace, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
        setError("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  useImperativeHandle(ref, () => ({
    save: handleSave,
  }));

  const handleNavigateToAccount = () => {
    markFirstLaunchComplete();
    if (onNavigateToAccount) {
      onNavigateToAccount();
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (portInput !== rendererPort.toString()) {
        const newPort = parseInt(portInput, 10);
        if (isNaN(newPort) || newPort < 1024 || newPort > 65535) {
          toast.error("Port must be between 1024 and 65535");
          setIsLoading(false);
          return;
        }
        await rendererService.setPort(newPort);
        setRendererPort(newPort);
      }

      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error(`Failed to save settings: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const config = await rendererService.getConfig();
      setRendererMode(config.mode);
      setRendererPort(config.port);
      setRendererAutoStart(config.autoStart);
      setRendererImageSource(config.imageSource);
      setRendererImageRef(config.imageRef);
      setRendererRemoteUrl(config.remoteUrl);
      setRendererRemoteToken(config.remoteToken);
      if (config.customRegistry) setRendererCustomRegistry(config.customRegistry);
      if (config.customTarPath) setRendererCustomTarPath(config.customTarPath);
      setPortInput(config.port.toString());
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error("Failed to load renderer config", err);
      toast.error(`Failed to load renderer configuration: ${errorMsg}`);
    }
  };

  const loadStatus = async () => {
    try {
      const status = await rendererService.getStatus();
      setRendererStatus(status.state);
      if (status.logs) {
        setRendererLogs(status.logs);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error("Failed to load renderer status", err);
      toast.error(`Failed to load renderer status: ${errorMsg}`);
      setRendererStatus("error");
    }
  };

  const loadLogs = async () => {
    try {
      const rendererLogsStr = await rendererService.getRendererLogs();
      if (rendererLogsStr) {
        setRendererLogs(rendererLogsStr);
      }

      const buildLogsStr = await rendererService.getBuildLog();
      if (buildLogsStr) {
        setBuildLog(buildLogsStr);
      }
    } catch (err) {
      log.debug("Failed to fetch logs", err);
    }
  };

  const handleModeChange = async (newMode: RendererMode) => {
    setIsLoading(true);
    try {
      await rendererService.setMode(newMode);
      setRendererMode(newMode);
      toast.success(`Mode changed to ${newMode}`);
    } catch (err) {
      toast.error(`Failed to change mode: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSourceChange = async (newSource: ImageSource) => {
    setIsLoading(true);
    try {
      await rendererService.setImageSource(newSource, rendererImageRef);
      setRendererImageSource(newSource);

      if (newSource === "ghcr") {
        setRendererImageRef("ghcr.io/alpha-og/treefrog/renderer:latest");
      }

      toast.success(`Image source changed to ${newSource}`);
    } catch (err) {
      toast.error(`Failed to change image source: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCustomImage = async () => {
    setIsVerifyingImage(true);
    setImageVerificationStatus("idle");

    const path = rendererCustomTarPath || rendererCustomRegistry;
    if (!path) {
      setError("Please enter a registry URL or tar file path");
      setIsVerifyingImage(false);
      return;
    }

    toast.promise(
      rendererService.verifyCustomImage(path),
      {
        loading: "Verifying custom image... (this may take up to 30 seconds)",
        success: (isValid: boolean) => {
          setImageVerificationStatus(isValid ? "valid" : "invalid");
          return isValid ? "Image verified successfully" : "Image verification failed";
        },
        error: (err: Error) => {
          setImageVerificationStatus("invalid");
          return `Verification failed: ${err.message}`;
        },
        finally: () => {
          setIsVerifyingImage(false);
        },
      }
    );
  };

  const handleStart = async () => {
    setIsLoading(true);
    setSuccessMessage("");
    setError("");
    setRendererStatus("building");

    toast.info("Starting renderer... This may take a few minutes if pulling image for the first time.");

    try {
      setRendererStatus("building");
      await rendererService.startRenderer();
      setRendererStatus("running");

      const status = await rendererService.getStatus();
      if (status.port !== rendererPort) {
        toast.warning(`Port ${rendererPort} was busy. Using port ${status.port} instead.`);
        setRendererPort(status.port);
        setPortInput(status.port.toString());
      }

      setSuccessMessage("Renderer started successfully");
      await loadStatus();
    } catch (err) {
      setRendererStatus("error");
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to start renderer: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    setSuccessMessage("");
    setError("");
    try {
      await rendererService.stopRenderer();
      setRendererStatus("stopped");
      setSuccessMessage("Renderer stopped successfully");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to stop renderer: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = async () => {
    setIsLoading(true);
    setSuccessMessage("");
    setError("");
    setRendererStatus("building");

    toast.info("Restarting renderer...");

    try {
      await rendererService.restartRenderer();
      setRendererStatus("running");
      setSuccessMessage("Renderer restarted successfully");
      await loadStatus();
    } catch (err) {
      setRendererStatus("error");
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to restart renderer: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoStartToggle = async () => {
    setSuccessMessage("");
    setError("");
    try {
      await rendererService.setAutoStart(!rendererAutoStart);
      setRendererAutoStart(!rendererAutoStart);
      toast.success(`Auto-start ${!rendererAutoStart ? "enabled" : "disabled"}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to update auto-start: ${errMsg}`);
    }
  };

  const handleCleanupDocker = async () => {
    setSuccessMessage("");
    setError("");
    setIsCleaningUp(true);
    try {
      toast.info("Cleaning up unused Docker resources...");
      await rendererService.cleanupDockerSystem();
      setSuccessMessage("Docker cleanup completed successfully");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to cleanup Docker: ${errMsg}`);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const formatDiskSpace = (bytes: number) => {
    const GB = bytes / (1024 * 1024 * 1024);
    const MB = bytes / (1024 * 1024);

    if (GB >= 1) {
      return `${GB.toFixed(1)} GB`;
    } else if (MB >= 1) {
      return `${MB.toFixed(0)} MB`;
    } else {
      return `${bytes} bytes`;
    }
  };

  const isRunning = rendererStatus === "running";
  const showImageSource = rendererMode === "local" || rendererMode === "auto";

  return (
    <motion.div
      className="space-y-6"
      initial={shouldAnimate ? { opacity: 0 } : undefined}
      animate={shouldAnimate ? { opacity: 1 } : undefined}
      transition={shouldAnimate ? { duration: ANIMATION_DURATIONS.normal } : undefined}
    >
      {/* Rendering Mode Selection */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-semibold text-foreground block mb-3">Rendering Mode</label>
          <p className="text-xs text-muted-foreground mb-3">Choose how LaTeX is compiled</p>
        </div>
        <DropdownMenuWrapper>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between"
              disabled={isLoading || isRunning}
            >
              <span>{rendererMode === "auto" ? "Auto (Recommended)" : rendererMode === "local" ? "Local (Docker)" : "Remote (External)"}</span>
              <ChevronDown size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContentWrapper align="start" className="w-56">
            <DropdownMenuRadioGroup value={rendererMode} onValueChange={(value) => handleModeChange(value as RendererMode)}>
              <MenuRadioItem 
                value="auto"
                className={cn(
                  "flex items-center gap-2",
                  rendererMode === "auto" && "bg-primary/20 text-primary font-semibold"
                )}
              >
                <span className="flex-1">Auto (Recommended)</span>
                {rendererMode === "auto" && <Check size={14} />}
              </MenuRadioItem>
              <MenuRadioItem 
                value="local"
                className={cn(
                  "flex items-center gap-2",
                  rendererMode === "local" && "bg-primary/20 text-primary font-semibold"
                )}
              >
                <span className="flex-1">Local (Docker)</span>
                {rendererMode === "local" && <Check size={14} />}
              </MenuRadioItem>
              <MenuRadioItem 
                value="remote"
                className={cn(
                  "flex items-center gap-2",
                  rendererMode === "remote" && "bg-primary/20 text-primary font-semibold"
                )}
              >
                <span className="flex-1">Remote (External)</span>
                {rendererMode === "remote" && <Check size={14} />}
              </MenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContentWrapper>
        </DropdownMenuWrapper>

        {rendererMode === "auto" && (
          <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
            Auto mode will use local Docker if available, otherwise fall back to remote compilation.
          </p>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: LOCAL COMPILER */}
        {(rendererMode === "local" || rendererMode === "auto") && (
          <motion.div
            className="space-y-6"
            initial={shouldAnimate ? { opacity: 0, x: -20 } : undefined}
            animate={shouldAnimate ? { opacity: 1, x: 0 } : undefined}
            transition={shouldAnimate ? { duration: ANIMATION_DURATIONS.normal } : undefined}
          >
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Local Compiler</h3>
              </div>
              <p className="text-sm text-muted-foreground">Docker-based LaTeX compilation</p>
            </div>

            {/* Status and Controls */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
                  <StatusBadge status={rendererStatus} />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={isRunning ? "outline" : "default"}
                    onClick={handleStart}
                    disabled={isLoading || isRunning}
                    title="Start renderer"
                  >
                    <Play className="w-3 h-3" />
                    <span className="hidden sm:inline">Start</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleStop}
                    disabled={isLoading || !isRunning}
                    title="Stop renderer"
                  >
                    <Square className="w-3 h-3" />
                    <span className="hidden sm:inline">Stop</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRestart}
                    disabled={isLoading || !isRunning}
                    title="Restart renderer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span className="hidden sm:inline">Restart</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Settings Grid */}
            <div className="space-y-4">
              {/* Port Configuration */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Port Number</label>
                <Input
                  type="number"
                  value={portInput}
                  onChange={(e) => setPortInput(e.target.value)}
                  min="1024"
                  max="65535"
                  disabled={isLoading || isRunning}
                  placeholder="1024 - 65535"
                />
                <p className="text-xs text-muted-foreground mt-1.5">Valid range: 1024 - 65535</p>
              </div>

              {/* Auto-Start Toggle */}
              <Toggle
                label="Auto-start on launch"
                description="Start renderer with app"
                checked={rendererAutoStart}
                onChange={handleAutoStartToggle}
                disabled={isLoading}
              />
            </div>

            {/* Image Source Section */}
            {showImageSource && (
              <motion.div
                className="space-y-4 pt-4 border-t border-border"
                initial={shouldAnimate ? "initial" : undefined}
                animate={shouldAnimate ? "animate" : undefined}
                variants={
                  shouldAnimate
                    ? {
                        initial: { opacity: 0, y: 10 },
                        animate: { opacity: 1, y: 0 },
                      }
                    : undefined
                }
                transition={shouldAnimate ? { duration: ANIMATION_DURATIONS.normal } : undefined}
              >
                <div>
                  <label className="text-sm font-medium text-foreground block mb-3">Image Source</label>
                  <DropdownMenuWrapper>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-between"
                        disabled={isLoading || isRunning}
                      >
                        <span>{rendererImageSource === "ghcr" ? "GitHub Registry (Default)" : rendererImageSource === "embedded" ? "Build from Source" : "Custom Image"}</span>
                        <ChevronDown size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContentWrapper align="start" className="w-56">
                      <DropdownMenuRadioGroup value={rendererImageSource} onValueChange={(value) => handleImageSourceChange(value as ImageSource)}>
                        <MenuRadioItem 
                          value="ghcr"
                          className={cn(
                            "flex items-center gap-2",
                            rendererImageSource === "ghcr" && "bg-primary/20 text-primary font-semibold"
                          )}
                        >
                          <span className="flex-1">GitHub Registry (Default)</span>
                          {rendererImageSource === "ghcr" && <Check size={14} />}
                        </MenuRadioItem>
                        <MenuRadioItem 
                          value="embedded"
                          className={cn(
                            "flex items-center gap-2",
                            rendererImageSource === "embedded" && "bg-primary/20 text-primary font-semibold"
                          )}
                        >
                          <span className="flex-1">Build from Source</span>
                          {rendererImageSource === "embedded" && <Check size={14} />}
                        </MenuRadioItem>
                        <MenuRadioItem 
                          value="custom"
                          className={cn(
                            "flex items-center gap-2",
                            rendererImageSource === "custom" && "bg-primary/20 text-primary font-semibold"
                          )}
                        >
                          <span className="flex-1">Custom Image</span>
                          {rendererImageSource === "custom" && <Check size={14} />}
                        </MenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContentWrapper>
                  </DropdownMenuWrapper>
                </div>

                {rendererImageSource === "custom" && (
                  <motion.div
                    className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border"
                    initial={shouldAnimate ? { opacity: 0, y: -10 } : undefined}
                    animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
                    transition={shouldAnimate ? { duration: ANIMATION_DURATIONS.normal } : undefined}
                  >
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-3">Custom Image Type</label>
                      <DropdownMenuWrapper>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full justify-between"
                            disabled={isLoading || isRunning}
                          >
                            <span>{showCustomTabs === "registry" ? "Registry" : "Tar File"}</span>
                            <ChevronDown size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContentWrapper align="start" className="w-56">
                          <DropdownMenuRadioGroup value={showCustomTabs} onValueChange={(value) => setShowCustomTabs(value as "registry" | "tar")}>
                            <MenuRadioItem 
                              value="registry"
                              className={cn(
                                "flex items-center gap-2",
                                showCustomTabs === "registry" && "bg-primary/20 text-primary font-semibold"
                              )}
                            >
                              <span className="flex-1">Registry</span>
                              {showCustomTabs === "registry" && <Check size={14} />}
                            </MenuRadioItem>
                            <MenuRadioItem 
                              value="tar"
                              className={cn(
                                "flex items-center gap-2",
                                showCustomTabs === "tar" && "bg-primary/20 text-primary font-semibold"
                              )}
                            >
                              <span className="flex-1">Tar File</span>
                              {showCustomTabs === "tar" && <Check size={14} />}
                            </MenuRadioItem>
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContentWrapper>
                      </DropdownMenuWrapper>
                    </div>

                    {showCustomTabs === "registry" ? (
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="registry/image:tag"
                          value={rendererCustomRegistry}
                          onChange={(e) => setRendererCustomRegistry(e.target.value)}
                          disabled={isLoading || isRunning}
                        />
                        <Button
                          variant="outline"
                          onClick={handleVerifyCustomImage}
                          disabled={isVerifyingImage || isLoading || isRunning || !rendererCustomRegistry}
                          title="Verify custom image"
                        >
                          {isVerifyingImage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : imageVerificationStatus === "valid" ? (
                            <Check className="w-4 h-4 text-success" />
                          ) : imageVerificationStatus === "invalid" ? (
                            <X className="w-4 h-4 text-destructive" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">Verify</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="/path/to/image.tar"
                          value={rendererCustomTarPath}
                          onChange={(e) => setRendererCustomTarPath(e.target.value)}
                          disabled={isLoading || isRunning}
                        />
                        <Button
                          variant="outline"
                          onClick={handleVerifyCustomImage}
                          disabled={isVerifyingImage || isLoading || isRunning || !rendererCustomTarPath}
                          title="Verify custom image"
                        >
                          {isVerifyingImage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : imageVerificationStatus === "valid" ? (
                            <Check className="w-4 h-4 text-success" />
                          ) : imageVerificationStatus === "invalid" ? (
                            <X className="w-4 h-4 text-destructive" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">Verify</span>
                        </Button>
                      </div>
                    )}

                    {imageVerificationStatus === "valid" && (
                      <motion.div
                        className="flex items-center gap-2 p-2 bg-success/10 border border-success/20 rounded text-success text-xs font-medium"
                        initial={shouldAnimate ? { opacity: 0, scale: 0.95 } : undefined}
                        animate={shouldAnimate ? { opacity: 1, scale: 1 } : undefined}
                        transition={shouldAnimate ? { duration: ANIMATION_DURATIONS.fast } : undefined}
                      >
                        <Check className="w-3 h-3" />
                        Verified
                      </motion.div>
                    )}
                    {imageVerificationStatus === "invalid" && (
                      <motion.div
                        className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-xs font-medium"
                        initial={shouldAnimate ? { opacity: 0, scale: 0.95 } : undefined}
                        animate={shouldAnimate ? { opacity: 1, scale: 1 } : undefined}
                        transition={shouldAnimate ? { duration: ANIMATION_DURATIONS.fast } : undefined}
                      >
                        <X className="w-3 h-3" />
                        Failed
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Docker Management */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Docker Management</span>
                </div>
                {diskSpaceAvailable !== null && (
                  <div className="text-xs text-muted-foreground">
                    <span className={diskSpaceAvailable < 1024 * 1024 * 1024 ? "text-warning" : ""}>
                      {formatDiskSpace(diskSpaceAvailable)} available
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleCleanupDocker}
                  disabled={isCleaningUp || isLoading || isRunning}
                  className="w-full"
                >
                  {isCleaningUp ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Cleanup Resources
                </Button>

                <Button
                  variant="ghost"
                  onClick={() =>
                    toast.info(
                      "Docker cleanup removes unused containers, images, and networks to free up disk space"
                    )
                  }
                  disabled={isLoading}
                  className="w-full"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  What is this?
                </Button>
              </div>
            </div>

            {/* Messages */}
            {successMessage && (
              <motion.div
                className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded text-success text-xs font-medium"
                initial={shouldAnimate ? { opacity: 0, scale: 0.95 } : undefined}
                animate={shouldAnimate ? { opacity: 1, scale: 1 } : undefined}
                transition={shouldAnimate ? { duration: ANIMATION_DURATIONS.fast } : undefined}
              >
                <Check className="w-3 h-3" />
                {successMessage}
              </motion.div>
            )}

            {error && (
              <motion.div
                className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-xs font-medium"
                initial={shouldAnimate ? { opacity: 0, scale: 0.95 } : undefined}
                animate={shouldAnimate ? { opacity: 1, scale: 1 } : undefined}
                transition={shouldAnimate ? { duration: ANIMATION_DURATIONS.fast } : undefined}
              >
                <X className="w-3 h-3" />
                {error}
              </motion.div>
            )}

            {/* Local Compiler Logs - with smooth layout-based animations */}
            <div className="pt-4 border-t border-border overflow-hidden">
              <LogsDisplay logs={rendererLogs} title="Renderer Logs" shouldAnimate={shouldAnimate} />
            </div>
          </motion.div>
        )}

        {/* RIGHT COLUMN: REMOTE COMPILER */}
        {(rendererMode === "remote" || rendererMode === "auto") && (
          <motion.div
            className="space-y-6"
            initial={shouldAnimate ? { opacity: 0, x: 20 } : undefined}
            animate={shouldAnimate ? { opacity: 1, x: 0 } : undefined}
            transition={shouldAnimate ? { duration: ANIMATION_DURATIONS.normal } : undefined}
          >
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Remote Compiler</h3>
                </div>
                {!isLoggedIn ? (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-200 border-amber-500/20">
                    <Lock size={14} className="mr-1" />
                    Auth Required
                  </Badge>
                ) : (
                  <Badge variant="default" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    <Check size={14} className="mr-1" />
                    Authenticated
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">External compilation server</p>
            </div>

            {/* Content */}
            {!isLoggedIn ? (
              <AuthenticationBanner onNavigateToAccount={handleNavigateToAccount} />
            ) : (
              <>
                <div className="flex-1 flex items-center justify-center min-h-[300px] p-8 bg-muted/30 rounded-lg border border-border/50">
                  <div className="text-center space-y-3">
                    <motion.div
                      animate={shouldAnimate ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Globe className="w-12 h-12 text-muted-foreground mx-auto" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Remote compilation ready</p>
                      <p className="text-xs text-muted-foreground mt-1">Configuration is managed automatically</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});
