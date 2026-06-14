import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { groupService } from '@/api/services';
import { assetUrl } from '@/api/client';
import type { CommunityGroup, EventAttendee } from '@/types';
import styles from './GroupInfo.module.css';

// ==========================================================================
// GroupInfo — tapping the group header opens this info/members page.
// ==========================================================================

export function GroupInfoPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [members, setMembers] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    Promise.all([
      groupService.getGroup(groupId),
      groupService.getGroupMembers(groupId),
    ]).then(([g, m]) => {
      setGroup(g);
      setMembers(m);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [groupId]);

  const photoSrc = group?.photoUrl ? assetUrl(group.photoUrl) : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <span className={styles.headerTitle}>Group Info</span>
      </div>

      {loading && <div className={styles.loading}>Loading…</div>}

      {!loading && group && (
        <div className={styles.content}>
          {/* Group avatar + name */}
          <div className={styles.groupHero}>
            {photoSrc
              ? <img src={photoSrc} alt={group.name} className={styles.groupPhoto} />
              : <div className={styles.groupPhotoPlaceholder}><Users size={36} /></div>
            }
            <h2 className={styles.groupName}>{group.name}</h2>
            {group.description && <p className={styles.groupDesc}>{group.description}</p>}
            <span className={styles.memberCount}>{group.memberCount} members</span>
          </div>

          {/* Members list */}
          <div className={styles.memberSection}>
            <h3 className={styles.sectionTitle}>{group.memberCount} Members</h3>
            {members.map(member => {
              const src = member.photos?.[0] ? assetUrl(member.photos[0]) : null;
              return (
                <button
                  key={member.id}
                  className={styles.memberRow}
                  onClick={() => navigate(`/u/${member.id}`)}
                >
                  <div className={styles.memberAvatar}>
                    {src
                      ? <img src={src} alt={member.displayName} />
                      : <span>{(member.displayName?.[0] ?? '?').toUpperCase()}</span>
                    }
                    {member.isOnline && <span className={styles.onlineDot} />}
                  </div>
                  <div className={styles.memberInfo}>
                    <span className={styles.memberName}>
                      {member.displayName}
                      {member.verification === 'verified' && <span className={styles.verifiedBadge}> ✓</span>}
                      {(member.adminRole === 'admin' || member.adminRole === 'super_admin') && <span className={styles.adminBadge}> 👑</span>}
                    </span>
                    <span className={styles.memberSub}>
                      {member.isOnline ? 'online' : 'offline'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
