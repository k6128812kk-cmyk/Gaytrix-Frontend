import { useState } from 'react';
import { useTranslation, type Language } from '@/i18n/useTranslation';
import styles from './LanguageSelection.module.css';

// ==========================================================================
// LanguageSelection — shown once on first launch so the user can choose
// English, Russian, or Turkish before continuing to onboarding.
// The choice is saved to localStorage AND synced to the backend profile.
// ==========================================================================

interface Props {
  onSelected: () => void;
}

const LANGUAGE_OPTIONS: { code: Language; label: string; native: string; flag: string }[] = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'ru', label: 'Russian', native: 'Русский', flag: '🇷🇺' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
];

export function LanguageSelectionPage({ onSelected }: Props) {
  const { setLanguage, language } = useTranslation();
  const [selected, setSelected] = useState<Language>(language);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    setLanguage(selected); // saves to localStorage and syncs to backend
    // Small delay to let the backend save before proceeding
    await new Promise(r => setTimeout(r, 300));
    onSelected();
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>K5</div>
        <h1 className={styles.title}>Choose your language</h1>
        <p className={styles.subtitle}>
          Select your preferred language for the app.
          {'\n'}You can change this anytime in your profile settings.
        </p>

        <div className={styles.options}>
          {LANGUAGE_OPTIONS.map(opt => (
            <button
              key={opt.code}
              className={`${styles.option} ${selected === opt.code ? styles.optionSelected : ''}`}
              onClick={() => setSelected(opt.code)}
              aria-pressed={selected === opt.code}
            >
              <span className={styles.flag}>{opt.flag}</span>
              <div className={styles.optionText}>
                <span className={styles.optionNative}>{opt.native}</span>
                <span className={styles.optionLabel}>{opt.label}</span>
              </div>
              {selected === opt.code && <span className={styles.checkmark}>✓</span>}
            </button>
          ))}
        </div>

        <button
          className={styles.confirmBtn}
          onClick={handleConfirm}
          disabled={saving}
        >
          {saving ? '…' : (selected === 'ru' ? 'Продолжить' : selected === 'tr' ? 'Devam et' : 'Continue')}
        </button>
      </div>
    </div>
  );
}
