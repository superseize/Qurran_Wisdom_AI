import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { backend } from '@/api/backend';
import { translations } from '@/lib/data';
import { QueryClient } from '@tanstack/react-query';

// ───────── lib/AuthContext.jsx ─────────
const AuthContext = createContext(null);

// The app is open to guests (reading, search, AI); signing in unlocks
// per-user data (notebook sync, progress, learning records).
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const refresh = useCallback(async () => {
    try { setUser(await backend.auth.me()); } catch { setUser(null); }
    setIsLoadingAuth(false);
  }, []);

  useEffect(() => {
    refresh();
    return backend.auth.onChange((_event, u) => { setUser(u); setIsLoadingAuth(false); });
  }, [refresh]);

  const logout = async () => { await backend.auth.signOut(); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoadingAuth, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// ───────── lib/LanguageContext.jsx ─────────
const LanguageContext = createContext(null);
const STORAGE_KEY = 'app-language';

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'ur'; } catch { return 'ur'; }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  const t = useCallback((key) => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry.ur || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) return { lang: 'ur', setLang: () => {}, t: (k) => k };
  return ctx;
}

// ───────── lib/appConfig.js ─────────
export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});
