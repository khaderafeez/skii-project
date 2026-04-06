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
  resetSession: () => void;
}

export function useTelemetry(): TelemetryData {
  // Initialize presentation state variables
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
      
      const host = window.location.hostname;
      const ws = new WebSocket(`ws://${host}:8765`);
      
      wsRef.current = ws;

      setData(prev => ({ ...prev, connectionStatus: 'connecting' }));

      ws.onopen = () => {
        console.log("[Network] WebSocket IPC established. Awaiting telemetry stream...");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          // 1. Connection Fault Branch
          if (payload.type === "STATUS" && payload.status === "DISCONNECTED") {
            setData(prev => ({ ...prev, connectionStatus: 'disconnected' }));
            if (watchdogRef.current) clearTimeout(watchdogRef.current);
            return;
          }

          // 2. High-Frequency Branch (Real-time waveforms & HR)
          if (payload.type === "LIVE_TELEMETRY" && payload.heartRate > 0) {
            // Reset hardware dropout watchdog
            if (watchdogRef.current) clearTimeout(watchdogRef.current);
            watchdogRef.current = setTimeout(() => {
              console.warn("[Watchdog] IPC timeout. Transitioning to disconnected state.");
              setData(prev => ({ ...prev, connectionStatus: 'disconnected' }));
            }, 3000);

            setData(prev => ({
              ...prev,
              connectionStatus: 'connected',
              heartRate: payload.heartRate,
              latestRR: payload.rrIntervals ?? [],
            }));
          }

          // 3. Low-Frequency Branch (150s Epoch Processed Metrics)
          if (payload.type === "HRV_EPOCH" && payload.data) {
            console.log("[Data] Processed Epoch Received:", payload.data);
            setData(prev => ({
              ...prev,
              hrv: payload.data.rmssd ?? prev.hrv,
              sdnn: payload.data.sdnn ?? prev.sdnn,
              pnn50: payload.data.pnn50 ?? prev.pnn50,
              avgRR: payload.data.avgRR ?? prev.avgRR,
              sdHr: payload.data.sdHr ?? prev.sdHr,   
              artifactPct: payload.data.artifactPct ?? prev.artifactPct,
            }));
          }

        } catch (error) {
          console.error("[Parse Error] Unrecognized IPC payload structure:", error);
        }
      };

      ws.onclose = () => {
        setData(prev => ({ ...prev, connectionStatus: 'disconnected' }));
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        // Implement exponential backoff or standard 3s reconnect loop
        timeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("[Network Error] WebSocket failure:", err);
        ws.close();
      };
    };

    connect();

    return () => {
      // Memory cleanup & IPC socket teardown on component unmount
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  const resetSession = () => {
    setData(prev => ({
      ...prev,
      hrv: 0,
      sdnn: 0,
      pnn50: 0,
      avgRR: 0,
      sdHr: 0,
      artifactPct: 0,
      latestRR: [],
    }));
  };

  return {
    ...data,
    isConnected: data.connectionStatus === 'connected',
    resetSession, 
  };
}