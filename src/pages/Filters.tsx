import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Chip } from '@/components/Chip';
import { Button } from '@/components/Button';
import { useTranslation } from '@/i18n/useTranslation';
import type { DiscoveryFilters, RelationshipStatus, Orientation, ShowMeOption } from '@/types';
import styles from './Filters.module.css';

function loadFilters(): DiscoveryFilters {
  try {
    const saved = sessionStorage.getItem('discoveryFilters');
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_FILTERS;
}

const DEFAULT_FILTERS: DiscoveryFilters = {
  ageMin: 18,
  ageMax: 45,
  maxDistanceKm: 50,
  relationshipStatus: [],
  interests: [],
  languages: [],
  verifiedOnly: false,
  onlineOnly: false,
  genderIdentity: '',
  interestedIn: 'everyone',
  orientation: '',
  showMe: 'everyone',
};

const SHOW_ME_OPTIONS: { value: ShowMeOption; label: string; desc: string }[] = [
  { value: 'men',      label: 'Men',      desc: 'Show profiles identifying as male' },
  { value: 'women',    label: 'Women',    desc: 'Show profiles identifying as female' },
  { value: 'gay',      label: 'Gay',      desc: 'Show users with gay orientation' },
  { value: 'everyone', label: 'Everyone', desc: 'Show all users' },
];

const ORIENTATION_OPTIONS: { value: Orientation; label: string }[] = [
  { value: 'gay',       label: 'Gay' },
  { value: 'lesbian',   label: 'Lesbian' },
  { value: 'bisexual',  label: 'Bisexual' },
  { value: 'straight',  label: 'Straight' },
  { value: 'pansexual', label: 'Pansexual' },
  { value: 'asexual',   label: 'Asexual' },
  { value: 'other',     label: 'Other' },
];

const RELATIONSHIP_OPTIONS: { value: RelationshipStatus; label: string }[] = [
  { value: 'single',            label: 'Single' },
  { value: 'in_relationship',   label: 'In a relationship' },
  { value: 'open_relationship', label: 'Open relationship' },
];

const LANGUAGE_OPTIONS = ['English', 'Turkish', 'Russian', 'German', 'French', 'Spanish', 'Arabic'];
const INTEREST_OPTIONS = ['Music', 'Coffee', 'Hiking', 'Travel', 'Tech', 'Books', 'Nightlife', 'Food', 'Photography'];

export function FiltersPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<DiscoveryFilters>(loadFilters);

  function set<K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function toggleArr<T>(key: keyof DiscoveryFilters, value: T) {
    setFilters(prev => {
      const arr = (prev[key] as T[]) ?? [];
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  }

  function applyFilters() {
    sessionStorage.setItem('discoveryFilters', JSON.stringify(filters));
    navigate(-1);
  }

  function resetFilters() {
    sessionStorage.removeItem('discoveryFilters');
    setFilters(DEFAULT_FILTERS);
  }

  return (
    <div className={styles.page}>
      <PageHeader title={t('filters')} showBack />

      <div className={styles.content}>

        {/* ── Show Me ── */}
        <section className={styles.section}>
          <label className={styles.label}>Show me</label>
          <div className={styles.chipWrap}>
            {SHOW_ME_OPTIONS.map(opt => (
              <Chip key={opt.value} selected={filters.showMe === opt.value}
                onClick={() => set('showMe', opt.value)}>
                {opt.label}
              </Chip>
            ))}
          </div>
          <p className={styles.hint}>
            {SHOW_ME_OPTIONS.find(o => o.value === (filters.showMe || 'everyone'))?.desc}
          </p>
        </section>

        {/* ── Sexual Orientation ── */}
        <section className={styles.section}>
          <label className={styles.label}>Sexual orientation</label>
          <div className={styles.chipWrap}>
            {ORIENTATION_OPTIONS.map(opt => (
              <Chip key={opt.value}
                selected={filters.orientation === opt.value}
                onClick={() => set('orientation', filters.orientation === opt.value ? '' : opt.value)}>
                {opt.label}
              </Chip>
            ))}
          </div>
        </section>

        {/* ── Age Range ── */}
        <section className={styles.section}>
          <label className={styles.label}>Age range</label>
          <div className={styles.rangeRow}>
            <input type="number" min={18} max={99} value={filters.ageMin}
              onChange={e => set('ageMin', Number(e.target.value))}
              className={styles.rangeInput} />
            <span className={styles.rangeDash}>–</span>
            <input type="number" min={18} max={99} value={filters.ageMax}
              onChange={e => set('ageMax', Number(e.target.value))}
              className={styles.rangeInput} />
          </div>
        </section>

        {/* ── Relationship Status ── */}
        <section className={styles.section}>
          <label className={styles.label}>Relationship status</label>
          <div className={styles.chipWrap}>
            {RELATIONSHIP_OPTIONS.map(opt => (
              <Chip key={opt.value} selected={filters.relationshipStatus?.includes(opt.value)}
                onClick={() => toggleArr('relationshipStatus', opt.value)}>
                {opt.label}
              </Chip>
            ))}
          </div>
        </section>

        {/* ── Interests ── */}
        <section className={styles.section}>
          <label className={styles.label}>Interests</label>
          <div className={styles.chipWrap}>
            {INTEREST_OPTIONS.map(opt => (
              <Chip key={opt} selected={filters.interests?.includes(opt)}
                onClick={() => toggleArr('interests', opt)}>
                {opt}
              </Chip>
            ))}
          </div>
        </section>

        {/* ── Languages ── */}
        <section className={styles.section}>
          <label className={styles.label}>Languages</label>
          <div className={styles.chipWrap}>
            {LANGUAGE_OPTIONS.map(opt => (
              <Chip key={opt} selected={filters.languages?.includes(opt)}
                onClick={() => toggleArr('languages', opt)}>
                {opt}
              </Chip>
            ))}
          </div>
        </section>

        {/* ── Toggles ── */}
        <section className={styles.section}>
          <div className={styles.toggleRow}>
            <div>
              <p className={styles.toggleLabel}>Verified only</p>
              <p className={styles.toggleHint}>Only show verified profiles</p>
            </div>
            <button className={`${styles.toggle} ${filters.verifiedOnly ? styles.toggleOn : ''}`}
              onClick={() => set('verifiedOnly', !filters.verifiedOnly)}
              aria-pressed={filters.verifiedOnly}>
              <span className={styles.toggleKnob} />
            </button>
          </div>
          <div className={styles.toggleRow}>
            <div>
              <p className={styles.toggleLabel}>Online now</p>
              <p className={styles.toggleHint}>Only show people currently online</p>
            </div>
            <button className={`${styles.toggle} ${filters.onlineOnly ? styles.toggleOn : ''}`}
              onClick={() => set('onlineOnly', !filters.onlineOnly)}
              aria-pressed={filters.onlineOnly}>
              <span className={styles.toggleKnob} />
            </button>
          </div>
        </section>

      </div>

      <div className={styles.footer}>
        <Button variant="secondary" onClick={resetFilters}>Reset</Button>
        <Button fullWidth onClick={applyFilters}>Apply filters</Button>
      </div>
    </div>
  );
}
