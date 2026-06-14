import { create } from 'zustand';
import { en, type TranslationKey } from './en';
import { tr } from './tr';
import { ru } from './ru';

// ==========================================================================
// i18n — lightweight translation system.
// Supports English (default), Turkish, Russian.
// Persists language choice to localStorage.
// ==========================================================================

export type Language = 'en' | 'tr' | 'ru';

const TRANSLATIONS: Record<Language, Partial<Record<TranslationKey, string>>> = { en, tr, ru };

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: '🇬🇧 English',
  tr: '🇹🇷 Türkçe',
  ru: '🇷🇺 Русский',
};

function detectLanguage(): Language {
  const saved = localStorage.getItem('k5_lang');
  if (saved === 'tr' || saved === 'ru' || saved === 'en') return saved;
  // Auto-detect from Telegram/browser
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  if (tgLang === 'tr') return 'tr';
  if (tgLang === 'ru') return 'ru';
  const browserLang = navigator.language?.split('-')[0];
  if (browserLang === 'tr') return 'tr';
  if (browserLang === 'ru') return 'ru';
  return 'en';
}

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

export const useI18nStore = create<I18nState>((set, get) => ({
  language: detectLanguage(),

  setLanguage: (lang: Language) => {
    localStorage.setItem('k5_lang', lang);
    set({ language: lang });
  },

  t: (key: TranslationKey): string => {
    const { language } = get();
    const translations = TRANSLATIONS[language];
    return (translations[key] as string | undefined) ?? (en[key] as string) ?? key;
  },
}));

// Convenience hook
export function useTranslation() {
  const { t, language, setLanguage } = useI18nStore();
  return { t, language, setLanguage };
}
