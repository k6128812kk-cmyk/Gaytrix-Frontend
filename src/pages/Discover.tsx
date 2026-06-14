import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SlidersHorizontal, ShieldCheck, Sparkles, Clock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Stories } from '@/components/Stories';
import { discoveryService } from '@/api/services';
import { assetUrl } from '@/api/client';
import type { UserProfile, DiscoveryFilters } from '@/types';
import styles from './Discover.module.css';

// ==========================================================================
// Discover — stories row + explore rails + nearby grid.
// ==========================================================================

type ExploreSection = 'new' | 'verified' | 'recent';

const SECTIONS: { key: ExploreSection; label: string; icon: typeof ShieldCheck }[] = [
  { key: 'new', label: 'New members', icon: Sparkles },
  { key: 'verified', label: 'Verified members', icon: ShieldCheck },
  { key: 'recent', label: 'Recently active', icon: Clock },
];

function loadFilters(): Partial<DiscoveryFilters> {
  try {
    const saved = sessionStorage.getItem('discoveryFilters');
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

export function DiscoverPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [nearby, setNearby] = useState<UserProfile[]>([]);
  const [explore, setExplore] = useState<Record<ExploreSection, UserProfile[]>>({
    new: [], verified: [], recent: [],
  });
  const [storyKey, setStoryKey] = useState(0);

  // Refresh stories when a new one is created from the TabBar
  useEffect(() => {
    const handler = () => setStoryKey(k => k + 1);
    window.addEventListener('story-created', handler);
    return () => window.removeEventListener('story-created', handler);
  }, []);
  const [activeFilters, setActiveFilters] = useState(false);

  useEffect(() => {
    const filters = loadFilters();
    const hasFilters = Object.values(filters).some(v =>
      Array.isArray(v) ? v.length > 0 : v !== undefined && v !== '' && v !== false
    );
    setActiveFilters(hasFilters);
    setLoading(true);

    (async () => {
      try {
        const [nearbyData, ...exploreData] = await Promise.all([
          discoveryService.getNearby(filters),
          discoveryService.getExplore('new'),
          discoveryService.getExplore('verified'),
          discoveryService.getExplore('recent'),
        ]);
        setNearby(nearbyData);
        setExplore({ new: exploreData[0], verified: exploreData[1], recent: exploreData[2] });
      } finally {
        setLoading(false);
      }
    })();
  }, [location.key]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Discover"
        action={
          <button
            className={`${styles.filterButton} ${activeFilters ? styles.filterButtonActive : ''}`}
            onClick={() => navigate('/discover/filters')}
            aria-label="Filters"
          >
            <SlidersHorizontal size={18} />
            {activeFilters && <span className={styles.filterDot} />}
          </button>
        }
      />

      <div className={styles.content}>
        {/* Stories row — remounts on new story creation */}
        <Stories key={storyKey} />

        {/* Explore rails */}
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <section key={key} className={styles.section}>
            <div className={styles.sectionHeader}>
              <Icon size={15} className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>{label}</h2>
            </div>
            <div className={styles.rail}>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className={styles.railSkeleton} />)
                : explore[key].length === 0
                  ? <p className={styles.railEmpty}>No profiles yet</p>
                  : explore[key].map(p => <MiniCard key={p.id} profile={p} />)}
            </div>
          </section>
        ))}

        {/* Nearby grid */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>All members</h2>
          </div>
          <div className={styles.grid}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.gridSkeleton} />)
              : nearby.map(p => <GridCard key={p.id} profile={p} />)}
          </div>
          {!loading && nearby.length === 0 && (
            <p className={styles.railEmpty}>No profiles match your filters</p>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Compact rail card (horizontal scroll) ─────────────────────────────────
function MiniCard({ profile }: { profile: UserProfile }) {
  const navigate = useNavigate();
  const src = profile.photos[0]
    ? (profile.photos[0].startsWith('http') ? profile.photos[0] : assetUrl(profile.photos[0]))
    : `https://i.pravatar.cc/200?u=${profile.id}`;

  return (
    <button className={styles.miniCard} onClick={() => navigate(`/u/${profile.id}`)}>
      <div className={styles.miniPhotoWrap}>
        <img src={src} alt={profile.displayName} className={styles.miniPhoto} />
        {profile.isOnline && <span className={styles.onlineDot} />}
        {profile.verification === 'verified' && <span className={styles.verifiedDot}>✓</span>}
      </div>
      <div className={styles.miniName}>{profile.displayName?.split(' ')[0] || 'User'}</div>
      {profile.age && <div className={styles.miniAge}>{profile.age}</div>}
    </button>
  );
}

// ── Compact grid card ──────────────────────────────────────────────────────
function GridCard({ profile }: { profile: UserProfile }) {
  const navigate = useNavigate();
  const src = profile.photos[0]
    ? (profile.photos[0].startsWith('http') ? profile.photos[0] : assetUrl(profile.photos[0]))
    : `https://i.pravatar.cc/300?u=${profile.id}`;

  return (
    <button className={styles.gridCard} onClick={() => navigate(`/u/${profile.id}`)}>
      <img src={src} alt={profile.displayName} className={styles.gridPhoto} />
      <div className={styles.gridGradient} />
      {profile.isOnline && <span className={styles.gridOnline} />}
      {profile.verification === 'verified' && <span className={styles.gridVerified}>✓</span>}
      <div className={styles.gridInfo}>
        <span className={styles.gridName}>{profile.displayName?.split(' ')[0] || 'User'}</span>
        {profile.age && <span className={styles.gridAge}>{profile.age}</span>}
      </div>
    </button>
  );
}
