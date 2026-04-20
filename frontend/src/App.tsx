import React, { useState } from 'react';
import { SessionStartScreen } from './pages/SessionStartScreen';
import { LiveMonitoringScreen } from './pages/LiveMonitoringScreen';
import { SessionEndScreen } from './pages/SessionEndScreen';
import { ThemeSelector, Theme } from './components/ThemeSelector';
import { useTelemetry } from './hooks/useTelemetry';
import { unlockAudioEngine } from './hooks/useAudioTherapy';

type Screen = 'themeSelect' | 'sessionStart' | 'liveMonitoring' | 'sessionEnd';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('themeSelect');
  const [theme, setTheme] = useState<Theme>('cyan');
  
  const mockContext = {
    title: "Cancer",
    pathname: "/skitiiorg/dashboard", 
    userDetails: { GroupType: "Experimental" } 
  };

  const telemetryData = useTelemetry(mockContext);

  const handleThemeContinue = () => {
    void unlockAudioEngine();
    setCurrentScreen('sessionStart');
  };

  return (
    <div className="w-full min-h-screen" data-theme={theme}>
      {currentScreen === 'themeSelect' &&
        <ThemeSelector
          currentTheme={theme}
          onSelectTheme={setTheme}
          onContinue={handleThemeContinue} 
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
          onRestart={() => {
            telemetryData.resetSession(); 
            setCurrentScreen('sessionStart');
          }}
          telemetryData={telemetryData}
        />
      }
      {currentScreen === 'sessionEnd' &&
        <SessionEndScreen
          onNewSession={() => {
            telemetryData.resetSession(); 
            setCurrentScreen('themeSelect');
          }}
          onRestart={() => {
            telemetryData.resetSession(); 
            setCurrentScreen('sessionStart');
          }}
          telemetryData={telemetryData} 
        />
      }
    </div>
  );
}
