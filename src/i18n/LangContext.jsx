import { createContext, useContext, useState } from 'react';
import translations from './translations';

const LangContext = createContext(null);

document.documentElement.setAttribute('data-theme', 'light');
localStorage.removeItem('sw_dark');

export const LangProvider = ({ children }) => {
  const [lang, setLang] = useState(
    () => localStorage.getItem('sw_lang_code') || 'en'
  );

  const switchLang = (l) => {
    setLang(l);
    localStorage.setItem('sw_lang_code', l);
  };

  const t = (key) => translations[lang]?.[key] ?? translations['en']?.[key] ?? key;

  return (
    <LangContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) return { lang: 'en', switchLang: () => {}, t: (k) => k };
  return ctx;
};
