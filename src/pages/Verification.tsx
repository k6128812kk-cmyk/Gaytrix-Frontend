import { useState } from 'react';
import { Camera, ShieldCheck, Clock, XCircle, Lock } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/Button';
import { useSessionStore } from '@/context/sessionStore';
import { useTranslation } from '@/i18n/useTranslation';
import { profileService } from '@/api/services';
import styles from './Verification.module.css';

export function VerificationPage() {
  const { profile, updateProfile } = useSessionStore();
  const { t } = useTranslation();
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!profile) return null;

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    setSelfiePreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!selfieFile) return;
    setSubmitting(true);
    try {
      await profileService.requestVerification(selfieFile);
      updateProfile({ verification: 'pending' });
    } finally { setSubmitting(false); }
  }

  return (
    <div className={styles.page}>
      <PageHeader title={t('verificationTitle')} showBack />
      <div className={styles.content}>
        {profile.verification === 'verified' && (
          <StatusBanner icon={ShieldCheck} tone="gold"
            title={t('verificationVerified')}
            description={t('verifiedDesc')} />
        )}
        {profile.verification === 'pending' && (
          <StatusBanner icon={Clock} tone="neutral"
            title={t('verificationPending')}
            description={t('pendingDesc')} />
        )}
        {profile.verification === 'rejected' && (
          <StatusBanner icon={XCircle} tone="danger"
            title={t('verificationRejected')}
            description={t('rejectedDesc')} />
        )}

        {(profile.verification === 'none' || profile.verification === 'rejected') && (
          <>
            <section className={styles.infoSection}>
              <h2 className={styles.heading}>{t('verificationTitle')}</h2>
              <p className={styles.body}>{t('verificationDesc')}</p>
            </section>
            <section className={styles.infoSection}>
              <div className={styles.privacyNote}>
                <Lock size={16} />
                <p>Your selfie is only ever seen by admins reviewing your request. It is never shown on your public profile.</p>
              </div>
            </section>
            <section className={styles.uploadSection}>
              <label className={styles.uploadBox}>
                {selfiePreview ? (
                  <img src={selfiePreview} alt={t('selfiePreview')} className={styles.preview} />
                ) : (
                  <><Camera size={28} /><span>Take or upload a selfie</span></>
                )}
                <input type="file" accept="image/*" capture="user" onChange={handleFilePick} className="visually-hidden" />
              </label>
              <ul className={styles.requirements}>
                <li>Clear photo of your face, good lighting</li>
                <li>No filters, sunglasses, or face coverings</li>
                <li>Must match your profile photos</li>
              </ul>
            </section>
          </>
        )}
      </div>

      {(profile.verification === 'none' || profile.verification === 'rejected') && (
        <div className={styles.footer}>
          <Button fullWidth onClick={handleSubmit} disabled={!selfieFile || submitting}>
            {submitting ? t('saving') : t('submitVerification')}
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusBanner({ icon: Icon, tone, title, description }: {
  icon: typeof ShieldCheck; tone: 'gold' | 'neutral' | 'danger'; title: string; description: string;
}) {
  return (
    <div className={`${styles.banner} ${styles[`banner_${tone}`]}`}>
      <Icon size={24} />
      <div>
        <h3 className={styles.bannerTitle}>{title}</h3>
        <p className={styles.bannerBody}>{description}</p>
      </div>
    </div>
  );
}
