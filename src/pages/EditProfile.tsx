import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, Plus, CheckCircle2, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Chip } from '@/components/Chip';
import { useSessionStore } from '@/context/sessionStore';
import { useTranslation } from '@/i18n/useTranslation';
import { profileService } from '@/api/services';
import type { LookingFor, GenderIdentity, InterestedIn, Orientation, RelationshipStatus } from '@/types';
import styles from './EditProfile.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGUAGE_SUGGESTIONS = [
  'English', 'Turkish', 'German', 'French', 'Spanish', 'Arabic',
  'Italian', 'Portuguese', 'Russian', 'Japanese', 'Korean',
];

const LOOKING_FOR_OPTIONS: { value: LookingFor; label: string }[] = [
  { value: 'friends',      label: 'Friends'      },
  { value: 'dating',       label: 'Dating'       },
  { value: 'relationship', label: 'Relationship' },
  { value: 'networking',   label: 'Networking'   },
  { value: 'community',    label: 'Community'    },
  { value: 'chat',         label: 'Just chat'    },
];

const GENDER_OPTIONS: { value: GenderIdentity; label: string }[] = [
  { value: 'male',       label: 'Male'       },
  { value: 'female',     label: 'Female'     },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other',      label: 'Other'      },
];

const INTERESTED_IN_OPTIONS: { value: InterestedIn; label: string }[] = [
  { value: 'men',      label: 'Men'      },
  { value: 'women',    label: 'Women'    },
  { value: 'everyone', label: 'Everyone' },
];

const ORIENTATION_OPTIONS: { value: Orientation; label: string }[] = [
  { value: 'gay',       label: 'Gay'       },
  { value: 'lesbian',   label: 'Lesbian'   },
  { value: 'bisexual',  label: 'Bisexual'  },
  { value: 'straight',  label: 'Straight'  },
  { value: 'pansexual', label: 'Pansexual' },
  { value: 'asexual',   label: 'Asexual'   },
  { value: 'other',     label: 'Other'     },
];

const RELATIONSHIP_STATUS_OPTIONS: { value: RelationshipStatus; label: string }[] = [
  { value: 'single',            label: 'Single'             },
  { value: 'in_relationship',   label: 'In a relationship'  },
  { value: 'married',           label: 'Married'            },
  { value: 'open_relationship', label: 'Open relationship'  },
  { value: 'complicated',       label: "It's complicated"   },
  { value: 'prefer_not_to_say', label: 'Prefer not to say'  },
];

const INTEREST_SUGGESTIONS = [
  'Music', 'Coffee', 'Hiking', 'Travel', 'Tech', 'Books',
  'Nightlife', 'Food', 'Photography', 'Cinema', 'Fitness', 'Art',
];

// ─── Component ────────────────────────────────────────────────────────────────

