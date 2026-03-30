import { useState, useEffect, useRef } from 'react';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface TelemetryData {
  connectionStatus: ConnectionStatus;
  isConnected: boolean; // Derived from connectionStatus for convenience
  heartRate: number;
  hrv: number;       // Mapped from RMSSD
  sdnn: number;
  pnn50: number;
  avgRR: number;
  sdHr: number;
  artifactPct: number;
  latestRR: number[]; // Used for the RR waveform
}

export function useTelemetry(): TelemetryData {
  const [data, setData] = useState<Omit<TelemetryData, 'isConnected'>>({
    connectionStatus: 'connecting',
    heartRate: 0,
    hrv: 0,
    sdnn: 0,
    pnn50: 0,
    avgRR: 0,
    sdHr: 0,
    artifactPct: 0,
    latestRR: [],
  });

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to Python WebSocket server
    const connect = () => {
      // If there's an existing connection, don't create a new one
      if (wsRef.current && wsRef.current.readyState < 2) return;
      
      const ws = new WebSocket('ws://localhost:8765');
      wsRef.current = ws;

      setData(prev => ({ ...prev, connectionStatus: 'connecting' }));

      ws.onopen = () => {
        // We don't assume connection to the *device* is ready here.
        // We wait for the first message with data.
        console.log("WebSocket connection established. Waiting for data...");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.status === "DISCONNECTED") {
            setData(prev => ({ ...prev, connectionStatus: 'disconnected' }));
            return;
          }

          if (payload.heartRate) {
            setData(prev => ({
              ...prev,
              connectionStatus: 'connected',
              heartRate: payload.heartRate,
              hrv: payload.rmssd ?? prev.hrv,
              sdnn: payload.sdnn ?? prev.sdnn,
              pnn50: payload.pnn50 ?? prev.pnn50,
              avgRR: payload.avgRR ?? prev.avgRR,
              sdHr: payload.sdHr ?? prev.sdHr,
              artifactPct: payload.artifactPct ?? prev.artifactPct,
              latestRR: payload.rrIntervals ?? [],
            }));
          }
        } catch (error) {
          console.error("Error parsing telemetry data:", error);
          setData(prev => ({ ...prev, connectionStatus: 'disconnected' }));
        }
      };

      ws.onclose = () => {
        setData(prev => ({ ...prev, connectionStatus: 'disconnected' }));
        console.log("WebSocket closed. Attempting auto-reconnect...");
        // Attempt auto-reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
        setData(prev => ({ ...prev, connectionStatus: 'disconnected' }));
        // onclose will be called next, which handles reconnect logic
        ws.close();
      };
    };

    connect();

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        // Remove the onclose handler to prevent reconnect attempts on unmount
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  return {
    ...data,
    isConnected: data.connectionStatus === 'connected',
  };
}