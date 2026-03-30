import React from 'react';
import { Activity } from 'lucide-react';
export type Theme = 'cyan' | 'amber' | 'violet';
interface ThemeSelectorProps {
  currentTheme: Theme;
  onSelectTheme: (theme: Theme) => void;
  onContinue: () => void;
}
const themes: {
  id: Theme;
  name: string;
  tagline: string;
  accent: string;
  bg: string;
  secondary: string;
  grid: string;
  green: string;
}[] = [
{
  id: 'cyan',
  name: 'NEURAL',
  tagline: 'Clinical Cyan',
  accent: '#00d9ff',
  bg: '#0a0a0a',
  secondary: '#121212',
  grid: 'rgba(0,217,255,0.12)',
  green: '#00ff88'
},
{
  id: 'amber',
  name: 'EMBER',
  tagline: 'Warm Amber',
  accent: '#f59e0b',
  bg: '#0c0800',
  secondary: '#160f00',
  grid: 'rgba(245,158,11,0.12)',
  green: '#84cc16'
},
{
  id: 'violet',
  name: 'AURA',
  tagline: 'Deep Violet',
  accent: '#a78bfa',
  bg: '#07000f',
  secondary: '#0f0020',
  grid: 'rgba(167,139,250,0.12)',
  green: '#34d399'
}];

export function ThemeSelector({
  currentTheme,
  onSelectTheme,
  onContinue
}: ThemeSelectorProps) {
  const selected = themes.find((t) => t.id === currentTheme)!;
  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-6"
      style={{
        backgroundColor: selected.bg,
        backgroundImage: `linear-gradient(${selected.grid} 1px, transparent 1px), linear-gradient(90deg, ${selected.grid} 1px, transparent 1px)`,
        backgroundSize: '10px 10px'
      }}>
      
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: `${selected.accent}15`,
              border: `2px solid ${selected.accent}`,
              boxShadow: `0 0 24px ${selected.accent}30`
            }}>
            
            <Activity
              className="w-8 h-8"
              style={{
                color: selected.accent
              }} />
            
          </div>
          <div className="text-center">
            <h1
              className="text-xl font-bold font-mono tracking-widest"
              style={{
                color: selected.accent
              }}>
              
              HRV ADAPTIVE RHYTHM
            </h1>
            <p
              className="text-xs mt-1"
              style={{
                color: `${selected.accent}60`
              }}>
              
              Choose your interface theme
            </p>
          </div>
        </div>

        {/* Theme cards */}
        <div className="w-full flex flex-col gap-3">
          {themes.map((theme) => {
            const isActive = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => onSelectTheme(theme.id)}
                className="w-full rounded-xl p-4 flex items-center gap-4 transition-all duration-200 text-left"
                style={{
                  backgroundColor: isActive ?
                  `${theme.accent}15` :
                  `${theme.secondary}`,
                  border: `1.5px solid ${isActive ? theme.accent : `${theme.accent}30`}`,
                  boxShadow: isActive ? `0 0 16px ${theme.accent}25` : 'none'
                }}>
                
                {/* Mini waveform preview */}
                <div
                  className="w-14 h-10 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden relative"
                  style={{
                    backgroundColor: theme.bg,
                    border: `1px solid ${theme.accent}20`
                  }}>
                  
                  <svg viewBox="0 0 56 40" className="w-full h-full">
                    <polyline
                      points="0,20 8,20 10,14 12,20 18,20 20,22 22,4 24,28 26,20 34,20 36,14 38,20 44,20 46,22 48,4 50,28 52,20 56,20"
                      fill="none"
                      stroke={theme.accent}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        filter: `drop-shadow(0 0 3px ${theme.accent}80)`
                      }} />
                    
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <p
                    className="text-sm font-mono font-bold tracking-wider"
                    style={{
                      color: theme.accent
                    }}>
                    
                    {theme.name}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{
                      color: `${theme.accent}70`
                    }}>
                    
                    {theme.tagline}
                  </p>
                </div>

                {/* Color swatches */}
                <div className="flex gap-1.5 flex-shrink-0">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: theme.accent
                    }} />
                  
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: theme.green
                    }} />
                  
                  <div
                    className="w-4 h-4 rounded-full opacity-60"
                    style={{
                      backgroundColor: theme.bg,
                      border: `1px solid ${theme.accent}40`
                    }} />
                  
                </div>

                {/* Selected indicator */}
                {isActive &&
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: theme.accent,
                    boxShadow: `0 0 6px ${theme.accent}`
                  }} />

                }
              </button>);

          })}
        </div>

        {/* Continue button */}
        <button
          onClick={onContinue}
          className="w-full py-4 rounded-xl font-mono font-bold text-base tracking-wider transition-all duration-200"
          style={{
            backgroundColor: selected.accent,
            color: selected.bg,
            boxShadow: `0 4px 20px ${selected.accent}40`
          }}>
          
          BEGIN SESSION →
        </button>
      </div>
    </div>);

}