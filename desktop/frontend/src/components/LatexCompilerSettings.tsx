import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useAppStore } from "../stores/appStore";
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
} from "lucide-react";
import { Button } from "@treefrog/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@treefrog/ui";
import { Input } from "@treefrog/ui";
import { Select } from "@treefrog/ui";
import { Toggle } from "@treefrog/ui";
import { Badge } from "@treefrog/ui";
import { motion, AnimatePresence } from "motion/react";
import { ANIMATION_DURATIONS, fadeInUp } from "@treefrog/ui";
import { useAnimation, useReducedMotion } from "@treefrog/ui";

const log = createLogger("LatexCompilerSettings");

// Reusable Logs Display Component
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
    <motion.div layout>
      <motion.button
        onClick={() => setShowLogs(!showLogs)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors border-t border-border"
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

      <AnimatePresence>
        {showLogs && (
          <motion.div
            className="p-4 bg-muted/20 overflow-hidden"
            initial={shouldAnimate ? { opacity: 0, scaleY: 0 } : undefined}
            animate={shouldAnimate ? { opacity: 1, scaleY: 1 } : undefined}
            exit={shouldAnimate ? { opacity: 0, scaleY: 0 } : undefined}
            transition={
              shouldAnimate
                ? {
                    opacity: { duration: ANIMATION_DURATIONS.fast },
                    scaleY: { type: "spring", stiffness: 400, damping: 35, duration: ANIMATION_DURATIONS.normal },
                  }
                : undefined
            }
            style={{ originY: 0 }}
            layout
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

export default forwardRef(function LatexCompilerSettings(_, ref) {
  const { animationsEnabled } = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animationsEnabled && !prefersReducedMotion;

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
   const [remoteUrlInput, setRemoteUrlInput] = useState(rendererRemoteUrl);
   const [remoteTokenInput, setRemoteTokenInput] = useState(rendererRemoteToken);
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
       // Wait for Wails runtime to be available
       await waitForWails();
       await loadConfig();
       await loadStatus();
       // Fetch initial logs
       await loadLogs();
     };
     initializeSettings();
    }, []);

     // Poll for log updates every 2 seconds
     useEffect(() => {
       const interval = setInterval(() => {
         loadLogs();
       }, 2000);
       return () => clearInterval(interval);
     }, []);

     // Load disk space info periodically
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
       const interval = setInterval(loadDiskSpace, 30000); // Every 30 seconds
       return () => clearInterval(interval);
     }, []);

     // Auto-clear messages after 5 seconds
     useEffect(() => {
       if (successMessage || error) {
         const timer = setTimeout(() => {
           setSuccessMessage("");
           setError("");
         }, 5000);
         return () => clearTimeout(timer);
       }
     }, [successMessage, error]);

    // Sync remote inputs when config loads
    useEffect(() => {
     setRemoteUrlInput(rendererRemoteUrl);
     setRemoteTokenInput(rendererRemoteToken);
   }, [rendererRemoteUrl, rendererRemoteToken]);

   // Expose save method to parent
   useImperativeHandle(ref, () => ({
     save: handleSave,
   }));

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Save port if changed
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

      // Save remote settings if changed
      if (remoteUrlInput !== rendererRemoteUrl) {
        await rendererService.setRemoteUrl(remoteUrlInput);
        setRendererRemoteUrl(remoteUrlInput);
      }
      if (remoteTokenInput !== rendererRemoteToken) {
        await rendererService.setRemoteToken(remoteTokenInput);
        setRendererRemoteToken(remoteTokenInput);
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
        // Fetch local renderer logs
        const rendererLogsStr = await rendererService.getRendererLogs();
        if (rendererLogsStr) {
          setRendererLogs(rendererLogsStr);
        }

        // Fetch remote build logs
        const buildLogsStr = await rendererService.getBuildLog();
        if (buildLogsStr) {
          setBuildLog(buildLogsStr);
        }
      } catch (err) {
        // Silently fail on log fetch (don't show toast for polling)
        log.debug("Failed to fetch logs", err);
      }
    };

  const handleModeChange = async (newMode: RendererMode) => {
    setIsLoading(true);
    try {
      await rendererService.setMode(newMode);
      setRendererMode(newMode);
      toast.success(`Mode changed to ${newMode}`);     } catch (err) {
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

      toast.success(`Image source changed to ${newSource}`);    } catch (err) {
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
       toast.info("Starting renderer... This may take a few minutes if pulling image for the first time. Progress will be shown in logs.");

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

   const getStatusDisplay = () => {
    switch (rendererStatus) {
      case "running":
        return {
          badge: "success",
          text: "Running",
        };
      case "stopped":
        return {
          badge: "secondary",
          text: "Stopped",
        };
      case "building":
        return {
          badge: "warning",
          text: "Starting...",
        };
      case "error":
        return {
          badge: "destructive",
          text: "Error",
        };
      case "not-installed":
        return {
          badge: "warning",
          text: "Not Installed",
        };
      default:
        return {
          badge: "secondary",
          text: "Loading...",
        };
    }
   };

    const status = getStatusDisplay();
    const isRunning = rendererStatus === "running";
    const showImageSource = rendererMode === "local" || rendererMode === "auto";

   return (
     <motion.div
       className="space-y-4"
       initial={shouldAnimate ? { opacity: 0 } : undefined}
       animate={shouldAnimate ? { opacity: 1 } : undefined}
       transition={shouldAnimate ? { duration: ANIMATION_DURATIONS.normal } : undefined}
     >
       {/* Rendering Mode Selection */}
       <Select
         label="Rendering Mode"
         value={rendererMode}
         onChange={(e) => handleModeChange(e.target.value as RendererMode)}
         disabled={isLoading || isRunning}
       >
         <option value="auto">Auto (Recommended)</option>
         <option value="local">Local (Docker)</option>
         <option value="remote">Remote (External)</option>
       </Select>

        {/* LOCAL COMPILER CARD */}
        <Card disableHover>
         <CardHeader>
           <div className="flex items-center gap-2">
             <Wrench className="w-4 h-4 text-primary" />
             <CardTitle>Local Compiler</CardTitle>
           </div>
         </CardHeader>
         <CardContent className="space-y-4">
           {/* Status Badge */}
              <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card/50">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Badge variant={status.badge as any}>{status.text}</Badge>
                </div>
              </div>
              {/* Local Controls */}
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

            {/* Port Configuration */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Port Number
              </label>
              <Input
                type="number"
                value={portInput}
                onChange={(e) => setPortInput(e.target.value)}
                min="1024"
                max="65535"
                disabled={isLoading || isRunning}
                placeholder="1024 - 65535"
              />
              <p className="text-xs text-muted-foreground mt-1">Valid range: 1024 - 65535</p>
            </div>

            {/* Auto-Start Toggle */}
           <div className="pt-3 border-t border-border">
              <Toggle
                label="Auto-start on launch"
                description="Start/stop with app"
                checked={rendererAutoStart}
                onChange={handleAutoStartToggle}
                disabled={isLoading}
              />
           </div>

           {/* Docker Management */}
           <div className="pt-3 border-t border-border space-y-3">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <HardDrive className="w-4 h-4 text-primary" />
                 <span className="text-sm font-medium">Docker Management</span>
               </div>
               <div className="text-right">
                 {diskSpaceAvailable !== null && (
                   <div className="text-xs text-muted-foreground">
                     <span className={diskSpaceAvailable < 1024*1024*1024 ? "text-warning" : ""}>
                       {formatDiskSpace(diskSpaceAvailable)} available
                     </span>
                   </div>
                 )}
               </div>
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
                 onClick={() => toast.info("Docker cleanup removes unused containers, images, and networks to free up disk space")}
                 disabled={isLoading}
                 className="w-full"
               >
                 <AlertTriangle className="w-4 h-4 mr-2" />
                 What is this?
               </Button>
             </div>
           </div>

           {/* Image Source */}
           {showImageSource && (
             <motion.div
               className="pt-3 border-t border-border space-y-3"
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
               <Select
                 label="Image Source"
                 value={rendererImageSource}
                 onChange={(e) => handleImageSourceChange(e.target.value as ImageSource)}
                 disabled={isLoading || isRunning}
               >
                 <option value="ghcr">GitHub Registry (Default)</option>
                 <option value="embedded">Build from Source</option>
                 <option value="custom">Custom Image</option>
               </Select>

               {rendererImageSource === "custom" && (
                 <motion.div
                   className="space-y-3 mt-3 p-3 bg-muted/30 rounded-lg"
                   initial={shouldAnimate ? { opacity: 0, y: -10 } : undefined}
                   animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
                   transition={shouldAnimate ? { duration: ANIMATION_DURATIONS.normal } : undefined}
                 >
                   <div className="flex gap-2 border-b border-border">
                     <button
                       className={`pb-2 px-2 text-sm font-medium transition-colors ${
                         showCustomTabs === "registry"
                           ? "text-primary border-b-2 border-primary"
                           : "text-muted-foreground"
                       }`}
                       onClick={() => setShowCustomTabs("registry")}
                     >
                       Registry
                     </button>
                     <button
                       className={`pb-2 px-2 text-sm font-medium transition-colors ${
                         showCustomTabs === "tar"
                           ? "text-primary border-b-2 border-primary"
                           : "text-muted-foreground"
                       }`}
                       onClick={() => setShowCustomTabs("tar")}
                     >
                       Tar File
                     </button>
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

              {/* Success Message */}
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

              {/* Error Message */}
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

              {/* Local Compiler Logs */}
              <LogsDisplay
                logs={rendererLogs}
                title="Renderer Logs"
                shouldAnimate={shouldAnimate}
              />
          </CardContent>
        </Card>

         {/* REMOTE COMPILER CARD */}
         <Card disableHover>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <CardTitle>Remote Compiler</CardTitle>
              </div>
              <Badge variant={rendererRemoteUrl ? "default" : "secondary"}>
                {rendererRemoteUrl ? "Configured" : "Not configured"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">

           {/* Compiler URL */}
           <Input
             label="Compiler URL"
             type="text"
             placeholder="https://compiler.com"
             value={remoteUrlInput}
             onChange={(e) => setRemoteUrlInput(e.target.value)}
             disabled={isLoading}
             description="API endpoint for remote compiler"
           />

           {/* API Key */}
            <Input
              label="API Key (Optional)"
              type="password"
              placeholder="Enter API key"
              value={remoteTokenInput}
              onChange={(e) => setRemoteTokenInput(e.target.value)}
              disabled={isLoading}
              description="Authentication if required"
            />

            {/* Remote Compiler Build Logs */}
            <LogsDisplay
              logs={buildLog}
              title="Build Logs"
              shouldAnimate={shouldAnimate}
            />

          </CardContent>
        </Card>
      </motion.div>
    );
});
