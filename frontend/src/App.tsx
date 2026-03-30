import React, { useState } from 'react';
import { SessionStartScreen } from './pages/SessionStartScreen';
import { LiveMonitoringScreen } from './pages/LiveMonitoringScreen';
import { SessionEndScreen } from './pages/SessionEndScreen';
import { ThemeSelector, Theme } from './components/ThemeSelector';
import { useTelemetry } from './hooks/useTelemetry';

type Screen = 'themeSelect' | 'sessionStart' | 'liveMonitoring' | 'sessionEnd';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('themeSelect');
  const [theme, setTheme] = useState<Theme>('cyan');
  
  // Lift the telemetry state to the top-level component
  const telemetryData = useTelemetry();

  return (
    <div className="w-full min-h-screen" data-theme={theme}>
      {currentScreen === 'themeSelect' &&
        <ThemeSelector
          currentTheme={theme}
          onSelectTheme={setTheme}
          onContinue={() => setCurrentScreen('sessionStart')} 
        />
      }
      {currentScreen === 'sessionStart' &&
        <SessionStartScreen
          onStartSession={() => setCurrentScreen('liveMonitoring')}
          telemetryData={telemetryData}
        />
      }
      {currentScreen === 'liveMonitoring' &&
        <LiveMonitoringScreen
          onEndSession={() => setCurrentScreen('sessionEnd')}
          onRestart={() => setCurrentScreen('sessionStart')}
          telemetryData={telemetryData}
        />
      }
      {currentScreen === 'sessionEnd' &&
        <SessionEndScreen
          onNewSession={() => setCurrentScreen('themeSelect')}
          onRestart={() => setCurrentScreen('sessionStart')}
        />
      }
    </div>
  );
}