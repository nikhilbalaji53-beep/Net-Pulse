import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebSocket(onEvent) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  // Request browser notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // Connect to /api/ws (proxied by Vite or direct in prod)
    const wsUrl = `${protocol}//${host}/api/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onEventRef.current) {
            onEventRef.current(data);
          }

          // Trigger browser notification for alerts if permitted
          if (data.type === 'alert_triggered' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('NetPulse Alert', {
              body: data.alert?.message || 'Network alert triggered',
              icon: '/favicon.ico',
            });
          }
        } catch (e) {
          // May be plain text keep-alive
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    }
  }, []);

  useEffect(() => {
    connect();

    // Ping every 25 seconds to keep connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return { isConnected };
}
