import { ExternalLink, MessageSquare, FileText, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useTranslation } from '@/i18n/useTranslation';
import styles from './Help.module.css';

export function HelpPage() {
  const { t } = useTranslation();

  const LINKS = [
    { icon: MessageSquare, label: t('contactUs'), sublabel: 'Chat with the K5 support bot' },
    { icon: FileText, label: 'Community guidelines', sublabel: 'Rules for a safe and respectful community' },
    { icon: ShieldAlert, label: 'Safety center', sublabel: 'Tips for staying safe while meeting people' },
    { icon: FileText, label: t('termsOfService') + ' & ' + t('privacyPolicy'), sublabel: 'How your data is handled' },
  ];

  return (
    <div className={styles.page}>
      <PageHeader title={t('helpTitle')} showBack />
      <div className={styles.content}>
        <nav className={styles.menu}>
          {LINKS.map(link => (
            <button key={link.label} className={styles.menuItem}>
              <span className={styles.icon}><link.icon size={18} /></span>
              <span className={styles.text}>
                <span className={styles.label}>{link.label}</span>
                <span className={styles.sublabel}>{link.sublabel}</span>
              </span>
              <ExternalLink size={14} className={styles.external} />
            </button>
          ))}
        </nav>
        <p className={styles.version}>K5 v1.0.0</p>
      </div>
    </div>
  );
}
