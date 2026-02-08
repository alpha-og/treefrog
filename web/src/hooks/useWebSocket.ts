import { useEffect, useRef } from "react";

export function useWebSocket(onMsg: (d: any) => void) {
  const onMsgRef = useRef(onMsg);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  useEffect(() => {
    onMsgRef.current = onMsg;
  }, [onMsg]);

  useEffect(() => {
    // Construct websocket URL based on current location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsURL = `${protocol}//${window.location.host}/ws/build`;

    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsURL);

        ws.onopen = () => {
          // Reset reconnection attempts on successful connection
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
          // Attempt to reconnect with exponential backoff
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
        // Connection failed, retry after delay with exponential backoff
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
