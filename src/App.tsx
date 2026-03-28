import React, { useState } from 'react';
import { SessionStartScreen } from './pages/SessionStartScreen';
import { LiveMonitoringScreen } from './pages/LiveMonitoringScreen';
import { SessionEndScreen } from './pages/SessionEndScreen';
import { ThemeSelector, Theme } from './components/ThemeSelector';
type Screen = 'themeSelect' | 'sessionStart' | 'liveMonitoring' | 'sessionEnd';
export function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('themeSelect');
  const [theme, setTheme] = useState<Theme>('cyan');
  return (
    <div className="w-full min-h-screen" data-theme={theme}>
      {currentScreen === 'themeSelect' &&
      <ThemeSelector
        currentTheme={theme}
        onSelectTheme={setTheme}
        onContinue={() => setCurrentScreen('sessionStart')} />

      }
      {currentScreen === 'sessionStart' &&
      <SessionStartScreen
        onStartSession={() => setCurrentScreen('liveMonitoring')} />

      }
      {currentScreen === 'liveMonitoring' &&
      <LiveMonitoringScreen
        onEndSession={() => setCurrentScreen('sessionEnd')}
        onRestart={() => setCurrentScreen('sessionStart')} />

      }
      {currentScreen === 'sessionEnd' &&
      <SessionEndScreen
        onNewSession={() => setCurrentScreen('themeSelect')}
        onRestart={() => setCurrentScreen('sessionStart')} />

      }
    </div>);

}