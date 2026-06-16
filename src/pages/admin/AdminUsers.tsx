import { useEffect, useState } from 'react';
import { Search, ShieldCheck, Ban, Clock, UserX, RotateCcw, Crown, ShieldOff } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { useTranslation } from '@/i18n/useTranslation';
import { adminService } from '@/api/services';
import { useSessionStore } from '@/context/sessionStore';
import type { UserProfile } from '@/types';
import { formatDistanceToNowStrict } from 'date-fns';
import styles from './Admin.module.css';

// ==========================================================================
// AdminUsers — full user list with search/filter, moderation actions.
// Every action calls an admin API endpoint; the server re-checks the caller's
// adminRole before executing, so the UI can't grant itself permissions.
// ==========================================================================

type StatusFilter = 'all' | 'active' | 'suspended' | 'banned';
type VerificationFilter = 'all' | 'verified' | 'pending' | 'none';

interface ConfirmAction {
  type: 'ban' | 'suspend' | 'remove' | 'unsuspend' | 'revoke_premium' | 'grant_premium' | 'remove_verification' | 'grant_verification';
  user: UserProfile;
}

export function AdminUsers() {
  const { profile: adminProfile } = useSessionStore();
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('all');
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    load();
  }, [search, statusFilter, verificationFilter]);

  async function load() {
    setLoading(true);
    const data = await adminService.getUsers({
      search: search || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      verification: verificationFilter !== 'all' ? verificationFilter : undefined,
    });
    setUsers(data);
    setLoading(false);
  }

  async function executeAction() {
    if (!confirm) return;
    // Reason required only for destructive actions
    const needsReason = ['ban', 'suspend', 'remove'].includes(confirm.type);
    if (needsReason && !reason.trim()) return;
    setActing(true);
    try {
      switch (confirm.type) {
        case 'ban':
          await adminService.banUser(confirm.user.id, reason);
          break;
        case 'suspend':
          await adminService.suspendUser(confirm.user.id, reason, 7);
          break;
        case 'remove':
          await adminService.removeUser(confirm.user.id, reason);
          break;
        case 'unsuspend':
          await adminService.unsuspendUser(confirm.user.id);
          break;
        case 'revoke_premium':
          await adminService.revokePremium(confirm.user.id);
          break;
        case 'grant_premium':
          await adminService.grantPremium(confirm.user.id);
          break;
        case 'remove_verification':
          await adminService.removeVerification(confirm.user.id);
          break;
        case 'grant_verification':
          await adminService.grantVerification(confirm.user.id);
          break;
      }
      setConfirm(null);
      setReason('');
      load();
    } finally {
      setActing(false);
    }
  }

  // Super admin cannot be moderated by anyone
  function canModerate(user: UserProfile) {
    if (user.adminRole === 'super_admin') return false;
    if (user.id === adminProfile?.id) return false;
    return true;
  }

  return (
    <div className={styles.page}>
      <PageHeader title={t('usersTitle')} showBack />

      <div className={styles.content}>
        <div className={styles.searchBar}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchUsersPlaceholder')}
              className={styles.searchInput}
              style={{ paddingLeft: 36 }}
            />
          </div>
        </div>

        <div className={styles.filterRow}>
          {(['all', 'active', 'suspended', 'banned'] as StatusFilter[]).map(s => (
            <Chip key={s} selected={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Chip>
          ))}
        </div>

        <div className={styles.filterRow}>
          {(['all', 'verified', 'pending', 'none'] as VerificationFilter[]).map(v => (
            <Chip key={v} selected={verificationFilter === v} onClick={() => setVerificationFilter(v)}>
              {v === 'all' ? 'All verifications' : v.charAt(0).toUpperCase() + v.slice(1)}
            </Chip>
          ))}
        </div>

        {loading && <div className={styles.empty}>Loading users...</div>}

        <div className={styles.userList}>
          {!loading && users.length === 0 && (
            <div className={styles.empty}>No users found</div>
          )}
          {users.map(user => (
            <div key={user.id} className={styles.userCard}>
              <div className={styles.userCardTop}>
                <img
                  src={user.photos[0] ?? '/avatar-placeholder.svg'}
                  alt={user.displayName}
                  className={styles.userAvatar}
                />
                <div className={styles.userInfo}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={styles.userName}>{user.displayName}</span>
                    {user.adminRole === 'super_admin' && <span style={{ fontSize: 14 }}>👑</span>}
                    {user.verification === 'verified' && <ShieldCheck size={13} color="var(--color-gold)" />}
                  </div>
                  <div className={styles.userHandle}>
                    @{user.telegramUsername} · ID: {user.telegramId}
                  </div>
                </div>
                <span className={`${styles.statusPill} ${styles[`status_${user.accountStatus}`]}`}>
                  {user.accountStatus}
                </span>
              </div>

              <div className={styles.userMeta}>
                <span>Age {user.age}</span>
                <span>·</span>
                <span>{user.city}, {user.country}</span>
                <span>·</span>
                <span>{user.membership}</span>
                <span>·</span>
                <span>Joined {formatDistanceToNowStrict(new Date(user.registeredAt))} ago</span>
                {user.reportsCount != null && user.reportsCount > 0 && (
                  <><span>·</span><span style={{ color: 'var(--color-danger)' }}>{user.reportsCount} reports</span></>
                )}
              </div>

              {canModerate(user) && (
                <div className={styles.userActions}>
                  {/* Tooltip is via aria-label; visible on desktop hover via CSS */}
                  {user.accountStatus === 'suspended' ? (
                    <button
                      className={`${styles.iconBtn} ${styles.iconBtnSuccess}`}
                      onClick={() => { setConfirm({ type: 'unsuspend', user }); setReason('Admin review completed'); }}
                      aria-label={t('unsuspendUser')} title={t('unsuspend')}
                    ><RotateCcw size={16} /></button>
                  ) : user.accountStatus === 'active' ? (
                    <button
                      className={styles.iconBtn}
                      onClick={() => setConfirm({ type: 'suspend', user })}
                      aria-label={t('suspendUser')} title={t('suspend7d')}
                    ><Clock size={16} /></button>
                  ) : null}
                  {user.membership === 'premium' ? (
                    <button
                      className={styles.iconBtn}
                      onClick={() => setConfirm({ type: 'revoke_premium', user })}
                      aria-label={t('revokePremiumUser')} title={t('revokePremium')}
                    ><Crown size={16} /></button>
                  ) : (
                    <button
                      className={`${styles.iconBtn} ${styles.iconBtnGold}`}
                      onClick={() => setConfirm({ type: 'grant_premium', user })}
                      aria-label={t('grantPremiumUser')} title={t('grantPremium')}
                    ><Crown size={16} /></button>
                  )}
                  {user.verification === 'verified' ? (
                    <button
                      className={styles.iconBtn}
                      onClick={() => setConfirm({ type: 'remove_verification', user })}
                      aria-label={t('removeVerifiedBadge')} title={t('removeBadge')}
                    ><ShieldOff size={16} /></button>
                  ) : (
                    <button
                      className={`${styles.iconBtn} ${styles.iconBtnSuccess}`}
                      onClick={() => setConfirm({ type: 'grant_verification', user })}
                      aria-label={t('grantVerifiedBadge')} title={t('grantBadge')}
                    ><ShieldCheck size={16} /></button>
                  )}
                  {user.accountStatus !== 'banned' && (
                    <button
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      onClick={() => setConfirm({ type: 'ban', user })}
                      aria-label={t('banUser')} title={t('ban')}
                    ><Ban size={16} /></button>
                  )}
                  <button
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    onClick={() => setConfirm({ type: 'remove', user })}
                    aria-label={t('removeAccount')} title={t('remove')}
                  ><UserX size={16} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {confirm && (
        <div className={styles.confirmOverlay} onClick={() => setConfirm(null)}>
          <div className={styles.confirmSheet} onClick={e => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>
              {confirm.type === 'ban' ? 'Permanently ban' :
               confirm.type === 'suspend' ? 'Suspend 7 days' :
               confirm.type === 'remove' ? 'Remove account' :
               confirm.type === 'revoke_premium' ? 'Revoke Premium from' :
               confirm.type === 'grant_premium' ? 'Grant Premium to' :
               confirm.type === 'remove_verification' ? 'Remove badge from' :
               confirm.type === 'grant_verification' ? 'Grant verified badge to' :
               'Unsuspend'} @{confirm.user.telegramUsername}?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Telegram ID: {confirm.user.telegramId}
              {confirm.type === 'ban' && ' · This action is permanent.'}
              {confirm.type === 'remove' && ' · This deletes the account entirely.'}
            </p>
            {['ban', 'suspend', 'remove'].includes(confirm.type) && (
              <input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={t('reasonPlaceholder')}
                className={styles.confirmInput}
              />
            )}
            <div className={styles.confirmBtns}>
              <Button variant="secondary" onClick={() => { setConfirm(null); setReason(''); }}>Cancel</Button>
              <Button
                variant="danger"
                fullWidth
                onClick={executeAction}
                disabled={(['ban', 'suspend', 'remove'].includes(confirm.type) && !reason.trim()) || acting}
              >
                {acting ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
