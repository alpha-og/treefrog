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
  Sliders,
  LogIn,
  Server,
  Download,
  Cpu,
  Wrench,
  FileArchive,
  Globe,
  Search,
  Check,
  X,
  Loader2,
  Shield,
} from "lucide-react";

const log = createLogger("RendererSettings");

export default function RendererSettings() {
  // Timeout refs for cleanup
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Load initial config and status
  useEffect(() => {
    loadConfig();
    loadStatus();
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
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
       setError(null); // Clear any previous errors
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
       setError(null); // Clear any previous errors
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

  const handleDetectBestMode = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const detectedMode = await rendererService.detectBestMode();
      setRendererDetectedMode(detectedMode);
      setRendererMode(detectedMode);
      await rendererService.setMode(detectedMode);
      toast.success(`Auto-detected best mode: ${detectedMode}`);
    } catch (err) {
      setError(`Failed to detect mode: ${err}`);
      toast.error(`Failed to detect mode: ${err}`);
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
      
      // Set default ref based on source
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
      
      // Check if port changed
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
      setSuccessMessage(
        `Auto-start ${!rendererAutoStart ? "enabled" : "disabled"}`
      );
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
          icon: <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>,
          text: "Running",
          color: "text-success",
        };
      case "stopped":
        return {
          icon: <div className="w-3 h-3 bg-base-content/40 rounded-full"></div>,
          text: "Stopped",
          color: "text-base-content/60",
        };
      case "building":
        return {
          icon: <RefreshCw className="w-4 h-4 text-warning animate-spin" />,
          text: "Starting...",
          color: "text-warning",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-4 h-4 text-error" />,
          text: "Error",
          color: "text-error",
        };
      default:
        return {
          icon: <AlertCircle className="w-4 h-4 text-warning" />,
          text: "Unknown",
          color: "text-warning",
        };
    }
  };

  const status = getStatusDisplay();
  const isRunning = rendererStatus === "running";
  const isRemoteMode = rendererMode === "remote";
  const showImageSource = rendererMode === "local" || rendererMode === "auto";

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-error/10 border border-error/30 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
          <span className="text-error text-sm font-medium">{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-success/10 border border-success/30 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
          <span className="text-success text-sm font-medium">
            {successMessage}
          </span>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-gradient-to-br from-base-100 to-base-100/50 border border-base-content/10 rounded-2xl p-6 md:p-8 hover:border-base-content/20 transition-all duration-300">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-sm font-bold text-base-content/60 uppercase tracking-wider mb-3">
              Current Status
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {status.icon}
              <span className={`font-semibold ${status.color}`}>
                {status.text}
              </span>
              {isRunning && (
                <span className="text-xs text-base-content/60 ml-2">
                  on port {rendererPort}
                </span>
              )}
              {rendererMode === "auto" && rendererDetectedMode && (
                <span className="badge badge-primary badge-sm">
                  Auto (using {rendererDetectedMode})
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-base-content/50 uppercase tracking-wider">
              Mode
            </span>
            <p className="font-semibold capitalize">{rendererMode}</p>
          </div>
        </div>
      </div>

      {/* Mode Selection Card */}
      <div className="bg-gradient-to-br from-base-100 to-base-100/50 border border-base-content/10 rounded-2xl p-6 md:p-8 hover:border-base-content/20 transition-all duration-300">
        <label className="font-bold text-base flex items-center gap-2 mb-4">
          <Server size={18} className="text-primary" />
          Rendering Mode
        </label>

        <div className="space-y-4">
          <div className="flex gap-3">
            <select
              className="select select-bordered flex-1"
              value={rendererMode}
              onChange={(e) => handleModeChange(e.target.value as RendererMode)}
              disabled={isLoading || isRunning}
            >
              <option value="auto">Auto (Recommended)</option>
              <option value="local">Local (Docker)</option>
              <option value="remote">Remote (External)</option>
            </select>
            <button
              className="btn btn-outline gap-2"
              onClick={handleDetectBestMode}
              disabled={isLoading || isRunning}
            >
              <Search className="w-4 h-4" />
              Detect
            </button>
          </div>
          
          <div className="bg-base-200/50 rounded-xl p-4">
            <p className="text-xs text-base-content/70 leading-relaxed">
              <strong>Auto:</strong> Tries remote builder first, falls back to local Docker.
              <br />
              <strong>Local:</strong> Uses Docker container on your machine. Requires Docker.
              <br />
              <strong>Remote:</strong> Connects to an external builder. Requires URL configuration.
            </p>
          </div>
        </div>
      </div>

      {/* Image Source Card (shown for local and auto modes) */}
      {showImageSource && (
        <div className="bg-gradient-to-br from-base-100 to-base-100/50 border border-base-content/10 rounded-2xl p-6 md:p-8 hover:border-base-content/20 transition-all duration-300">
          <label className="font-bold text-base flex items-center gap-2 mb-4">
            <Download size={18} className="text-primary" />
            Image Source
          </label>

          <div className="space-y-4">
            <select
              className="select select-bordered w-full"
              value={rendererImageSource}
              onChange={(e) => handleImageSourceChange(e.target.value as ImageSource)}
              disabled={isLoading || isRunning}
            >
              <option value="ghcr">GitHub Container Registry (Default)</option>
              <option value="embedded">Build from Source</option>
              <option value="custom">Custom Image</option>
            </select>

            {/* GHCR Info */}
            {rendererImageSource === "ghcr" && (
              <div className="bg-success/10 border border-success/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-success">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Will pull from: {rendererImageRef}
                  </span>
                </div>
              </div>
            )}

            {/* Embedded Info */}
            {rendererImageSource === "embedded" && (
              <div className="bg-info/10 border border-info/30 rounded-xl p-4">
                <div className="flex items-start gap-2 text-info">
                  <Wrench className="w-4 h-4 mt-0.5" />
                  <span className="text-sm">
                    Will build from bundled Dockerfile. This may take 10-20 minutes on first run.
                  </span>
                </div>
              </div>
            )}

            {/* Custom Image Configuration */}
            {rendererImageSource === "custom" && (
              <div className="space-y-4">
                <div className="tabs tabs-boxed">
                  <button
                    className={`tab ${showCustomTabs === "registry" ? "tab-active" : ""}`}
                    onClick={() => setShowCustomTabs("registry")}
                  >
                    Registry URL
                  </button>
                  <button
                    className={`tab ${showCustomTabs === "tar" ? "tab-active" : ""}`}
                    onClick={() => setShowCustomTabs("tar")}
                  >
                    Tar File
                  </button>
                </div>

                {showCustomTabs === "registry" ? (
                  <div className="space-y-3">
                    <label className="label">
                      <span className="label-text text-sm font-semibold">
                        Custom Registry URL
                      </span>
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        className="input input-bordered flex-1"
                        placeholder="e.g., myregistry.com/image:tag"
                        value={rendererCustomRegistry}
                        onChange={(e) => setRendererCustomRegistry(e.target.value)}
                        disabled={isLoading || isRunning}
                      />
                      <button
                        className="btn btn-outline gap-2"
                        onClick={handleVerifyCustomImage}
                        disabled={isVerifyingImage || isLoading || isRunning || !rendererCustomRegistry}
                      >
                        {isVerifyingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : imageVerificationStatus === "valid" ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : imageVerificationStatus === "invalid" ? (
                          <X className="w-4 h-4 text-error" />
                        ) : (
                          <Shield className="w-4 h-4" />
                        )}
                        Verify
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="label">
                      <span className="label-text text-sm font-semibold">
                        Tar File Path
                      </span>
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        className="input input-bordered flex-1"
                        placeholder="/path/to/image.tar"
                        value={rendererCustomTarPath}
                        onChange={(e) => setRendererCustomTarPath(e.target.value)}
                        disabled={isLoading || isRunning}
                      />
                      <button
                        className="btn btn-outline gap-2"
                        onClick={handleVerifyCustomImage}
                        disabled={isVerifyingImage || isLoading || isRunning || !rendererCustomTarPath}
                      >
                        {isVerifyingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : imageVerificationStatus === "valid" ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : imageVerificationStatus === "invalid" ? (
                          <X className="w-4 h-4 text-error" />
                        ) : (
                          <Shield className="w-4 h-4" />
                        )}
                        Verify
                      </button>
                    </div>
                  </div>
                )}

                {imageVerificationStatus === "valid" && (
                  <div className="bg-success/10 border border-success/30 rounded-xl p-3 flex items-center gap-2">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-sm text-success">Image verified successfully</span>
                  </div>
                )}
                {imageVerificationStatus === "invalid" && (
                  <div className="bg-error/10 border border-error/30 rounded-xl p-3 flex items-center gap-2">
                    <X className="w-4 h-4 text-error" />
                    <span className="text-sm text-error">Image verification failed. Check the path and try again.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Remote Configuration Card (shown for remote mode) */}
      {isRemoteMode && (
        <div className="bg-gradient-to-br from-base-100 to-base-100/50 border border-base-content/10 rounded-2xl p-6 md:p-8 hover:border-base-content/20 transition-all duration-300">
          <label className="font-bold text-base flex items-center gap-2 mb-4">
            <Globe size={18} className="text-primary" />
            Remote Builder Configuration
          </label>

          <div className="space-y-4">
            <div>
              <label className="label pb-2">
                <span className="label-text text-sm font-semibold">URL</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="https://your-builder.com"
                value={rendererRemoteUrl}
                onChange={(e) => setRendererRemoteUrl(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="label pb-2">
                <span className="label-text text-sm font-semibold">
                  Authentication Token
                </span>
                <span className="label-text-alt text-xs text-base-content/50">
                  Optional
                </span>
              </label>
              <input
                type="password"
                className="input input-bordered w-full"
                placeholder="Enter token"
                value={rendererRemoteToken}
                onChange={(e) => setRendererRemoteToken(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button
              className="btn btn-outline w-full gap-2"
              onClick={handleDetectBestMode}
              disabled={isLoading}
            >
              <Search className="w-4 h-4" />
              Test Connection
            </button>
          </div>
        </div>
      )}

      {/* Port Configuration Card */}
      <div className="bg-gradient-to-br from-base-100 to-base-100/50 border border-base-content/10 rounded-2xl p-6 md:p-8 hover:border-base-content/20 transition-all duration-300">
        <label className="font-bold text-base flex items-center gap-2 mb-4">
          <Sliders size={18} className="text-primary" />
          Port Configuration
        </label>

        <div className="space-y-4">
          <div>
            <label className="label pb-2">
              <span className="label-text text-sm font-semibold">
                Port Number
              </span>
              <span className="label-text-alt text-xs text-base-content/50">
                1024 - 65535
              </span>
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                className="input input-bordered flex-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={portInput}
                onChange={(e) => setPortInput(e.target.value)}
                min="1024"
                max="65535"
                disabled={isLoading || isRunning}
              />
              <button
                className="btn btn-outline"
                onClick={handlePortChange}
                disabled={
                  isLoading ||
                  isRunning ||
                  portInput === rendererPort.toString()
                }
              >
                Apply
              </button>
            </div>
            <p className="text-xs text-base-content/60 mt-2 leading-relaxed">
              Enter a port number where the renderer will be accessible. If the port is busy, an available port will be selected automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Control Buttons Card */}
      <div className="bg-gradient-to-br from-base-100 to-base-100/50 border border-base-content/10 rounded-2xl p-6 md:p-8 hover:border-base-content/20 transition-all duration-300">
        <label className="font-bold text-base mb-4 block">
          Container Controls
        </label>

        {isRemoteMode ? (
          <div className="alert alert-info">
            <Cpu className="w-5 h-5" />
            <span>
              Remote renderer is controlled externally. Use the &quot;Test Connection&quot; button above to verify connectivity.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              className="btn btn-success gap-2 shadow-md hover:shadow-lg transition-all"
              onClick={handleStart}
              disabled={isLoading || isRunning}
            >
              <Play className="w-4 h-4" />
              <span className="hidden md:inline">Start</span>
            </button>

            <button
              className="btn btn-warning gap-2 shadow-md hover:shadow-lg transition-all"
              onClick={handleStop}
              disabled={isLoading || !isRunning}
            >
              <Square className="w-4 h-4" />
              <span className="hidden md:inline">Stop</span>
            </button>

            <button
              className="btn btn-info gap-2 shadow-md hover:shadow-lg transition-all"
              onClick={handleRestart}
              disabled={isLoading || !isRunning}
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden md:inline">Restart</span>
            </button>
          </div>
        )}
      </div>

      {/* Auto-Start Setting Card */}
      <div className="bg-gradient-to-br from-base-100 to-base-100/50 border border-base-content/10 rounded-2xl p-6 md:p-8 hover:border-base-content/20 transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="font-bold text-base mb-1 flex items-center gap-2">
              Auto-Start on Launch
            </label>
            <p className="text-xs text-base-content/60 leading-relaxed">
              Automatically start the renderer when you open the application.
              The renderer will also shut down when you close the app.
            </p>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-lg ml-4"
            checked={rendererAutoStart}
            onChange={handleAutoStartToggle}
            disabled={isLoading || isRemoteMode}
          />
        </div>
        {isRemoteMode && (
          <p className="text-xs text-base-content/50 mt-2">
            Auto-start is not available in remote mode.
          </p>
        )}
      </div>

      {/* Logs Section */}
      <div className="bg-gradient-to-br from-base-100 to-base-100/50 border border-base-content/10 rounded-2xl overflow-hidden hover:border-base-content/20 transition-all duration-300">
        <button
          className="w-full flex items-center justify-between p-6 md:p-8 hover:bg-base-100/50 transition-colors"
          onClick={() => setShowLogs(!showLogs)}
        >
          <label className="font-bold text-base flex items-center gap-2 cursor-pointer">
            <LogIn className="w-5 h-5" />
            Renderer Logs
          </label>
          <ChevronDown
            className={`w-5 h-5 transition-transform ${
              showLogs ? "rotate-180" : ""
            }`}
          />
        </button>

        {showLogs && (
          <div className="border-t border-base-content/10 px-6 md:px-8 py-4 bg-base-200/30">
            <pre className="bg-base-300 p-4 rounded-xl text-xs overflow-auto max-h-64 text-base-content/80 font-mono leading-relaxed">
              {rendererLogs || "No logs available yet"}
            </pre>
          </div>
        )}
      </div>

      {/* Prerequisites Card */}
      <div className="bg-info/10 border border-info/30 rounded-2xl p-6 md:p-8 flex items-start gap-4">
        <AlertCircle
          size={22}
          className="text-info flex-shrink-0 mt-0.5"
        />
        <div className="flex-1">
          <h3 className="font-bold text-info mb-3 text-sm">Prerequisites</h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-info/90">
              <span className="text-info font-bold mt-0.5">•</span>
              <span>
                Docker must be installed on your system.{" "}
                <a
                  href="https://www.docker.com/get-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline hover:no-underline"
                >
                  Install Docker
                </a>
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm text-info/90">
              <span className="text-info font-bold mt-0.5">•</span>
              <span>
                The Treefrog LaTeX Docker image must be available locally or
                will be pulled from the selected source
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm text-info/90">
              <span className="text-info font-bold mt-0.5">•</span>
              <span>
                Your selected port must be available and not in use by another
                application (auto-detection will find an alternative if busy)
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}