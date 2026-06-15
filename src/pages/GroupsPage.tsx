import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, ArrowUpDown, MessageSquare, Trash2, X, Camera, Lock, Clock } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { groupService } from '@/api/services';
import { assetUrl } from '@/api/client';
import { useSessionStore } from '@/context/sessionStore';
import { useTranslation } from '@/i18n/useTranslation';
import type { CommunityGroup, GroupSortOption } from '@/types';
import styles from './GroupsPage.module.css';

export function GroupsPage() {
  const navigate = useNavigate();
  const { profile, isModerator } = useSessionStore();
  const { t } = useTranslation();
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [sort, setSort] = useState<GroupSortOption>('recent');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const SORT_OPTIONS: { value: GroupSortOption; label: string }[] = [
    { value: 'recent', label: 'Most recent' },
    { value: 'last_message', label: 'Last message' },
    { value: 'members_desc', label: 'Most members' },
    { value: 'members_asc', label: 'Fewest members' },
  ];

  useEffect(() => { load(); }, [sort]);
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(load, 400);
  }, [search]);

  async function load() {
    setLoading(true);
    try {
      const data = await groupService.getGroups(sort, search || undefined);
      setGroups(data);
    } finally { setLoading(false); }
  }

  async function handleJoin(group: CommunityGroup) {
    try {
      const result = await groupService.joinGroup(group.id);
      if (result.status === 'joined') {
        setGroups(prev => prev.map(g =>
          g.id === group.id ? { ...g, isMember: true, userRole: 'member', memberCount: result.memberCount ?? g.memberCount } : g
        ));
        navigate(`/groups/${group.id}`);
      } else if (result.status === 'request_pending') {
        // Update local state to show pending state
        setGroups(prev => prev.map(g =>
          g.id === group.id ? { ...g, joinRequestStatus: 'pending' } : g
        ));
      } else if (result.status === 'already_member') {
        navigate(`/groups/${group.id}`);
      }
    } catch { /* fail silently */ }
  }

  async function handleDelete(group: CommunityGroup) {
    if (!confirm(`Delete "${group.name}"?`)) return;
    try {
      await groupService.deleteGroup(group.id);
      setGroups(prev => prev.filter(g => g.id !== group.id));
    } catch { /* fail silently */ }
  }

  function canDelete(group: CommunityGroup) {
    return group.createdBy === profile?.id || isModerator();
  }

  const sortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? 'Sort';

  return (
    <div className={styles.page}>
      <PageHeader
        title={t('groups')}
        action={
          <button className={styles.addBtn} onClick={() => setShowCreate(true)} aria-label={t('createGroup')}>
            <Plus size={20} />
          </button>
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('search')}
            className={styles.searchInput}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <button className={styles.sortBtn} onClick={() => setShowSortMenu(v => !v)}>
            <ArrowUpDown size={14} />
            <span className={styles.sortLabel}>{sortLabel}</span>
          </button>
          {showSortMenu && (
            <div className={styles.sortMenu}>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`${styles.sortOption} ${sort === opt.value ? styles.sortOptionActive : ''}`}
                  onClick={() => { setSort(opt.value); setShowSortMenu(false); }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.list}>
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.skeleton} />
        ))}
        {!loading && groups.length === 0 && (
          <div className={styles.empty}>
            <Users size={40} />
            <h3>{t('noGroupsYet')}</h3>
            <p>{t('beFirstToCreate')}</p>
            <Button onClick={() => setShowCreate(true)}>{t('createGroup')}</Button>
          </div>
        )}
        {!loading && groups.map(group => (
          <GroupCard
            key={group.id}
            group={group}
            canDelete={canDelete(group)}
            onJoin={() => handleJoin(group)}
            onDelete={() => handleDelete(group)}
            onOpen={() => {
              // For private groups, only members/admins can open
              if (group.isPrivate && !group.isMember) {
                handleJoin(group);
                return;
              }
              navigate(`/groups/${group.id}`);
            }}
          />
        ))}
      </div>

      {showCreate && (
        <CreateGroupSheet
          onClose={() => setShowCreate(false)}
          onCreated={group => { setGroups(prev => [group, ...prev]); setShowCreate(false); navigate(`/groups/${group.id}`); }}
        />
      )}
    </div>
  );
}

