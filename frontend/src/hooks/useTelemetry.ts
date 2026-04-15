import { useState, useEffect, useRef } from 'react';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface ClientContext {
  title?: string;
  pathname?: string;
  userDetails?: { GroupType?: string };
}

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
  musicCategory: string | null;
  resetSession: () => void;
}

export function useTelemetry(context?: ClientContext): TelemetryData {
  const [data, setData] = useState<Omit<TelemetryData, 'isConnected' | 'resetSession'>>({
    connectionStatus: 'connecting',
    heartRate: 0,
    hrv: 0,
    sdnn: 0,
    pnn50: 0,
    avgRR: 0,
    sdHr: 0,
    artifactPct: 0,
    latestRR: [],
    musicCategory: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);
  const lastRmssdRef = useRef<number | null>(null);
  const lastSubcategoryRef = useRef<string | null>(null);

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
          
          if (payload.type === "STATUS" && payload.status === "DISCONNECTED") {
            setData(prev => ({ ...prev, connectionStatus: 'disconnected' }));
            if (watchdogRef.current) clearTimeout(watchdogRef.current);
            return;
          }

          if (payload.type === "LIVE_TELEMETRY" && payload.heartRate > 0) {
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

          if (payload.type === "HRV_EPOCH" && payload.data) {
            console.log("[Data] Processed Epoch Received:", payload.data);

            let newMusicCategory = lastSubcategoryRef.current;
            const rawRmssd = payload.data.rmssd;
            const parsedRmssd = Number.parseFloat(String(rawRmssd));
            const hasValidRmssd = rawRmssd !== null && rawRmssd !== undefined && Number.isFinite(parsedRmssd);

            if (
              context?.title === "Cancer" &&
              context?.pathname?.includes("skitiiorg") &&
              context?.userDetails?.GroupType !== "Control" &&
              hasValidRmssd
            ) {
              const rmssd = parsedRmssd;
              let subcategoryValue = "Grounding";

              if (rmssd < 20) {
                subcategoryValue = "Grounding";
              } else if (rmssd >= 20 && rmssd < 35) {
                subcategoryValue = "Calming";
              } else if (rmssd >= 35 && rmssd < 55) {
                subcategoryValue = "Restorative";
              } else if (rmssd >= 55) {
                subcategoryValue = "Uplifting";
              }

              const lastRmssd = lastRmssdRef.current;
              const percentChange = lastRmssd
                ? Math.abs(rmssd - lastRmssd) / lastRmssd
                : 1;

              const subcategoryChanged = subcategoryValue !== lastSubcategoryRef.current;
              const rmssdChangedEnough = percentChange >= 0.2;

              if (subcategoryChanged && rmssdChangedEnough) {
                newMusicCategory = subcategoryValue;
                lastSubcategoryRef.current = subcategoryValue;
                console.log(`[Audio Algo] Category switched to: ${subcategoryValue}`);
              }

              lastRmssdRef.current = rmssd;
            }

            setData(prev => ({
              ...prev,
              hrv: hasValidRmssd ? parsedRmssd : prev.hrv,
              sdnn: payload.data.sdnn ?? prev.sdnn,
              pnn50: payload.data.pnn50 ?? prev.pnn50,
              avgRR: payload.data.avgRR ?? prev.avgRR,
              sdHr: payload.data.sdHr ?? prev.sdHr,   
              artifactPct: payload.data.artifactPct ?? prev.artifactPct,
              musicCategory: newMusicCategory,
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
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, [context?.title, context?.pathname, context?.userDetails?.GroupType]);

  const resetSession = () => {
    lastRmssdRef.current = null;
    lastSubcategoryRef.current = null;

    setData(prev => ({
      ...prev,
      hrv: 0,
      sdnn: 0,
      pnn50: 0,
      avgRR: 0,
      sdHr: 0,
      artifactPct: 0,
      latestRR: [],
      musicCategory: null,
    }));
  };

  return {
    ...data,
    isConnected: data.connectionStatus === 'connected',
    resetSession, 
  };
}
