import { useState, useEffect, useRef } from 'react';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface TelemetryData {
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  heartRate: number;
  hrv: number;       
  sdnn: number;
  pnn50: number;
  avgRR: number;
  sdHr: number;
  artifactPct: number;
  latestRR: number[]; 
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const connect = () => {
      if (wsRef.current && wsRef.current.readyState < 2) return;
      
      const ws = new WebSocket('ws://localhost:8765');
      wsRef.current = ws;

      setData(prev => ({ ...prev, connectionStatus: 'connecting' }));

      ws.onopen = () => {
        console.log("WebSocket connection established. Waiting for data...");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.status === "DISCONNECTED") {
            setData(prev => ({ ...prev, connectionStatus: 'disconnected' }));
            if (watchdogRef.current) clearTimeout(watchdogRef.current);
            return;
          }

          if (payload.heartRate && payload.heartRate > 0) {
            if (watchdogRef.current) clearTimeout(watchdogRef.current);
            
            watchdogRef.current = setTimeout(() => {
              console.warn("UI Watchdog: No valid data for 3s. Assuming disconnected.");
              setData(prev => ({ ...prev, connectionStatus: 'disconnected' }));
            }, 3000);

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
        }
      };

      ws.onclose = () => {
        setData(prev => ({ ...prev, connectionStatus: 'disconnected' }));
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        timeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
        ws.close();
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  return {
    ...data,
    isConnected: data.connectionStatus === 'connected',
  };
}