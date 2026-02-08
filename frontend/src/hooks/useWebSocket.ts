import { useEffect, useRef } from "react";
import { isWails } from "../utils/env";

export function useWebSocket(onMsg: (d: any) => void) {
  const onMsgRef = useRef(onMsg);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  useEffect(() => {
    onMsgRef.current = onMsg;
  }, [onMsg]);

  useEffect(() => {
    // Wails mode: use Events API
    if (isWails()) {
      let unsubscribe: (() => void) | null = null;
      
      // Use eval to prevent build-time analysis of the import
      const setupWailsEvents = () => {
        try {
          // Check if runtime is available on window (injected by Wails)
          const wailsRuntime = (window as any).wails?.runtime;
          
          if (wailsRuntime?.EventsOn) {
            unsubscribe = wailsRuntime.EventsOn("build-status", (data: any) => {
              onMsgRef.current(data);
            });
            return;
          }
          
          // Try to load from global scope
          const globalRuntime = (window as any).runtime;
          if (globalRuntime?.EventsOn) {
            unsubscribe = globalRuntime.EventsOn("build-status", (data: any) => {
              onMsgRef.current(data);
            });
            return;
          }
          
          console.warn("Wails runtime not available, build status updates may not work");
        } catch (err) {
          console.error("Failed to setup Wails events:", err);
        }
      };
      
      setupWailsEvents();
      
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }

    // Web mode: use WebSocket
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsURL = `${protocol}//${window.location.host}/ws/build`;

    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsURL);

        ws.onopen = () => {
          reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (e) => {
          try {
            onMsgRef.current(JSON.parse(e.data));
          } catch (err) {
            console.error("Failed to parse WebSocket message:", err);
          }
        };

        ws.onerror = (event) => {
          console.error("WebSocket error:", event);
        };

        ws.onclose = () => {
          reconnectAttemptsRef.current += 1;

          if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
            const backoffDelay = Math.min(
              1000 + reconnectAttemptsRef.current * 500,
              10000
            );
            reconnectTimeout = setTimeout(connect, backoffDelay);
          } else {
            console.warn(
              "WebSocket reconnection failed after max attempts. Build status updates will be unavailable."
            );
          }
        };
      } catch (err) {
        console.error("Failed to create WebSocket:", err);
        reconnectAttemptsRef.current += 1;

        if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
          const backoffDelay = Math.min(
            1000 + reconnectAttemptsRef.current * 500,
            10000
          );
          reconnectTimeout = setTimeout(connect, backoffDelay);
        }
      }
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);
}
