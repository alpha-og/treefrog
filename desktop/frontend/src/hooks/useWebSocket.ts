import { useEffect, useRef } from "react";
import { isWails } from "../utils/env";
import { useAppStore } from "../stores/appStore";
import { createLogger } from "../utils/logger";

const log = createLogger("WebSocket");

export function useWebSocket(onMsg: (d: any) => void) {
  const onMsgRef = useRef(onMsg);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const { apiUrl } = useAppStore();

  useEffect(() => {
    onMsgRef.current = onMsg;
  }, [onMsg]);

  useEffect(() => {
    // Wails mode: use Events API
    if (isWails()) {
      log.info("Setting up Wails Events for build status");
      let unsubscribe: (() => void) | null = null;
      
      // Use eval to prevent build-time analysis of the import
      const setupWailsEvents = () => {
        try {
          // Check if runtime is available on window (injected by Wails)
          const wailsRuntime = (window as any).wails?.runtime;
          
          if (wailsRuntime?.EventsOn) {
            log.debug("Connected to Wails runtime EventsOn");
            unsubscribe = wailsRuntime.EventsOn("build-status", (data: any) => {
              log.debug("Received build status event", { state: data?.state });
              onMsgRef.current(data);
            });
            return;
          }
          
          // Try to load from global scope
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

    // Web mode: use WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Construct WebSocket URL from apiUrl (replace /api with /ws/build)
    const baseURL = apiUrl.startsWith("http") ? apiUrl : `${window.location.protocol}//${window.location.host}${apiUrl}`;
    const wsURL = baseURL
      .replace(/^https?:/, protocol === "wss:" ? "wss:" : "ws:")
      .replace(/\/api\/?$/, "/ws/build");

    log.info(`Connecting to WebSocket at ${wsURL}`);

    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        log.debug("Attempting WebSocket connection");
        ws = new WebSocket(wsURL);

        ws.onopen = () => {
          log.info("WebSocket connected");
          reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            log.debug("WebSocket message received", { type: data?.type });
            onMsgRef.current(data);
          } catch (err) {
            log.error("Failed to parse WebSocket message", err);
          }
        };

        ws.onerror = (event) => {
          log.error("WebSocket error", event);
        };

        ws.onclose = () => {
          log.info("WebSocket disconnected");
          reconnectAttemptsRef.current += 1;

          if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
            const backoffDelay = Math.min(
              1000 + reconnectAttemptsRef.current * 500,
              10000
            );
            log.debug(`Reconnecting in ${backoffDelay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            reconnectTimeout = setTimeout(connect, backoffDelay);
          } else {
            log.warn(
              "WebSocket reconnection failed after max attempts. Build status updates will be unavailable."
            );
          }
        };
      } catch (err) {
        log.error("Failed to create WebSocket", err);
        reconnectAttemptsRef.current += 1;

        if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
          const backoffDelay = Math.min(
            1000 + reconnectAttemptsRef.current * 500,
            10000
          );
          log.debug(`Retrying in ${backoffDelay}ms`);
          reconnectTimeout = setTimeout(connect, backoffDelay);
        }
      }
    };

    connect();

    return () => {
      if (ws) {
        log.debug("Closing WebSocket");
        ws.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [apiUrl]);
}
