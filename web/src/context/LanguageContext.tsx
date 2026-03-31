import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { LanguageCode } from '../i18n/translations';
import { getTranslation } from '../i18n/translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: Parameters<typeof getTranslation>[1]) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    // Try to get from localStorage, fallback to 'en'
    const saved = localStorage.getItem('appLanguage') as LanguageCode;
    return saved && ['en', 'ur', 'ar'].includes(saved) ? saved : 'en';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('appLanguage', lang);
    // Also save to backend settings
    saveLanguageToSettings(lang);
  };

  const saveLanguageToSettings = async (lang: LanguageCode) => {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
      if (!token) return;
      const { api } = await import('../services/api');
      await api.updateSettings({ defaultLanguage: lang });
    } catch (error) {
      console.error('Failed to save language to settings:', error);
    }
  };

  // Load language from settings on mount
  useEffect(() => {
    const loadLanguageFromSettings = async () => {
      try {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
        if (!token) return;
        const { api } = await import('../services/api');
        const response = await api.getSettings();
        if (response.success && response.data) {
          const data = response.data as { defaultLanguage?: string };
          if (data.defaultLanguage) {
            const lang = data.defaultLanguage as LanguageCode;
            if (['en', 'ur', 'ar'].includes(lang)) {
              setLanguageState(lang);
              localStorage.setItem('appLanguage', lang);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load language from settings:', error);
      }
    };
    loadLanguageFromSettings();
  }, []);

  const t = (key: Parameters<typeof getTranslation>[1]) => {
    return getTranslation(language, key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