export function EditProfilePage() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useSessionStore();
  const { t } = useTranslation();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [photos, setPhotos]                         = useState<string[]>(profile?.photos ?? []);
  const [pendingUploads, setPendingUploads]          = useState(0);
  const [displayName, setDisplayName]               = useState(profile?.displayName ?? '');
  const [age, setAge]                               = useState(profile?.age ? String(profile.age) : '');
  const [city, setCity]                             = useState(profile?.city ?? '');
  const [bio, setBio]                               = useState(profile?.bio ?? '');
  const [occupation, setOccupation]                 = useState(profile?.occupation ?? '');
  const [interests, setInterests]                   = useState<string[]>(profile?.interests ?? []);
  const [lookingFor, setLookingFor]                 = useState<LookingFor[]>(profile?.lookingFor ?? []);
  const [languages, setLanguages]                   = useState<string[]>(profile?.languages ?? []);
  const [genderIdentity, setGenderIdentity]         = useState<GenderIdentity>(profile?.genderIdentity ?? '');
  const [interestedIn, setInterestedIn]             = useState<InterestedIn>(profile?.interestedIn ?? 'everyone');
  const [orientation, setOrientation]               = useState<Orientation>(profile?.orientation ?? '');
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>(profile?.relationshipStatus ?? 'single');

  // ── Save state ──────────────────────────────────────────────────────────────
  type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Use refs to always have the latest values inside async callbacks / cleanup
  const stateRef = useRef({
    photos, displayName, age, city, bio, occupation,
    interests, lookingFor, languages,
    genderIdentity, interestedIn, orientation, relationshipStatus,
  });

  useEffect(() => {
    stateRef.current = {
      photos, displayName, age, city, bio, occupation,
      interests, lookingFor, languages,
      genderIdentity, interestedIn, orientation, relationshipStatus,
    };
  }, [
    photos, displayName, age, city, bio, occupation,
    interests, lookingFor, languages,
    genderIdentity, interestedIn, orientation, relationshipStatus,
  ]);

  // Debounce timer ref — we debounce text field saves, but fire immediately for chip toggles
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  // ── Core save function ──────────────────────────────────────────────────────
  const save = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSaveStatus('saving');

    const s = stateRef.current;
    const persistedPhotos = s.photos.filter(u => !u.startsWith('blob:'));
    const parsedAge = parseInt(s.age);

    try {
      const updated = await profileService.updateMe({
        photos:             persistedPhotos,
        displayName:        s.displayName.trim() || undefined,
        age:                (!isNaN(parsedAge) && parsedAge >= 18) ? parsedAge : undefined,
        city:               s.city.trim() || undefined,
        bio:                s.bio.trim(),
        occupation:         s.occupation.trim() || undefined,
        interests:          s.interests,
        lookingFor:         s.lookingFor,
        languages:          s.languages,
        genderIdentity:     s.genderIdentity || undefined,
        interestedIn:       s.interestedIn   || undefined,
        orientation:        s.orientation    || undefined,
        relationshipStatus: s.relationshipStatus,
      });
      updateProfile(updated);
      setSaveStatus('saved');
      // Reset to 'idle' after a brief "Saved ✓" flash
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      isSavingRef.current = false;
    }
  }, [updateProfile]);

  // ── Debounced save (for text inputs) ────────────────────────────────────────
  const scheduleSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(save, 800);
  }, [save]);

  // ── Immediate save (for chip toggles, selects) ───────────────────────────────
  const immediateSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Small tick so the state setter has committed before we read stateRef
    debounceRef.current = setTimeout(save, 50);
  }, [save]);

  // ── Auto-save on unmount (navigating away) ───────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Fire and forget — we don't await inside cleanup
      save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Photo upload ─────────────────────────────────────────────────────────────
  function handlePhotoPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setPhotos(prev => prev.length < 6 ? [...prev, localUrl] : prev);
    setPendingUploads(n => n + 1);
    profileService.uploadPhoto(file)
      .then(remoteUrl => {
        setPhotos(prev => prev.map(u => u === localUrl ? remoteUrl : u));
        immediateSave();
      })
      .catch(() => setPhotos(prev => prev.filter(u => u !== localUrl)))
      .finally(() => setPendingUploads(n => n - 1));
  }

  function removePhoto(index: number) {
    setPhotos(prev => { const next = prev.filter((_, i) => i !== index); return next; });
    immediateSave();
  }

  // ── Chip toggle helpers ──────────────────────────────────────────────────────
  function toggleInterest(value: string) {
    setInterests(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    immediateSave();
  }
  function toggleLookingFor(value: LookingFor) {
    setLookingFor(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    immediateSave();
  }
  function toggleLanguage(lang: string) {
    setLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);
    immediateSave();
  }
  function pickGender(val: GenderIdentity) {
    setGenderIdentity(prev => prev === val ? '' : val);
    immediateSave();
  }
  function pickOrientation(val: Orientation) {
    setOrientation(prev => prev === val ? '' : val);
    immediateSave();
  }

  // ── Header status indicator ──────────────────────────────────────────────────
  const statusNode =
    saveStatus === 'saving' ? (
      <span className={styles.saveStatus}>
        <Loader2 size={14} className={styles.spin} /> Saving…
      </span>
    ) : saveStatus === 'saved' ? (
      <span className={`${styles.saveStatus} ${styles.saveStatusSaved}`}>
        <CheckCircle2 size={14} /> Saved
      </span>
    ) : saveStatus === 'error' ? (
      <span className={`${styles.saveStatus} ${styles.saveStatusError}`}>
        Not saved
      </span>
    ) : null;

  // ── Age validation hint ──────────────────────────────────────────────────────
  const ageNum = parseInt(age);
  const ageError = age !== '' && (isNaN(ageNum) || ageNum < 18 || ageNum > 100);

  return (
    <div className={styles.page}>
      <PageHeader
        title={t('editProfile')}
        showBack
        action={statusNode ?? undefined}
      />

      <div className={styles.content}>

        {/* ── Photos ── */}
        <section className={styles.section}>
          <label className={styles.label}>Photos</label>
          <div className={styles.photoGrid}>
            {photos.map((src, i) => (
              <div key={i} className={styles.photoSlot}>
                <img src={src} alt={`Photo ${i + 1}`} />
                <button className={styles.removePhoto} onClick={() => removePhoto(i)} aria-label="Remove photo">
                  <X size={14} />
                </button>
              </div>
            ))}
            {photos.length < 6 && (
              <label className={styles.photoSlotEmpty}>
                <Camera size={20} />
                <input type="file" accept="image/*" onChange={handlePhotoPick} className="visually-hidden" />
              </label>
            )}
          </div>
          {pendingUploads > 0 && (
            <p className={styles.fieldHint}>
              Uploading {pendingUploads} photo{pendingUploads > 1 ? 's' : ''}…
            </p>
          )}
        </section>

        {/* ── Display name ── */}
        <section className={styles.section}>
          <label className={styles.label} htmlFor="displayName">{t('displayName')}</label>
          <input
            id="displayName"
            value={displayName}
            onChange={e => { setDisplayName(e.target.value); scheduleSave(); }}
            className={styles.input}
          />
        </section>

        {/* ── Age ── */}
        <section className={styles.section}>
          <label className={styles.label} htmlFor="age">{t('age')}</label>
          <input
            id="age"
            type="number"
            inputMode="numeric"
            min={18}
            max={100}
            value={age}
            onChange={e => { setAge(e.target.value); scheduleSave(); }}
            placeholder="e.g. 25"
            className={`${styles.input} ${ageError ? styles.inputError : ''}`}
          />
          {ageError && (
            <p className={`${styles.fieldHint} ${styles.hintError}`}>
              Must be 18 or older
            </p>
          )}
        </section>

        {/* ── City ── */}
        <section className={styles.section}>
          <label className={styles.label} htmlFor="city">{t('city')}</label>
          <input
            id="city"
            value={city}
            onChange={e => { setCity(e.target.value); scheduleSave(); }}
            placeholder="e.g. Istanbul"
            className={styles.input}
          />
        </section>

        {/* ── Occupation ── */}
        <section className={styles.section}>
          <label className={styles.label} htmlFor="occupation">{t('occupation')}</label>
          <input
            id="occupation"
            value={occupation}
            onChange={e => { setOccupation(e.target.value); scheduleSave(); }}
            placeholder={t('optional')}
            className={styles.input}
          />
        </section>

        {/* ── Bio ── */}
        <section className={styles.section}>
          <label className={styles.label} htmlFor="bio">{t('bio')}</label>
          <textarea
            id="bio"
            value={bio}
            onChange={e => { setBio(e.target.value); scheduleSave(); }}
            rows={4}
            maxLength={400}
            className={styles.textarea}
          />
          <div className={styles.charCount}>{bio.length}/400</div>
        </section>

        {/* ── Gender identity ── */}
        <section className={styles.section}>
          <label className={styles.label}>{t('genderIdentity')}</label>
          <div className={styles.chipWrap}>
            {GENDER_OPTIONS.map(opt => (
              <Chip key={opt.value} selected={genderIdentity === opt.value} onClick={() => pickGender(opt.value)}>
                {opt.label}
              </Chip>
            ))}
          </div>
        </section>

        {/* ── Interested in ── */}
        <section className={styles.section}>
          <label className={styles.label}>{t('interestedIn')}</label>
          <div className={styles.chipWrap}>
            {INTERESTED_IN_OPTIONS.map(opt => (
              <Chip key={opt.value} selected={interestedIn === opt.value}
                onClick={() => { setInterestedIn(opt.value); immediateSave(); }}>
                {opt.label}
              </Chip>
            ))}
          </div>
        </section>

        {/* ── Orientation ── */}
        <section className={styles.section}>
          <label className={styles.label}>{t('orientation')} ({t('optional')})</label>
          <div className={styles.chipWrap}>
            {ORIENTATION_OPTIONS.map(opt => (
              <Chip key={opt.value} selected={orientation === opt.value} onClick={() => pickOrientation(opt.value)}>
                {opt.label}
              </Chip>
            ))}
          </div>
        </section>

        {/* ── Relationship status ── */}
        <section className={styles.section}>
          <label className={styles.label}>{t('relationshipStatus')}</label>
          <div className={styles.chipWrap}>
            {RELATIONSHIP_STATUS_OPTIONS.map(opt => (
              <Chip key={opt.value} selected={relationshipStatus === opt.value}
                onClick={() => { setRelationshipStatus(opt.value); immediateSave(); }}>
                {opt.label}
              </Chip>
            ))}
          </div>
        </section>

        {/* ── Languages ── */}
        <section className={styles.section}>
          <label className={styles.label}>{t('languagesSpoken')}</label>
          <div className={styles.chipWrap}>
            {LANGUAGE_SUGGESTIONS.map(lang => (
              <Chip key={lang} selected={languages.includes(lang)} onClick={() => toggleLanguage(lang)}>
                {lang}
              </Chip>
            ))}
          </div>
        </section>

        {/* ── Looking for ── */}
        <section className={styles.section}>
          <label className={styles.label}>{t('lookingFor')}</label>
          <div className={styles.chipWrap}>
            {LOOKING_FOR_OPTIONS.map(opt => (
              <Chip key={opt.value} selected={lookingFor.includes(opt.value)} onClick={() => toggleLookingFor(opt.value)}>
                {opt.label}
              </Chip>
            ))}
          </div>
        </section>

        {/* ── Interests ── */}
        <section className={styles.section}>
          <label className={styles.label}>{t('interests')}</label>
          <div className={styles.chipWrap}>
            {INTEREST_SUGGESTIONS.map(interest => (
              <Chip key={interest} selected={interests.includes(interest)} onClick={() => toggleInterest(interest)}>
                {!interests.includes(interest) && <Plus size={12} />}
                {interest}
              </Chip>
            ))}
          </div>
        </section>

        {/* Bottom padding so content clears the safe area */}
        <div style={{ height: 'calc(var(--safe-bottom, 0px) + 24px)' }} />
      </div>
    </div>
  );
}
