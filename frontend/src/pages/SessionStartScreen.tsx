import React, { useEffect, useState, useRef } from 'react';
import { Activity, Heart, Wifi, WifiOff, Loader } from 'lucide-react';
import { VitalCard } from '../components/VitalCard';
import { BluetoothStatus } from '../components/BluetoothStatus';
import { ECGWaveform } from '../components/ECGWaveform';
import { TelemetryData } from '../hooks/useTelemetry';

interface SessionStartScreenProps {
  onStartSession: () => void;
  telemetryData: TelemetryData;
}

type Phase = 'connecting' | 'disconnected' | 'measuring' | 'done';

// A new sub-component to render the status indicator
function MeasurementStatus({ phase, countdown }: { phase: Phase, countdown: number }) {
  const statusMap = {
    connecting: {
      icon: <Loader className="w-10 h-10 text-medical-blue animate-spin" />,
      title: "CONNECTING",
      subtitle: "Attempting to link with the sensor...",
      color: "text-medical-blue",
    },
    disconnected: {
      icon: <WifiOff className="w-10 h-10 text-medical-red" />,
      title: "DISCONNECTED",
      subtitle: "Check sensor & Bluetooth. Retrying...",
      color: "text-medical-red",
    },
    measuring: {
      icon: (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-mono font-bold text-medical-cyan">{countdown}</span>
          <span className="text-xs text-gray-500 font-mono">sec</span>
        </div>
      ),
      title: "MEASURING",
      subtitle: "Please remain still and relaxed",
      color: "text-medical-cyan",
    },
    done: {
      icon: (
        <div className="absolute inset-0 flex items-center justify-center">
          <Heart className="w-10 h-10 text-medical-green animate-pulse" />
        </div>
      ),
      title: "BASELINE COMPLETE",
      subtitle: "Starting session…",
      color: "text-medical-green",
    }
  };

  const currentStatus = statusMap[phase];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* The icon for measuring/done is inside the circle, others are outside */}
      {phase !== 'measuring' && phase !== 'done' && (
         <div className="w-28 h-28 flex items-center justify-center">
            {currentStatus.icon}
        </div>
      )}
      
      {/* Text part is always outside */}
      <div className="text-center">
        <p className={`text-sm font-mono font-bold ${currentStatus.color} tracking-widest`}>{currentStatus.title}</p>
        <p className="text-xs text-gray-500 mt-1">{currentStatus.subtitle}</p>
      </div>
    </div>
  );
}


export function SessionStartScreen({ onStartSession, telemetryData }: SessionStartScreenProps) {
  const { heartRate, sdHr, isConnected, connectionStatus } = telemetryData;
  
  const [countdown, setCountdown] = useState(30);
  const [phase, setPhase] = useState<Phase>('connecting');
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (connectionStatus === 'connected' && phase !== 'measuring' && phase !== 'done') {
      setPhase('measuring');
    } else if (connectionStatus === 'disconnected' && phase !== 'done') {
      setPhase('disconnected');
    } else if (connectionStatus === 'connecting' && phase !== 'done') {
      setPhase('connecting');
    }
  }, [connectionStatus, phase]);


  // Countdown timer, only runs when in 'measuring' phase
  useEffect(() => {
    if (phase !== 'measuring') {
      return;
    }
    
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
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [phase]);

  // Auto-start 1s after measurement completes
  useEffect(() => {
    if (phase !== 'done') return;
    const delay = setTimeout(() => onStartSession(), 1000);
    return () => clearTimeout(delay);
  }, [phase, onStartSession]);

  const progressPct = phase === 'measuring' ? ((30 - countdown) / 30) * 100 : 0;

  return (
    <div className="min-h-screen w-full ecg-grid-bg text-white flex flex-col">
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
        <div className="flex flex-col items-center gap-4 py-4">
          
          {(phase === 'measuring' || phase === 'done') && (
            <div className="relative w-28 h-28 mb-2">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(0,217,255,0.1)" strokeWidth="8" />
                {phase === 'measuring' && (
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke={'#00d9ff'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - progressPct / 100)}`}
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
                  />
                )}
                {phase === 'done' && (
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke={'#00ff88'}
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                )}
              </svg>
              {phase === 'measuring' && statusMap.measuring.icon}
              {phase === 'done' && statusMap.done.icon}
            </div>
          )}

          <MeasurementStatus phase={phase} countdown={countdown} />
        </div>

        <section aria-label="Heart Rate Metrics">
          <h3 className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Heart Rate Baseline
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <VitalCard label="Heart Rate" value={`${heartRate || '--'}`} unit="bpm" color="cyan" icon="heart" />
            <VitalCard label="SD of HR" value={sdHr ? `±${sdHr}` : '--'} unit="bpm" color="purple" icon="activity" />
          </div>
        </section>

        <section aria-label="ECG Waveform">
          <h3 className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest mb-2">
            ECG Waveform
          </h3>
          <ECGWaveform isConnected={isConnected} heartRate={heartRate || 72} />
        </section>
      </main>
    </div>
  );
}