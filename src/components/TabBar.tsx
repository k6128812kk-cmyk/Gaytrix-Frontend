import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, Users, MessageCircle, User, Plus, Camera, Image as ImageIcon } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { useSessionStore } from '@/context/sessionStore';
import { storyService } from '@/api/services';
import { useTranslation } from '@/i18n/useTranslation';
import styles from './TabBar.module.css';

// ==========================================================================
// TabBar — 4 nav tabs + centre "+" story creation button.
// Layout: Discover | Groups | [+] | Chat | Profile
// The "+" button shows a bottom sheet to choose camera vs gallery.
// ==========================================================================

export function TabBar() {
  const { haptic } = useTelegram();
  const { totalUnreadCount } = useSessionStore();
  const { t } = useTranslation();
  const [showSheet, setShowSheet] = useState(false);

  const LEFT_TABS = [
    { to: '/discover', label: t('discover'), icon: Compass, badge: 0 },
    { to: '/groups', label: t('groups'), icon: Users, badge: 0 },
  ];
  const RIGHT_TABS = [
    { to: '/chat', label: t('chat'), icon: MessageCircle, badge: totalUnreadCount },
    { to: '/profile', label: t('profile'), icon: User, badge: 0 },
  ];

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await storyService.createStory(file);
      window.dispatchEvent(new CustomEvent('story-created'));
    } catch {
      // fail silently — story row handles errors
    } finally {
      e.target.value = '';
    }
  }

  function renderTab(tab: { to: string; label: string; icon: typeof Compass; badge: number }) {
    const Icon = tab.icon;
    return (
      <NavLink
        key={tab.to}
        to={tab.to}
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
        onClick={() => haptic.selection()}
      >
        <span className={styles.iconWrap}>
          <Icon size={22} strokeWidth={2.2} />
          {tab.badge > 0 && <span className={styles.badge}>{tab.badge > 99 ? '99+' : tab.badge}</span>}
        </span>
        <span className={styles.tabLabel}>{tab.label}</span>
      </NavLink>
    );
  }

  return (
    <>
      <nav className={styles.tabbar} aria-label="Primary">
        {LEFT_TABS.map(renderTab)}

        <div className={styles.createWrap}>
          <button
            className={styles.createBtn}
            onClick={() => { haptic.selection(); setShowSheet(true); }}
            aria-label={t('addStory')}
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </div>

        {RIGHT_TABS.map(renderTab)}
      </nav>

      {/* Bottom sheet — camera vs gallery */}
      {showSheet && (
        <div className={styles.sheetOverlay} onClick={() => setShowSheet(false)}>
          <div className={styles.sheetInner} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h3 className={styles.sheetTitle}>{t('addStoryTitle')}</h3>

            <label className={styles.sheetBtn}>
              <Camera size={22} />
              <span>{t('takePhoto')}</span>
              <input type="file" accept="image/*" capture="environment"
                onChange={e => { setShowSheet(false); handleFileUpload(e); }}
                style={{ display: 'none' }} />
            </label>

            <label className={styles.sheetBtn}>
              <ImageIcon size={22} />
              <span>{t('uploadPhoto')}</span>
              <input type="file" accept="image/*"
                onChange={e => { setShowSheet(false); handleFileUpload(e); }}
                style={{ display: 'none' }} />
            </label>

            <button className={styles.sheetCancel} onClick={() => setShowSheet(false)}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
