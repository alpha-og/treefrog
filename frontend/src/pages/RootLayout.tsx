import { Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { getConfig } from "@/services/configService";
import { createLogger } from "@/utils/logger";

const log = createLogger("RootLayout");

export default function RootLayout() {
  const { _hasHydrated, setCompilerUrl, setCompilerToken, setRendererMode, setRendererPort, setRendererAutoStart, setRendererImageSource, setRendererImageRef, setRendererRemoteUrl, setRendererRemoteToken, setRendererCustomRegistry, setRendererCustomTarPath } = useAppStore();

  // Load config from backend after Zustand hydrates
  useEffect(() => {
    if (!_hasHydrated) return;

    const loadBackendConfig = async () => {
      try {
        const config = await getConfig();
        log.debug("Loaded config from backend", config);

        // Sync compiler settings
        if (config.CompilerURL) {
          setCompilerUrl(config.CompilerURL);
        }
        if (config.CompilerToken) {
          setCompilerToken(config.CompilerToken);
        }

        // Sync renderer settings if available
        if (config.Renderer) {
          setRendererMode(config.Renderer.Mode || "auto");
          setRendererPort(config.Renderer.Port || 8080);
          setRendererAutoStart(config.Renderer.AutoStart || false);
          setRendererImageSource(config.Renderer.ImageSource || "ghcr");
          setRendererImageRef(config.Renderer.ImageRef || "");
          setRendererRemoteUrl(config.Renderer.RemoteURL || "");
          setRendererRemoteToken(config.Renderer.RemoteToken || "");
          setRendererCustomRegistry(config.Renderer.CustomRegistry || "");
          setRendererCustomTarPath(config.Renderer.CustomTarPath || "");
        }
      } catch (err) {
        log.debug("No backend config to load or not in Wails environment", err);
        // This is expected in web-only mode
      }
    };

    loadBackendConfig();
  }, [_hasHydrated, setCompilerUrl, setCompilerToken, setRendererMode, setRendererPort, setRendererAutoStart, setRendererImageSource, setRendererImageRef, setRendererRemoteUrl, setRendererRemoteToken, setRendererCustomRegistry, setRendererCustomTarPath]);

  return (
    <div className="w-full h-full flex flex-col">
      <Outlet />
    </div>
  );
}
