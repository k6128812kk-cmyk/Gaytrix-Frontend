import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, ShieldCheck, Crown, Settings, Globe,
  Eye, Bell, HelpCircle, LogOut, ShieldAlert,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { useSessionStore } from '@/context/sessionStore';
import { useTranslation, LANGUAGE_LABELS, type Language } from '@/i18n/useTranslation';
import styles from './Profile.module.css';

// ==========================================================================
// Profile — own profile page.
// Admin panel link is ONLY shown when adminRole is super_admin or admin,
// as returned by the server. The client never self-assigns this.
// ==========================================================================

export function ProfilePage() {
  const navigate = useNavigate();
  const { profile, isAdmin, isModerator } = useSessionStore();
  const { language, setLanguage } = useTranslation();

  if (!profile) return null;

  const verificationLabel =
    profile.verification === 'verified' ? 'Verified ✓' :
    profile.verification === 'pending' ? 'Verification pending...' :
    profile.verification === 'rejected' ? 'Verification rejected — retry' :
    'Get verified';

  return (
    <div className={styles.page}>
      <PageHeader title="Profile" />

      <div className={styles.content}>
        <button className={styles.profileSummary} onClick={() => navigate('/profile/edit')}>
          <Avatar
            src={profile.photos[0] ?? 'https://i.pravatar.cc/100'}
            alt={profile.displayName}
            size={64}
            isOnline={profile.isOnline}
            verification={profile.verification}
            membership={profile.membership}
          />
          <div className={styles.summaryText}>
            <h2 className={styles.name}>{profile.displayName}</h2>
            <p className={styles.username}>@{profile.telegramUsername}</p>
            <p className={styles.telegramId}>Telegram ID: {profile.telegramId}</p>
            <div className={styles.badgeRow}>
              {isAdmin() && <Badge variant="gold">👑 Admin</Badge>}
              {!isAdmin() && isModerator() && <Badge variant="gold">🛡 Moderator</Badge>}
              {profile.verification === 'verified' && !isAdmin() && <Badge variant="gold">Verified</Badge>}
              {profile.membership === 'premium' && <Badge variant="premium">Premium</Badge>}
            </div>
          </div>
          <ChevronRight size={18} className={styles.chevron} />
        </button>

        <nav className={styles.menu}>
          <MenuItem
            icon={ShieldCheck}
            label={verificationLabel}
            sublabel="Optional badge for trusted profiles"
            onClick={() => navigate('/profile/verification')}
            highlight={profile.verification !== 'verified'}
          />
          <MenuItem
            icon={Crown}
            label={profile.membership === 'premium' ? 'Manage Premium' : 'Upgrade to Premium'}
            sublabel="Boosts, advanced filters, profile views"
            onClick={() => navigate('/profile/premium')}
            highlight={profile.membership !== 'premium'}
          />
          <MenuItem icon={Settings} label="Edit profile" onClick={() => navigate('/profile/edit')} />
          <MenuItem icon={Eye} label="Privacy settings" onClick={() => navigate('/profile/privacy')} />
          {/* Language selector */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--color-border)', gap: 12 }}>
            <Globe size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 15, color: 'var(--color-text)' }}>Language</span>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as Language)}
              style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', color: 'var(--color-text)',
                padding: '4px 8px', fontSize: 13, cursor: 'pointer',
              }}
            >
              {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
          <MenuItem icon={Bell} label="Notifications" onClick={() => navigate('/profile/notifications')} />
          {/* Admin panel — only shown when server assigns admin/moderator role */}
          {isModerator() && (
            <MenuItem
              icon={ShieldAlert}
              label={isAdmin() ? '👑 Admin Panel' : '🛡 Moderator Panel'}
              sublabel="Manage users, reports, verification"
              onClick={() => navigate('/admin')}
              accent
            />
          )}
          <MenuItem icon={HelpCircle} label="Help & support" onClick={() => navigate('/profile/help')} />
          <MenuItem icon={LogOut} label="Sign out" onClick={() => {}} danger />
        </nav>
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon, label, sublabel, onClick, highlight, danger, accent,
}: {
  icon: typeof Settings; label: string; sublabel?: string;
  onClick: () => void; highlight?: boolean; danger?: boolean; accent?: boolean;
}) {
  return (
    <button className={styles.menuItem} onClick={onClick}>
      <span className={`${styles.menuIcon} ${highlight ? styles.menuIconHighlight : ''} ${accent ? styles.menuIconAccent : ''}`}>
        <Icon size={18} />
      </span>
      <span className={styles.menuText}>
        <span className={`${styles.menuLabel} ${danger ? styles.menuLabelDanger : ''}`}>{label}</span>
        {sublabel && <span className={styles.menuSublabel}>{sublabel}</span>}
      </span>
      <ChevronRight size={16} className={styles.chevron} />
    </button>
  );
}
