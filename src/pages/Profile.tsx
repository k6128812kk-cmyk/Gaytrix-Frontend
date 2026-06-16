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
  const { t, language, setLanguage } = useTranslation();

  if (!profile) return null;

  const verificationLabel =
    profile.verification === 'verified' ? t('verificationVerified') :
    profile.verification === 'pending' ? t('verificationPending') :
    profile.verification === 'rejected' ? t('verificationRejected') :
    t('verification');

  return (
    <div className={styles.page}>
      <PageHeader title={t('profile')} />

      <div className={styles.content}>
        <button className={styles.profileSummary} onClick={() => navigate('/profile/edit')}>
          <Avatar
            src={profile.photos[0] ?? ''}
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
              {profile.verification === 'verified' && !isAdmin() && <Badge variant="gold">{t('verificationVerified')}</Badge>}
              {profile.membership === 'premium' && <Badge variant="premium">Premium</Badge>}
            </div>
          </div>
          <ChevronRight size={18} className={styles.chevron} />
        </button>

        <nav className={styles.menu}>
          <MenuItem
            icon={ShieldCheck}
            label={verificationLabel}
            sublabel={t('verificationBadge')}
            onClick={() => navigate('/profile/verification')}
            highlight={profile.verification !== 'verified'}
          />
          <MenuItem
            icon={Crown}
            label={profile.membership === 'premium' ? t('managePremium') : t('upgradePremium')}
            sublabel={t('premiumBoosts')}
            onClick={() => navigate('/profile/premium')}
            highlight={profile.membership !== 'premium'}
          />
          <MenuItem icon={Settings} label={t('editProfileMenu')} onClick={() => navigate('/profile/edit')} />
          <MenuItem icon={Eye} label={t('privacySettings')} onClick={() => navigate('/profile/privacy')} />

          {/* Language selector — styled to match MenuItem */}
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '13px 16px',
            borderBottom: '1px solid var(--color-border)',
            gap: 12, background: 'var(--color-surface)',
          }}>
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--color-surface-raised)',
              color: 'var(--color-text-muted)', flexShrink: 0,
            }}>
              <Globe size={18} />
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 500, color: 'var(--color-text)' }}>
                {t('language')}
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>
                {LANGUAGE_LABELS[language]}
              </span>
            </span>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as Language)}
              style={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text)',
                padding: '6px 10px',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                minWidth: 110,
              }}
            >
              {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>

          <MenuItem icon={Bell} label={t('notifications')} onClick={() => navigate('/profile/notifications')} />

          {/* Admin panel — only shown when server assigns admin/moderator role */}
          {isModerator() && (
            <MenuItem
              icon={ShieldAlert}
              label={isAdmin() ? `👑 ${t('adminPanel')}` : `🛡 ${t('moderatorPanel')}`}
              sublabel={t('adminPanelSublabel')}
              onClick={() => navigate('/admin')}
              accent
            />
          )}

          <MenuItem icon={HelpCircle} label={t('help')} onClick={() => navigate('/profile/help')} />
          <MenuItem icon={LogOut} label={t('signOut')} onClick={() => {}} danger />
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
