import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '@/types';
import { Avatar } from './Avatar';
import { assetUrl } from '@/api/client';
import { Badge } from './Badge';
import styles from './ProfileCard.module.css';

interface ProfileCardProps {
  profile: UserProfile;
}

// Inline SVG placeholder for the large card background photo.
// Using a data URI means no network request and no Android WebView SVG-loading quirks.
const PLACEHOLDER_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 500'%3E%3Crect width='400' height='500' fill='%231a0f14'/%3E%3Ccircle cx='200' cy='180' r='80' fill='%23c8a96e'/%3E%3Cellipse cx='200' cy='420' rx='140' ry='100' fill='%23c8a96e'/%3E%3C/svg%3E";

export function ProfileCard({ profile }: ProfileCardProps) {
  const navigate = useNavigate();
  const [imgFailed, setImgFailed] = useState(false);

  const rawSrc = profile.photos[0] ? assetUrl(profile.photos[0]) : null;
  const photoSrc = (!rawSrc || imgFailed) ? PLACEHOLDER_DATA_URI : rawSrc;

  return (
    <article className={styles.card} onClick={() => navigate(`/u/${profile.id}`)}>
      <img
        src={photoSrc}
        alt={profile.displayName}
        className={styles.photo}
        onError={() => setImgFailed(true)}
      />
      <div className={styles.gradient} />

      <div className={styles.topRow}>
        {(profile.adminRole === 'admin' || profile.adminRole === 'super_admin') && <Badge variant="gold">⭐ Staff</Badge>}
        {profile.verification === 'verified' && profile.adminRole === 'none' && <Badge variant="neutral">✓ Verified</Badge>}
        {profile.membership === 'premium' && <Badge variant="premium">Premium</Badge>}
      </div>

      <div className={styles.info}>
        <div className={styles.nameRow}>
          <Avatar
            src={profile.photos[0] || ''}
            alt=""
            size={36}
            isOnline={profile.isOnline}
            verification={profile.verification}
            membership={profile.membership}
            adminRole={profile.adminRole}
            showBadge={false}
          />
          <h3 className={styles.name}>
            {profile.displayName}, {profile.age}
          </h3>
        </div>
        <div className={styles.meta}>
          <MapPin size={13} />
          <span>
            {profile.city}
            {profile.distanceKm !== undefined ? ` · ${profile.distanceKm.toFixed(1)} km` : ''}
          </span>
        </div>
      </div>
    </article>
  );
}
