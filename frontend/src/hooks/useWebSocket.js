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
    let wsUrl;
    let custom = null;
    if (typeof window !== 'undefined') {
      custom = localStorage.getItem('netpulse_backend_url');
    }
    const envUrl = custom || import.meta.env.VITE_API_URL;

    if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
      const clean = envUrl.trim().replace(/\/+$/, '');
      const wsProtocol = clean.startsWith('https') ? 'wss:' : 'ws:';
      const cleanHost = clean.replace(/^https?:\/\//, '');
      const wsHost = cleanHost.endsWith('/api') ? cleanHost : `${cleanHost}/api`;
      wsUrl = `${wsProtocol}//${wsHost}/ws`;
    } else if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}/api/ws`;
    } else {
      return;
    }

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
        // Auto-reconnect after 4 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 4000);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch (_) {}
      };
    } catch (err) {
      console.warn('WebSocket connection error:', err);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 4000);
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
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch (_) {}
      }
    };
  }, [connect]);

  return { isConnected };
}
