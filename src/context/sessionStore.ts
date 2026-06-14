import { create } from 'zustand';
import type { UserProfile } from '@/types';

// ==========================================================================
// Session store — authenticated user profile, onboarding state, and
// global unread message count (for the TabBar badge).
//
// hasCompletedOnboarding is persisted in localStorage so it survives
// page reloads. A new user with an empty profile would otherwise be
// sent back to onboarding on every refresh even after completing it.
// ==========================================================================

const ONBOARDING_KEY = 'k5_onboarding_done';

function profileLooksComplete(profile: UserProfile): boolean {
  return (
    profile.displayName.trim().length > 0 &&
    profile.bio.trim().length > 0 &&
    profile.photos.length > 0
  );
}

function loadOnboardingFlag(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1';
  } catch {
    return false;
  }
}

function saveOnboardingFlag() {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1');
  } catch {}
}

interface SessionState {
  profile: UserProfile | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  totalUnreadCount: number;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  setLoading: (loading: boolean) => void;
  completeOnboarding: () => void;
  setTotalUnread: (count: number) => void;
  isAdmin: () => boolean;
  isModerator: () => boolean;
  isActive: () => boolean;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  profile: null,
  isLoading: true,
  // Restore from localStorage on first load
  hasCompletedOnboarding: loadOnboardingFlag(),
  totalUnreadCount: 0,

  setProfile: (profile) => {
    const done = loadOnboardingFlag() || profileLooksComplete(profile);
    if (done) saveOnboardingFlag();
    set({ profile, hasCompletedOnboarding: done });
  },

  updateProfile: (patch) =>
    set((state) => {
      const profile = state.profile ? { ...state.profile, ...patch } : state.profile;
      const done =
        state.hasCompletedOnboarding ||
        (profile != null && profileLooksComplete(profile));
      if (done) saveOnboardingFlag();
      return { profile, hasCompletedOnboarding: done };
    }),

  setLoading: (isLoading) => set({ isLoading }),

  completeOnboarding: () => {
    saveOnboardingFlag();
    set({ hasCompletedOnboarding: true });
  },

  setTotalUnread: (count) => set({ totalUnreadCount: count }),

  isAdmin: () => {
    const role = get().profile?.adminRole;
    return role === 'super_admin' || role === 'admin';
  },
  isModerator: () => {
    const role = get().profile?.adminRole;
    return role === 'super_admin' || role === 'admin' || role === 'moderator';
  },
  isActive: () => get().profile?.accountStatus === 'active',
}));
