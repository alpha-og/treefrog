import { useState, useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import { rendererService } from "../services/rendererService";
import {
  ChevronDown,
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Sliders,
  LogIn,
} from "lucide-react";

export default function RendererSettings() {
  const {
    rendererPort,
    rendererStatus,
    rendererAutoStart,
    rendererLogs,
    setRendererPort,
    setRendererStatus,
    setRendererAutoStart,
    setRendererLogs,
  } = useAppStore();

  const [portInput, setPortInput] = useState(rendererPort.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load initial status
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const status = await rendererService.getStatus();
      setRendererStatus(status.state as any);
      if (status.logs) {
        setRendererLogs(status.logs);
      }
    } catch (err) {
      console.error("Failed to get renderer status:", err);
    }
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
      setTimeout(() => setSuccessMessage(null), 3000);
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
    try {
      await rendererService.startRenderer();
      setRendererStatus("running");
      setSuccessMessage("Renderer started successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadStatus();
    } catch (err) {
      setRendererStatus("error");
      setError(`Failed to start renderer: ${err}`);
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
      setTimeout(() => setSuccessMessage(null), 3000);
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
    try {
      await rendererService.restartRenderer();
      setRendererStatus("running");
      setSuccessMessage("Renderer restarted successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadStatus();
    } catch (err) {
      setRendererStatus("error");
      setError(`Failed to restart renderer: ${err}`);
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
      setTimeout(() => setSuccessMessage(null), 3000);
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-base-content/60 uppercase tracking-wider mb-3">
              Current Status
            </h3>
            <div className="flex items-center gap-2">
              {status.icon}
              <span className={`font-semibold ${status.color}`}>
                {status.text}
              </span>
              {isRunning && (
                <span className="text-xs text-base-content/60 ml-2">
                  on port {rendererPort}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

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
              Enter a port number where the renderer will be accessible. The
              renderer will bind to localhost for security.
            </p>
          </div>
        </div>
      </div>

      {/* Control Buttons Card */}
      <div className="bg-gradient-to-br from-base-100 to-base-100/50 border border-base-content/10 rounded-2xl p-6 md:p-8 hover:border-base-content/20 transition-all duration-300">
        <label className="font-bold text-base mb-4 block">
          Container Controls
        </label>

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
            disabled={isLoading}
          />
        </div>
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
                will be built from the bundled Dockerfile
              </span>
            </li>
            <li className="flex items-start gap-2 text-sm text-info/90">
              <span className="text-info font-bold mt-0.5">•</span>
              <span>
                Your selected port must be available and not in use by another
                application
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
