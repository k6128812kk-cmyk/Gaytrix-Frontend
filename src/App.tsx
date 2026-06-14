import { useEffect } from 'react';
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
import { useTranslation } from '@/i18n/useTranslation';
import styles from './App.module.css';

function BannedScreen({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <div className={styles.blockedScreen}>
      <div className={styles.blockedCard}>
        <span className={styles.blockedIcon}>🚫</span>
        <h2>
          {status === 'banned'
            ? (t('accountBanned' as any) || 'Account permanently banned')
            : (t('accountSuspended' as any) || 'Account suspended')}
        </h2>
        <p>
          {status === 'banned'
            ? (t('bannedMessage' as any) || 'Your account has been permanently banned for violating community guidelines.')
            : (t('suspendedMessage' as any) || 'Your account is temporarily suspended. Please check back later.')}
        </p>
        <p className={styles.blockedContact}>
          {t('contactSupport' as any) || 'If you believe this is an error, contact support via @K5Support on Telegram.'}
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

// Shown while Telegram initData is being verified by the server
function AuthLoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className={styles.loading}>
      <div className={styles.loadingLogo}>K5</div>
      <p>{t('loading')}</p>
    </div>
  );
}

// Shown when app is opened outside Telegram (no initData)
function TelegramRequiredScreen() {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingLogo}>K5</div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 16, textAlign: 'center', padding: '0 24px' }}>
        Open this app inside Telegram to continue.
      </p>
    </div>
  );
}

export default function App() {
  const { initData, isReady } = useTelegram();
  const { profile, isLoading, hasCompletedOnboarding, setProfile, setLoading, isActive } = useSessionStore();

  useGlobalWs();

  useEffect(() => {
    if (!isReady) return;

    // Outside Telegram — no initData means we cannot authenticate.
    // Show a "please open in Telegram" screen rather than mock data.
    if (!initData) {
      setLoading(false);
      return;
    }

    setInitData(initData);

    profileService.getMe()
      .then(setProfile)
      .catch((err) => {
        console.error('Failed to load profile:', err);
        // Don't fall back to mock data — let the user see an error
        // so they know to try again rather than seeing fake profiles.
      })
      .finally(() => setLoading(false));
  }, [isReady, initData, setProfile, setLoading]);

  if (isLoading || (!profile && initData)) {
    return <AuthLoadingScreen />;
  }

  // Not inside Telegram — can't authenticate
  if (!initData && !profile) {
    return <TelegramRequiredScreen />;
  }

  if (!isActive()) return <BannedScreen status={profile!.accountStatus} />;
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
