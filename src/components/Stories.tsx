import { useEffect, useRef, useState } from 'react';
import { Plus, X, Eye, Trash2 } from 'lucide-react';
import { storyService } from '@/api/services';
import { assetUrl } from '@/api/client';
import { useSessionStore } from '@/context/sessionStore';
import { formatDistanceToNowStrict } from 'date-fns';
import type { Story, MyStory, StoryViewer } from '@/types';
import styles from './Stories.module.css';

// ==========================================================================
// Stories — horizontal avatar row at top of Discover.
// Features: upload, view, swipe navigation, view counter, viewer list, delete.
// All API errors are caught silently so a backend failure never blanks the page.
// ==========================================================================

export function Stories() {
  const { profile } = useSessionStore();
  const [stories, setStories] = useState<Story[]>([]);
  const [myStory, setMyStory] = useState<MyStory | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showMyStory, setShowMyStory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ready, setReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('story-created', handler);
    return () => window.removeEventListener('story-created', handler);
  }, []);

  async function load() {
    try {
      const { stories: s, myStory: ms } = await storyService.getStories();
      setStories(s);
      setMyStory(ms);
    } catch {
      // table may not exist yet
    } finally {
      setReady(true);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const created = await storyService.createStory(file);
      setMyStory(created);
    } catch { /* fail silently */ }
    finally { setUploading(false); e.target.value = ''; }
  }

  async function handleViewStory(index: number) {
    setViewerIndex(index);
    const story = stories[index];
    if (story && !story.viewed) {
      storyService.markViewed(story.id).catch(() => {});
      setStories(prev => prev.map((s, i) => i === index ? { ...s, viewed: true, viewCount: (s.viewCount ?? 0) + 1 } : s));
    }
  }

  async function handleDeleteMyStory() {
    if (!myStory) return;
    try {
      await storyService.deleteStory(myStory.id);
      setMyStory(null);
      setShowMyStory(false);
    } catch { /* fail silently */ }
  }

  if (!ready) return null;
  if (stories.length === 0 && !myStory) return null;

  const myPhotoSrc = profile?.photos?.[0]
    ? assetUrl(profile.photos[0])
    : `https://i.pravatar.cc/80?u=${profile?.id}`;

  return (
    <>
      <div className={styles.row}>
        {/* My story */}
        <div className={styles.storyWrap}>
          <button
            className={`${styles.avatar} ${styles.myAvatar}`}
            onClick={() => myStory ? setShowMyStory(true) : fileRef.current?.click()}
            disabled={uploading}
            aria-label={myStory ? 'View my story' : 'Add story'}
          >
            <img
              src={myStory ? assetUrl(myStory.photoUrl) : myPhotoSrc}
              alt="My story"
              onError={(e) => { (e.target as HTMLImageElement).src = myPhotoSrc; }}
            />
            {!myStory && (
              <span className={styles.addBadge}>{uploading ? '…' : <Plus size={11} />}</span>
            )}
            <span className={`${styles.ring} ${myStory ? styles.ringMine : styles.ringAdd}`} />
          </button>
          <span className={styles.label}>You</span>
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={handleUpload} className={styles.fileInput} />
        </div>

        {stories.map((story, i) => {
          const src = story.avatar ? assetUrl(story.avatar) : `https://i.pravatar.cc/80?u=${story.userId}`;
          return (
            <div key={story.id} className={styles.storyWrap}>
              <button className={styles.avatar} onClick={() => handleViewStory(i)}
                aria-label={`${story.displayName}'s story`}>
                <img src={src} alt={story.displayName}
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://i.pravatar.cc/80?u=${story.userId}`; }} />
                <span className={`${styles.ring} ${story.viewed ? styles.ringViewed : styles.ringUnviewed}`} />
              </button>
              <span className={styles.label}>{story.displayName.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>

      {/* Full-screen viewer for other users' stories */}
      {viewerIndex !== null && (
        <StoryViewer
          stories={stories}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onNext={() => {
            const next = viewerIndex + 1;
            if (next < stories.length) handleViewStory(next);
            else setViewerIndex(null);
          }}
          onPrev={() => {
            const prev = viewerIndex - 1;
            if (prev >= 0) handleViewStory(prev);
          }}
        />
      )}

      {/* My own story viewer */}
      {showMyStory && myStory && (
        <MyStoryViewer
          myStory={myStory}
          myPhotoSrc={myPhotoSrc}
          displayName={profile?.displayName ?? ''}
          onClose={() => setShowMyStory(false)}
          onDelete={handleDeleteMyStory}
          onReplace={() => fileRef.current?.click()}
        />
      )}
    </>
  );
}

// ── Full-screen viewer with swipe support ─────────────────────────────────
function StoryViewer({ stories, index, onClose, onNext, onPrev }: {
  stories: Story[];
  index: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const story = stories[index];
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setProgress(0);
    setShowViewers(false);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(timerRef.current); onNext(); return 100; }
        return p + 1;
      });
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [index]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) onNext();
      else onPrev();
    }
    touchStartX.current = null;
  }

  if (!story) return null;

  const avatarSrc = story.avatar ? assetUrl(story.avatar) : `https://i.pravatar.cc/80?u=${story.userId}`;

  return (
    <div className={styles.viewer}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bars */}
      <div className={styles.progressBar}>
        {stories.map((_, i) => (
          <div key={i} className={styles.progressSegment}>
            <div className={styles.progressFill}
              style={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className={styles.viewerHeader}>
        <img src={avatarSrc} alt="" className={styles.viewerAvatar} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.viewerName}>{story.displayName}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
            {formatDistanceToNowStrict(new Date(story.createdAt))} ago
          </div>
        </div>
        <button className={styles.viewerClose} onClick={onClose} aria-label="Close"><X size={20} /></button>
      </div>

      {/* Story image */}
      <img src={assetUrl(story.photoUrl)} alt="Story" className={styles.storyImage}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />

      {/* View count */}
      {story.viewCount !== undefined && (
        <div className={styles.viewCount}>
          <Eye size={14} />
          <span>{story.viewCount}</span>
        </div>
      )}

      {/* Tap zones */}
      <button className={styles.tapLeft} onClick={e => { e.stopPropagation(); onPrev(); }} aria-label="Previous" />
      <button className={styles.tapRight} onClick={e => { e.stopPropagation(); onNext(); }} aria-label="Next" />

      {/* Viewers list sheet */}
      {showViewers && (
        <div className={styles.viewerSheet} onClick={() => setShowViewers(false)}>
          <div className={styles.viewerSheetInner} onClick={e => e.stopPropagation()}>
            <div className={styles.viewerSheetHeader}>
              <span>Viewers ({viewers.length})</span>
              <button onClick={() => setShowViewers(false)}><X size={16} /></button>
            </div>
            {viewers.map(v => (
              <div key={v.id} className={styles.viewerRow}>
                <img src={v.avatar ? assetUrl(v.avatar) : `https://i.pravatar.cc/40?u=${v.id}`}
                  className={styles.viewerRowAvatar} alt={v.displayName} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{v.displayName}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                    @{v.username} · {formatDistanceToNowStrict(new Date(v.viewedAt))} ago
                  </div>
                </div>
              </div>
            ))}
            {viewers.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--color-text-faint)', padding: 16 }}>No views yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── My own story viewer ────────────────────────────────────────────────────
function MyStoryViewer({ myStory, myPhotoSrc, displayName, onClose, onDelete }: {
  myStory: MyStory;
  myPhotoSrc: string;
  displayName: string;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    storyService.getViewers(myStory.id).then(setViewers).catch(() => {});
    timerRef.current = setInterval(() => {
      setProgress(p => Math.min(p + 1, 100));
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [myStory.id]);

  return (
    <div className={styles.viewer}>
      <div className={styles.progressBar}>
        <div className={styles.progressSegment}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className={styles.viewerHeader}>
        <img src={myPhotoSrc} alt="" className={styles.viewerAvatar} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.viewerName}>{displayName}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
            {formatDistanceToNowStrict(new Date(myStory.createdAt))} ago
          </div>
        </div>
        <button
          className={styles.viewerClose}
          onClick={() => setShowViewers(true)}
          aria-label="View viewers"
          title="View viewers"
        >
          <Eye size={18} />
          <span style={{ fontSize: 12, marginLeft: 3 }}>{viewers.length}</span>
        </button>
        <button className={styles.viewerClose} style={{ color: 'var(--color-danger)' }}
          onClick={onDelete} aria-label="Delete story"><Trash2 size={18} /></button>
        <button className={styles.viewerClose} onClick={onClose} aria-label="Close"><X size={20} /></button>
      </div>

      <img src={assetUrl(myStory.photoUrl)} alt="My story" className={styles.storyImage}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />

      {showViewers && (
        <div className={styles.viewerSheet} onClick={() => setShowViewers(false)}>
          <div className={styles.viewerSheetInner} onClick={e => e.stopPropagation()}>
            <div className={styles.viewerSheetHeader}>
              <span>Viewers ({viewers.length})</span>
              <button onClick={() => setShowViewers(false)}><X size={16} /></button>
            </div>
            {viewers.map(v => (
              <div key={v.id} className={styles.viewerRow}>
                <img src={v.avatar ? assetUrl(v.avatar) : `https://i.pravatar.cc/40?u=${v.id}`}
                  className={styles.viewerRowAvatar} alt={v.displayName} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{v.displayName}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                    @{v.username} · {formatDistanceToNowStrict(new Date(v.viewedAt))} ago
                  </div>
                </div>
              </div>
            ))}
            {viewers.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--color-text-faint)', padding: 16 }}>No views yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
