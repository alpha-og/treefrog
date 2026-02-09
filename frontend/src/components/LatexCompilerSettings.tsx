import { useState, useEffect, useRef } from "react";
import { useAppStore } from "../stores/appStore";
import { rendererService, type RendererMode, type ImageSource } from "../services/rendererService";
import { createLogger } from "../utils/logger";
import { toast } from "sonner";
import {
  ChevronDown,
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Wrench,
  Globe,
  Check,
  X,
  Loader2,
  Shield,
  LogIn,
} from "lucide-react";

const log = createLogger("LatexCompilerSettings");

export default function LatexCompilerSettings() {
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    rendererDetectedMode,
    rendererLogs,
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
    setRendererDetectedMode,
    setRendererLogs,
  } = useAppStore();

  const [portInput, setPortInput] = useState(rendererPort.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCustomTabs, setShowCustomTabs] = useState<"registry" | "tar">("registry");
  const [isVerifyingImage, setIsVerifyingImage] = useState(false);
  const [imageVerificationStatus, setImageVerificationStatus] = useState<"idle" | "valid" | "invalid">("idle");

  useEffect(() => {
    loadConfig();
    loadStatus();
  }, []);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

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
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error("Failed to load renderer config", err);
      setError(`Failed to load renderer configuration: ${errorMsg}`);
    }
  };

  const loadStatus = async () => {
    try {
      const status = await rendererService.getStatus();
      setRendererStatus(status.state);
      setRendererDetectedMode(status.mode);
      if (status.logs) {
        setRendererLogs(status.logs);
      }
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error("Failed to load renderer status", err);
      setError(`Failed to load renderer status: ${errorMsg}`);
      setRendererStatus("error");
    }
  };

  const handleModeChange = async (newMode: RendererMode) => {
    setIsLoading(true);
    setError(null);
    try {
      await rendererService.setMode(newMode);
      setRendererMode(newMode);
      setSuccessMessage(`Mode changed to ${newMode}`);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(`Failed to change mode: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };



  const handleImageSourceChange = async (newSource: ImageSource) => {
    setIsLoading(true);
    setError(null);
    try {
      await rendererService.setImageSource(newSource, rendererImageRef);
      setRendererImageSource(newSource);

      if (newSource === "ghcr") {
        setRendererImageRef("ghcr.io/alpha-og/treefrog/renderer:latest");
      }

      setSuccessMessage(`Image source changed to ${newSource}`);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(`Failed to change image source: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCustomImage = async () => {
    setIsVerifyingImage(true);
    setImageVerificationStatus("idle");
    setError(null);

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
        success: (isValid) => {
          setImageVerificationStatus(isValid ? "valid" : "invalid");
          return isValid ? "Image verified successfully" : "Image verification failed";
        },
        error: (err) => {
          setImageVerificationStatus("invalid");
          return `Verification failed: ${err}`;
        },
        finally: () => {
          setIsVerifyingImage(false);
        },
      }
    );
  };

  const handlePortChange = async () => {
    const newPort = parseInt(portInput, 10);
    if (isNaN(newPort) || newPort < 1024 || newPort > 65535) {
      setError("Port must be between 1024 and 65535");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await rendererService.setPort(newPort);
      setRendererPort(newPort);
      setSuccessMessage("Port updated successfully");
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(`Failed to update port: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStart = async () => {
    setIsLoading(true);
    setError(null);
    setRendererStatus("building");

    toast.info("Starting renderer... This may take a few minutes if pulling image for the first time.");

    try {
      await rendererService.startRenderer();
      setRendererStatus("running");

      const status = await rendererService.getStatus();
      if (status.port !== rendererPort) {
        toast.warning(`Port ${rendererPort} was busy. Using port ${status.port} instead.`);
        setRendererPort(status.port);
        setPortInput(status.port.toString());
      }

      setSuccessMessage("Renderer started successfully");
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setSuccessMessage(null), 3000);
      await loadStatus();
    } catch (err) {
      setRendererStatus("error");
      setError(`Failed to start renderer: ${err}`);
      toast.error(`Failed to start renderer: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await rendererService.stopRenderer();
      setRendererStatus("stopped");
      setSuccessMessage("Renderer stopped successfully");
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(`Failed to stop renderer: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = async () => {
    setIsLoading(true);
    setError(null);
    setRendererStatus("building");

    toast.info("Restarting renderer...");

    try {
      await rendererService.restartRenderer();
      setRendererStatus("running");
      setSuccessMessage("Renderer restarted successfully");
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setSuccessMessage(null), 3000);
      await loadStatus();
    } catch (err) {
      setRendererStatus("error");
      setError(`Failed to restart renderer: ${err}`);
      toast.error(`Failed to restart renderer: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoStartToggle = async () => {
    try {
      await rendererService.setAutoStart(!rendererAutoStart);
      setRendererAutoStart(!rendererAutoStart);
      setSuccessMessage(`Auto-start ${!rendererAutoStart ? "enabled" : "disabled"}`);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(`Failed to update auto-start: ${err}`);
    }
  };

  const getStatusDisplay = () => {
    switch (rendererStatus) {
      case "running":
        return {
          icon: <div className="w-2.5 h-2.5 bg-success rounded-full animate-pulse shadow-lg shadow-success/50"></div>,
          text: "Running",
          color: "text-success",
          bgColor: "bg-success/10",
          borderColor: "border-success/20",
        };
      case "stopped":
        return {
          icon: <div className="w-2.5 h-2.5 bg-base-content/40 rounded-full"></div>,
          text: "Stopped",
          color: "text-base-content/60",
          bgColor: "bg-base-content/5",
          borderColor: "border-base-content/10",
        };
      case "building":
        return {
          icon: <RefreshCw className="w-3 h-3 text-warning animate-spin" />,
          text: "Starting...",
          color: "text-warning",
          bgColor: "bg-warning/10",
          borderColor: "border-warning/20",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-3 h-3 text-error" />,
          text: "Error",
          color: "text-error",
          bgColor: "bg-error/10",
          borderColor: "border-error/20",
        };
      case "not-installed":
        return {
          icon: <AlertCircle className="w-3 h-3 text-warning" />,
          text: "Not Installed",
          color: "text-warning",
          bgColor: "bg-warning/10",
          borderColor: "border-warning/20",
        };
      default:
        return {
          icon: <AlertCircle className="w-3 h-3 text-warning" />,
          text: "Loading...",
          color: "text-warning",
          bgColor: "bg-warning/10",
          borderColor: "border-warning/20",
        };
    }
  };

  const status = getStatusDisplay();
  const isRunning = rendererStatus === "running";
  const isRemoteMode = rendererMode === "remote";
  const showImageSource = rendererMode === "local" || rendererMode === "auto";

  return (
    <div className="space-y-4">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-3 flex items-start gap-2 animate-in fade-in text-sm">
          <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
          <span className="text-error font-medium">{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-3 flex items-start gap-2 animate-in fade-in text-sm">
          <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
          <span className="text-success font-medium">{successMessage}</span>
        </div>
      )}

       {/* Rendering Mode Selection */}
       <div>
         <label className="label pb-2">
           <span className="label-text font-semibold">Rendering Mode</span>
         </label>
         <select
           className="select select-bordered w-full"
           value={rendererMode}
           onChange={(e) => handleModeChange(e.target.value as RendererMode)}
           disabled={isLoading || isRunning}
         >
           <option value="auto">Auto (Recommended)</option>
           <option value="local">Local (Docker)</option>
           <option value="remote">Remote (External)</option>
         </select>
       </div>

       {/* UNIFIED COMPILER SETTINGS SECTION */}
       <div className="bg-base-100/30 border border-base-content/10 rounded-xl overflow-hidden">
         {/* LOCAL COMPILER SECTION */}
         <div className="p-4 space-y-4">
           <div>
             <div className="flex items-center gap-2 mb-3">
               <Wrench className="w-4 h-4 text-primary" />
               <h3 className="text-sm font-bold text-base-content/80">Local Compiler</h3>
             </div>

             {/* Local Status Card */}
             <div className={`${status.bgColor} border ${status.borderColor} rounded-lg p-3 flex items-center justify-between mb-3`}>
               <div className="flex items-center gap-2">
                 {status.icon}
                 <div>
                   <p className={`text-sm font-bold ${status.color}`}>{status.text}</p>
                 </div>
               </div>

               {/* Local Controls */}
               <div className="flex gap-1">
                 <button
                   className="btn btn-success btn-xs gap-1"
                   onClick={handleStart}
                   disabled={isLoading || isRunning}
                   title="Start renderer"
                 >
                   <Play className="w-3 h-3" />
                   <span className="hidden sm:inline">Start</span>
                 </button>
                 <button
                   className="btn btn-warning btn-xs gap-1"
                   onClick={handleStop}
                   disabled={isLoading || !isRunning}
                   title="Stop renderer"
                 >
                   <Square className="w-3 h-3" />
                   <span className="hidden sm:inline">Stop</span>
                 </button>
                 <button
                   className="btn btn-info btn-xs gap-1"
                   onClick={handleRestart}
                   disabled={isLoading || !isRunning}
                   title="Restart renderer"
                 >
                   <RefreshCw className="w-3 h-3" />
                   <span className="hidden sm:inline">Restart</span>
                 </button>
               </div>
             </div>

             {/* Port Configuration */}
             <div>
               <label className="label pb-2">
                 <span className="label-text font-semibold text-xs">Port Number</span>
               </label>
               <div className="flex gap-2">
                 <input
                   type="number"
                   className="input input-bordered input-sm flex-1"
                   value={portInput}
                   onChange={(e) => setPortInput(e.target.value)}
                   min="1024"
                   max="65535"
                   disabled={isLoading || isRunning}
                 />
                 <button
                   className="btn btn-outline btn-sm"
                   onClick={handlePortChange}
                   disabled={isLoading || isRunning || portInput === rendererPort.toString()}
                 >
                   Apply
                 </button>
               </div>
               <p className="text-xs text-base-content/70 mt-1">1024 - 65535</p>
             </div>

             {/* Auto-Start Toggle */}
             <div className="pt-3 mt-3 border-t border-base-content/10">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="font-semibold text-sm">Auto-start on launch</p>
                   <p className="text-xs text-base-content/70">Start/stop with app</p>
                 </div>
                 <input
                   type="checkbox"
                   className="toggle toggle-primary toggle-sm"
                   checked={rendererAutoStart}
                   onChange={handleAutoStartToggle}
                   disabled={isLoading}
                 />
               </div>
             </div>

             {/* Image Source */}
             {showImageSource && (
               <div className="mt-3 pt-3 border-t border-base-content/10">
                 <label className="label pb-2">
                   <span className="label-text font-semibold text-xs">Image Source</span>
                 </label>
                 <select
                   className="select select-bordered select-sm w-full"
                   value={rendererImageSource}
                   onChange={(e) => handleImageSourceChange(e.target.value as ImageSource)}
                   disabled={isLoading || isRunning}
                 >
                   <option value="ghcr">GitHub Registry (Default)</option>
                   <option value="embedded">Build from Source</option>
                   <option value="custom">Custom Image</option>
                 </select>

                 {rendererImageSource === "custom" && (
                   <div className="space-y-2 mt-3">
                     <div className="tabs tabs-boxed tabs-xs">
                       <button
                         className={`tab ${showCustomTabs === "registry" ? "tab-active" : ""}`}
                         onClick={() => setShowCustomTabs("registry")}
                       >
                         Registry
                       </button>
                       <button
                         className={`tab ${showCustomTabs === "tar" ? "tab-active" : ""}`}
                         onClick={() => setShowCustomTabs("tar")}
                       >
                         Tar
                       </button>
                     </div>

                     {showCustomTabs === "registry" ? (
                       <div className="flex gap-2">
                         <input
                           type="text"
                           className="input input-bordered input-sm flex-1"
                           placeholder="registry/image:tag"
                           value={rendererCustomRegistry}
                           onChange={(e) => setRendererCustomRegistry(e.target.value)}
                           disabled={isLoading || isRunning}
                         />
                         <button
                           className="btn btn-outline btn-sm"
                           onClick={handleVerifyCustomImage}
                           disabled={isVerifyingImage || isLoading || isRunning || !rendererCustomRegistry}
                         >
                           {isVerifyingImage ? (
                             <Loader2 className="w-3 h-3 animate-spin" />
                           ) : imageVerificationStatus === "valid" ? (
                             <Check className="w-3 h-3 text-success" />
                           ) : imageVerificationStatus === "invalid" ? (
                             <X className="w-3 h-3 text-error" />
                           ) : (
                             <Shield className="w-3 h-3" />
                           )}
                         </button>
                       </div>
                     ) : (
                       <div className="flex gap-2">
                         <input
                           type="text"
                           className="input input-bordered input-sm flex-1"
                           placeholder="/path/to/image.tar"
                           value={rendererCustomTarPath}
                           onChange={(e) => setRendererCustomTarPath(e.target.value)}
                           disabled={isLoading || isRunning}
                         />
                         <button
                           className="btn btn-outline btn-sm"
                           onClick={handleVerifyCustomImage}
                           disabled={isVerifyingImage || isLoading || isRunning || !rendererCustomTarPath}
                         >
                           {isVerifyingImage ? (
                             <Loader2 className="w-3 h-3 animate-spin" />
                           ) : imageVerificationStatus === "valid" ? (
                             <Check className="w-3 h-3 text-success" />
                           ) : imageVerificationStatus === "invalid" ? (
                             <X className="w-3 h-3 text-error" />
                           ) : (
                             <Shield className="w-3 h-3" />
                           )}
                         </button>
                       </div>
                     )}

                     {imageVerificationStatus === "valid" && (
                       <div className="bg-success/10 border border-success/20 rounded-lg p-2 flex items-center gap-2 text-xs text-success">
                         <Check className="w-3 h-3" />
                         Verified
                       </div>
                     )}
                     {imageVerificationStatus === "invalid" && (
                       <div className="bg-error/10 border border-error/20 rounded-lg p-2 flex items-center gap-2 text-xs text-error">
                         <X className="w-3 h-3" />
                         Failed
                       </div>
                     )}
                   </div>
                 )}
               </div>
             )}
           </div>
         </div>

         {/* DIVIDER */}
         <div className="border-t border-base-content/10"></div>

         {/* REMOTE COMPILER SECTION */}
         <div className="p-4 space-y-4">
           <div>
             <div className="flex items-center gap-2 mb-3">
               <Globe className="w-4 h-4 text-primary" />
               <h3 className="text-sm font-bold text-base-content/80">Remote Compiler</h3>
             </div>

              {/* Remote Status */}
              <div className="bg-base-content/5 border border-base-content/10 rounded-lg p-3 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-base-content/40 rounded-full"></div>
                  <p className="text-sm text-base-content/60">External Compiler</p>
                </div>
                <p className="text-xs text-base-content/50">{rendererRemoteUrl ? "Configured" : "Not configured"}</p>
              </div>

              {/* Compiler URL */}
              <div>
                <label className="label pb-2">
                  <span className="label-text font-semibold text-xs">Compiler URL</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered input-sm w-full"
                  placeholder="https://compiler.com"
                  value={rendererRemoteUrl}
                  onChange={(e) => setRendererRemoteUrl(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-base-content/70 mt-1">API endpoint for remote compiler</p>
              </div>

             {/* API Key */}
             <div className="pt-3 mt-3 border-t border-base-content/10">
               <label className="label pb-2">
                 <span className="label-text font-semibold text-xs">API Key (Optional)</span>
               </label>
               <input
                 type="password"
                 className="input input-bordered input-sm w-full"
                 placeholder="Enter API key"
                 value={rendererRemoteToken}
                 onChange={(e) => setRendererRemoteToken(e.target.value)}
                 disabled={isLoading}
               />
               <p className="text-xs text-base-content/70 mt-1">Authentication if required</p>
             </div>
           </div>
         </div>
       </div>

      {/* Logs - Available for both local and remote */}
      <div className="bg-base-100/30 border border-base-content/10 rounded-xl overflow-hidden flex flex-col h-40">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="w-full flex items-center justify-between p-3 hover:bg-base-200/50 transition-colors flex-shrink-0"
        >
          <div className="flex items-center gap-2">
            <LogIn className="w-3 h-3 text-base-content/60" />
            <span className="text-sm font-medium">Logs</span>
          </div>
          <ChevronDown
            className={`w-3 h-3 text-base-content/60 transition-transform duration-300 ${
              showLogs ? "rotate-180" : ""
            }`}
          />
        </button>

        {showLogs && (
          <div className="flex-1 overflow-y-auto border-t border-base-content/10 p-3">
            <pre className="text-xs font-mono text-base-content/70 whitespace-pre-wrap break-words">
              {rendererLogs || "No logs available yet"}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
