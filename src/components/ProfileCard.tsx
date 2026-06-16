import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '@/types';
import { Avatar } from './Avatar';
import { assetUrl } from '@/api/client';
import { Badge } from './Badge';
import styles from './ProfileCard.module.css';

// ==========================================================================
// ProfileCard — large photo card used in the Discover feed.
// Tapping navigates to the full profile view.
// ==========================================================================

interface ProfileCardProps {
  profile: UserProfile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const navigate = useNavigate();
  const photoSrc = profile.photos[0] ? assetUrl(profile.photos[0]) : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%231a0f14'/%3E%3Ccircle cx='50' cy='38' r='16' fill='%23c8a96e'/%3E%3Cellipse cx='50' cy='80' rx='26' ry='18' fill='%23c8a96e'/%3E%3C/svg%3E";

  return (
    <article className={styles.card} onClick={() => navigate(`/u/${profile.id}`)}>
      <img src={photoSrc} alt={profile.displayName} className={styles.photo} />
      <div className={styles.gradient} />

      <div className={styles.topRow}>
        {(profile.adminRole === 'admin' || profile.adminRole === 'super_admin') && <Badge variant="gold">⭐ Staff</Badge>}
        {profile.verification === 'verified' && profile.adminRole === 'none' && <Badge variant="neutral">✓ Verified</Badge>}
        {profile.membership === 'premium' && <Badge variant="premium">Premium</Badge>}
      </div>

      <div className={styles.info}>
        <div className={styles.nameRow}>
          <Avatar
            src={photoSrc}
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
