import { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { LangProvider } from './i18n/LangContext';
import { onAuthStateChange, isFirebaseConfigured } from './firebase';

import Splash from './screens/Splash';
import Login from './screens/Login';
import Main from './screens/Main';
import OnboardingInstructions from './screens/OnboardingInstructions';
import OnboardingTelegram from './screens/OnboardingTelegram';
import Blocked from './screens/Blocked';

function App() {
  const location = useLocation();

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;
    const unsub = onAuthStateChange((user) => {
      if (user?.uid) {
        try {
          localStorage.setItem('sw_userId', user.uid);
        } catch {
          /* ignore quota / private mode */
        }
      }
    });
    return () => unsub();
  }, []);

  return (
    <LangProvider>
      <div className="app-container">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Splash />} />
            <Route path="/login" element={<Login />} />
            <Route path="/blocked" element={<Blocked />} />
            <Route path="/onboarding-1" element={<OnboardingInstructions />} />
            <Route path="/onboarding-3" element={<OnboardingTelegram />} />
            <Route path="/main/*" element={<Main />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AnimatePresence>
      </div>
    </LangProvider>
  );
}

export default App;
