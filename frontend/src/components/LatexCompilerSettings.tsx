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
  Zap,
  Download,
  Cpu,
  Wrench,
  Globe,
  Search,
  Check,
  X,
  Loader2,
  Shield,
  Sliders,
  LogIn,
  Server,
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

      {/* Status & Controls Card - Horizontal Layout */}
      <div className={`${status.bgColor} border ${status.borderColor} rounded-xl p-4 flex items-center justify-between hover:border-primary/40 transition-all`}>
        {/* Left: Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {status.icon}
            <div>
              <p className="text-xs font-semibold text-base-content/60 uppercase">Status</p>
              <p className={`text-sm font-bold ${status.color}`}>{status.text}</p>
            </div>
          </div>
          
          {/* Status Details */}
          <div className="hidden sm:flex items-center gap-4 ml-4 pl-4 border-l border-base-content/10">
            <div className="text-center">
              <p className="text-xs text-base-content/60 uppercase">Mode</p>
              <p className="text-sm font-semibold capitalize">{rendererMode}</p>
            </div>
            {isRunning && (
              <div className="text-center">
                <p className="text-xs text-base-content/60 uppercase">Port</p>
                <p className="text-sm font-semibold text-primary">{rendererPort}</p>
              </div>
            )}
            {rendererMode === "auto" && rendererDetectedMode && (
              <div className="text-center">
                <p className="text-xs text-base-content/60 uppercase">Using</p>
                <div className="badge badge-primary badge-xs capitalize">{rendererDetectedMode}</div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Container Controls */}
        {!isRemoteMode && (
          <div className="flex gap-1.5">
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
        )}
      </div>

      {/* Rendering Mode */}
      <div>
        <label className="label pb-2">
          <span className="label-text font-semibold text-sm">Rendering Mode</span>
        </label>
        <div className="flex gap-2">
          <select
            className="select select-bordered select-sm flex-1"
            value={rendererMode}
            onChange={(e) => handleModeChange(e.target.value as RendererMode)}
            disabled={isLoading || isRunning}
          >
            <option value="auto">Auto (Recommended)</option>
            <option value="local">Local (Docker)</option>
            <option value="remote">Remote (External)</option>
          </select>
          <button
            className="btn btn-outline btn-sm gap-1"
            onClick={handleDetectBestMode}
            disabled={isLoading || isRunning}
          >
            <Search className="w-3 h-3" />
            Detect
          </button>
        </div>
        <p className="text-xs text-base-content/70 mt-1">Auto tries remote first, then local Docker</p>
      </div>

      {/* Image Source */}
      {showImageSource && (
        <div>
          <label className="label pb-2">
            <span className="label-text font-semibold text-sm">Image Source</span>
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

      {/* Port Configuration */}
      <div>
        <label className="label pb-2">
          <span className="label-text font-semibold text-sm">Port Number</span>
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
        <p className="text-xs text-base-content/70 mt-1">1024 - 65535, auto-selects if busy</p>
      </div>

      {/* Remote Configuration */}
      {isRemoteMode && (
        <div className="space-y-3">
          <div>
            <label className="label pb-2">
              <span className="label-text font-semibold text-sm">Builder URL</span>
            </label>
            <input
              type="text"
              className="input input-bordered input-sm w-full"
              placeholder="https://builder.com"
              value={rendererRemoteUrl}
              onChange={(e) => setRendererRemoteUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="label pb-2">
              <span className="label-text font-semibold text-sm">Token (Optional)</span>
            </label>
            <input
              type="password"
              className="input input-bordered input-sm w-full"
              placeholder="Enter token"
              value={rendererRemoteToken}
              onChange={(e) => setRendererRemoteToken(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {/* Auto-Start Toggle */}
      <div className="flex items-center justify-between p-3 bg-base-100/30 border border-base-content/10 rounded-xl">
        <div>
          <p className="font-semibold text-sm">Auto-start on launch</p>
          <p className="text-xs text-base-content/70">Start/stop with app</p>
        </div>
        <input
          type="checkbox"
          className="toggle toggle-primary toggle-sm"
          checked={rendererAutoStart}
          onChange={handleAutoStartToggle}
          disabled={isLoading || isRemoteMode}
        />
      </div>

      {/* Logs */}
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
