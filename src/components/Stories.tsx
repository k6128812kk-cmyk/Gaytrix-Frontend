import { useEffect, useRef, useState } from 'react';
import { Plus, X, Eye, Trash2, Send } from 'lucide-react';
import { storyService } from '@/api/services';
import { assetUrl } from '@/api/client';
import { useSessionStore } from '@/context/sessionStore';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import type { Story, MyStory, StoryViewer } from '@/types';
import styles from './Stories.module.css';

// ==========================================================================
// Stories — circular avatars with thumbnail preview, full-screen viewer,
// swipe navigation, view counter, viewer list, replies, and delete.
// All API errors are silently caught so no story failure blanks the page.
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
    window.addEventListener('story-created', load);
    return () => window.removeEventListener('story-created', load);
  }, []);

  async function load() {
    try {
      const { stories: s, myStory: ms } = await storyService.getStories();
      setStories(s);
      setMyStory(ms);
    } catch { /* fail silently */ }
    finally { setReady(true); }
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
      setStories(prev => prev.map((s, i) => i === index
        ? { ...s, viewed: true, viewCount: (s.viewCount ?? 0) + 1 } : s));
    }
  }

  async function handleDeleteMyStory() {
    if (!myStory) return;
    try { await storyService.deleteStory(myStory.id); setMyStory(null); setShowMyStory(false); }
    catch { /* fail silently */ }
  }

  if (!ready) return null;
  if (stories.length === 0 && !myStory) return null;

  const myPhotoSrc = profile?.photos?.[0]
    ? assetUrl(profile.photos[0])
    : `https://i.pravatar.cc/80?u=${profile?.id}`;
  const myStoryThumb = myStory ? assetUrl(myStory.photoUrl) : null;

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
            {/* Thumbnail preview inside circle */}
            <img
              src={myStoryThumb ?? myPhotoSrc}
              alt="My story"
              className={styles.avatarImg}
              onError={(e) => { (e.target as HTMLImageElement).src = myPhotoSrc; }}
            />
            {!myStory && (
              <span className={styles.addBadge}>{uploading ? '…' : <Plus size={11} />}</span>
            )}
            <span className={`${styles.ring} ${myStory ? styles.ringMine : styles.ringAdd}`} />
          </button>
          <span className={styles.label}>You</span>
          <input ref={fileRef} type="file" accept="image/*,video/*"
            onChange={handleUpload} className={styles.fileInput} />
        </div>

        {stories.map((story, i) => {
          const thumbSrc = story.photoUrl ? assetUrl(story.photoUrl) : null;
          const avatarSrc = story.avatar ? assetUrl(story.avatar) : `https://i.pravatar.cc/80?u=${story.userId}`;
          return (
            <div key={story.id} className={styles.storyWrap}>
              <button className={styles.avatar} onClick={() => handleViewStory(i)}
                aria-label={`${story.displayName}'s story`}>
                {/* Story thumbnail as background, avatar as overlay */}
                <img
                  src={thumbSrc ?? avatarSrc}
                  alt={story.displayName}
                  className={styles.avatarImg}
                  onError={(e) => { (e.target as HTMLImageElement).src = avatarSrc; }}
                />
                {/* Small profile photo overlay bottom-left */}
                <img
                  src={avatarSrc}
                  alt=""
                  className={styles.avatarOverlay}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className={`${styles.ring} ${story.viewed ? styles.ringViewed : styles.ringUnviewed}`} />
              </button>
              <span className={styles.label}>{story.displayName.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>

      {/* Viewer for other users' stories */}
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
        />
      )}
    </>
  );
}

// ── Full-screen viewer ─────────────────────────────────────────────────────
function StoryViewer({ stories, index, onClose, onNext, onPrev }: {
  stories: Story[];
  index: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const navigate = useNavigate();
  const story = stories[index];
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

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
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - (touchStartY.current ?? 0));
    if (Math.abs(dx) > 50 && dy < 80) {
      dx < 0 ? onNext() : onPrev();
    }
    touchStartX.current = null;
  }

  async function handleSendReply() {
    if (!replyText.trim() || !story) return;
    setReplying(true);
    try {
      const result = await storyService.replyToStory(story.id, replyText.trim());
      setReplyText('');
      onClose();
      if (result.conversationId) navigate(`/chat/${result.conversationId}`);
    } catch { /* fail silently */ }
    finally { setReplying(false); }
  }

  if (!story) return null;
  const avatarSrc = story.avatar ? assetUrl(story.avatar) : `https://i.pravatar.cc/80?u=${story.userId}`;

  return (
    <div className={styles.viewer} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
        <button className={styles.viewerClose} onClick={onClose}><X size={20} /></button>
      </div>

      {/* Story image */}
      <img src={assetUrl(story.photoUrl)} alt="Story" className={styles.storyImage} />

      {/* View count */}
      {story.viewCount !== undefined && story.viewCount > 0 && (
        <div className={styles.viewCount}><Eye size={14} /><span>{story.viewCount}</span></div>
      )}

      {/* Tap zones */}
      <button className={styles.tapLeft} onClick={e => { e.stopPropagation(); onPrev(); }} />
      <button className={styles.tapRight} onClick={e => { e.stopPropagation(); onNext(); }} />

      {/* Reply bar */}
      <div className={styles.replyBar} onClick={e => e.stopPropagation()}>
        <input
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendReply()}
          placeholder={`Reply to ${story.displayName}…`}
          className={styles.replyInput}
        />
        {replyText.trim() && (
          <button className={styles.replyBtn} onClick={handleSendReply} disabled={replying}>
            <Send size={16} />
          </button>
        )}
      </div>

      {/* Viewers sheet */}
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
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{v.displayName}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                    @{v.username} · {formatDistanceToNowStrict(new Date(v.viewedAt))} ago
                  </div>
                </div>
              </div>
            ))}
            {viewers.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-text-faint)', padding: 16 }}>No views yet</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── My own story viewer ────────────────────────────────────────────────────
function MyStoryViewer({ myStory, myPhotoSrc, displayName, onClose, onDelete }: {
  myStory: MyStory; myPhotoSrc: string; displayName: string;
  onClose: () => void; onDelete: () => void;
}) {
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    storyService.getViewers(myStory.id).then(setViewers).catch(() => {});
    timerRef.current = setInterval(() => setProgress(p => Math.min(p + 1, 100)), 50);
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
        <div style={{ flex: 1 }}>
          <div className={styles.viewerName}>{displayName}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
            {formatDistanceToNowStrict(new Date(myStory.createdAt))} ago
          </div>
        </div>
        <button className={styles.viewerClose} onClick={() => setShowViewers(true)} title="View viewers">
          <Eye size={16} /><span style={{ fontSize: 12, marginLeft: 3 }}>{viewers.length}</span>
        </button>
        <button className={styles.viewerClose} style={{ color: '#e74c3c' }} onClick={onDelete}><Trash2 size={16} /></button>
        <button className={styles.viewerClose} onClick={onClose}><X size={20} /></button>
      </div>

      <img src={assetUrl(myStory.photoUrl)} alt="My story" className={styles.storyImage} />

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
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{v.displayName}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                    @{v.username} · {formatDistanceToNowStrict(new Date(v.viewedAt))} ago
                  </div>
                </div>
              </div>
            ))}
            {viewers.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-text-faint)', padding: 16 }}>No views yet</p>}
          </div>
        </div>
      )}
    </div>
  );
}
