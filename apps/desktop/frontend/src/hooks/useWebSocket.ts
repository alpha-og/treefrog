import { useEffect, useRef } from "react";
import { isWails } from "../utils/env";
import { createLogger } from "../utils/logger";

const log = createLogger("WebSocket");

export function useWebSocket(onMsg: (d: any) => void) {
  const onMsgRef = useRef(onMsg);

  useEffect(() => {
    onMsgRef.current = onMsg;
  }, [onMsg]);

  useEffect(() => {
    if (isWails()) {
      log.info("Setting up Wails Events for build status");
      let unsubscribe: (() => void) | null = null;
      
      const setupWailsEvents = () => {
        try {
          const wailsRuntime = (window as any).wails?.runtime;
          
          if (wailsRuntime?.EventsOn) {
            log.debug("Connected to Wails runtime EventsOn");
            unsubscribe = wailsRuntime.EventsOn("build-status", (data: any) => {
              log.debug("Received build status event", { state: data?.state });
              onMsgRef.current(data);
            });
            return;
          }
          
          const globalRuntime = (window as any).runtime;
          if (globalRuntime?.EventsOn) {
            log.debug("Connected to global runtime EventsOn");
            unsubscribe = globalRuntime.EventsOn("build-status", (data: any) => {
              log.debug("Received build status event", { state: data?.state });
              onMsgRef.current(data);
            });
            return;
          }
          
          log.warn("Wails runtime not available, build status updates may not work");
        } catch (err) {
          log.error("Failed to setup Wails events", err);
        }
      };
      
      setupWailsEvents();
      
      return () => {
        if (unsubscribe) {
          log.debug("Unsubscribing from Wails events");
          unsubscribe();
        }
      };
    }

    log.info("Not in Wails mode, build status via polling");
    return;
  }, []);
}
