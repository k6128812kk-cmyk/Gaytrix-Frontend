import { useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import type { VerificationStatus, MembershipTier, AdminRole } from '@/types';
import { assetUrl } from '@/api/client';
import styles from './Avatar.module.css';

interface AvatarProps {
  src: string;
  alt: string;
  size?: number;
  isOnline?: boolean;
  verification?: VerificationStatus;
  membership?: MembershipTier;
  adminRole?: AdminRole;
  showBadge?: boolean;
}

// Inline SVG rendered directly — no file load, no network, never fails on any platform.
const PLACEHOLDER_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%231a0f14'/%3E%3Ccircle cx='50' cy='38' r='16' fill='%23c8a96e'/%3E%3Cellipse cx='50' cy='80' rx='26' ry='18' fill='%23c8a96e'/%3E%3C/svg%3E";

export function Avatar({
  src,
  alt,
  size = 56,
  isOnline = false,
  verification = 'none',
  membership = 'free',
  adminRole = 'none',
  showBadge = true,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);

  let ringClass = styles.ringOffline;
  if (verification === 'verified') ringClass = styles.ringVerified;
  else if (membership === 'premium') ringClass = styles.ringPremium;
  else if (isOnline) ringClass = styles.ringOnline;

  const isAdminOrModerator =
    adminRole === 'super_admin' || adminRole === 'admin' || adminRole === 'moderator';
  const badgeSize = Math.max(14, size * 0.26);

  const resolvedSrc = src ? assetUrl(src) : null;
  const imgSrc = (!resolvedSrc || failed) ? PLACEHOLDER_DATA_URI : resolvedSrc;

  return (
    <div className={styles.wrapper} style={{ width: size, height: size }}>
      <div className={`${styles.ring} ${ringClass}`}>
        <div className={styles.imageMask}>
          <img
            src={imgSrc}
            alt={alt}
            className={styles.image}
            onError={() => setFailed(true)}
          />
        </div>
      </div>
      {isOnline && <span className={styles.onlineDot} aria-label="Online" />}
      {showBadge && (isAdminOrModerator || verification === 'verified') && (
        <span
          className={styles.verifiedBadge}
          aria-label={isAdminOrModerator ? 'Staff member' : 'Verified profile'}
          style={{
            color: isAdminOrModerator
              ? 'var(--color-gold, #f5c518)'
              : 'var(--color-info, #4fb8ff)',
          }}
        >
          {isAdminOrModerator
            ? <ShieldCheck size={badgeSize} strokeWidth={2.5} />
            : <CheckCircle2 size={badgeSize} strokeWidth={2.5} />}
        </span>
      )}
    </div>
  );
}
