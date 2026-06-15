import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Settings, Shield, ShieldOff, CheckCircle, XCircle, Lock, UserMinus } from 'lucide-react';
import { groupService } from '@/api/services';
import { assetUrl } from '@/api/client';
import { useSessionStore } from '@/context/sessionStore';
import type { CommunityGroup, GroupJoinRequest } from '@/types';
import styles from './GroupInfo.module.css';

// ==========================================================================
// GroupInfo — group info, member management, moderator controls,
//              join request approval for private groups, edit group (creator).
// ==========================================================================

type MemberWithRole = {
  id: string;
  displayName: string;
  photos: string[];
  verification: string;
  membership: string;
  adminRole: string;
  isOnline?: boolean;
  groupRole: string;
};

export function GroupInfoPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { profile } = useSessionStore();
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [members, setMembers] = useState<MemberWithRole[]>([]);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrivate, setEditPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isCreator = group?.createdBy === profile?.id;
  const isMod = isCreator || group?.userRole === 'moderator';

  useEffect(() => {
    if (!groupId) return;
    loadAll();
  }, [groupId]);

  async function loadAll() {
    if (!groupId) return;
    try {
      const [g, m] = await Promise.all([
        groupService.getGroup(groupId),
        groupService.getGroupMembers(groupId),
      ]);
      setGroup(g);
      setMembers(m as MemberWithRole[]);
      setEditName(g.name);
      setEditDesc(g.description);
      setEditPrivate(g.isPrivate);

      // Load join requests if moderator/creator
      if (g.userRole === 'creator' || g.userRole === 'moderator') {
        try {
          const requests = await groupService.getJoinRequests(groupId);
          setJoinRequests(requests);
        } catch {}
      }
    } catch {}
    finally { setLoading(false); }
  }

  const photoSrc = group?.photoUrl ? assetUrl(group.photoUrl) : null;

  async function handleSaveEdit() {
    if (!groupId) return;
    setSaving(true);
    try {
      const updated = await groupService.updateGroup(groupId, {
        name: editName,
        description: editDesc,
        isPrivate: editPrivate,
      });
      setGroup(updated);
      setShowEdit(false);
    } catch { /* fail silently */ }
    finally { setSaving(false); }
  }

  async function handleKickMember(memberId: string, memberName: string) {
    if (!groupId) return;
    if (!confirm(`Remove ${memberName} from the group?`)) return;
    setActionLoading(memberId);
    try {
      await groupService.kickMember(groupId, memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch { /* fail silently */ }
    finally { setActionLoading(null); }
  }

  async function handleToggleMod(member: MemberWithRole) {
    if (!groupId) return;
    setActionLoading(member.id);
    try {
      if (member.groupRole === 'moderator') {
        await groupService.removeModerator(groupId, member.id);
      } else {
        await groupService.addModerator(groupId, member.id);
      }
      await loadAll();
    } catch { /* fail silently */ }
    finally { setActionLoading(null); }
  }

  async function handleApproveRequest(requestId: string) {
    if (!groupId) return;
    setActionLoading(requestId);
    try {
      await groupService.approveJoinRequest(groupId, requestId);
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      await loadAll();
    } catch { /* fail silently */ }
    finally { setActionLoading(null); }
  }

  async function handleRejectRequest(requestId: string) {
    if (!groupId) return;
    setActionLoading(requestId);
    try {
      await groupService.rejectJoinRequest(groupId, requestId);
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
    } catch { /* fail silently */ }
    finally { setActionLoading(null); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <span className={styles.headerTitle}>Group Info</span>
        {isCreator && (
          <button className={styles.editBtn} onClick={() => setShowEdit(s => !s)} aria-label="Edit group">
            <Settings size={18} />
          </button>
        )}
      </div>

      {loading && <div className={styles.loading}>Loading…</div>}

      {!loading && group && (
        <div className={styles.content}>
          {/* Edit group panel */}
          {showEdit && isCreator && (
            <div className={styles.editPanel}>
              <h3 className={styles.editTitle}>Edit Group</h3>
              <label className={styles.editLabel}>Group name</label>
              <input
                className={styles.editInput}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Group name"
              />
              <label className={styles.editLabel}>Description</label>
              <textarea
                className={styles.editTextarea}
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                rows={3}
                placeholder="Description"
              />
              <label className={styles.editCheckLabel}>
                <input
                  type="checkbox"
                  checked={editPrivate}
                  onChange={e => setEditPrivate(e.target.checked)}
                />
                <Lock size={14} style={{ marginLeft: 6, marginRight: 4 }} />
                Private group (requires approval to join)
              </label>
              <div className={styles.editActions}>
                <button className={styles.cancelBtn} onClick={() => setShowEdit(false)}>Cancel</button>
                <button className={styles.saveBtn} onClick={handleSaveEdit} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          )}

          {/* Group avatar + name */}
          <div className={styles.groupHero}>
            {photoSrc
              ? <img src={photoSrc} alt={group.name} className={styles.groupPhoto} />
              : <div className={styles.groupPhotoPlaceholder}><Users size={36} /></div>
            }
            <h2 className={styles.groupName}>
              {group.name}
              {group.isPrivate && <Lock size={14} style={{ marginLeft: 6, verticalAlign: 'middle', opacity: 0.6 }} />}
            </h2>
            {group.description && <p className={styles.groupDesc}>{group.description}</p>}
            <span className={styles.memberCount}>{group.memberCount} members</span>
          </div>

          {/* Join requests (for private groups, visible to creator/mod) */}
          {isMod && joinRequests.length > 0 && (
            <div className={styles.memberSection}>
              <h3 className={styles.sectionTitle}>Join Requests ({joinRequests.length})</h3>
              {joinRequests.map(req => {
                const src = req.photos?.[0] ? assetUrl(req.photos[0]) : null;
                return (
                  <div key={req.id} className={styles.requestRow}>
                    <div className={styles.memberAvatar}>
                      {src ? <img src={src} alt={req.displayName} /> : <span>{(req.displayName?.[0] ?? '?').toUpperCase()}</span>}
                    </div>
                    <div className={styles.memberInfo} style={{ flex: 1 }}>
                      <span className={styles.memberName}>{req.displayName}</span>
                      <span className={styles.memberSub}>@{req.telegramUsername}</span>
                    </div>
                    <button
                      className={styles.approveBtn}
                      onClick={() => handleApproveRequest(req.id)}
                      disabled={actionLoading === req.id}
                      title="Approve"
                    >
                      <CheckCircle size={18} />
                    </button>
                    <button
                      className={styles.rejectBtn}
                      onClick={() => handleRejectRequest(req.id)}
                      disabled={actionLoading === req.id}
                      title="Reject"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Members list */}
          <div className={styles.memberSection}>
            <h3 className={styles.sectionTitle}>{group.memberCount} Members</h3>
            {members.map(member => {
              const src = member.photos?.[0] ? assetUrl(member.photos[0]) : null;
              const roleLabel =
                member.groupRole === 'creator' ? '👑 Creator' :
                member.groupRole === 'moderator' ? '🛡 Mod' : '';
              return (
                <div key={member.id} className={styles.memberRowWrap}>
                  <button
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
                        {roleLabel || (member.isOnline ? 'online' : 'offline')}
                      </span>
                    </div>
                  </button>
                  {/* Creator can toggle moderator role for non-creators */}
                  {isCreator && member.groupRole !== 'creator' && member.id !== profile?.id && (
                    <button
                      className={`${styles.modToggleBtn} ${member.groupRole === 'moderator' ? styles.modToggleBtnActive : ''}`}
                      onClick={() => handleToggleMod(member)}
                      disabled={actionLoading === member.id}
                      title={member.groupRole === 'moderator' ? 'Remove moderator' : 'Make moderator'}
                    >
                      {member.groupRole === 'moderator' ? <ShieldOff size={15} /> : <Shield size={15} />}
                    </button>
                  )}
                  {/* Kick button — creator, mods (non-mod targets), or super-admin */}
                  {isMod && member.groupRole !== 'creator' && member.id !== profile?.id &&
                    (member.groupRole !== 'moderator' || isCreator) && (
                    <button
                      className={styles.kickBtn}
                      onClick={() => handleKickMember(member.id, member.displayName)}
                      disabled={actionLoading === member.id}
                      title="Remove from group"
                    >
                      <UserMinus size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
