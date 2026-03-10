import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { LangProvider } from './i18n/LangContext';

import Splash from './screens/Splash';
import Login from './screens/Login';
import Main from './screens/Main';

function App() {
  const location = useLocation();

  return (
    <LangProvider>
      <div className="app-container">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/"        element={<Splash />} />
            <Route path="/login"   element={<Login  />} />
            <Route path="/main/*"  element={<Main   />} />
            <Route path="*"        element={<Navigate to="/" />} />
          </Routes>
        </AnimatePresence>
      </div>
    </LangProvider>
  );
}

export default App;
