import React, { useEffect, useState, useRef } from 'react';
import { Activity, StopCircle, RefreshCw, Music, Clock, AlertTriangle, X } from 'lucide-react';
import { VitalCard } from '../components/VitalCard';
import { BluetoothStatus } from '../components/BluetoothStatus';
import { ECGWaveform } from '../components/ECGWaveform';
import { RRIntervalWaveform } from '../components/RRIntervalWaveform';
import { TelemetryData } from '../hooks/useTelemetry';

interface LiveMonitoringScreenProps {
  onEndSession: () => void;
  onRestart: () => void;
  telemetryData: TelemetryData;
}

export function LiveMonitoringScreen({ onEndSession, onRestart, telemetryData }: LiveMonitoringScreenProps) {
  // Pull live data from the shared telemetry hook via props
  const { 
    isConnected, 
    heartRate, 
    hrv, 
    sdHr, 
    artifactPct, 
    avgRR, 
    pnn50, 
    sdnn,
    latestRR // Added: We need the raw intervals for the waveform!
  } = telemetryData;

  const [sessionTime, setSessionTime] = useState(0);
  const [showStopWarning, setShowStopWarning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const phase: 1 | 2 = sessionTime < 150 ? 1 : 2;

  useEffect(() => {
    // Timer should only run when connected
    if (isConnected) {
      timerRef.current = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
    } else {
      // Clear interval if it exists and we're disconnected
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isConnected]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStopClick = () => setShowStopWarning(true);
  const handleConfirmStop = () => {
    setShowStopWarning(false);
    onEndSession();
  };

  return (
    <div className="min-h-screen w-full bg-medical-bg text-white flex flex-col ecg-grid-bg relative">
      {/* Warning Modal Overlay */}
      {showStopWarning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-medical-bg-secondary border-2 border-medical-red rounded-xl p-6 shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-medical-red/20 border-2 border-medical-red flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-medical-red" />
              </div>
            </div>
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-medical-red font-mono tracking-wider mb-2">WARNING</h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                You will lose all session data if you stop now. This action cannot be undone.
              </p>
              <p className="text-xs text-gray-500 mt-2 font-mono">Do you want to continue?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowStopWarning(false)}
                className="py-3 rounded-lg border border-medical-cyan/40 bg-medical-cyan/5 hover:bg-medical-cyan/10 text-medical-cyan font-mono font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> NO
              </button>
              <button
                onClick={handleConfirmStop}
                className="py-3 rounded-lg bg-medical-red/20 border border-medical-red text-medical-red font-mono font-bold text-sm hover:bg-medical-red/30 transition-colors flex items-center justify-center gap-2"
              >
                <StopCircle className="w-4 h-4" /> YES, STOP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-medical-grid">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-medical-cyan/10 border border-medical-cyan/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-medical-cyan" />
          </div>
          <div>
            <h1 className="text-base font-bold text-medical-cyan font-mono tracking-wider">LIVE MONITORING</h1>
            <p className="text-xs text-gray-500">HRV Monitor</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-medical-cyan">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono text-sm tabular-nums">{formatTime(sessionTime)}</span>
          </div>
          <BluetoothStatus isConnected={isConnected} />
        </div>
      </header>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-medical-bg-secondary border-b border-medical-grid flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Music className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs text-gray-500 uppercase tracking-wider">Music</span>
          <span className="text-xs font-semibold text-purple-300 font-mono">CALMING</span>
        </div>
        <div className="w-px h-3 bg-medical-grid hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Phase</span>
          <div className="flex items-center gap-1">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border transition-all duration-500 ${phase === 1 ? 'bg-medical-cyan/20 border-medical-cyan text-medical-cyan' : 'bg-medical-grid border-medical-grid text-gray-600'}`}>1</span>
            <span className="text-gray-700 text-xs">→</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border transition-all duration-500 ${phase === 2 ? 'bg-medical-green/20 border-medical-green text-medical-green' : 'bg-medical-grid border-medical-grid text-gray-600'}`}>2</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-medical-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-medical-green" />
          </span>
          <span className="text-xs text-medical-green font-mono">REC</span>
        </div>
      </div>

      <ECGWaveform isConnected={isConnected} heartRate={heartRate || 72} />

      <main className="flex-1 px-4 py-4 flex flex-col gap-4 overflow-y-auto">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">RR Interval Variability</p>
          {/* Passed the live array into the component */}
          <RRIntervalWaveform 
            isConnected={isConnected} 
            heartRate={heartRate || 72} 
            rrIntervals={latestRR} 
          />
        </div>

        <section aria-label="Primary Vitals">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Primary Vitals</h3>
          <div className="grid grid-cols-3 gap-2">
            <VitalCard label="Heart Rate" value={`${heartRate || '--'}`} unit="bpm" color="cyan" icon="heart" />
            <VitalCard label="HRV (RMSSD)" value={`${hrv || '--'}`} unit="ms" color="green" icon="activity" />
            <VitalCard label="SD HR" value={sdHr ? `±${sdHr}` : '--'} unit="bpm" color="purple" icon="activity" />
          </div>
        </section>

        <section aria-label="HRV Metrics">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">HRV Metrics</h3>
          <div className="grid grid-cols-2 gap-2">
            <VitalCard label="Avg RR" value={`${avgRR || '--'}`} unit="ms" color="blue" icon="activity" />
            <VitalCard label="PNN50" value={`${pnn50 || '--'}`} unit="%" color="teal" icon="activity" />
            <VitalCard label="SDNN" value={`${sdnn || '--'}`} unit="ms" color="indigo" icon="activity" />
            <VitalCard 
              label="Artifact %" 
              value={`${artifactPct || '0'}`} 
              unit="%" 
              color={artifactPct === 0 ? 'cyan' : artifactPct > 5 ? 'red' : 'orange'} 
              icon="alert" 
            />
          </div>
        </section>
      </main>

      <div className="px-4 pb-4 pt-2 border-t border-medical-grid grid grid-cols-2 gap-3">
        <button onClick={onRestart} className="py-3 rounded-lg border border-medical-cyan/40 bg-medical-cyan/5 hover:bg-medical-cyan/10 text-medical-cyan font-mono font-bold text-sm transition-colors flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4" /> RESTART
        </button>
        <button onClick={handleStopClick} className="py-3 rounded-lg bg-medical-red/20 border border-medical-red text-medical-red font-mono font-bold text-sm hover:bg-medical-red/30 transition-colors flex items-center justify-center gap-2">
          <StopCircle className="w-4 h-4" /> STOP
        </button>
      </div>
    </div>
  );
}