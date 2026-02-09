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
          icon: <div className="w-2.5 h-2.5 bg-success rounded-full animate-pulse"></div>,
          text: "Running",
          color: "text-success",
        };
      case "stopped":
        return {
          icon: <div className="w-2.5 h-2.5 bg-base-content/40 rounded-full"></div>,
          text: "Stopped",
          color: "text-base-content/60",
        };
      case "building":
        return {
          icon: <RefreshCw className="w-3 h-3 text-warning animate-spin" />,
          text: "Starting...",
          color: "text-warning",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-3 h-3 text-error" />,
          text: "Error",
          color: "text-error",
        };
      default:
        return {
          icon: <AlertCircle className="w-3 h-3 text-warning" />,
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
        <div className="bg-error/10 border border-error/20 rounded-lg p-3 flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
          <span className="text-error text-sm font-medium">{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-3 flex items-start gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
          <span className="text-success text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-base-100/30 border border-base-content/10 rounded-xl p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-semibold text-base-content/60 uppercase mb-2">Status</p>
            <div className="flex items-center gap-2">
              {status.icon}
              <span className={`text-sm font-semibold ${status.color}`}>{status.text}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-base-content/60 uppercase mb-2">Mode</p>
            <p className="text-sm font-semibold capitalize">{rendererMode}</p>
          </div>
          {isRunning && (
            <div>
              <p className="text-xs font-semibold text-base-content/60 uppercase mb-2">Port</p>
              <p className="text-sm font-semibold text-primary">{rendererPort}</p>
            </div>
          )}
          {rendererMode === "auto" && rendererDetectedMode && (
            <div>
              <p className="text-xs font-semibold text-base-content/60 uppercase mb-2">Using</p>
              <div className="badge badge-primary badge-sm capitalize">{rendererDetectedMode}</div>
            </div>
          )}
        </div>
      </div>

      {/* Mode Selection */}
      <div>
        <label className="label pb-2">
          <span className="label-text font-semibold">Rendering Mode</span>
        </label>
        <div className="flex gap-2">
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
            className="btn btn-outline gap-1"
            onClick={handleDetectBestMode}
            disabled={isLoading || isRunning}
          >
            <Search className="w-4 h-4" />
            Detect
          </button>
        </div>
        <p className="text-xs text-base-content/70 mt-2">
          Auto tries remote first, falls back to local Docker. Local uses Docker on your machine. Remote connects to external builder.
        </p>
      </div>

      {/* Image Source */}
      {showImageSource && (
        <div>
          <label className="label pb-2">
            <span className="label-text font-semibold">Image Source</span>
          </label>
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
          <p className="text-xs text-base-content/70 mt-2">
            Where to pull the LaTeX compiler image from
          </p>

          {/* Image Source Info */}
          {rendererImageSource === "ghcr" && (
            <div className="bg-info/10 border border-info/20 rounded-lg p-3 mt-3 flex items-start gap-2 text-xs text-info/90">
              <Globe className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Pulling from GitHub Container Registry</p>
                <p className="text-info/70 mt-1">{rendererImageRef}</p>
              </div>
            </div>
          )}

          {rendererImageSource === "embedded" && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mt-3 flex items-start gap-2 text-xs text-warning/90">
              <Wrench className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="font-medium">Building from bundled Dockerfile - May take 10-20 minutes on first run</p>
            </div>
          )}

          {/* Custom Image */}
          {rendererImageSource === "custom" && (
            <div className="space-y-3 mt-3">
              <div className="tabs tabs-boxed tabs-sm">
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
                  Tar File
                </button>
              </div>

              {showCustomTabs === "registry" ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered flex-1"
                    placeholder="myregistry.com/image:tag"
                    value={rendererCustomRegistry}
                    onChange={(e) => setRendererCustomRegistry(e.target.value)}
                    disabled={isLoading || isRunning}
                  />
                  <button
                    className="btn btn-outline gap-1"
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
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered flex-1"
                    placeholder="/path/to/image.tar"
                    value={rendererCustomTarPath}
                    onChange={(e) => setRendererCustomTarPath(e.target.value)}
                    disabled={isLoading || isRunning}
                  />
                  <button
                    className="btn btn-outline gap-1"
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
              )}

              {imageVerificationStatus === "valid" && (
                <div className="bg-success/10 border border-success/20 rounded-lg p-2 flex items-center gap-2 text-xs text-success">
                  <Check className="w-3 h-3" />
                  Image verified successfully
                </div>
              )}
              {imageVerificationStatus === "invalid" && (
                <div className="bg-error/10 border border-error/20 rounded-lg p-2 flex items-center gap-2 text-xs text-error">
                  <X className="w-3 h-3" />
                  Verification failed
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Remote Configuration */}
      {isRemoteMode && (
        <>
          <div>
            <label className="label pb-2">
              <span className="label-text font-semibold">Builder URL</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="https://your-builder.com"
              value={rendererRemoteUrl}
              onChange={(e) => setRendererRemoteUrl(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-base-content/70 mt-2">URL of your remote LaTeX compilation server</p>
          </div>

          <div>
            <label className="label pb-2">
              <span className="label-text font-semibold">Authentication Token</span>
              <span className="label-text-alt text-xs">Optional</span>
            </label>
            <input
              type="password"
              className="input input-bordered w-full"
              placeholder="Enter token if required"
              value={rendererRemoteToken}
              onChange={(e) => setRendererRemoteToken(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-base-content/70 mt-2">Leave blank if authentication is not required</p>
          </div>

          <button
            className="btn btn-outline w-full gap-1"
            onClick={handleDetectBestMode}
            disabled={isLoading}
          >
            <Search className="w-4 h-4" />
            Test Connection
          </button>
        </>
      )}

      {/* Port Configuration */}
      <div>
        <label className="label pb-2">
          <span className="label-text font-semibold">Port Number</span>
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            className="input input-bordered flex-1"
            value={portInput}
            onChange={(e) => setPortInput(e.target.value)}
            min="1024"
            max="65535"
            disabled={isLoading || isRunning}
          />
          <button
            className="btn btn-outline"
            onClick={handlePortChange}
            disabled={isLoading || isRunning || portInput === rendererPort.toString()}
          >
            Apply
          </button>
        </div>
        <p className="text-xs text-base-content/70 mt-2">
          Range: 1024 - 65535. System will auto-select if busy.
        </p>
      </div>

      {/* Container Controls */}
      {!isRemoteMode && (
        <div>
          <label className="label pb-2">
            <span className="label-text font-semibold">Container Controls</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              className="btn btn-success btn-sm gap-1"
              onClick={handleStart}
              disabled={isLoading || isRunning}
            >
              <Play className="w-4 h-4" />
              Start
            </button>
            <button
              className="btn btn-warning btn-sm gap-1"
              onClick={handleStop}
              disabled={isLoading || !isRunning}
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
            <button
              className="btn btn-info btn-sm gap-1"
              onClick={handleRestart}
              disabled={isLoading || !isRunning}
            >
              <RefreshCw className="w-4 h-4" />
              Restart
            </button>
          </div>
        </div>
      )}

      {isRemoteMode && (
        <div className="bg-base-200/50 rounded-lg p-3 text-xs text-base-content/70">
          Remote renderer is managed externally. Use "Test Connection" above to verify.
        </div>
      )}

      {/* Auto-Start Toggle */}
      <div className="flex items-center justify-between p-4 bg-base-100/30 border border-base-content/10 rounded-xl">
        <div>
          <p className="font-semibold text-sm">Start on app launch</p>
          <p className="text-xs text-base-content/70 mt-1">
            Compiler will start when you open the app and stop on close
          </p>
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
      <div className="bg-base-100/30 border border-base-content/10 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="w-full flex items-center justify-between p-3 hover:bg-base-200/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <LogIn className="w-4 h-4 text-base-content/60" />
            <span className="text-sm font-medium">Compiler Logs</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-base-content/60 transition-transform duration-300 ${
              showLogs ? "rotate-180" : ""
            }`}
          />
        </button>

        {showLogs && (
          <div className="border-t border-base-content/10 p-3">
            <pre className="text-xs font-mono text-base-content/70 overflow-auto max-h-48 whitespace-pre-wrap break-words">
              {rendererLogs || "No logs available yet"}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