function GroupCard({ group, canDelete, onJoin, onDelete, onOpen }: {
  group: CommunityGroup;
  canDelete: boolean;
  onJoin: () => void;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const [joining, setJoining] = useState(false);
  const photoSrc = group.photoUrl ? assetUrl(group.photoUrl) : null;

  async function handleJoinClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (joining) return;
    setJoining(true);
    try { await onJoin(); } finally { setJoining(false); }
  }

  const isPending = group.joinRequestStatus === 'pending';

  return (
    <div className={styles.card}>
      {photoSrc
        ? <img src={photoSrc} alt={group.name} className={styles.cardPhoto} onClick={onOpen} />
        : <div className={styles.cardPhotoPlaceholder} onClick={onOpen}>
            <span style={{ fontSize: 24 }}>👥</span>
          </div>
      }
      <div className={styles.cardBody} onClick={onOpen}>
        <div className={styles.cardName}>
          {group.isPrivate && <Lock size={11} style={{ marginRight: 4, verticalAlign: 'middle', opacity: 0.6 }} />}
          {group.name}
        </div>
        {group.description && <div className={styles.cardDesc}>{group.description}</div>}
        <div className={styles.cardMeta}>
          <span><Users size={12} /> {group.memberCount} {t('members')}</span>
          {group.lastMessageAt && (
            <span>{formatDistanceToNowStrict(new Date(group.lastMessageAt))} ago</span>
          )}
        </div>
      </div>
      <div className={styles.cardActions}>
        {group.isMember ? (
          <button className={styles.chatBtn} onClick={onOpen} aria-label={t('messageGroup')}>
            <MessageSquare size={18} />
          </button>
        ) : isPending ? (
          <span className={styles.pendingBadge}>
            <Clock size={12} /> Pending
          </span>
        ) : (
          <button className={styles.joinBtn} onClick={handleJoinClick} disabled={joining}>
            {joining ? '…' : (group.isPrivate ? 'Request' : t('join'))}
          </button>
        )}
        {canDelete && (
          <button className={styles.deleteBtn} onClick={e => { e.stopPropagation(); onDelete(); }} aria-label={t('delete')}>
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

function CreateGroupSheet({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (group: CommunityGroup) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    setSubmitting(true); setError(null);
    try {
      const group = await groupService.createGroup(name.trim(), description.trim(), photo || undefined, isPrivate);
      onCreated(group);
    } catch {
      setError(t('couldNotCreateGroup'));
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.sheetHeader}>
          <h3>{t('createGroup')}</h3>
          <button onClick={onClose} className={styles.closeBtn}><X size={18} /></button>
        </div>
        <label className={styles.photoPicker}>
          {photoPreview
            ? <img src={photoPreview} alt="Group photo" className={styles.photoPreview} />
            : <><Camera size={24} /><span>{t('addGroupPhoto')}</span></>
          }
          <input type="file" accept="image/*" onChange={handlePhoto} className={styles.fileInput} />
        </label>
        <div className={styles.field}>
          <label>{t('groupName')} *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder={t('groupName')} className={styles.input} />
        </div>
        <div className={styles.field}>
          <label>{t('groupDescription')}</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder={t('groupDescription')} rows={3} className={styles.textarea} />
        </div>
        <label className={styles.privateToggle}>
          <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
          <Lock size={14} style={{ marginRight: 6 }} />
          Private group — members must request to join
        </label>
        {error && <p className={styles.errorText}>{error}</p>}
        <Button fullWidth disabled={!name.trim() || submitting} onClick={handleSubmit}>
          {submitting ? t('creating') : t('createGroup')}
        </Button>
      </div>
    </div>
  );
}
