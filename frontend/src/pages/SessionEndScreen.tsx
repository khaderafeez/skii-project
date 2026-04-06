import React, { useState } from 'react';
import { Activity, RotateCcw, Printer, CheckCircle, LogOut } from 'lucide-react';
import { VitalCard } from '../components/VitalCard';
import { TelemetryData } from '../hooks/useTelemetry';

interface SessionEndScreenProps {
  onNewSession: () => void;
  onRestart: () => void;
  telemetryData: TelemetryData; // Added real data prop
}

const getEmoji = (val: number) => {
  if (val <= 20) return { emoji: '😞', label: 'Very Poor', color: '#ff3366' };
  if (val <= 40) return { emoji: '😕', label: 'Poor', color: '#ff8c42' };
  if (val <= 60) return { emoji: '😐', label: 'Neutral', color: '#ffd166' };
  if (val <= 80) return { emoji: '🙂', label: 'Good', color: '#06d6a0' };
  return { emoji: '😄', label: 'Excellent', color: '#00ff88' };
};

export function SessionEndScreen({ onNewSession, onRestart, telemetryData }: SessionEndScreenProps) {
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [sliderValue, setSliderValue] = useState(50);
  const mood = getEmoji(sliderValue);
  const handlePrint = () => window.print();

  // Extract the finalized data
  const { heartRate, hrv, sdHr, avgRR, pnn50, sdnn, artifactPct } = telemetryData;

  if (!feedbackDone) {
    return (
      <div className="min-h-screen w-full ecg-grid-bg text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col items-center gap-8">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-medical-cyan/10 border-2 border-medical-cyan flex items-center justify-center mb-4">
              <Activity className="w-7 h-7 text-medical-cyan" />
            </div>
            <h1 className="text-xl font-bold text-medical-cyan font-mono tracking-wider">HRV ADAPTIVE RHYTHM</h1>
            <p className="text-xs text-gray-500 mt-1">Session Complete — How do you feel?</p>
          </div>

          <div className="text-8xl select-none transition-all duration-300" style={{ filter: `drop-shadow(0 0 20px ${mood.color}60)` }}>
            {mood.emoji}
          </div>

          <div className="text-center">
            <p className="text-2xl font-mono font-bold transition-all duration-300" style={{ color: mood.color }}>{mood.label}</p>
            <p className="text-4xl font-mono font-bold text-white mt-1">{sliderValue}</p>
            <p className="text-xs text-gray-500 mt-1">out of 100</p>
          </div>

          <div className="w-full px-2">
            <div className="flex justify-between text-lg mb-3 select-none">
              <span>😞</span><span>😕</span><span>😐</span><span>🙂</span><span>😄</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={sliderValue}
              onChange={(e) => setSliderValue(Number(e.target.value))}
              className="w-full h-3 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${mood.color} 0%, ${mood.color} ${sliderValue}%, rgba(0,217,255,0.15) ${sliderValue}%, rgba(0,217,255,0.15) 100%)`,
                accentColor: mood.color
              }} 
            />
            <div className="flex justify-between text-xs text-gray-600 font-mono mt-1">
              <span>1</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
          </div>

          <button
            onClick={() => setFeedbackDone(true)}
            className="w-full py-4 rounded-lg font-mono font-bold text-medical-bg text-lg transition-colors"
            style={{ backgroundColor: mood.color }}>
            SUBMIT FEEDBACK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full ecg-grid-bg text-white flex flex-col print:bg-white print:text-gray-900">
      <header className="flex items-center justify-between px-4 py-3 border-b border-medical-grid print:border-gray-300">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-medical-cyan/10 border border-medical-cyan/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-medical-cyan" />
          </div>
          <div>
            <h1 className="text-base font-bold text-medical-cyan font-mono tracking-wider print:text-gray-900">SESSION COMPLETE</h1>
            <p className="text-xs text-gray-500">HRV Adaptive Rhythm — Report</p>
          </div>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <div className="w-2 h-2 rounded-full bg-medical-green" />
          <span className="text-xs text-medical-green font-mono">DONE</span>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 flex flex-col gap-4 max-w-2xl mx-auto w-full overflow-y-auto">
        <div className="flex items-center gap-3 bg-medical-green/10 border border-medical-green/30 rounded-lg px-4 py-3 print:bg-green-50">
          <CheckCircle className="w-5 h-5 text-medical-green flex-shrink-0" />
          <div className="flex-1">
            <p className="font-mono font-bold text-medical-green text-sm">Session Completed Successfully</p>
            <p className="text-xs text-gray-500 mt-0.5">All data recorded.</p>
          </div>
          <div className="text-right">
            <p className="text-2xl">{getEmoji(sliderValue).emoji}</p>
            <p className="text-xs font-mono font-bold" style={{ color: getEmoji(sliderValue).color }}>{sliderValue}/100</p>
          </div>
        </div>

        <div className="bg-medical-bg-secondary border border-medical-grid rounded-lg p-4 print:bg-gray-50">
          <h2 className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest mb-3">Session Info</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-0.5">Date</p>
              <p className="font-mono font-semibold text-medical-cyan print:text-gray-900">
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-0.5">Wellbeing Score</p>
              <p className="font-mono font-semibold" style={{ color: getEmoji(sliderValue).color }}>
                {sliderValue}/100 {getEmoji(sliderValue).emoji}
              </p>
            </div>
          </div>
        </div>

        <section aria-label="Primary Vitals Summary">
          <h3 className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest mb-2">Primary Vitals</h3>
          <div className="grid grid-cols-3 gap-2">
            <VitalCard label="Final HR" value={`${heartRate || '--'}`} unit="bpm" color="cyan" icon="heart" />
            <VitalCard label="HRV (RMSSD)" value={`${hrv || '--'}`} unit="ms" color="green" icon="activity" />
            <VitalCard label="SD HR" value={sdHr ? `±${sdHr}` : '--'} unit="bpm" color="purple" icon="activity" />
          </div>
        </section>

        <section aria-label="HRV Summary">
          <h3 className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest mb-2">HRV Summary</h3>
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

        <section aria-label="Actions" className="mt-auto pt-2 print:hidden">
          <div className="grid grid-cols-3 gap-2">
            <button onClick={onNewSession} className="py-3 rounded-lg border border-medical-grid bg-medical-bg-secondary hover:bg-medical-grid text-gray-300 font-mono font-bold text-sm transition-colors flex items-center justify-center gap-1.5">
              <LogOut className="w-4 h-4" /> FINISH
            </button>
            <button onClick={onRestart} className="py-3 rounded-lg border border-medical-cyan/40 bg-medical-cyan/5 hover:bg-medical-cyan/10 text-medical-cyan font-mono font-bold text-sm transition-colors flex items-center justify-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> RESTART
            </button>
            <button onClick={handlePrint} className="py-3 rounded-lg bg-medical-cyan text-medical-bg font-mono font-bold text-sm hover:bg-medical-cyan/90 transition-colors flex items-center justify-center gap-1.5">
              <Printer className="w-4 h-4" /> PRINT
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}