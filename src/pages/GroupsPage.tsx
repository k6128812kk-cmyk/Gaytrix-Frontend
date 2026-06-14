import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, ArrowUpDown, MessageSquare, Trash2, X, Camera } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { groupService } from '@/api/services';
import { assetUrl } from '@/api/client';
import { useSessionStore } from '@/context/sessionStore';
import type { CommunityGroup, GroupSortOption } from '@/types';
import styles from './GroupsPage.module.css';

// ==========================================================================
// GroupsPage — community group chats. Replaces the Map tab.
// ==========================================================================

const SORT_OPTIONS: { value: GroupSortOption; label: string }[] = [
  { value: 'recent', label: 'Most recent' },
  { value: 'last_message', label: 'Last message' },
  { value: 'members_desc', label: 'Most members' },
  { value: 'members_asc', label: 'Fewest members' },
];

export function GroupsPage() {
  const navigate = useNavigate();
  const { profile, isModerator } = useSessionStore();
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [sort, setSort] = useState<GroupSortOption>('recent');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    load();
  }, [sort]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(load, 400);
  }, [search]);

  async function load() {
    setLoading(true);
    try {
      const data = await groupService.getGroups(sort, search || undefined);
      setGroups(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(group: CommunityGroup) {
    const result = await groupService.joinGroup(group.id);
    setGroups(prev => prev.map(g =>
      g.id === group.id ? { ...g, isMember: true, memberCount: result.memberCount } : g
    ));
  }

  async function handleLeave(group: CommunityGroup) {
    const result = await groupService.leaveGroup(group.id);
    setGroups(prev => prev.map(g =>
      g.id === group.id ? { ...g, isMember: false, memberCount: result.memberCount } : g
    ));
  }

  async function handleDelete(group: CommunityGroup) {
    if (!confirm(`Delete "${group.name}"?`)) return;
    await groupService.deleteGroup(group.id);
    setGroups(prev => prev.filter(g => g.id !== group.id));
  }

  function canDelete(group: CommunityGroup) {
    return group.createdBy === profile?.id || isModerator();
  }

  const sortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? 'Sort';

  return (
    <div className={styles.page}>
      <PageHeader
        title="Groups"
        action={
          <button className={styles.addBtn} onClick={() => setShowCreate(true)} aria-label="Create group">
            <Plus size={20} />
          </button>
        }
      />

      {/* Search + sort */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search groups..."
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

      {/* Group list */}
      <div className={styles.list}>
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.skeleton} />
        ))}

        {!loading && groups.length === 0 && (
          <div className={styles.empty}>
            <Users size={40} />
            <h3>No groups yet</h3>
            <p>Be the first to create a community group!</p>
            <Button onClick={() => setShowCreate(true)}>Create group</Button>
          </div>
        )}

        {!loading && groups.map(group => (
          <GroupCard
            key={group.id}
            group={group}
            canDelete={canDelete(group)}
            onJoin={() => handleJoin(group)}
            onLeave={() => handleLeave(group)}
            onDelete={() => handleDelete(group)}
            onOpen={() => navigate(`/groups/${group.id}`)}
          />
        ))}
      </div>

      {/* Create group sheet */}
      {showCreate && (
        <CreateGroupSheet
          onClose={() => setShowCreate(false)}
          onCreated={group => { setGroups(prev => [group, ...prev]); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

// ── Group card ─────────────────────────────────────────────────────────────
function GroupCard({ group, canDelete, onJoin, onLeave, onDelete, onOpen }: {
  group: CommunityGroup;
  canDelete: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const photoSrc = group.photoUrl
    ? assetUrl(group.photoUrl)
    : `https://i.pravatar.cc/80?u=${group.id}`;

  return (
    <div className={styles.card}>
      <img src={photoSrc} alt={group.name} className={styles.cardPhoto} onClick={onOpen} />
      <div className={styles.cardBody} onClick={onOpen}>
        <div className={styles.cardName}>{group.name}</div>
        {group.description && <div className={styles.cardDesc}>{group.description}</div>}
        <div className={styles.cardMeta}>
          <span><Users size={12} /> {group.memberCount} members</span>
          {group.lastMessageAt && (
            <span>Active {formatDistanceToNowStrict(new Date(group.lastMessageAt))} ago</span>
          )}
        </div>
      </div>
      <div className={styles.cardActions}>
        {group.isMember ? (
          <>
            <button className={styles.chatBtn} onClick={onOpen} aria-label="Open chat">
              <MessageSquare size={18} />
            </button>
            <button className={styles.leaveBtn} onClick={e => { e.stopPropagation(); onLeave(); }} aria-label="Leave">
              Leave
            </button>
          </>
        ) : (
          <button className={styles.joinBtn} onClick={e => { e.stopPropagation(); onJoin(); }}>
            Join
          </button>
        )}
        {canDelete && (
          <button className={styles.deleteBtn} onClick={e => { e.stopPropagation(); onDelete(); }} aria-label="Delete group">
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Create group sheet ─────────────────────────────────────────────────────
function CreateGroupSheet({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (group: CommunityGroup) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
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
      const group = await groupService.createGroup(name.trim(), description.trim(), photo || undefined);
      onCreated(group);
    } catch {
      setError('Could not create group. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={e => e.stopPropagation()}>
        <div className={styles.sheetHeader}>
          <h3>Create group</h3>
          <button onClick={onClose} className={styles.closeBtn}><X size={18} /></button>
        </div>

        {/* Photo picker */}
        <label className={styles.photoPicker}>
          {photoPreview
            ? <img src={photoPreview} alt="Group photo" className={styles.photoPreview} />
            : <><Camera size={24} /><span>Add group photo</span></>
          }
          <input type="file" accept="image/*" onChange={handlePhoto} className={styles.fileInput} />
        </label>

        <div className={styles.field}>
          <label>Group name *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Istanbul LGBTQ+ Coffee" className={styles.input} />
        </div>

        <div className={styles.field}>
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What is this group about?" rows={3} className={styles.textarea} />
        </div>

        {error && <p className={styles.errorText}>{error}</p>}

        <Button fullWidth disabled={!name.trim() || submitting} onClick={handleSubmit}>
          {submitting ? 'Creating...' : 'Create group'}
        </Button>
      </div>
    </div>
  );
}
