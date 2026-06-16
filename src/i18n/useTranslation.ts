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
  // If the user has explicitly chosen a language (stored in k5_lang), always
  // honour it — this covers both the mini-app picker and the bot /start flow.
  const saved = localStorage.getItem('k5_lang');
  if (saved === 'tr' || saved === 'ru' || saved === 'en') return saved;
  // No explicit choice yet — auto-detect from Telegram/browser so the picker
  // pre-selects a sensible default before the user confirms.
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
    // Sync to backend so push notifications arrive in the correct language
    import('@/api/services').then(({ profileService }) => {
      profileService.updateMe({ languagePreference: lang }).catch(() => {});
    }).catch(() => { /* non-fatal */ });
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
