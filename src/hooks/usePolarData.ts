import { useEffect, useState, useRef, useCallback } from 'react';

export interface PolarData {
  heartRate: number;
  hrv: number; // RMSSD in milliseconds
  rr_intervals: number[];
  isConnected: boolean;
  error: string | null;
}

interface WebSocketMessage {
  type: 'heart_data' | 'connection_status';
  hr?: number;
  rr_intervals?: number[];
  rmssd?: number;
  connected?: boolean;
  reason?: string;
  timestamp?: number;
}

const WS_URL = 'ws://localhost:8765';
const RECONNECT_DELAY_MS = 3000;
const CONNECTION_TIMEOUT_MS = 5000;
const MAX_RECONNECT_ATTEMPTS = 10;

export function usePolarData(): PolarData {
  const [heartRate, setHeartRate] = useState(0);
  const [hrv, setHrv] = useState(0);
  const [rrIntervals, setRrIntervals] = useState<number[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    // Clear any pending reconnect attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Clear connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }

    try {
      console.log('[v0] Attempting WebSocket connection to', WS_URL);
      const ws = new WebSocket(WS_URL);

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log('[v0] Connection timeout - closing');
          ws.close();
          setError('Connection timeout');
          setIsConnected(false);
          scheduleReconnect();
        }
      }, CONNECTION_TIMEOUT_MS);

      ws.onopen = () => {
        console.log('[v0] WebSocket connected');
        clearTimeout(connectionTimeoutRef.current!);
        wsRef.current = ws;
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('[v0] Received message type:', message.type);

          if (message.type === 'heart_data') {
            // Update heart rate and HRV data
            if (message.hr !== undefined) {
              setHeartRate(message.hr);
            }
            if (message.rmssd !== undefined) {
              setHrv(message.rmssd);
            }
            if (message.rr_intervals) {
              setRrIntervals(message.rr_intervals);
            }
            // Bluetooth device is sending data
            setIsConnected(true);
            setError(null);
          } else if (message.type === 'connection_status') {
            console.log('[v0] Connection status:', message.connected, message.reason);
            setIsConnected(message.connected || false);
            if (!message.connected && message.reason) {
              setError(message.reason);
            }
          }
        } catch (err) {
          console.error('[v0] Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[v0] WebSocket error:', event);
        setError('WebSocket error');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('[v0] WebSocket closed');
        wsRef.current = null;
        if (!isConnected) {
          // Only try to reconnect if we were previously connected
          // or if reconnection attempts haven't exceeded the limit
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            scheduleReconnect();
          } else {
            setError('Max reconnection attempts reached');
          }
        }
      };
    } catch (err) {
      console.error('[v0] Error creating WebSocket:', err);
      setError(String(err));
      scheduleReconnect();
    }
  }, [isConnected]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectAttemptsRef.current += 1;
    console.log(
      `[v0] Scheduling reconnect attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}...`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, RECONNECT_DELAY_MS);
  }, [connect]);

  // Initialize connection on mount
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    heartRate,
    hrv,
    rr_intervals: rrIntervals,
    isConnected,
    error
  };
}
