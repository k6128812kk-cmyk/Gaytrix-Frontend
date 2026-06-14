import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useTranslation } from '@/i18n/useTranslation';
import styles from './Notifications.module.css';

export function NotificationsPage() {
  const { t } = useTranslation();

  const CATEGORIES = [
    { key: 'messages', label: t('messageAlerts'), description: 'Get notified when someone sends you a message' },
    { key: 'likes', label: t('profileViews'), description: 'Someone viewed your profile (Premium)' },
    { key: 'events', label: 'Community events', description: 'New events near you and RSVP reminders' },
    { key: 'verification', label: t('verification'), description: 'Status changes to your verification request' },
    { key: 'announcements', label: t('announcements'), description: 'Important platform updates from K5' },
  ];

  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    messages: true, likes: true, events: true, verification: true, announcements: true,
  });

  return (
    <div className={styles.page}>
      <PageHeader title={t('notificationsTitle')} showBack />
      <div className={styles.content}>
        <section className={styles.group}>
          {CATEGORIES.map(cat => (
            <div key={cat.key} className={styles.row}>
              <div className={styles.rowText}>
                <p className={styles.label}>{cat.label}</p>
                <p className={styles.description}>{cat.description}</p>
              </div>
              <button
                className={`${styles.toggle} ${enabled[cat.key] ? styles.toggleOn : ''}`}
                onClick={() => setEnabled(prev => ({ ...prev, [cat.key]: !prev[cat.key] }))}
                aria-pressed={enabled[cat.key]}
                aria-label={cat.label}
              >
                <span className={styles.toggleKnob} />
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
