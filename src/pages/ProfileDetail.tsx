import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, MessageCircle, Flag, Ban, Globe2, Briefcase, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { discoveryService, profileService, chatService } from '@/api/services';
import { assetUrl } from '@/api/client';
import { useTranslation } from '@/i18n/useTranslation';
import type { UserProfile } from '@/types';
import styles from './ProfileDetail.module.css';

// RELATIONSHIP_LABELS built inside component

// LOOKING_FOR_LABELS built inside component

type ReportReason = 'Spam / fake profile' | 'Inappropriate content' | 'Harassment' | 'Underage' | 'Other';
const REPORT_REASONS: ReportReason[] = [
  'Spam / fake profile', 'Inappropriate content', 'Harassment', 'Underage', 'Other',
];

export function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const RELATIONSHIP_LABELS: Record<string, string> = {
    single: t('single'), in_relationship: t('inRelationship'), married: t('married'),
    open_relationship: t('openRelationship'), complicated: t('complicated'),
    prefer_not_to_say: t('preferNotToSay'),
  };
  const LOOKING_FOR_LABELS: Record<string, string> = {
    friends: t('friends'), dating: t('dating'), relationship: t('relationship'),
    networking: t('networking'), community: t('community'), chat: t('justChat'),
  };
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const touchStartX = useRef<number | null>(null);

  function goNextPhoto() {
    if (!profile) return;
    setActivePhoto(i => (i + 1) % profile.photos.length);
  }
  function goPrevPhoto() {
    if (!profile) return;
    setActivePhoto(i => (i - 1 + profile.photos.length) % profile.photos.length);
  }
  function handleGalleryTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleGalleryTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || !profile || profile.photos.length <= 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) { dx < 0 ? goNextPhoto() : goPrevPhoto(); }
    touchStartX.current = null;
  }

  useEffect(() => {
    if (!id) return;
    discoveryService.getProfile(id).then(p => {
      if (!p) setNotFound(true);
      else setProfile(p);
    });
  }, [id]);

  async function handleSendMessage() {
    if (!profile) return;
    setStartingChat(true);
    try {
      const { conversationId } = await chatService.startConversation(profile.id);
      navigate(`/chat/${conversationId}`);
    } catch {
      try {
        const convos = await chatService.getConversations();
        const existing = convos.find(c => c.participant.id === profile.id);
        if (existing) navigate(`/chat/${existing.id}`);
        else setStartingChat(false);
      } catch { setStartingChat(false); }
    }
  }

  async function submitReport() {
    if (!profile || !reportReason) return;
    setReporting(true);
    await profileService.reportUser(profile.id, reportReason, reportDetails || undefined);
    setReporting(false);
    setReported(true);
    setShowReport(false);
  }

  async function handleBlock() {
    if (!profile) return;
    await profileService.blockUser(profile.id);
    setBlocked(true);
    setTimeout(() => navigate(-1), 1500);
  }

  if (notFound || blocked) {
    return (
      <div className={styles.page}>
        <PageHeader title={t('profile')} showBack />
        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-faint)' }}>
          {blocked ? t('userBlocked') : t('profileNotAvailable')}
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className={styles.page}><PageHeader title={t('profile')} showBack /></div>;
  }

  const photoSrc = profile.photos[activePhoto]
    ? assetUrl(profile.photos[activePhoto])
    : `https://i.pravatar.cc/600?u=${profile.id}`;

  return (
    <div className={styles.page}>
      <PageHeader
        title={profile.displayName}
        showBack
        action={
          <button className={styles.moreButton} onClick={() => setShowReport(s => !s)} aria-label={t('report')}>
            <Flag size={18} />
          </button>
        }
      />

      {showReport && !reported && (
        <div className={styles.actionsMenu}>
          <button className={styles.actionsMenuItem} onClick={() => { setShowReport(false); setTimeout(() => setShowReport(true), 50); }}>
            <Flag size={16} /> {t('report')} {profile.displayName}
          </button>
          <button className={`${styles.actionsMenuItem} ${styles.danger}`} onClick={handleBlock}>
            <Ban size={16} /> {t('block')} {profile.displayName}
          </button>
        </div>
      )}

      {reported && (
        <div style={{ padding: '8px 16px', background: 'var(--color-secondary-soft)', fontSize: 13, color: 'var(--color-secondary)' }}>
          ✓ Report submitted. Thank you for keeping K5 safe.
        </div>
      )}

      <div
        className={styles.gallery}
        onTouchStart={handleGalleryTouchStart}
        onTouchEnd={handleGalleryTouchEnd}
      >
        <img src={photoSrc} alt={profile.displayName} className={styles.photo} />
        {profile.photos.length > 1 && (
          <>
            {/* Progress indicator bar at top */}
            <div className={styles.photoDots}>
              {profile.photos.map((_, i) => (
                <button key={i} className={`${styles.dot} ${i === activePhoto ? styles.dotActive : ''}`}
                  onClick={() => setActivePhoto(i)} />
              ))}
            </div>
            {/* Left tap zone / arrow */}
            {activePhoto > 0 && (
              <button className={styles.galleryNavPrev} onClick={goPrevPhoto} aria-label={t('previousPhoto')}>
                <ChevronLeft size={22} />
              </button>
            )}
            {/* Right tap zone / arrow */}
            {activePhoto < profile.photos.length - 1 && (
              <button className={styles.galleryNavNext} onClick={goNextPhoto} aria-label={t('nextPhoto')}>
                <ChevronRight size={22} />
              </button>
            )}
            {/* Photo counter badge */}
            <div className={styles.photoCounter}>
              {activePhoto + 1} / {profile.photos.length}
            </div>
          </>
        )}
        <div className={styles.galleryGradient} />
      </div>

      <div className={styles.content}>
        <div className={styles.headerRow}>
          <Avatar src={profile.photos[0]} alt=""
            size={48} isOnline={profile.isOnline} verification={profile.verification} membership={profile.membership} />
          <div className={styles.headerText}>
            <h2 className={styles.name}>{profile.displayName}, {profile.age}</h2>
            <div className={styles.metaRow}>
              <MapPin size={13} />
              <span>{profile.city}, {profile.country}
                {profile.distanceKm !== undefined ? ` · ${profile.distanceKm.toFixed(1)} km away` : ''}</span>
            </div>
          </div>
        </div>

        <div className={styles.badgeRow}>
          {(profile.adminRole === 'super_admin' || profile.adminRole === 'admin') && <Badge variant="gold">👑 Admin</Badge>}
          {profile.adminRole === 'moderator' && <Badge variant="gold">🛡 Moderator</Badge>}
          {profile.verification === 'verified' && profile.adminRole === 'none' && <Badge variant="neutral">✓ Verified</Badge>}
          {profile.membership === 'premium' && <Badge variant="premium">Premium</Badge>}
          {profile.isOnline && <Badge variant="online">{t('online')}</Badge>}
        </div>

        {profile.bio && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('about')}</h3>
            <p className={styles.bio}>{profile.bio}</p>
          </section>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('lookingFor')}</h3>
          <div className={styles.chipWrap}>
            {profile.lookingFor.map(lf => <Chip key={lf}>{LOOKING_FOR_LABELS[lf]}</Chip>)}
          </div>
        </section>

        {profile.interests.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('interests')}</h3>
            <div className={styles.chipWrap}>
              {profile.interests.map(i => <Chip key={i}>{i}</Chip>)}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Details</h3>
          <div className={styles.detailsList}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('relationshipStatus')}</span>
              <span className={styles.detailValue}>{RELATIONSHIP_LABELS[profile.relationshipStatus]}</span>
            </div>
            {profile.heightCm && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Height</span>
                <span className={styles.detailValue}>{profile.heightCm} cm</span>
              </div>
            )}
            {profile.occupation && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}><Briefcase size={13} /> {t('occupation')}</span>
                <span className={styles.detailValue}>{profile.occupation}</span>
              </div>
            )}
            {profile.languages.length > 0 && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}><Globe2 size={13} /> {t('languagesSpoken')}</span>
                <span className={styles.detailValue}>{profile.languages.join(', ')}</span>
              </div>
            )}
            {profile.orientation && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>❤️ {t('orientation')}</span>
                <span className={styles.detailValue} style={{ textTransform: 'capitalize' }}>
                  {profile.orientation.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className={styles.footer}>
        <Button fullWidth onClick={handleSendMessage} disabled={startingChat}>
          <MessageCircle size={18} /> {startingChat ? t('connecting') : t('sendMessage')}
        </Button>
      </div>

      {showReport && !reported && (
        <div className={styles.reportOverlay} onClick={() => setShowReport(false)}>
          <div className={styles.reportSheet} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>{t('report')} {profile.displayName}</h3>
              <button onClick={() => setShowReport(false)}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              Select the reason that best describes the issue. Reports are reviewed by our moderation team.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {REPORT_REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReportReason(r)}
                  style={{
                    padding: '10px 14px', borderRadius: 'var(--radius-md)', textAlign: 'left',
                    fontSize: 14, fontWeight: reportReason === r ? 700 : 400,
                    background: reportReason === r ? 'var(--color-accent-soft)' : 'var(--color-surface)',
                    color: reportReason === r ? 'var(--color-accent)' : 'var(--color-text)',
                    border: `1px solid ${reportReason === r ? 'var(--color-accent)' : 'transparent'}`,
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            {reportReason && (
              <textarea
                value={reportDetails}
                onChange={e => setReportDetails(e.target.value)}
                placeholder={`${t('optional')}...`}
                rows={3}
                style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 13,
                  color: 'var(--color-text)', resize: 'none', width: '100%',
                }}
              />
            )}
            <Button fullWidth onClick={submitReport} disabled={!reportReason || reporting}>
              {reporting ? t('saving') : t('submitReport')}
            </Button>
            <button
              style={{ color: 'var(--color-danger)', fontWeight: 600, fontSize: 14, textAlign: 'center', width: '100%', padding: 8 }}
              onClick={handleBlock}
            >
              {t('blockThisUser')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
