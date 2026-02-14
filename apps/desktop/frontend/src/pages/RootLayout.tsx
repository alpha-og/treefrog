import { Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { getConfig } from "@/services/configService";
import { createLogger } from "@/utils/logger";
import type { RendererMode, ImageSource } from "@/types";

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

        if (config.compilerUrl) {
          setCompilerUrl(config.compilerUrl);
        }
        if (config.compilerToken) {
          setCompilerToken(config.compilerToken);
        }

        if (config.renderer) {
          setRendererMode((config.renderer.mode || "auto") as RendererMode);
          setRendererPort(config.renderer.port || 8080);
          setRendererAutoStart(config.renderer.autoStart || false);
          setRendererImageSource((config.renderer.imageSource || "ghcr") as ImageSource);
          setRendererImageRef(config.renderer.imageRef || "");
          setRendererRemoteUrl(config.renderer.remoteUrl || "");
          setRendererRemoteToken(config.renderer.remoteToken || "");
          setRendererCustomRegistry(config.renderer.customRegistry || "");
          setRendererCustomTarPath(config.renderer.customTarPath || "");
        }
      } catch (err) {
        log.debug("No backend config to load or not in Wails environment", err);
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
