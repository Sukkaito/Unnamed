import { useEffect, useRef, useState } from 'react';

export function useWebSocket(url: string) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const connect = () => {
      const websocket = new WebSocket(url);
      
      websocket.onopen = () => {
        console.log('Connected to game server');
        setIsConnected(true);
        setWs(websocket);
      };

      websocket.onclose = () => {
        console.log('Disconnected from server');
        setIsConnected(false);
        setWs(null);
        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [url]);

  return { ws, isConnected };
}

