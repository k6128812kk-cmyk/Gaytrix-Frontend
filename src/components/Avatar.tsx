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

// Inline SVG placeholder — rendered directly in the DOM so it can never
// "successfully load" as a broken/empty file. Android WebView is strict:
// a 200 OK response with an empty SVG is treated as loaded (no onError),
// leaving a blank image. Inline SVG bypasses that entirely.
function PlaceholderAvatar({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: '50%' }}
    >
      <circle cx="50" cy="50" r="50" fill="#1a0f14" />
      <circle cx="50" cy="38" r="16" fill="#c8a96e" />
      <ellipse cx="50" cy="80" rx="26" ry="18" fill="#c8a96e" />
    </svg>
  );
}

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
  const [imgFailed, setImgFailed] = useState(false);

  let ringClass = styles.ringOffline;
  if (verification === 'verified') ringClass = styles.ringVerified;
  else if (membership === 'premium') ringClass = styles.ringPremium;
  else if (isOnline) ringClass = styles.ringOnline;

  const isAdminOrModerator =
    adminRole === 'super_admin' || adminRole === 'admin' || adminRole === 'moderator';
  const badgeSize = Math.max(14, size * 0.26);

  const resolvedSrc = src ? assetUrl(src) : null;
  const showPlaceholder = !resolvedSrc || imgFailed;

  return (
    <div className={styles.wrapper} style={{ width: size, height: size }}>
      <div className={`${styles.ring} ${ringClass}`}>
        <div className={styles.imageMask}>
          {showPlaceholder ? (
            <PlaceholderAvatar size={size} />
          ) : (
            <img
              src={resolvedSrc!}
              alt={alt}
              className={styles.image}
              onError={() => setImgFailed(true)}
            />
          )}
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
          {isAdminOrModerator ? (
            <ShieldCheck size={badgeSize} strokeWidth={2.5} />
          ) : (
            <CheckCircle2 size={badgeSize} strokeWidth={2.5} />
          )}
        </span>
      )}
    </div>
  );
}
