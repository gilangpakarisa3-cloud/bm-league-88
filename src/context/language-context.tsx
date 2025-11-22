
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import id from '@/locales/id.json';
import en from '@/locales/en.json';

type Language = 'id' | 'en';
type Translations = Record<string, any>;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  translations: Translations;
  t: (key: string, options?: Record<string, string | number>) => string;
  t_dynamic: (key: string, options?: Record<string, string | number>) => string;
}

const translations: Record<Language, Translations> = { id, en };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('id');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  useEffect(() => {
    if (isMounted) {
      const storedLang = localStorage.getItem('language') as Language;
      if (storedLang && ['id', 'en'].includes(storedLang)) {
        setLanguage(storedLang);
      } else {
        // Default to Indonesian if no stored language preference
        setLanguage('id');
      }
    }
  }, [isMounted]);

  const t = (key: string, options?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let result = translations[language];
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        // Fallback to English if translation is missing
        let fallbackResult = translations['en'];
        for (const fk of keys) {
            fallbackResult = fallbackResult?.[fk];
             if (fallbackResult === undefined) return key;
        }
        result = fallbackResult;
        break;
      }
    }

    if (typeof result === 'string' && options) {
      return Object.entries(options).reduce((acc, [key, value]) => {
        return acc.replace(`{{${key}}}`, String(value));
      }, result);
    }
    
    return result || key;
  };
  
  // A version of 't' that is stable and won't cause re-renders on language change
  // for things that are not user-facing, like validation messages.
   const t_dynamic = (key: string, options?: Record<string, string | number>): string => {
    const lang = typeof window !== 'undefined' ? (localStorage.getItem('language') as Language || 'id') : 'id';
    const keys = key.split('.');
    let result = translations[lang];
    for (const k of keys) {
      result = result?.[k];
       if (result === undefined) {
        let fallbackResult = translations['en'];
        for (const fk of keys) {
            fallbackResult = fallbackResult?.[fk];
             if (fallbackResult === undefined) return key;
        }
        result = fallbackResult;
        break;
      }
    }
     if (typeof result === 'string' && options) {
      return Object.entries(options).reduce((acc, [key, value]) => {
        return acc.replace(`{{${key}}}`, String(value));
      }, result);
    }
    return result || key;
  };


  useEffect(() => {
    if (isMounted) {
        localStorage.setItem('language', language);
    }
  }, [language, isMounted]);

  if (!isMounted) {
    return null;
  }
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations: translations[language], t, t_dynamic }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
