import { useEffect, useRef, useState } from 'react';
import { Plus, X, Eye, Trash2, Send, Camera, Image as ImageIcon } from 'lucide-react';
import { storyService } from '@/api/services';
import { assetUrl } from '@/api/client';
import { useSessionStore } from '@/context/sessionStore';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n/useTranslation';
import { formatDistanceToNowStrict } from 'date-fns';
import type { Story, MyStory, StoryViewer } from '@/types';
import styles from './Stories.module.css';

// ==========================================================================
// Stories — circular avatars, full-screen viewer, multi-story per user.
// Tab bar is hidden whenever a story modal or caption sheet is open.
// Only the story owner can see view analytics.
// ==========================================================================

const STORY_VIEWING_CLASS = 'story-viewing';

function hideTabBar() { document.body.classList.add(STORY_VIEWING_CLASS); }
function showTabBar() { document.body.classList.remove(STORY_VIEWING_CLASS); }

export function Stories() {
  const { profile } = useSessionStore();
  const { t } = useTranslation();
  const [stories, setStories] = useState<Story[]>([]);
  const [myStory, setMyStory] = useState<MyStory | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showMyStory, setShowMyStory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  // Caption sheet state
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [ready, setReady] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
    window.addEventListener('story-created', load);
    return () => {
      window.removeEventListener('story-created', load);
      showTabBar(); // cleanup on unmount
    };
  }, []);

  async function load() {
    try {
      const { stories: s, myStory: ms } = await storyService.getStories();
      setStories(s);
      setMyStory(ms);
    } catch { /* fail silently */ }
    finally { setReady(true); }
  }

  // File selected → open caption sheet (tabbar hidden here too)
  function handleFileSelect(file: File) {
    setShowAddSheet(false);
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    setCaption('');
    setShowCaptionInput(true);
    hideTabBar(); // hide while composing caption
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileSelect(file);
  }

  function cancelCaption() {
    setShowCaptionInput(false);
    setPendingFile(null);
    setPendingPreview(null);
    setCaption('');
    showTabBar();
    if (cameraRef.current) cameraRef.current.value = '';
    if (galleryRef.current) galleryRef.current.value = '';
  }

  async function handleUploadWithCaption() {
    if (!pendingFile) return;
    setUploading(true);
    setShowCaptionInput(false);
    showTabBar(); // restore after caption sheet closes
    try {
      const created = await storyService.createStory(pendingFile, caption);
      setMyStory(created);
      await load();
      window.dispatchEvent(new CustomEvent('story-created'));
    } catch { /* fail silently */ }
    finally {
      setUploading(false);
      setPendingFile(null);
      setPendingPreview(null);
      setCaption('');
      if (cameraRef.current) cameraRef.current.value = '';
      if (galleryRef.current) galleryRef.current.value = '';
    }
  }

  function handlePlusClick() {
    if (myStory) {
      openMyStoryViewer();
    } else {
      setShowAddSheet(true);
    }
  }

  function openViewer(index: number) {
    setViewerIndex(index);
    hideTabBar();
    const story = stories[index];
    if (story && !story.viewed) {
      storyService.markViewed(story.id).catch(() => {});
      setStories(prev => prev.map((s, i) => i === index
        ? { ...s, viewed: true } : s));
    }
  }

  function closeViewer() {
    setViewerIndex(null);
    showTabBar();
  }

  function openMyStoryViewer() {
    setShowMyStory(true);
    hideTabBar();
  }

  function closeMyStoryViewer() {
    setShowMyStory(false);
    showTabBar();
  }

  async function handleDeleteMyStory(storyId: string) {
    if (!myStory) return;
    try {
      await storyService.deleteStory(storyId);
      await load();
      if (!myStory.allStories || myStory.allStories.length <= 1) {
        closeMyStoryViewer();
      }
    } catch { /* fail silently */ }
  }

  if (!ready) return null;

  const myPhotoSrc = profile?.photos?.[0]
    ? assetUrl(profile.photos[0])
    : '/avatar-placeholder.svg';
  const myStoryThumb = myStory ? assetUrl(myStory.photoUrl) : null;

  const hasContent = stories.length > 0 || myStory !== null;

  return (
    <>
      <div className={styles.row}>
        {/* My story / add button */}
        <div className={styles.storyWrap}>
          <button
            className={`${styles.avatar} ${styles.myAvatar}`}
            onClick={handlePlusClick}
            disabled={uploading}
            aria-label={myStory ? t('myStory') : t('addStory')}
          >
            <img
              src={myStoryThumb ?? myPhotoSrc}
              alt={t('myStory')}
              className={styles.avatarImg}
              onError={(e) => { (e.target as HTMLImageElement).src = myPhotoSrc; }}
            />
            {!myStory && (
              <span className={styles.addBadge}>{uploading ? '…' : <Plus size={11} />}</span>
            )}
            <span className={`${styles.ring} ${myStory ? styles.ringMine : styles.ringAdd}`} />
          </button>
          <span className={styles.label}>{uploading ? t('storyUploading') : t('you')}</span>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment"
            onChange={handleFileChange} className={styles.fileInput} />
          <input ref={galleryRef} type="file" accept="image/*"
            onChange={handleFileChange} className={styles.fileInput} />
        </div>

        {stories.map((story, i) => {
          const thumbSrc = story.photoUrl ? assetUrl(story.photoUrl) : null;
          const avatarSrc = story.avatar ? assetUrl(story.avatar) : '/avatar-placeholder.svg';
          const allViewed = story.stories?.every(s => s.viewed) ?? story.viewed;
          return (
            <div key={story.userId} className={styles.storyWrap}>
              <button className={styles.avatar} onClick={() => openViewer(i)}
                aria-label={`${story.displayName}'s story`}>
                <img
                  src={thumbSrc ?? avatarSrc}
                  alt={story.displayName}
                  className={styles.avatarImg}
                  onError={(e) => { (e.target as HTMLImageElement).src = avatarSrc; }}
                />
                {/* Small avatar overlay in bottom-left */}
                <img
                  src={avatarSrc}
                  alt=""
                  className={styles.avatarOverlay}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className={`${styles.ring} ${allViewed ? styles.ringViewed : styles.ringUnviewed}`} />
                {story.stories && story.stories.length > 1 && (
                  <span className={styles.storyCountBadge}>{story.stories.length}</span>
                )}
              </button>
              <span className={styles.label}>{story.displayName.split(' ')[0]}</span>
            </div>
          );
        })}

        {!hasContent && (
          <p className={styles.noStories}>{t('noStoriesYet')}</p>
        )}
      </div>

      {/* Bottom sheet — camera vs gallery */}
      {showAddSheet && (
        <div className={styles.sheet} onClick={() => setShowAddSheet(false)}>
          <div className={styles.sheetInner} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h3 className={styles.sheetTitle}>{t('addStoryTitle')}</h3>
            <p className={styles.sheetSubtitle}>{t('addStoryOption')}</p>
            <button className={styles.sheetBtn} onClick={() => { setShowAddSheet(false); setTimeout(() => cameraRef.current?.click(), 50); }}>
              <Camera size={22} /><span>{t('takePhoto')}</span>
            </button>
            <button className={styles.sheetBtn} onClick={() => { setShowAddSheet(false); setTimeout(() => galleryRef.current?.click(), 50); }}>
              <ImageIcon size={22} /><span>{t('uploadPhoto')}</span>
            </button>
            <button className={styles.sheetCancel} onClick={() => setShowAddSheet(false)}>{t('cancel')}</button>
          </div>
        </div>
      )}

      {/* Caption sheet — tabbar already hidden when this is open */}
      {showCaptionInput && pendingPreview && (
        <div className={styles.captionSheet}>
          <div className={styles.captionPreviewWrap}>
            <img src={pendingPreview} alt="Preview" className={styles.captionPreviewImg} />
          </div>
          <div className={styles.captionInputWrap}>
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder={t('captionPlaceholder')}
              className={styles.captionInput}
              maxLength={500}
              autoFocus
            />
            <div className={styles.captionActions}>
              <button className={styles.captionCancel} onClick={cancelCaption}>{t('cancel')}</button>
              <button className={styles.captionShare} onClick={handleUploadWithCaption} disabled={uploading}>
                {uploading ? t('storyUploading') : 'Share story'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story viewer — other users' stories */}
      {viewerIndex !== null && (
        <StoryViewer
          stories={stories}
          index={viewerIndex}
          onClose={closeViewer}
          onNext={() => {
            const next = viewerIndex + 1;
            if (next < stories.length) openViewer(next);
            else closeViewer();
          }}
          onPrev={() => {
            const prev = viewerIndex - 1;
            if (prev >= 0) openViewer(prev);
          }}
        />
      )}

      {/* My own story viewer */}
      {showMyStory && myStory && (
        <MyStoryViewer
          myStory={myStory}
          myPhotoSrc={myPhotoSrc}
          displayName={profile?.displayName ?? ''}
          onClose={closeMyStoryViewer}
          onDelete={handleDeleteMyStory}
          onAddMore={() => { closeMyStoryViewer(); setTimeout(() => setShowAddSheet(true), 100); }}
        />
      )}
    </>
  );
}

// ── Confirmation dialog ────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className={styles.confirmOverlay} onClick={onCancel}>
      <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
        <p className={styles.confirmMessage}>{message}</p>
        <div className={styles.confirmActions}>
          <button className={styles.confirmCancel} onClick={onCancel}>Cancel</button>
          <button className={styles.confirmDelete} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Full-screen story viewer (other users) ─────────────────────────────────
function StoryViewer({ stories, index, onClose, onNext, onPrev }: {
  stories: Story[];
  index: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const story = stories[index];
  const [subIndex, setSubIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const subStories = story?.stories || [{ id: story?.id, photoUrl: story?.photoUrl, caption: story?.caption || '', createdAt: story?.createdAt, viewed: story?.viewed }];
  const currentSub = subStories[subIndex] || subStories[0];

  useEffect(() => { setSubIndex(0); }, [index]);

  useEffect(() => {
    if (showViewers) {
      storyService.getViewers(currentSub.id).then(setViewers).catch(() => {});
    }
  }, [showViewers, subIndex]);

  useEffect(() => {
    setProgress(0);
    setShowViewers(false);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timerRef.current);
          if (subIndex < subStories.length - 1) setSubIndex(prev => prev + 1);
          else onNext();
          return 100;
        }
        return p + 1;
      });
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [index, subIndex]);

  function goNextSub() {
    if (subIndex < subStories.length - 1) setSubIndex(prev => prev + 1);
    else onNext();
  }
  function goPrevSub() {
    if (subIndex > 0) setSubIndex(prev => prev - 1);
    else onPrev();
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - (touchStartY.current ?? 0));
    if (Math.abs(dx) > 50 && dy < 80) { dx < 0 ? goNextSub() : goPrevSub(); }
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
  const avatarSrc = story.avatar ? assetUrl(story.avatar) : '/avatar-placeholder.svg';

  return (
    <div className={styles.viewer} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Progress bars */}
      <div className={styles.progressBar}>
        {subStories.map((_, i) => (
          <div key={i} className={styles.progressSegment}>
            <div className={styles.progressFill}
              style={{ width: i < subIndex ? '100%' : i === subIndex ? `${progress}%` : '0%' }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className={styles.viewerHeader}>
        <img src={avatarSrc} alt="" className={styles.viewerAvatar}
          onClick={() => { onClose(); navigate(`/u/${story.userId}`); }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={styles.viewerName}
            onClick={() => { onClose(); navigate(`/u/${story.userId}`); }}>
            {story.displayName}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
            {formatDistanceToNowStrict(new Date(currentSub.createdAt))} ago
          </div>
        </div>
        <button className={styles.viewerClose} onClick={onClose}><X size={20} /></button>
      </div>

      {/* Story image */}
      <img src={assetUrl(currentSub.photoUrl)} alt="Story" className={styles.storyImage} />

      {/* Caption */}
      {currentSub.caption && (
        <div className={styles.captionOverlay}>
          <p className={styles.captionText}>{currentSub.caption}</p>
        </div>
      )}

      {/* Tap zones */}
      <button className={styles.tapLeft} onClick={e => { e.stopPropagation(); goPrevSub(); }} />
      <button className={styles.tapRight} onClick={e => { e.stopPropagation(); goNextSub(); }} />

      {/* Reply bar */}
      <div className={styles.replyBar} onClick={e => e.stopPropagation()}>
        <input
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendReply()}
          placeholder={`${t('replyTo')} ${story.displayName}…`}
          className={styles.replyInput}
        />
        {replyText.trim() && (
          <button className={styles.replyBtn} onClick={handleSendReply} disabled={replying}>
            <Send size={16} />
          </button>
        )}
      </div>

      {/* Viewers sheet — only story owner can see this, but owner sees own stories in MyStoryViewer */}
      {showViewers && (
        <div className={styles.viewerSheet} onClick={() => setShowViewers(false)}>
          <div className={styles.viewerSheetInner} onClick={e => e.stopPropagation()}>
            <div className={styles.viewerSheetHeader}>
              <span>{t('viewersLabel')} ({viewers.length})</span>
              <button onClick={() => setShowViewers(false)}><X size={16} /></button>
            </div>
            {viewers.map(v => (
              <div key={v.id} className={styles.viewerRow}>
                <img src={v.avatar ? assetUrl(v.avatar) : '/avatar-placeholder.svg'}
                  className={styles.viewerRowAvatar} alt={v.displayName} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{v.displayName}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                    @{v.username} · {formatDistanceToNowStrict(new Date(v.viewedAt))} ago
                  </div>
                </div>
              </div>
            ))}
            {viewers.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-text-faint)', padding: 16 }}>{t('noViewsYet')}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── My own story viewer ────────────────────────────────────────────────────
function MyStoryViewer({ myStory, myPhotoSrc, displayName, onClose, onDelete, onAddMore }: {
  myStory: MyStory; myPhotoSrc: string; displayName: string;
  onClose: () => void; onDelete: (id: string) => void; onAddMore: () => void;
}) {
  const { t } = useTranslation();
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const [progress, setProgress] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const allStories = myStory.allStories || [{ id: myStory.id, photoUrl: myStory.photoUrl, caption: myStory.caption || '', createdAt: myStory.createdAt }];
  const currentStory = allStories[subIndex] || allStories[0];

  useEffect(() => {
    storyService.getViewers(currentStory.id).then(setViewers).catch(() => {});
  }, [subIndex, currentStory.id]);

  useEffect(() => {
    setProgress(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timerRef.current);
          if (subIndex < allStories.length - 1) setSubIndex(prev => prev + 1);
          return 100;
        }
        return p + 1;
      });
    }, 50);
    return () => clearInterval(timerRef.current);
  }, [subIndex]);

  return (
    <div className={styles.viewer}>
      <div className={styles.progressBar}>
        {allStories.map((_, i) => (
          <div key={i} className={styles.progressSegment}>
            <div className={styles.progressFill}
              style={{ width: i < subIndex ? '100%' : i === subIndex ? `${progress}%` : '0%' }} />
          </div>
        ))}
      </div>

      <div className={styles.viewerHeader}>
        <img src={myPhotoSrc} alt="" className={styles.viewerAvatar} />
        <div style={{ flex: 1 }}>
          <div className={styles.viewerName}>{displayName}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
            {formatDistanceToNowStrict(new Date(currentStory.createdAt))} ago
          </div>
        </div>
        {/* Add more stories */}
        <button className={styles.viewerClose} onClick={onAddMore} title="Add another story">
          <Plus size={16} />
        </button>
        {/* View count — only owner sees this */}
        <button className={styles.viewerClose} onClick={() => setShowViewers(true)} title={t('viewersLabel')}>
          <Eye size={16} /><span style={{ fontSize: 12, marginLeft: 3 }}>{viewers.length}</span>
        </button>
        {/* Delete with confirmation */}
        <button className={styles.viewerClose} style={{ color: '#e74c3c' }}
          onClick={() => setConfirmDeleteId(currentStory.id)} title={t('deleteStory')}>
          <Trash2 size={16} />
        </button>
        <button className={styles.viewerClose} onClick={onClose}><X size={20} /></button>
      </div>

      <img src={assetUrl(currentStory.photoUrl)} alt={t('myStory')} className={styles.storyImage} />

      {currentStory.caption && (
        <div className={styles.captionOverlay}>
          <p className={styles.captionText}>{currentStory.caption}</p>
        </div>
      )}

      {subIndex > 0 && (
        <button className={styles.tapLeft} onClick={() => setSubIndex(prev => prev - 1)} />
      )}
      {subIndex < allStories.length - 1 && (
        <button className={styles.tapRight} onClick={() => setSubIndex(prev => prev + 1)} />
      )}

      {/* Delete confirmation dialog */}
      {confirmDeleteId && (
        <ConfirmDialog
          message={t('confirmDeleteStory')}
          onConfirm={() => { const id = confirmDeleteId; setConfirmDeleteId(null); onDelete(id); }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {showViewers && (
        <div className={styles.viewerSheet} onClick={() => setShowViewers(false)}>
          <div className={styles.viewerSheetInner} onClick={e => e.stopPropagation()}>
            <div className={styles.viewerSheetHeader}>
              <span>{t('viewersLabel')} ({viewers.length})</span>
              <button onClick={() => setShowViewers(false)}><X size={16} /></button>
            </div>
            {viewers.map(v => (
              <div key={v.id} className={styles.viewerRow}>
                <img src={v.avatar ? assetUrl(v.avatar) : '/avatar-placeholder.svg'}
                  className={styles.viewerRowAvatar} alt={v.displayName} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{v.displayName}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                    @{v.username} · {formatDistanceToNowStrict(new Date(v.viewedAt))} ago
                  </div>
                </div>
              </div>
            ))}
            {viewers.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-text-faint)', padding: 16 }}>{t('noViewsYet')}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
