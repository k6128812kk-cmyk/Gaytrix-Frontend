import { useEffect, useRef, useState } from 'react';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { storyService } from '@/api/services';
import { assetUrl } from '@/api/client';
import { useSessionStore } from '@/context/sessionStore';
import type { Story, MyStory } from '@/types';
import styles from './Stories.module.css';

// ==========================================================================
// Stories — horizontal avatar row at top of Discover.
// Errors are silently swallowed so a backend failure never blanks the page.
// ==========================================================================

export function Stories() {
  const { profile } = useSessionStore();
  const [stories, setStories] = useState<Story[]>([]);
  const [myStory, setMyStory] = useState<MyStory | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [ready, setReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    storyService.getStories()
      .then(({ stories: s, myStory: ms }) => {
        setStories(s);
        setMyStory(ms);
      })
      .catch(() => { /* Table may not exist yet — fail silently */ })
      .finally(() => setReady(true));
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const created = await storyService.createStory(file);
      setMyStory(created);
    } catch {
      // fail silently
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleViewStory(index: number) {
    setViewerIndex(index);
    const story = stories[index];
    if (story && !story.viewed) {
      storyService.markViewed(story.id).catch(() => {});
      setStories(prev => prev.map((s, i) => i === index ? { ...s, viewed: true } : s));
    }
  }

  // Don't render anything until loaded (avoid flash)
  if (!ready) return null;
  // No stories at all and no own story — hide the row entirely
  if (stories.length === 0 && !myStory) return null;

  const myPhotoSrc = profile?.photos?.[0]
    ? assetUrl(profile.photos[0])
    : `https://i.pravatar.cc/80?u=${profile?.id}`;

  return (
    <>
      <div className={styles.row}>
        {/* My story / add story button */}
        <div className={styles.storyWrap}>
          <button
            className={`${styles.avatar} ${styles.myAvatar}`}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label={myStory ? 'My story' : 'Add story'}
          >
            <img
              src={myStory ? assetUrl(myStory.photoUrl) : myPhotoSrc}
              alt="My story"
              onError={(e) => { (e.target as HTMLImageElement).src = myPhotoSrc; }}
            />
            {!myStory && (
              <span className={styles.addBadge}>
                {uploading ? '⏳' : <Plus size={12} />}
              </span>
            )}
            <span className={`${styles.ring} ${myStory ? styles.ringMine : styles.ringAdd}`} />
          </button>
          <span className={styles.label}>You</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleUpload}
            className={styles.fileInput}
          />
        </div>

        {/* Other users' stories */}
        {stories.map((story, i) => {
          const src = story.avatar
            ? assetUrl(story.avatar)
            : `https://i.pravatar.cc/80?u=${story.userId}`;
          return (
            <div key={story.id} className={styles.storyWrap}>
              <button
                className={styles.avatar}
                onClick={() => handleViewStory(i)}
                aria-label={`${story.displayName}'s story`}
              >
                <img
                  src={src}
                  alt={story.displayName}
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://i.pravatar.cc/80?u=${story.userId}`; }}
                />
                <span className={`${styles.ring} ${story.viewed ? styles.ringViewed : styles.ringUnviewed}`} />
              </button>
              <span className={styles.label}>{story.displayName.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>

      {/* Full-screen viewer */}
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
    </>
  );
}

// ── Full-screen story viewer ───────────────────────────────────────────────
function StoryViewer({ stories, index, onClose, onNext, onPrev }: {
  stories: Story[];
  index: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const story = stories[index];
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    setProgress(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timerRef.current);
          onNext();
          return 100;
        }
        return p + 1;
      });
    }, 50); // 5 seconds total
    return () => clearInterval(timerRef.current);
  }, [index]);

  if (!story) return null;

  const avatarSrc = story.avatar
    ? assetUrl(story.avatar)
    : `https://i.pravatar.cc/80?u=${story.userId}`;

  return (
    <div className={styles.viewer}>
      {/* Progress bars */}
      <div className={styles.progressBar}>
        {stories.map((_, i) => (
          <div key={i} className={styles.progressSegment}>
            <div
              className={styles.progressFill}
              style={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className={styles.viewerHeader}>
        <img src={avatarSrc} alt="" className={styles.viewerAvatar} />
        <span className={styles.viewerName}>{story.displayName}</span>
        <button className={styles.viewerClose} onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>

      {/* Story image */}
      <img src={assetUrl(story.photoUrl)} alt="Story" className={styles.storyImage} />

      {/* Tap zones for prev/next */}
      <button className={styles.tapLeft} onClick={e => { e.stopPropagation(); onPrev(); }} aria-label="Previous" />
      <button className={styles.tapRight} onClick={e => { e.stopPropagation(); onNext(); }} aria-label="Next" />
    </div>
  );
}
