import React, { useEffect, useState, useRef } from 'react';
import { Activity, Heart } from 'lucide-react';
import { VitalCard } from '../components/VitalCard';
import { BluetoothStatus } from '../components/BluetoothStatus';
import { ECGWaveform } from '../components/ECGWaveform';
import { usePolarData } from '../hooks/usePolarData';
interface SessionStartScreenProps {
  onStartSession: () => void;
}
export function SessionStartScreen({
  onStartSession
}: SessionStartScreenProps) {
  // Get real Polar H10 HR data via WebSocket
  const { heartRate, isConnected, error } = usePolarData();

  const [hrStdDev] = useState(8.3); // Placeholder - can calculate from RR in future
  const [countdown, setCountdown] = useState(30);
  const [phase, setPhase] = useState<'measuring' | 'done'>('measuring');
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  // 30-second countdown, then auto-start
  useEffect(() => {
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          setPhase('done');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownIntervalRef.current)
      clearInterval(countdownIntervalRef.current);
    };
  }, []);
  // Auto-start 1s after measurement completes
  useEffect(() => {
    if (phase !== 'done') return;
    const delay = setTimeout(() => onStartSession(), 1000);
    return () => clearTimeout(delay);
  }, [phase, onStartSession]);
  const progressPct = (30 - countdown) / 30 * 100;
  return (
    <div className="min-h-screen w-full ecg-grid-bg text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-medical-grid">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-medical-cyan/10 border border-medical-cyan/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-medical-cyan" />
          </div>
          <div>
            <h1 className="text-base font-bold text-medical-cyan font-mono tracking-wider">
              HRV ADAPTIVE RHYTHM
            </h1>
            <p className="text-xs text-gray-500">Baseline Measurement</p>
          </div>
        </div>
        <BluetoothStatus isConnected={isConnected} />
      </header>

      <main className="flex-1 px-4 py-6 flex flex-col gap-6 max-w-md mx-auto w-full">
        {/* Countdown ring + status */}
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative w-28 h-28">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              {/* Track */}
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="rgba(0,217,255,0.1)"
                strokeWidth="8" />
              
              {/* Progress */}
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke={phase === 'done' ? '#00ff88' : '#00d9ff'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - progressPct / 100)}`}
                style={{
                  transition: 'stroke-dashoffset 1s linear, stroke 0.5s'
                }} />
              
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {phase === 'measuring' ?
              <>
                  <span className="text-3xl font-mono font-bold text-medical-cyan">
                    {countdown}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">sec</span>
                </> :

              <Heart className="w-10 h-10 text-medical-green animate-pulse" />
              }
            </div>
          </div>

          <div className="text-center">
            {phase === 'measuring' ?
            <>
                <p className="text-sm font-mono font-bold text-medical-cyan tracking-widest">
                  {isConnected ? 'MEASURING' : 'WAITING FOR DEVICE'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {error ? error : 'Please remain still and relaxed'}
                </p>
              </> :

            <>
                <p className="text-sm font-mono font-bold text-medical-green tracking-widest">
                  BASELINE COMPLETE
                </p>
                <p className="text-xs text-gray-500 mt-1">Starting session…</p>
              </>
            }
          </div>
        </div>

        {/* Live HR + SD HR cards */}
        <section aria-label="Heart Rate Metrics">
          <h3 className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Heart Rate Baseline
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <VitalCard
              label="Heart Rate"
              value={`${heartRate || '--'}`}
              unit="bpm"
              color="cyan"
              icon="heart" />
            
            <VitalCard
              label="SD of HR"
              value={`±${hrStdDev}`}
              unit="bpm"
              color="purple"
              icon="activity" />
            
          </div>
        </section>

        {/* Live ECG */}
        <section aria-label="ECG Waveform">
          <h3 className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest mb-2">
            ECG Waveform
          </h3>
          <ECGWaveform isConnected={isConnected} heartRate={heartRate} />
        </section>
      </main>
    </div>);

}
