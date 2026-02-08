import { useEffect, useRef } from "react";

export function useWebSocket(onMsg: (d: any) => void) {
  const onMsgRef = useRef(onMsg);

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

        ws.onmessage = (e) => {
          try {
            onMsgRef.current(JSON.parse(e.data));
          } catch { }
        };

        ws.onerror = () => {
          // Silently fail, will reconnect
        };

        ws.onclose = () => {
          // Attempt to reconnect after 3 seconds
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch (err) {
        // Connection failed, retry after delay
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);
}
