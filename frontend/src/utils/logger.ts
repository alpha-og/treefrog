export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

interface LogConfig {
  level: LogLevel;
  namespace?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

const COLORS = {
  debug: "#7c3aed", // violet
  info: "#0ea5e9", // cyan
  warn: "#f59e0b", // amber
  error: "#ef4444", // red
  reset: "color: inherit",
};

class Logger {
  private level: LogLevel;
  private isDev: boolean;

  constructor() {
    this.isDev = import.meta.env.DEV;
    this.level = this.getLogLevel();
    this.setupWindowDebug();
  }

  private getLogLevel(): LogLevel {
    // Check window.__LOG_CONFIG (runtime override)
    const windowConfig = (window as any).__LOG_CONFIG;
    if (windowConfig?.level) {
      return windowConfig.level;
    }

    // Check localStorage
    const stored = localStorage.getItem("treefrog-log-level");
    if (stored && this.isValidLogLevel(stored)) {
      return stored as LogLevel;
    }

    // Check environment variable
    const envLevel = import.meta.env.VITE_LOG_LEVEL;
    if (envLevel && this.isValidLogLevel(envLevel)) {
      return envLevel as LogLevel;
    }

    // Default: debug in dev, error in production
    return this.isDev ? "debug" : "error";
  }

  private isValidLogLevel(level: string): level is LogLevel {
    return ["debug", "info", "warn", "error", "silent"].includes(level);
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDev && level === "debug") {
      return false; // Never log debug in production
    }
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private format(level: LogLevel, namespace: string, message: string, data?: any) {
    const timestamp = new Date().toLocaleTimeString();
    const style = `color: ${COLORS[level]}; font-weight: bold;`;
    const prefix = `%c[${timestamp}] [${level.toUpperCase()}] ${namespace}:`;

    if (data !== undefined) {
      return [prefix, style, message, data];
    }
    return [prefix, style, message];
  }

  setLevel(level: LogLevel) {
    if (this.isValidLogLevel(level)) {
      this.level = level;
      localStorage.setItem("treefrog-log-level", level);
      console.log(`Logger level set to: ${level}`);
    }
  }

  getLevel(): LogLevel {
    return this.level;
  }

  debug(namespace: string, message: string, data?: any) {
    if (this.shouldLog("debug")) {
      console.log(...this.format("debug", namespace, message, data));
    }
  }

  info(namespace: string, message: string, data?: any) {
    if (this.shouldLog("info")) {
      console.log(...this.format("info", namespace, message, data));
    }
  }

  warn(namespace: string, message: string, data?: any) {
    if (this.shouldLog("warn")) {
      console.warn(...this.format("warn", namespace, message, data));
    }
  }

  error(namespace: string, message: string, data?: any) {
    if (this.shouldLog("error")) {
      console.error(...this.format("error", namespace, message, data));
    }
  }

  private setupWindowDebug() {
    (window as any).__LOG_CONFIG = {
      setLevel: (level: LogLevel) => this.setLevel(level),
      getLevel: () => this.getLevel(),
      logger: this,
    };

    if (this.isDev) {
      console.log(
        "%cTreefrog Logger initialized",
        "color: #10b981; font-weight: bold; font-size: 14px;"
      );
      console.log(
        `%cCurrent level: ${this.level} | Use window.__LOG_CONFIG.setLevel('debug|info|warn|error|silent') to change`,
        "color: #6366f1; font-size: 12px;"
      );
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Create namespace-based logger
export function createLogger(namespace: string) {
  return {
    debug: (message: string, data?: any) => logger.debug(namespace, message, data),
    info: (message: string, data?: any) => logger.info(namespace, message, data),
    warn: (message: string, data?: any) => logger.warn(namespace, message, data),
    error: (message: string, data?: any) => logger.error(namespace, message, data),
  };
}

export default logger;
