import { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, Users, MessageCircle, User, Plus } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { useSessionStore } from '@/context/sessionStore';
import { storyService } from '@/api/services';
import styles from './TabBar.module.css';

// ==========================================================================
// TabBar — 4 nav tabs + centre "+" story creation button.
// Layout: Discover | Groups | [+] | Chat | Profile
// ==========================================================================

export function TabBar() {
  const { haptic } = useTelegram();
  const { totalUnreadCount } = useSessionStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const LEFT_TABS = [
    { to: '/discover', label: 'Discover', icon: Compass, badge: 0 },
    { to: '/groups', label: 'Groups', icon: Users, badge: 0 },
  ];
  const RIGHT_TABS = [
    { to: '/chat', label: 'Chat', icon: MessageCircle, badge: totalUnreadCount },
    { to: '/profile', label: 'Profile', icon: User, badge: 0 },
  ];

  async function handleStoryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await storyService.createStory(file);
      // Trigger discover page refresh to show the story
      window.dispatchEvent(new CustomEvent('story-created'));
    } catch {
      // fail silently
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
    <nav className={styles.tabbar} aria-label="Primary">
      {LEFT_TABS.map(renderTab)}

      {/* Centre story creation button */}
      <div className={styles.createWrap}>
        <button
          className={styles.createBtn}
          onClick={() => { haptic.impact('medium'); fileRef.current?.click(); }}
          aria-label="Create story"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleStoryUpload}
          style={{ display: 'none' }}
        />
      </div>

      {RIGHT_TABS.map(renderTab)}
    </nav>
  );
}
