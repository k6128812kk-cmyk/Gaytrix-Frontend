import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { OnboardingPage } from '@/pages/Onboarding';
import { DiscoverPage } from '@/pages/Discover';
import { FiltersPage } from '@/pages/Filters';
import { ProfileDetailPage } from '@/pages/ProfileDetail';
import { GroupsPage } from '@/pages/GroupsPage';
import { GroupChatPage } from '@/pages/GroupChat';
import { GroupInfoPage } from '@/pages/GroupInfo';
import { ChatListPage } from '@/pages/ChatList';
import { ConversationPage } from '@/pages/Conversation';
import { ProfilePage } from '@/pages/Profile';
import { EditProfilePage } from '@/pages/EditProfile';
import { VerificationPage } from '@/pages/Verification';
import { PremiumPage } from '@/pages/Premium';
import { PrivacyPage } from '@/pages/Privacy';
import { NotificationsPage } from '@/pages/Notifications';
import { HelpPage } from '@/pages/Help';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminUsers } from '@/pages/admin/AdminUsers';
import { AdminVerification } from '@/pages/admin/AdminVerification';
import { AdminReports } from '@/pages/admin/AdminReports';
import { AdminAuditLog } from '@/pages/admin/AdminAuditLog';
import { AdminModerators } from '@/pages/admin/AdminModerators';
import { EventChatPage } from '@/pages/EventChat';
import { MapPage } from '@/pages/MapPage';
import { useTelegram } from '@/hooks/useTelegram';
import { useGlobalWs } from '@/hooks/useGlobalWs';
import { useSessionStore } from '@/context/sessionStore';
import { profileService } from '@/api/services';
import { setInitData } from '@/api/client';
import styles from './App.module.css';

// ─── Screens ──────────────────────────────────────────────────────────────────

function LoadingScreen({ slow }: { slow: boolean }) {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingLogo}>K5</div>
      {slow && (
        <p style={{ color: 'var(--color-text-faint)', fontSize: 13, marginTop: 16, textAlign: 'center' }}>
          Waking up the server…
        </p>
      )}
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingLogo}>K5</div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 20, textAlign: 'center', padding: '0 32px', lineHeight: 1.6 }}>
        {message}
      </p>
      <button onClick={onRetry} style={{
        marginTop: 20, padding: '12px 32px',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--color-accent)', color: '#1a1014',
        fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
      }}>
        Try Again
      </button>
    </div>
  );
}

function BannedScreen({ status }: { status: string }) {
  return (
    <div className={styles.blockedScreen}>
      <div className={styles.blockedCard}>
        <span className={styles.blockedIcon}>🚫</span>
        <h2 style={{ color: 'var(--color-danger)', fontSize: 18, fontWeight: 800 }}>
          {status === 'banned' ? 'Account permanently banned' : 'Account suspended'}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          {status === 'banned'
            ? 'Your account has been permanently banned for violating community guidelines.'
            : 'Your account is temporarily suspended. Please check back later.'}
        </p>
        <p className={styles.blockedContact}>
          Contact @K5Support on Telegram if you believe this is an error.
        </p>
      </div>
    </div>
  );
}

function AdminGuard({ children }: { children: ReactNode }) {
  const { isModerator } = useSessionStore();
  if (!isModerator()) return <Navigate to="/discover" replace />;
  return <>{children}</>;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const { initData, isReady } = useTelegram();
  const { profile, isLoading, hasCompletedOnboarding, setProfile, setLoading, isActive } =
    useSessionStore();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Show "waking up" hint after 5s of loading
  const [slowLoad, setSlowLoad] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout>>();

  useGlobalWs();

  function doLoadProfile() {
    setErrorMessage(null);
    setSlowLoad(false);
    setLoading(true);

    // After 5s still loading, show the "waking up" message
    clearTimeout(slowTimer.current);
    slowTimer.current = setTimeout(() => setSlowLoad(true), 5000);

    profileService.getMe()
      .then((p) => {
        clearTimeout(slowTimer.current);
        setProfile(p);
      })
      .catch((err) => {
        clearTimeout(slowTimer.current);
        setSlowLoad(false);
        const status = err?.response?.status;
        if (status === 401) {
          setErrorMessage('Session expired. Close and re-open this app from Telegram.');
        } else if (status === 403) {
          setErrorMessage('Account restricted. Contact @K5Support.');
        } else if (status === 500) {
          setErrorMessage('Server error. Please try again in a moment.');
        } else {
          // Network error, timeout, CORS — give a clear retry message
          setErrorMessage('Could not reach the server. Check your internet and try again.');
        }
        console.error('getMe failed — status:', status, 'message:', err?.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    if (!isReady) return;
    if (!initData) {
      setLoading(false);
      return;
    }
    setInitData(initData);
    doLoadProfile();
    return () => clearTimeout(slowTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, initData]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) return <LoadingScreen slow={slowLoad} />;

  if (errorMessage) return <ErrorScreen message={errorMessage} onRetry={doLoadProfile} />;

  if (!profile) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingLogo}>K5</div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 20, textAlign: 'center', padding: '0 32px' }}>
          Open this app inside Telegram to continue.
        </p>
      </div>
    );
  }

  if (!isActive()) return <BannedScreen status={profile.accountStatus} />;
  if (!hasCompletedOnboarding) return <OnboardingPage />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/discover" replace />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/discover/filters" element={<FiltersPage />} />
        <Route path="/u/:id" element={<ProfileDetailPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/groups/:groupId" element={<GroupChatPage />} />
        <Route path="/groups/:groupId/info" element={<GroupInfoPage />} />
        <Route path="/chat" element={<ChatListPage />} />
        <Route path="/chat/:id" element={<ConversationPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
        <Route path="/profile/verification" element={<VerificationPage />} />
        <Route path="/profile/premium" element={<PremiumPage />} />
        <Route path="/profile/privacy" element={<PrivacyPage />} />
        <Route path="/profile/notifications" element={<NotificationsPage />} />
        <Route path="/profile/help" element={<HelpPage />} />
        <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
        <Route path="/admin/users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
        <Route path="/admin/verification" element={<AdminGuard><AdminVerification /></AdminGuard>} />
        <Route path="/admin/reports" element={<AdminGuard><AdminReports /></AdminGuard>} />
        <Route path="/admin/audit" element={<AdminGuard><AdminAuditLog /></AdminGuard>} />
        <Route path="/admin/moderators" element={<AdminGuard><AdminModerators /></AdminGuard>} />
        <Route path="/event-chat/:conversationId" element={<EventChatPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="*" element={<Navigate to="/discover" replace />} />
      </Route>
    </Routes>
  );
}
